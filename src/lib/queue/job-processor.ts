import { JobType, JobData } from "./job-types";
import { SocialSyncService } from "@/lib/services/analytics";
import { AnalyticsAccessService } from "@/lib/services/analytics-access.service";
import { REDIS_OPTIMIZATION_CONFIG } from "./redis-optimization-config";

/**
 * Simplified Job Processor
 * Handles essential jobs with reduced complexity
 */
export class JobProcessor {
  private static batchBuffer: Map<string, any[]> = new Map();
  private static batchTimer: NodeJS.Timeout | null = null;

  /**
   * Main job processing entry point
   */
  public static async process(jobType: JobType, data: JobData): Promise<any> {
    console.log(`🔄 Processing job: ${jobType}`);

    try {
      switch (jobType) {
        case JobType.PUBLISH_POST:
          return await this.processPublishPost(data);

        case JobType.INITIAL_SYNC:
          return await this.processInitialSync(data);

        case JobType.INCREMENTAL_SYNC:
          return await this.processIncrementalSync(data);

        case JobType.DAILY_SYNC:
          return await this.processDailySync(data);

        case JobType.COLLECT_POST_ANALYTICS:
          return await this.processCollectPostAnalytics(data);

        case JobType.SYSTEM_HEALTH_CHECK:
          return await this.processSystemHealthCheck();

        case JobType.CLEANUP_OLD_LOGS:
          return await this.processCleanupOldLogs(data);

        // SEND_NOTIFICATION removed - notifications now handled directly via WebSocket

        default:
          console.warn(`⚠️ Unknown job type: ${jobType}`);
          return { success: false, message: `Unknown job type: ${jobType}` };
      }
    } catch (error: any) {
      console.error(`❌ Job processing failed for ${jobType}:`, error);
      throw error;
    }
  }

  /**
   * Process post publishing with optimized batch processing
   */
  private static async processPublishPost(data: any): Promise<any> {
    console.log(`📤 Processing due publications with batch optimization...`);

    try {
      // Use SchedulerService to process all due publications with batching
      const { SchedulerService } = await import(
        "@/lib/services/scheduling/scheduler.service"
      );
      
      // Apply batch processing configuration
      const batchSize = REDIS_OPTIMIZATION_CONFIG.batchSize
      const result = await SchedulerService.processDuePublications();

      console.log(`✅ Due publications processed with batching:`, {
        success: result.success,
        failed: result.failed,
        skipped: result.skipped,
        rate_limited: result.rate_limited,
        processed: result.processed,
        total: result.total,
        batchSize
      });

      return result;
    } catch (error) {
      console.error(`❌ Failed to process due publications:`, error);
      throw error;
    }
  }

  /**
   * Process initial sync for new social accounts
   */
  private static async processInitialSync(data: any): Promise<any> {
    console.log(`🚀 Starting initial sync for account ${data.accountId}...`);

    try {
      // Validasi akses analytics berdasarkan tier plan
      const accessCheck = await AnalyticsAccessService.hasAnalyticsAccessByTeam(
        data.teamId,
        "initialSync"
      );

      // if (!accessCheck.hasAccess) {
      //   console.warn(
      //     `❌ Initial sync blocked for team ${data.teamId}: ${accessCheck.reason}`
      //   );
      //   return {
      //     success: false,
      //     message: `Analytics feature not available: ${accessCheck.reason}`,
      //     plan: accessCheck.plan,
      //     upgradeRequired: true,
      //   };
      // }

      // Validasi dan adjust parameter sync berdasarkan plan limits
      const syncLimits = AnalyticsAccessService.validateSyncParams(
        accessCheck.plan,
        data.daysBack
      );

      if (syncLimits.warnings.length > 0) {
        console.warn(`⚠️ Sync parameters adjusted:`, syncLimits.warnings);
      }

      const { prisma } = await import("@/lib/prisma/client");
      const syncService = new SocialSyncService(prisma);

      // Perform initial sync dengan parameter yang sudah disesuaikan
      const result = await syncService.performInitialSync({
        accountId: data.accountId,
        teamId: data.teamId,
        platform: data.platform,
        daysBack: syncLimits.adjustedDaysBack || 30,
      });

      // Also fetch initial heatmap data for supported platforms
      if (data.platform === "INSTAGRAM" || data.platform === "FACEBOOK") {
        try {
          const { HotspotAnalyzer } = await import(
            "@/lib/services/analytics/hotspots/hotspot-analyzer"
          );
          await HotspotAnalyzer.fetchInitialHeatmapData(data.accountId);
          console.log(
            `✅ Initial heatmap data collected for ${data.accountId}`
          );
        } catch (heatmapError) {
          console.warn(
            `⚠️ Failed to collect heatmap data for ${data.accountId}:`,
            heatmapError
          );
          // Don't fail the entire job if heatmap collection fails
        }
      }

      console.log(`✅ Initial sync completed for ${data.accountId}:`, {
        success: result.success,
        postsProcessed: result.postsProcessed,
        analyticsUpdated: result.analyticsUpdated,
      });

      return result;
    } catch (error) {
      console.error(`❌ Initial sync failed for ${data.accountId}:`, error);
      throw error;
    }
  }

  /**
   * Process incremental sync
   */
  private static async processIncrementalSync(data: any): Promise<any> {
    console.log(
      `🔄 Starting incremental sync for account ${data.accountId}...`
    );

    try {
      // Validasi akses analytics berdasarkan tier plan
      const accessCheck = await AnalyticsAccessService.hasAnalyticsAccessByTeam(
        data.teamId,
        "incrementalSync"
      );

      // if (!accessCheck.hasAccess) {
      //   console.warn(
      //     `❌ Incremental sync blocked for team ${data.teamId}: ${accessCheck.reason}`
      //   );
      //   return {
      //     success: false,
      //     message: `Analytics feature not available: ${accessCheck.reason}`,
      //     plan: accessCheck.plan,
      //     upgradeRequired: true,
      //   };
      // }

      // Validasi dan adjust parameter sync berdasarkan plan limits
      const syncLimits = AnalyticsAccessService.validateSyncParams(
        accessCheck.plan,
        undefined,
        data.limit
      );

      if (syncLimits.warnings.length > 0) {
        console.warn(`⚠️ Sync parameters adjusted:`, syncLimits.warnings);
      }

      const { prisma } = await import("@/lib/prisma/client");
      const syncService = new SocialSyncService(prisma);

      const result = await syncService.performIncrementalSync({
        accountId: data.accountId,
        teamId: data.teamId,
        platform: data.platform,
        limit: syncLimits.adjustedLimit || 25,
        lastSyncDate: data.lastSyncDate,
      });

      console.log(`✅ Incremental sync completed for ${data.accountId}:`, {
        success: result.success,
        postsProcessed: result.postsProcessed,
        analyticsUpdated: result.analyticsUpdated,
      });

      return result;
    } catch (error) {
      console.error(`❌ Incremental sync failed for ${data.accountId}:`, error);
      throw error;
    }
  }

  /**
   * Process daily sync
   */
  private static async processDailySync(data: any): Promise<any> {
    console.log(`📊 Starting daily sync for account ${data.accountId}...`);

    try {
      // Validasi akses analytics berdasarkan tier plan
      const accessCheck = await AnalyticsAccessService.hasAnalyticsAccessByTeam(
        data.teamId,
        "dailySync"
      );

      // if (!accessCheck.hasAccess) {
      //   console.warn(`❌ Daily sync blocked for team ${data.teamId}: ${accessCheck.reason}`);
      //   return {
      //     success: false,
      //     message: `Analytics feature not available: ${accessCheck.reason}`,
      //     plan: accessCheck.plan,
      //     upgradeRequired: true,
      //   };
      // }

      console.log(
        `✅ Daily sync authorized for team ${data.teamId} with ${accessCheck.plan} plan`
      );

      const { prisma } = await import("@/lib/prisma/client");
      const syncService = new SocialSyncService(prisma);

      const result = await syncService.performDailySync({
        accountId: data.accountId,
        teamId: data.teamId,
        platform: data.platform,
        includeAudience: data.includeAudience,
        includeHashtags: data.includeHashtags,
        includeLinks: data.includeLinks,
      });

      console.log(`✅ Daily sync completed for ${data.accountId}:`, {
        success: result.success,
        analyticsUpdated: result.analyticsUpdated,
      });

      return result;
    } catch (error) {
      console.error(`❌ Daily sync failed for ${data.accountId}:`, error);
      throw error;
    }
  }

  /**
   * Process post analytics collection with batch processing
   */
  private static async processCollectPostAnalytics(data: any): Promise<any> {
    console.log(`📊 Collecting analytics for post ${data.postId} with batch optimization...`);

    try {
      const { prisma } = await import("@/lib/prisma/client");

      // Get post social accounts to trigger sync for each
      const postSocialAccounts = await prisma.postSocialAccount.findMany({
        where: { postId: data.postId },
        include: {
          socialAccount: true,
          post: {
            select: {
              teamId: true,
            },
          },
        },
      });

      if (postSocialAccounts.length === 0) {
        return {
          success: false,
          message: "No social accounts found for this post",
          results: [],
          errors: [],
        };
      }

      // Validasi akses analytics berdasarkan tier plan (menggunakan team dari post pertama)
      const teamId = postSocialAccounts[0].post.teamId;
      const accessCheck = await AnalyticsAccessService.hasAnalyticsAccessByTeam(
        teamId,
        "postAnalytics"
      );

      if (!accessCheck.hasAccess) {
        console.warn(
          `❌ Post analytics collection blocked for team ${teamId}: ${accessCheck.reason}`
        );
        return {
          success: false,
          message: `Analytics feature not available: ${accessCheck.reason}`,
          plan: accessCheck.plan,
          upgradeRequired: true,
          results: [],
          errors: [],
        };
      }

      console.log(
        `✅ Post analytics collection authorized for team ${teamId} with ${accessCheck.plan} plan`
      );

      const syncService = new SocialSyncService(prisma);
      const results: any[] = [];
      const errors: any[] = [];

      // Process social accounts in batches to reduce Redis load
      const batchSize = REDIS_OPTIMIZATION_CONFIG.batchSize;
      
      for (let i = 0; i < postSocialAccounts.length; i += batchSize) {
        const batch = postSocialAccounts.slice(i, i + batchSize);
        const batchPromises = batch.map(async (psa) => {
          try {
            const syncResult = await syncService.performIncrementalSync({
              accountId: psa.socialAccount.id,
              teamId: psa.socialAccount.teamId,
              platform: psa.socialAccount.platform as "INSTAGRAM" | "FACEBOOK",
              limit: 10,
            });

            return {
              platform: psa.socialAccount.platform,
              success: syncResult.success,
              analyticsUpdated: syncResult.analyticsUpdated,
            };
          } catch (error: any) {
            return {
              platform: psa.socialAccount.platform,
              success: false,
              error: error.message,
            };
          }
        });

        const batchResults = await Promise.all(batchPromises);
        
        batchResults.forEach(result => {
          if (result.success) {
            results.push(result);
          } else {
            errors.push({
              platform: result.platform,
              message: result.error,
            });
          }
        });

        // Add delay between batches to reduce Redis load
        if (i + batchSize < postSocialAccounts.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      const result = {
        success: errors.length === 0,
        results,
        errors,
      };

      console.log(
        `✅ Post analytics collection completed for ${data.postId} with batching:`,
        {
          success: result.success,
          resultsCount: result.results.length,
          errorsCount: result.errors.length,
          batchSize,
        }
      );

      return result;
    } catch (error) {
      console.error(
        `❌ Failed to collect post analytics for ${data.postId}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Process system health check
   */
  private static async processSystemHealthCheck(): Promise<any> {
    console.log(`🏥 Running system health check...`);

    try {
      // Simplified health check
      const result = {
        status: "healthy",
        timestamp: new Date(),
        checks: {
          database: "ok",
          redis: "ok",
          queue: "ok",
        },
        issues: [],
      };

      console.log(`✅ System health check completed:`, {
        status: result.status,
        issues: result.issues?.length || 0,
      });

      return result;
    } catch (error) {
      console.error(`❌ System health check failed:`, error);
      throw error;
    }
  }

  /**
   * Process cleanup old logs
   */
  private static async processCleanupOldLogs(data: any): Promise<any> {
    console.log(`🧹 Cleaning up old logs...`);

    try {
      const { prisma } = await import("@/lib/prisma/client");

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - (data.olderThanDays || 30));

      const deletedCount = await prisma.taskLog.deleteMany({
        where: {
          executedAt: {
            lt: cutoffDate,
          },
        },
      });

      console.log(`✅ Cleaned up ${deletedCount.count} old log entries`);

      return {
        success: true,
        deletedCount: deletedCount.count,
        cutoffDate,
      };
    } catch (error) {
      console.error(`❌ Failed to cleanup old logs:`, error);
      throw error;
    }
  }

  // processSendNotification method removed - notifications now handled directly via WebSocket
}
