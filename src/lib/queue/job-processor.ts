import { JobType, JobData } from "./job-types";
import { SchedulerService } from "@/lib/services/scheduler.service";
import { PostPublisherService } from "@/lib/services/post-publisher";
import type {
  PublishPostJobData,
  ProcessApprovalJobData,
  CheckExpiredTokensJobData,
  SystemHealthCheckJobData,
  CleanupOldLogsJobData,
  SendNotificationJobData,
  ProcessWebhookJobData,
  GenerateReportJobData,
  SocialMediaSyncJobData,
} from "./job-types";

export class JobProcessor {
  /**
   * Process job based on type
   */
  public static async process(jobType: JobType, data: JobData): Promise<any> {
    switch (jobType) {
      case JobType.PUBLISH_POST:
        return await this.processPublishPost(data as PublishPostJobData);

      case JobType.PROCESS_APPROVAL:
        return await this.processApproval(data as ProcessApprovalJobData);

      case JobType.CHECK_EXPIRED_TOKENS:
        return await this.processCheckExpiredTokens(
          data as CheckExpiredTokensJobData
        );

      case JobType.SYSTEM_HEALTH_CHECK:
        return await this.processSystemHealthCheck(
          data as SystemHealthCheckJobData
        );

      case JobType.CLEANUP_OLD_LOGS:
        return await this.processCleanupOldLogs(data as CleanupOldLogsJobData);

      case JobType.SEND_NOTIFICATION:
        return await this.processSendNotification(
          data as SendNotificationJobData
        );

      case JobType.PROCESS_WEBHOOK:
        return await this.processWebhook(data as ProcessWebhookJobData);

      case JobType.GENERATE_REPORT:
        return await this.processGenerateReport(data as GenerateReportJobData);

      case JobType.SOCIAL_MEDIA_SYNC:
        return await this.processSocialMediaSync(
          data as SocialMediaSyncJobData
        );

      case JobType.COLLECT_POSTS_ANALYTICS:

      default:
        throw new Error(`Unknown job type: ${jobType}`);
    }
  }

  /**
   * Process publish post job
   */
  private static async processPublishPost(
    data: PublishPostJobData
  ): Promise<any> {
    console.log(
      `📝 Processing publish job with data:`,
      JSON.stringify(data, null, 2)
    );

    try {
      // Handle batch processing mode for recurring cron jobs
      if (data.postId === "batch_due_posts") {
        console.log(`📋 Processing all due posts in batch mode`);
        // Import SchedulerService here to avoid circular dependencies
        const { SchedulerService } = await import(
          "@/lib/services/scheduler.service"
        );
        const result = await SchedulerService.processDuePublications();

        return {
          action: "batch_due_posts",
          result,
        };
      }

      // Handle case where data is incomplete or from old recurring jobs
      if (
        !data.postId ||
        !data.platform ||
        data.postId === "undefined" ||
        data.platform === "undefined"
      ) {
        console.warn(
          `⚠️  Received incomplete job data, falling back to batch processing:`,
          data
        );
        // Import SchedulerService here to avoid circular dependencies
        const { SchedulerService } = await import(
          "@/lib/services/scheduler.service"
        );
        const result = await SchedulerService.processDuePublications();

        return {
          action: "fallback_batch_processing",
          originalData: data,
          result,
        };
      }

      // Individual post processing
      console.log(`📝 Publishing post ${data.postId} to ${data.platform}`);

      // Use the refactored PostPublisherService for specific post publishing
      if (data.socialAccountId) {
        // Publish to specific platform
        const result = await PostPublisherService.publishToSocialMedia(
          data.postId,
          data.socialAccountId
        );

        return {
          postId: data.postId,
          platform: data.platform,
          socialAccountId: data.socialAccountId,
          status: result.success ? "published" : "failed",
          result,
        };
      } else {
        // Publish to all platforms for this post
        const results = await PostPublisherService.publishToAllPlatforms(
          data.postId
        );
        const successCount = results.filter((r) => r.success).length;

        return {
          postId: data.postId,
          platform: data.platform,
          status: successCount > 0 ? "published" : "failed",
          results,
          successCount,
          totalCount: results.length,
        };
      }
    } catch (error) {
      console.error(`❌ Failed to process publish job:`, error);
      throw error;
    }
  }

  /**
   * Process approval job
   */
  private static async processApproval(
    data: ProcessApprovalJobData
  ): Promise<any> {
    console.log(`📋 Processing approval for post ${data.postId}`);

    try {
      // Use existing approval system logic
      const result = await SchedulerService.processApprovalEdgeCases();

      return {
        postId: data.postId,
        action: data.action,
        approverUserId: data.approverUserId,
        result,
      };
    } catch (error) {
      console.error(
        `❌ Failed to process approval for post ${data.postId}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Process expired tokens check
   */
  private static async processCheckExpiredTokens(
    data: CheckExpiredTokensJobData
  ): Promise<any> {
    console.log(`🔐 Checking expired tokens`);

    try {
      // Use both the old method and new token validation
      const schedulerResult = await SchedulerService.checkExpiredTokens();
      const validationResult = await PostPublisherService.validateAllTokens();

      return {
        userId: data.userId,
        platform: data.platform,
        schedulerResult,
        validationResult,
        summary: {
          totalAccounts: validationResult.total,
          validTokens: validationResult.valid,
          invalidTokens: validationResult.invalid,
          expiredFromScheduler: schedulerResult,
        },
      };
    } catch (error) {
      console.error(`❌ Failed to check expired tokens:`, error);
      throw error;
    }
  }

  /**
   * Process system health check
   */
  private static async processSystemHealthCheck(
    data: SystemHealthCheckJobData
  ): Promise<any> {
    console.log(`🏥 Running system health check (${data.checkType})`);

    try {
      const result = await SchedulerService.getApprovalSystemHealth();

      // If health score is below threshold, trigger alerts
      if (data.alertThreshold && result.healthScore < data.alertThreshold) {
        console.warn(
          `⚠️  System health below threshold: ${result.healthScore}/${data.alertThreshold}`
        );
        // Here you could trigger notification jobs for alerts
      }

      return {
        checkType: data.checkType,
        healthScore: result.healthScore,
        result,
      };
    } catch (error) {
      console.error(`❌ Failed to run system health check:`, error);
      throw error;
    }
  }

  /**
   * Process cleanup old logs
   */
  private static async processCleanupOldLogs(
    data: CleanupOldLogsJobData
  ): Promise<any> {
    console.log(`🧹 Cleaning up logs older than ${data.olderThanDays} days`);

    try {
      // Import prisma here to avoid circular dependencies
      const { prisma } = await import("@/lib/prisma/client");

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - data.olderThanDays);

      const deleteResult = await prisma.cronLog.deleteMany({
        where: {
          executedAt: {
            lt: cutoffDate,
          },
        },
      });

      return {
        deletedCount: deleteResult.count,
        cutoffDate,
        logType: data.logType || "all",
      };
    } catch (error) {
      console.error(`❌ Failed to cleanup old logs:`, error);
      throw error;
    }
  }

  /**
   * Process send notification
   */
  private static async processSendNotification(
    data: SendNotificationJobData
  ): Promise<any> {
    console.log(`📧 Sending ${data.type} notification to user ${data.userId}`);

    try {
      // Placeholder for notification service
      // You can implement your notification logic here

      return {
        userId: data.userId,
        type: data.type,
        template: data.template,
        priority: data.priority,
        status: "sent",
        message: "Notification sent successfully (placeholder)",
      };
    } catch (error) {
      console.error(`❌ Failed to send notification:`, error);
      throw error;
    }
  }

  /**
   * Process webhook
   */
  private static async processWebhook(
    data: ProcessWebhookJobData
  ): Promise<any> {
    console.log(`🔗 Processing webhook from ${data.platform}`);

    try {
      // Placeholder for webhook processing logic
      // You can implement platform-specific webhook handling here

      return {
        platform: data.platform,
        timestamp: data.timestamp,
        status: "processed",
        message: "Webhook processed successfully (placeholder)",
      };
    } catch (error) {
      console.error(`❌ Failed to process webhook:`, error);
      throw error;
    }
  }

  /**
   * Process generate report
   */
  private static async processGenerateReport(
    data: GenerateReportJobData
  ): Promise<any> {
    console.log(
      `📊 Generating ${data.reportType} report for user ${data.userId}`
    );

    try {
      // Placeholder for report generation logic
      // You can implement your reporting logic here

      return {
        userId: data.userId,
        reportType: data.reportType,
        format: data.format,
        dateRange: data.dateRange,
        status: "generated",
        message: "Report generated successfully (placeholder)",
      };
    } catch (error) {
      console.error(`❌ Failed to generate report:`, error);
      throw error;
    }
  }

  /**
   * Process social media sync
   */
  private static async processSocialMediaSync(
    data: SocialMediaSyncJobData
  ): Promise<any> {
    console.log(
      `🔄 Syncing ${data.syncType} for ${data.platform} (user: ${data.userId})`
    );

    try {
      // Placeholder for social media sync logic
      // You can implement platform-specific sync logic here

      return {
        userId: data.userId,
        platform: data.platform,
        syncType: data.syncType,
        lastSyncAt: new Date(),
        status: "synced",
        message: "Social media sync completed successfully (placeholder)",
      };
    } catch (error) {
      console.error(`❌ Failed to sync social media:`, error);
      throw error;
    }
  }
}
