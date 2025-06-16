import { JobType, JobData } from "./job-types";
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
  CollectPostsAnalyticsJobData,
  AnalyzeHotspotsJobData,
} from "./job-types";

export class JobProcessor {
  /**
   * Process job based on type
   */
  public static async process(jobType: JobType, data: JobData): Promise<any> {
    switch (jobType) {
      case JobType.PUBLISH_POST:
        return await this.processPublishDuePosts();

      case JobType.PROCESS_APPROVAL:
        return await this.processApprovalEdgeCases();

      case JobType.CHECK_EXPIRED_TOKENS:
        return await this.processCheckExpiredTokens(
          data as CheckExpiredTokensJobData
        );

      case JobType.SYSTEM_HEALTH_CHECK:
        return await this.processSystemHealthCheck();

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
        return await this.processCollectPostsAnalytics();

      case JobType.ANALYZE_HOTSPOTS:
        return await this.processAnalyzeHotspots();

      case JobType.ANALYZE_ACCOUNT_INSIGHTS:
        return await this.processAnalyzeAccountInsights();

      default:
        throw new Error(`Unknown job type: ${jobType}`);
    }
  }

  /**
   * Process publish post job
   */
  private static async processPublishDuePosts(): Promise<any> {
    console.log(`📋 Processing due posts publication...`);

    try {
      // Use dynamic import to avoid circular dependencies
      const { SchedulerService } = await import(
        "@/lib/services/scheduler.service"
      );
      const result = await SchedulerService.processDuePublications();

      console.log(`✅ Due posts processing completed:`, result);
      return result;
    } catch (error) {
      console.error(`❌ Failed to process due posts:`, error);
      throw error;
    }
  }

  /**
   * Process approval job
   */
  private static async processApprovalEdgeCases(): Promise<any> {
    console.log(`📋 Processing approval edge cases...`);

    try {
      // Use dynamic import to avoid circular dependencies
      const { SchedulerService } = await import(
        "@/lib/services/scheduler.service"
      );
      const result = await SchedulerService.processApprovalEdgeCases();

      console.log(`✅ Approval edge cases processing completed:`, result);
      return result;
    } catch (error) {
      console.error(`❌ Failed to process approval edge cases:`, error);
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
      // Use dynamic imports to avoid circular dependencies
      const { SchedulerService } = await import(
        "@/lib/services/scheduler.service"
      );
      const { PostPublisherService } = await import(
        "@/lib/services/post-publisher"
      );

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
  private static async processSystemHealthCheck(): Promise<any> {
    console.log(`🏥 Running system health check...`);

    try {
      // Use dynamic import to avoid circular dependencies
      const { SchedulerService } = await import(
        "@/lib/services/scheduler.service"
      );
      const result = await SchedulerService.getApprovalSystemHealth();

      console.log(`✅ System health check completed:`, result);
      return result;
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

      const deleteResult = await prisma.taskLog.deleteMany({
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

  private static async processAnalyzeHotspots(): Promise<any> {
    console.log(`📊 Running hotspot analysis for all accounts...`);

    try {
      // Use dynamic import to avoid circular dependencies
      const { SchedulerService } = await import(
        "@/lib/services/scheduler.service"
      );
      const result = await SchedulerService.runHotspotAnalysisForAllAccounts();

      console.log(`✅ Hotspot analysis completed:`, result);
      return result;
    } catch (error) {
      console.error(`❌ Failed to run hotspot analysis:`, error);
      throw error;
    }
  }

  private static async processCollectPostsAnalytics(): Promise<any> {
    console.log(`📈 Collecting posts analytics...`);

    try {
      // Use dynamic imports to avoid circular dependencies
      const { prisma } = await import("@/lib/prisma/client");
      const { RealSocialAnalyticsService } = await import(
        "@/lib/services/social-analytics/real-analytics-service"
      );

      const realAnalyticsService = new RealSocialAnalyticsService(prisma);
      const result = await realAnalyticsService.scheduleAnalyticsCollection();

      console.log(`✅ Posts analytics collection completed:`, result);
      return result;
    } catch (error) {
      console.error(`❌ Failed to collect posts analytics:`, error);
      throw error;
    }
  }

  private static async processAnalyzeAccountInsights(): Promise<any> {
    console.log(`📊 Running account insights analysis for all accounts...`);

    try {
      // Use dynamic import to avoid circular dependencies
      const { SchedulerService } = await import(
        "@/lib/services/scheduler.service"
      );
      const result = await SchedulerService.runAccountInsightsForAllAccounts();

      console.log(`✅ Account insights analysis completed:`, result);
      return result;
    } catch (error) {
      console.error(`❌ Failed to run account insights analysis:`, error);
      throw error;
    }
  }
}
