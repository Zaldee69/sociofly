import { prisma } from "@/lib/prisma/client";
import axios from "axios";
import { PostPublisherService } from "./post-publisher";
import {
  PostStatus,
  ApprovalStatus,
  PostSocialAccount,
  PostAnalytics,
} from "@prisma/client";
// import { ApprovalEdgeCaseHandler } from "./approval-edge-case-handler"; // Removed to fix circular dependency
import { subDays, startOfDay } from "date-fns";

interface HeatmapCell {
  totalScore: number;
  count: number;
}

type Heatmap = Map<number, Map<number, HeatmapCell>>;

// Format dates properly for Instagram API (YYYY-MM-DD format)
const formatDateForAPI = (date: Date): string => {
  return date.toISOString().split("T")[0];
};

export class SchedulerService {
  /**
   * Checks for and publishes all posts that are due to be published
   * This should be called by a cron job on a regular interval (every 1 minute)
   * Optimized for performance with batching and parallel processing
   */
  static async processDuePublications(): Promise<{
    success: number;
    failed: number;
    skipped: number;
    rate_limited: number;
    processed: number;
    total: number;
  }> {
    try {
      // Get current time
      const now = new Date();

      // Limit processing to prevent overwhelming the system
      // Reduced batch size to prevent Instagram API rate limiting
      const BATCH_SIZE = parseInt(process.env.CRON_BATCH_SIZE || "3");

      // First, count total due posts for reporting
      const totalDue = await prisma.post.count({
        where: {
          status: PostStatus.SCHEDULED,
          scheduledAt: {
            lte: now,
          },
        },
      });

      if (totalDue === 0) {
        return {
          success: 0,
          failed: 0,
          skipped: 0,
          rate_limited: 0,
          processed: 0,
          total: 0,
        };
      }

      // Find scheduled posts that are due (with limit for performance)
      // Exclude posts that recently failed due to rate limits
      const duePosts = await prisma.post.findMany({
        where: {
          status: PostStatus.SCHEDULED,
          scheduledAt: {
            lte: now, // Less than or equal to now
          },
          // Skip posts that failed due to rate limits in the last 10 minutes
          NOT: {
            AND: [
              { status: PostStatus.FAILED },
              {
                updatedAt: {
                  gte: new Date(Date.now() - 10 * 60 * 1000), // 10 minutes ago
                },
              },
            ],
          },
        },
        include: {
          postSocialAccounts: {
            select: {
              socialAccountId: true,
              status: true,
            },
          },
          approvalInstances: {
            select: {
              status: true,
            },
          },
        },
        orderBy: {
          scheduledAt: "asc", // Process oldest first
        },
        take: BATCH_SIZE, // Limit to prevent overwhelming system
      });

      console.log(
        `📋 Processing ${duePosts.length} of ${totalDue} due posts (batch size: ${BATCH_SIZE})`
      );

      // Track results
      let successCount = 0;
      let failedCount = 0;
      let skippedCount = 0;
      let rateLimitedCount = 0;

      // Use Promise.allSettled for parallel processing with error isolation
      // But add sequential delays to prevent API overload
      const postPromises = duePosts.map(async (post, index) => {
        try {
          // Add staggered delay to prevent all posts hitting API simultaneously
          if (index > 0) {
            await new Promise((resolve) => setTimeout(resolve, index * 1000)); // 1s delay per post
          }

          // Check if post needs approval
          const hasApprovalInstances = post.approvalInstances.length > 0;
          const isApproved = post.approvalInstances.some(
            (instance) => instance.status === ApprovalStatus.APPROVED
          );

          if (hasApprovalInstances && !isApproved) {
            console.log(`⏩ Skipping post ${post.id} - awaiting approval`);
            return {
              status: "skipped",
              postId: post.id,
              reason: "awaiting approval",
            };
          }

          // Publish the post
          const publishResult =
            await PostPublisherService.publishToAllPlatforms(post.id);

          // Check if all publications were successful
          const allSuccessful = publishResult.every((result) => result.success);

          if (allSuccessful) {
            console.log(`✅ Successfully published post ${post.id}`);
            return { status: "success", postId: post.id };
          } else {
            const errorMessage = publishResult
              .filter((r) => !r.success)
              .map((r) => r.error)
              .join(", ");

            // Check if this is a rate limit error
            const isRateLimitError =
              errorMessage.toLowerCase().includes("rate limit") ||
              errorMessage.toLowerCase().includes("request limit reached");

            if (isRateLimitError) {
              console.error(
                `🚨 Rate limit hit for post ${post.id}: ${errorMessage}`
              );
              return {
                status: "rate_limited",
                postId: post.id,
                error: errorMessage,
              };
            }

            console.error(
              `❌ Failed to publish post ${post.id}: ${errorMessage}`
            );
            return { status: "failed", postId: post.id, error: errorMessage };
          }
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          console.error(`❌ Error processing post ${post.id}:`, errorMessage);
          return { status: "failed", postId: post.id, error: errorMessage };
        }
      });

      // Wait for all posts to be processed
      const postResults = await Promise.allSettled(postPromises);

      // Count results
      postResults.forEach((result) => {
        if (result.status === "fulfilled") {
          switch (result.value.status) {
            case "success":
              successCount++;
              break;
            case "failed":
              failedCount++;
              break;
            case "skipped":
              skippedCount++;
              break;
            case "rate_limited":
              rateLimitedCount++;
              break;
          }
        } else {
          failedCount++; // Promise was rejected
        }
      });

      // Single batch log entry instead of individual logs (reduces DB writes significantly)
      if (duePosts.length > 0) {
        const batchData = {
          processed: duePosts.length,
          success: successCount,
          failed: failedCount,
          skipped: skippedCount,
          rate_limited: rateLimitedCount,
          total: totalDue,
          remaining: totalDue - duePosts.length,
          batchSize: BATCH_SIZE,
        };

        const logData = {
          name: "publish_due_posts_batch",
          status:
            failedCount > 0
              ? successCount > 0
                ? "PARTIAL"
                : "FAILED"
              : "SUCCESS",
          message: `Batch processed ${duePosts.length} posts: ${successCount} success, ${failedCount} failed, ${skippedCount} skipped, ${rateLimitedCount} rate_limited. ${totalDue - duePosts.length} remaining. Data: ${JSON.stringify(batchData)}`,
        };

        await prisma.cronLog.create({ data: logData });
      }

      return {
        success: successCount,
        failed: failedCount,
        skipped: skippedCount,
        rate_limited: rateLimitedCount,
        processed: duePosts.length,
        total: totalDue,
      };
    } catch (error) {
      console.error("❌ Error in processDuePublications:", error);

      // Log the overall error
      await prisma.cronLog.create({
        data: {
          name: "publish_due_posts_error",
          status: "ERROR",
          message: `Overall error in processDuePublications: ${
            error instanceof Error ? error.message : String(error)
          }`,
        },
      });

      return {
        success: 0,
        failed: 0,
        skipped: 0,
        rate_limited: 0,
        processed: 0,
        total: 0,
      };
    }
  }

  /**
   * Checks for social accounts with expired tokens and marks them as needing reauthorization
   * This should be called by a cron job on a daily basis
   */
  static async checkExpiredTokens(): Promise<number> {
    try {
      const now = new Date();

      // Find accounts with expired tokens
      const expiredAccounts = await prisma.socialAccount.findMany({
        where: {
          expiresAt: {
            lte: now,
          },
        },
      });

      console.log(
        `Found ${expiredAccounts.length} accounts with expired tokens`
      );

      // Here you would implement logic to:
      // 1. Try to refresh tokens if refreshToken is available
      // 2. Mark accounts as needing reauthorization if refresh fails or no refreshToken

      // For now, we'll just log it
      if (expiredAccounts.length > 0) {
        await prisma.cronLog.create({
          data: {
            name: "check_expired_tokens",
            status: "INFO",
            message: `Found ${expiredAccounts.length} accounts with expired tokens`,
          },
        });
      }

      return expiredAccounts.length;
    } catch (error) {
      console.error("Error checking expired tokens:", error);

      await prisma.cronLog.create({
        data: {
          name: "check_expired_tokens",
          status: "ERROR",
          message: `Error checking expired tokens: ${
            error instanceof Error ? error.message : String(error)
          }`,
        },
      });

      return 0;
    }
  }

  /**
   * Process all approval edge cases
   * This should be called by a cron job every hour to handle various edge cases
   */
  static async processApprovalEdgeCases(): Promise<{
    totalIssues: number;
    reports: any[];
  }> {
    try {
      console.log("Starting approval edge case processing...");

      // Temporarily disabled to fix circular dependency
      // TODO: Implement edge case processing without circular dependency
      const reports: any[] = [];
      const totalIssues = 0;

      // Log the results
      await prisma.cronLog.create({
        data: {
          name: "process_approval_edge_cases",
          status: "SUCCESS",
          message: `Edge case processing temporarily disabled - ${totalIssues} issues processed`,
        },
      });

      console.log(
        `Completed edge case processing. Total issues handled: ${totalIssues}`
      );

      return {
        totalIssues,
        reports,
      };
    } catch (error) {
      console.error("Error in processApprovalEdgeCases:", error);

      await prisma.cronLog.create({
        data: {
          name: "process_approval_edge_cases",
          status: "ERROR",
          message: `Error processing approval edge cases: ${
            error instanceof Error ? error.message : String(error)
          }`,
        },
      });

      return {
        totalIssues: 0,
        reports: [],
      };
    }
  }

  /**
   * Get health statistics for the approval system
   */
  static async getApprovalSystemHealth(): Promise<{
    pendingApprovals: number;
    overduePosts: number;
    stuckApprovals: number;
    expiredTokens: number;
    healthScore: number;
  }> {
    try {
      const now = new Date();

      // Count pending approvals
      const pendingApprovals = await prisma.approvalAssignment.count({
        where: {
          status: ApprovalStatus.PENDING,
        },
      });

      // Count overdue posts (scheduled time passed but still in approval)
      const overduePosts = await prisma.post.count({
        where: {
          status: PostStatus.DRAFT,
          scheduledAt: {
            lt: now,
          },
          approvalInstances: {
            some: {
              status: ApprovalStatus.IN_PROGRESS,
            },
          },
        },
      });

      // Count stuck approvals (more than 48 hours old)
      const stuckThreshold = new Date(now.getTime() - 48 * 60 * 60 * 1000);
      const stuckApprovals = await prisma.approvalInstance.count({
        where: {
          status: ApprovalStatus.IN_PROGRESS,
          createdAt: {
            lt: stuckThreshold,
          },
          assignments: {
            every: {
              status: ApprovalStatus.PENDING,
              completedAt: null,
            },
          },
        },
      });

      // Count expired tokens
      const expiredTokens = await prisma.socialAccount.count({
        where: {
          expiresAt: {
            lte: now,
          },
        },
      });

      // Calculate health score (0-100)
      // Lower scores indicate more issues
      let healthScore = 100;

      // Deduct points for issues
      healthScore -= Math.min(overduePosts * 10, 50); // Max 50 points deduction
      healthScore -= Math.min(stuckApprovals * 15, 30); // Max 30 points deduction
      healthScore -= Math.min(expiredTokens * 5, 20); // Max 20 points deduction

      // Ensure health score doesn't go below 0
      healthScore = Math.max(healthScore, 0);

      return {
        pendingApprovals,
        overduePosts,
        stuckApprovals,
        expiredTokens,
        healthScore,
      };
    } catch (error) {
      console.error("Error getting approval system health:", error);
      return {
        pendingApprovals: 0,
        overduePosts: 0,
        stuckApprovals: 0,
        expiredTokens: 0,
        healthScore: 0,
      };
    }
  }

  /**
   * Analyzes historical post data to identify optimal posting times
   * This should be called by a cron job every 24 hours
   */
  static async analyzeAndStoreHotspots(socialAccountId: string): Promise<void> {
    const startTime = Date.now();

    try {
      // First, get the social account to verify it exists and get its teamId
      const socialAccount = await prisma.socialAccount.findUnique({
        where: { id: socialAccountId },
        select: { teamId: true, name: true, platform: true },
      });

      if (!socialAccount) {
        console.error(`Social account ${socialAccountId} not found`);
        await prisma.cronLog.create({
          data: {
            name: "smart_scheduler_analysis",
            status: "ERROR",
            executedAt: new Date(),
            message: `Social account ${socialAccountId} not found`,
          },
        });
        return;
      }

      // Get posts from the last 90 days with their analytics
      const startDate = subDays(startOfDay(new Date()), 90);
      const posts = await prisma.postSocialAccount.findMany({
        where: {
          socialAccountId,
          publishedAt: {
            gte: startDate,
          },
          status: "PUBLISHED",
        },
        include: {
          analytics: true,
        },
      });

      // Initialize heatmap for each day of week and hour
      const heatmap: Heatmap = new Map();
      for (let day = 0; day < 7; day++) {
        heatmap.set(day, new Map());
        for (let hour = 0; hour < 24; hour++) {
          heatmap.get(day)!.set(hour, { totalScore: 0, count: 0 });
        }
      }

      // Process each post
      posts.forEach(
        (post: PostSocialAccount & { analytics: PostAnalytics[] }) => {
          if (!post.publishedAt || !post.analytics.length) return;

          const publishDate = new Date(post.publishedAt);
          const dayOfWeek = publishDate.getUTCDay(); // 0 = Sunday
          const hourOfDay = publishDate.getUTCHours();

          // Get the most recent analytics for this post
          const latestAnalytics = post.analytics.reduce(
            (latest: PostAnalytics | null, current: PostAnalytics) => {
              return !latest || current.recordedAt > latest.recordedAt
                ? current
                : latest;
            },
            null
          );

          if (!latestAnalytics) return;

          // Calculate engagement score (weighted average of different metrics)
          const engagementScore =
            this.calculateEngagementScore(latestAnalytics);

          // Update heatmap
          const cell = heatmap.get(dayOfWeek)!.get(hourOfDay)!;
          cell.totalScore += engagementScore;
          cell.count += 1;
        }
      );

      // Convert heatmap to hotspots and store in database
      const hotspots = [];
      for (const [dayOfWeek, hours] of heatmap.entries()) {
        for (const [hourOfDay, data] of hours.entries()) {
          const score = data.count > 0 ? data.totalScore / data.count : 0;
          hotspots.push({
            teamId: socialAccount.teamId,
            socialAccountId,
            dayOfWeek,
            hourOfDay,
            score: this.normalizeScore(score),
            updatedAt: new Date(),
          });
        }
      }

      // Use transaction to update all hotspots atomically
      // First delete existing hotspots for this account, then create new ones
      await prisma.$transaction([
        prisma.engagementHotspot.deleteMany({
          where: {
            socialAccountId,
          },
        }),
        prisma.engagementHotspot.createMany({
          data: hotspots,
        }),
      ]);

      const executionTime = Date.now() - startTime;

      // Log success with more detailed information
      await prisma.cronLog.create({
        data: {
          name: "smart_scheduler_analysis",
          status: "SUCCESS",
          executedAt: new Date(),
          message: JSON.stringify({
            accountId: socialAccountId,
            accountName: socialAccount.name,
            platform: socialAccount.platform,
            analyzedPosts: posts.length,
            daysAnalyzed: 90,
            hotspotsGenerated: hotspots.length,
            executionTimeMs: executionTime,
          }),
        },
      });
    } catch (error) {
      const executionTime = Date.now() - startTime;

      console.error("Error analyzing hotspots:", error);

      // Log error with execution details
      await prisma.cronLog.create({
        data: {
          name: "smart_scheduler_analysis",
          status: "ERROR",
          executedAt: new Date(),
          message: JSON.stringify({
            accountId: socialAccountId,
            error: error instanceof Error ? error.message : String(error),
            executionTimeMs: executionTime,
          }),
        },
      });

      throw error;
    }
  }

  /**
   * Calculates engagement score based on various metrics
   */
  private static calculateEngagementScore(analytics: PostAnalytics): number {
    const { engagement, likes, comments, shares, clicks, reach, impressions } =
      analytics;

    // Base score is the engagement rate
    let score = engagement * 100;

    // Add weighted contributions from other metrics
    if (reach > 0) {
      score += ((likes + comments * 2 + shares * 3) / reach) * 100;
    }

    if (impressions > 0) {
      score += (clicks / impressions) * 100;
    }

    return score;
  }

  /**
   * Normalizes score to 0-100 range
   */
  private static normalizeScore(score: number): number {
    // Normalize score to 0-100 range
    const MIN_SCORE = 0;
    const MAX_SCORE = 200; // Assuming max possible score from calculateEngagementScore

    return Math.min(
      100,
      Math.max(0, ((score - MIN_SCORE) / (MAX_SCORE - MIN_SCORE)) * 100)
    );
  }

  /**
   * Runs hotspot analysis for all active social accounts
   * This should be called by a cron job every 24 hours
   */
  static async runHotspotAnalysisForAllAccounts(): Promise<{
    success: number;
    failed: number;
    total: number;
    executionTimeMs: number;
  }> {
    const startTime = Date.now();
    let successCount = 0;
    let failedCount = 0;

    try {
      // Get all social accounts
      const socialAccounts = await prisma.socialAccount.findMany({
        select: {
          id: true,
          name: true,
          platform: true,
          teamId: true,
        },
      });

      console.log(
        `📊 Starting hotspot analysis for ${socialAccounts.length} accounts`
      );

      // Process accounts in parallel with a limit
      const BATCH_SIZE = parseInt(process.env.ANALYSIS_BATCH_SIZE || "3");
      const results = [];

      // Process in batches to avoid overwhelming the system
      for (let i = 0; i < socialAccounts.length; i += BATCH_SIZE) {
        const batch = socialAccounts.slice(i, i + BATCH_SIZE);
        const batchResults = await Promise.allSettled(
          batch.map(async (account) => {
            try {
              await this.analyzeAndStoreHotspots(account.id);
              return { status: "success", accountId: account.id };
            } catch (error) {
              return {
                status: "error",
                accountId: account.id,
                error: error instanceof Error ? error.message : String(error),
              };
            }
          })
        );

        results.push(...batchResults);

        // Add a small delay between batches to prevent rate limiting
        if (i + BATCH_SIZE < socialAccounts.length) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }

      // Count results
      results.forEach((result) => {
        if (
          result.status === "fulfilled" &&
          result.value.status === "success"
        ) {
          successCount++;
        } else {
          failedCount++;
        }
      });

      const executionTime = Date.now() - startTime;

      // Log overall results
      await prisma.cronLog.create({
        data: {
          name: "smart_scheduler_batch_analysis",
          status: failedCount === 0 ? "SUCCESS" : "PARTIAL",
          executedAt: new Date(),
          message: JSON.stringify({
            totalAccounts: socialAccounts.length,
            successfulAnalyses: successCount,
            failedAnalyses: failedCount,
            executionTimeMs: executionTime,
            batchSize: BATCH_SIZE,
            results: results.map((r) =>
              r.status === "fulfilled"
                ? r.value
                : {
                    status: "error",
                    error:
                      r.reason instanceof Error
                        ? r.reason.message
                        : String(r.reason),
                  }
            ),
          }),
        },
      });

      return {
        success: successCount,
        failed: failedCount,
        total: socialAccounts.length,
        executionTimeMs: executionTime,
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;

      console.error("❌ Error in batch hotspot analysis:", error);

      // Log the overall error
      await prisma.cronLog.create({
        data: {
          name: "smart_scheduler_batch_analysis",
          status: "ERROR",
          executedAt: new Date(),
          message: JSON.stringify({
            error: error instanceof Error ? error.message : String(error),
            successfulAnalyses: successCount,
            failedAnalyses: failedCount,
            executionTimeMs: executionTime,
          }),
        },
      });

      return {
        success: successCount,
        failed: failedCount,
        total: 0,
        executionTimeMs: executionTime,
      };
    }
  }

  /**
   * Fetch and store account-level insights (followers, media count) for all social accounts.
   * Should be called by a cron job daily.
   */
  static async runAccountInsightsForAllAccounts(): Promise<{
    total: number;
    success: number;
    failed: number;
  }> {
    console.log("🚀 Starting account insights collection for all accounts...");

    // Fetch all social accounts with credentials
    const accounts = await prisma.socialAccount.findMany({
      select: {
        id: true,
        accessToken: true,
        profileId: true,
        platform: true,
      },
    });

    console.log(`📊 Found ${accounts.length} social accounts to process`);

    let success = 0;
    let failed = 0;

    for (const account of accounts) {
      try {
        const { id, accessToken, profileId, platform } = account;
        console.log(`📈 Processing account: ${platform} (${id})`);

        if (!accessToken || !profileId) {
          throw new Error("Missing credentials");
        }

        // --- IMPROVED DATE RANGE LOGIC (Same as fetchInitialAccountInsights) ---
        const yesterday = subDays(new Date(), 1);
        yesterday.setHours(23, 59, 59, 999);

        // Current period: Last 29 days ending yesterday (Instagram API limitation)
        const currentPeriodStart = subDays(yesterday, 28); // 29 days total including yesterday
        currentPeriodStart.setHours(0, 0, 0, 0);

        // Previous period: 29 days before the current period
        const previousPeriodEnd = subDays(currentPeriodStart, 1);
        previousPeriodEnd.setHours(23, 59, 59, 999);
        const previousPeriodStart = subDays(previousPeriodEnd, 28); // 29 days total
        previousPeriodStart.setHours(0, 0, 0, 0);

        // Initialize current and previous data
        let currentData = {
          followersCount: 0,
          mediaCount: 0,
          engagementRate: 0,
          avgReachPerPost: 0,
        };

        let previousData = {
          followersCount: 0,
          mediaCount: 0,
          engagementRate: 0,
          avgReachPerPost: 0,
        };

        let followerGrowth: Array<{ date: Date; value: number }> = [];
        let currentPeriodPosts: any[] = [];

        if (platform === "INSTAGRAM") {
          console.log(
            `📱 Fetching Instagram insights for profileId: ${profileId}`
          );
          console.log(
            `📅 Date range: ${formatDateForAPI(currentPeriodStart)} to ${formatDateForAPI(yesterday)} (29 days)`
          );

          // Get current basic account info
          const basicResp = await axios.get(
            `https://graph.facebook.com/v22.0/${profileId}`,
            {
              params: {
                fields: "followers_count,media_count",
                access_token: accessToken,
              },
            }
          );

          // Get current period media posts
          const currentMediaResp = await axios.get(
            `https://graph.facebook.com/v22.0/${profileId}/media`,
            {
              params: {
                fields: "id,like_count,comments_count,timestamp",
                limit: 50,
                access_token: accessToken,
              },
            }
          );

          // Get current period insights
          const currentInsightsResp = await axios.get(
            `https://graph.facebook.com/v22.0/${profileId}/insights`,
            {
              params: {
                metric: "reach,follower_count",
                period: "day",
                since: formatDateForAPI(currentPeriodStart),
                until: formatDateForAPI(yesterday),
                access_token: accessToken,
              },
            }
          );

          // Get previous period insights (if available)
          let previousInsightsData: any[] = [];
          const twentyNineDaysAgo = subDays(new Date(), 29);
          if (previousPeriodStart >= twentyNineDaysAgo) {
            try {
              const previousInsightsResp = await axios.get(
                `https://graph.facebook.com/v22.0/${profileId}/insights`,
                {
                  params: {
                    metric: "reach,follower_count",
                    period: "day",
                    since: formatDateForAPI(previousPeriodStart),
                    until: formatDateForAPI(previousPeriodEnd),
                    access_token: accessToken,
                  },
                }
              );
              previousInsightsData = previousInsightsResp.data.data || [];
            } catch (prevError) {
              console.warn(
                `⚠️ Could not fetch previous period insights for ${id}, will estimate:`,
                prevError
              );
            }
          }

          const basicData = basicResp.data;
          const currentMediaData = currentMediaResp.data.data || [];
          const currentInsightsData = currentInsightsResp.data.data || [];

          // Filter posts for current period
          currentPeriodPosts = currentMediaData.filter((post: any) => {
            const postDate = new Date(post.timestamp);
            return postDate >= currentPeriodStart && postDate <= yesterday;
          });

          // Current data
          currentData.followersCount = basicData.followers_count || 0;
          currentData.mediaCount = basicData.media_count || 0;

          // Calculate current engagement rate
          if (currentPeriodPosts.length > 0 && currentData.followersCount > 0) {
            const totalEngagement = currentPeriodPosts.reduce(
              (sum: number, post: any) => {
                const likes = post.like_count || 0;
                const comments = post.comments_count || 0;
                return sum + likes + comments;
              },
              0
            );

            const avgEngagementPerPost =
              totalEngagement / currentPeriodPosts.length;
            currentData.engagementRate = parseFloat(
              (
                (avgEngagementPerPost / currentData.followersCount) *
                100
              ).toFixed(2)
            );
          }

          // Calculate current average reach
          const currentReach = currentInsightsData.find(
            (d: any) => d.name === "reach"
          );
          if (
            currentReach &&
            currentReach.values &&
            currentReach.values.length > 0
          ) {
            const totalReach = currentReach.values.reduce(
              (sum: number, v: any) => sum + (v.value || 0),
              0
            );
            currentData.avgReachPerPost =
              currentPeriodPosts.length > 0
                ? Math.round(totalReach / currentPeriodPosts.length)
                : Math.round(
                    totalReach / Math.max(1, currentReach.values.length)
                  );
          }

          // Process previous period data if available
          if (previousInsightsData.length > 0) {
            const previousReach = previousInsightsData.find(
              (d: any) => d.name === "reach"
            );
            if (
              previousReach &&
              previousReach.values &&
              previousReach.values.length > 0
            ) {
              const totalReach = previousReach.values.reduce(
                (sum: number, v: any) => sum + (v.value || 0),
                0
              );
              previousData.avgReachPerPost = Math.round(
                totalReach / Math.max(1, previousReach.values.length)
              );
            }

            const previousFollowerCount = previousInsightsData.find(
              (d: any) => d.name === "follower_count"
            );
            if (
              previousFollowerCount &&
              previousFollowerCount.values &&
              previousFollowerCount.values.length > 0
            ) {
              previousData.followersCount =
                previousFollowerCount.values[0].value || 0;
            }

            const previousPeriodPostCount = Math.floor(
              currentPeriodPosts.length * 0.8
            );
            previousData.mediaCount = Math.max(
              0,
              currentData.mediaCount - currentPeriodPosts.length
            );

            if (
              previousData.followersCount > 0 &&
              previousPeriodPostCount > 0
            ) {
              const estimatedPreviousEngagement =
                currentData.engagementRate * 0.9;
              previousData.engagementRate = parseFloat(
                estimatedPreviousEngagement.toFixed(2)
              );
            }
          } else {
            // Estimate previous data when we can't fetch it
            const currentFollowerData = currentInsightsData.find(
              (d: any) => d.name === "follower_count"
            );
            if (
              currentFollowerData &&
              currentFollowerData.values &&
              currentFollowerData.values.length > 0
            ) {
              const sortedValues = currentFollowerData.values.sort(
                (a: any, b: any) =>
                  new Date(a.end_time).getTime() -
                  new Date(b.end_time).getTime()
              );
              previousData.followersCount =
                sortedValues[0].value || currentData.followersCount;
            } else {
              previousData.followersCount = Math.max(
                0,
                Math.floor(currentData.followersCount * 0.95)
              );
            }

            const estimatedPostsInPreviousPeriod = Math.floor(
              currentPeriodPosts.length * 0.8
            );
            previousData.mediaCount = Math.max(
              0,
              currentData.mediaCount -
                currentPeriodPosts.length -
                estimatedPostsInPreviousPeriod
            );

            previousData.avgReachPerPost = Math.max(
              1,
              Math.round(currentData.avgReachPerPost * 0.85)
            );
            previousData.engagementRate = parseFloat(
              (currentData.engagementRate * 0.9).toFixed(2)
            );
          }

          // Get follower growth for chart
          const followerCountData = currentInsightsData.find(
            (d: any) => d.name === "follower_count"
          );
          if (followerCountData && followerCountData.values) {
            followerGrowth = followerCountData.values
              .map((v: any) => ({
                date: new Date(v.end_time),
                value: v.value || 0,
              }))
              .sort((a: any, b: any) => a.date.getTime() - b.date.getTime());
          }
        } else if (platform === "FACEBOOK") {
          console.log(
            `📘 Fetching Facebook insights for profileId: ${profileId}`
          );

          // Get current basic account info
          const basicResp = await axios.get(
            `https://graph.facebook.com/v22.0/${profileId}`,
            {
              params: {
                fields: "fan_count,posts.summary(true).limit(0)",
                access_token: accessToken,
              },
            }
          );

          // Get current period insights
          const currentInsightsResp = await axios.get(
            `https://graph.facebook.com/v22.0/${profileId}/insights`,
            {
              params: {
                metric: "page_engaged_users,page_impressions",
                period: "day",
                since: formatDateForAPI(currentPeriodStart),
                until: formatDateForAPI(yesterday),
                access_token: accessToken,
              },
            }
          );

          const basicData = basicResp.data;
          const currentInsightsData = currentInsightsResp.data.data || [];

          currentData.followersCount = basicData.fan_count || 0;
          currentData.mediaCount = basicData.posts?.summary?.total_count || 0;

          const engUser = currentInsightsData.find(
            (d: any) => d.name === "page_engaged_users"
          );
          const impressions = currentInsightsData.find(
            (d: any) => d.name === "page_impressions"
          );

          if (
            engUser &&
            engUser.values &&
            engUser.values.length > 0 &&
            currentData.followersCount > 0
          ) {
            const totalEngagement = engUser.values.reduce(
              (sum: number, v: any) => sum + (v.value || 0),
              0
            );
            const avgEngagementPerDay = totalEngagement / engUser.values.length;
            currentData.engagementRate = parseFloat(
              (
                (avgEngagementPerDay / currentData.followersCount) *
                100
              ).toFixed(2)
            );
          }

          if (
            impressions &&
            impressions.values &&
            impressions.values.length > 0
          ) {
            const totalImpressions = impressions.values.reduce(
              (sum: number, v: any) => sum + (v.value || 0),
              0
            );
            currentData.avgReachPerPost =
              currentData.mediaCount > 0
                ? Math.round(totalImpressions / currentData.mediaCount)
                : Math.round(
                    totalImpressions / Math.max(1, impressions.values.length)
                  );
          }

          // Estimate previous data for Facebook (simplified)
          previousData.followersCount = Math.max(
            0,
            Math.floor(currentData.followersCount * 0.95)
          );
          previousData.mediaCount = Math.max(
            0,
            Math.floor(currentData.mediaCount * 0.9)
          );
          previousData.engagementRate = parseFloat(
            (currentData.engagementRate * 0.9).toFixed(2)
          );
          previousData.avgReachPerPost = Math.max(
            1,
            Math.round(currentData.avgReachPerPost * 0.85)
          );
        } else {
          console.log(`⚠️ Skipping unsupported platform: ${platform}`);
          continue;
        }

        // Calculate percentage changes
        const calculatePercentageChange = (
          current: number,
          previous: number
        ): number => {
          if (previous === 0) return current > 0 ? 100 : 0;
          return parseFloat(
            (((current - previous) / previous) * 100).toFixed(1)
          );
        };

        const metrics = {
          followersCount: currentData.followersCount,
          followersGrowth: calculatePercentageChange(
            currentData.followersCount,
            previousData.followersCount
          ),
          mediaCount: currentData.mediaCount,
          mediaGrowth: calculatePercentageChange(
            currentData.mediaCount,
            previousData.mediaCount
          ),
          engagementRate: currentData.engagementRate,
          engagementGrowth: calculatePercentageChange(
            currentData.engagementRate,
            previousData.engagementRate
          ),
          avgReachPerPost: currentData.avgReachPerPost,
          reachGrowth: calculatePercentageChange(
            currentData.avgReachPerPost,
            previousData.avgReachPerPost
          ),
        };

        // Store the comprehensive insights in the database
        await prisma.accountAnalytics.create({
          data: {
            socialAccountId: id,
            followersCount: metrics.followersCount,
            mediaCount: metrics.mediaCount,
            engagementRate: metrics.engagementRate,
            avgReachPerPost: metrics.avgReachPerPost,
            followerGrowth: JSON.stringify(followerGrowth),
            // Store comparison data
            previousFollowersCount: previousData.followersCount,
            previousMediaCount: previousData.mediaCount,
            previousEngagementRate: previousData.engagementRate,
            previousAvgReachPerPost: previousData.avgReachPerPost,
            engagementGrowthPercent: metrics.engagementGrowth,
            reachGrowthPercent: metrics.reachGrowth,
            mediaGrowthPercent: metrics.mediaGrowth,
            followersGrowthPercent: metrics.followersGrowth,
          },
        });

        console.log(`✅ Successfully processed account ${id}:`, {
          platform: platform,
          current: currentData,
          previous: previousData,
          growth: {
            followers: `${metrics.followersGrowth > 0 ? "+" : ""}${metrics.followersGrowth}%`,
            posts: `${metrics.mediaGrowth > 0 ? "+" : ""}${metrics.mediaGrowth}%`,
            engagement: `${metrics.engagementGrowth > 0 ? "+" : ""}${metrics.engagementGrowth}%`,
            reach: `${metrics.reachGrowth > 0 ? "+" : ""}${metrics.reachGrowth}%`,
          },
          dataPoints: followerGrowth.length,
          periodInfo: {
            currentPeriodPosts: currentPeriodPosts.length,
            currentPeriodStart: formatDateForAPI(currentPeriodStart),
            currentPeriodEnd: formatDateForAPI(yesterday),
          },
        });

        success++;
      } catch (error: any) {
        console.error(`❌ Failed account insights for ${account.id}:`, error);
        if (axios.isAxiosError(error) && error.response) {
          console.error(`API Error:`, {
            status: error.response.status,
            data: error.response.data,
            url: error.config?.url,
          });
        }
        failed++;
      }
    }

    console.log(
      `🎯 Account insights collection completed: ${success}/${accounts.length} successful, ${failed} failed`
    );
    return { total: accounts.length, success, failed };
  }

  /**
   * Fetch initial account-level insights (followers, media count) for a social account.
   * This should be called once when a user integrates their account.
   */
  static async fetchInitialAccountInsights(
    socialAccountId: string
  ): Promise<void> {
    try {
      // Fetch the social account details
      const account = await prisma.socialAccount.findUnique({
        where: { id: socialAccountId },
        select: { accessToken: true, profileId: true, platform: true },
      });

      if (!account || !account.accessToken || !account.profileId) {
        throw new Error("Missing credentials or account not found");
      }

      const { accessToken, profileId, platform } = account;

      // --- CORRECTED DATE RANGE LOGIC ---
      const yesterday = subDays(new Date(), 1);
      yesterday.setHours(23, 59, 59, 999);

      // Current period: Last 29 days ending yesterday (Instagram API limitation)
      const currentPeriodStart = subDays(yesterday, 28); // 29 days total including yesterday
      currentPeriodStart.setHours(0, 0, 0, 0);

      // Previous period: 29 days before the current period
      const previousPeriodEnd = subDays(currentPeriodStart, 1);
      previousPeriodEnd.setHours(23, 59, 59, 999);
      const previousPeriodStart = subDays(previousPeriodEnd, 28); // 29 days total
      previousPeriodStart.setHours(0, 0, 0, 0);
      // --- END OF CORRECTION ---

      // Initialize current and previous data
      let currentData = {
        followersCount: 0,
        mediaCount: 0,
        engagementRate: 0,
        avgReachPerPost: 0,
      };

      let previousData = {
        followersCount: 0,
        mediaCount: 0,
        engagementRate: 0,
        avgReachPerPost: 0,
      };

      let followerGrowth: Array<{ date: Date; value: number }> = [];

      // Prepare scoped variable for post filtering
      let currentPeriodPosts: any[] = [];

      console.log(`Fetching ${platform} insights for profileId: ${profileId}`);
      console.log(
        `Date range: ${formatDateForAPI(currentPeriodStart)} to ${formatDateForAPI(yesterday)} (29 days)`
      );

      // Get current basic account info
      const basicResp = await axios.get(
        `https://graph.facebook.com/v22.0/${profileId}`,
        {
          params: {
            fields: "followers_count,media_count",
            access_token: accessToken,
          },
        }
      );

      // Get current period media posts
      const currentMediaResp = await axios.get(
        `https://graph.facebook.com/v22.0/${profileId}/media`,
        {
          params: {
            fields: "id,like_count,comments_count,timestamp",
            limit: 50,
            access_token: accessToken,
          },
        }
      );

      // Get current period insights - Fixed: Use correct date format and metric names
      const currentInsightsResp = await axios.get(
        `https://graph.facebook.com/v22.0/${profileId}/insights`,
        {
          params: {
            metric: "reach,follower_count", // Use follower_count, not page_fans
            period: "day",
            since: formatDateForAPI(currentPeriodStart),
            until: formatDateForAPI(yesterday),
            access_token: accessToken,
          },
        }
      );

      // Get previous period insights - Limited to 30 days max
      // Note: We can only get follower_count for the last 30 days, so we'll estimate previous data
      let previousInsightsData: any[] = [];

      // Only fetch previous insights if the previous period is within the 29-day limit
      const twentyNineDaysAgo = subDays(new Date(), 29);
      if (previousPeriodStart >= twentyNineDaysAgo) {
        try {
          const previousInsightsResp = await axios.get(
            `https://graph.facebook.com/v22.0/${profileId}/insights`,
            {
              params: {
                metric: "reach,follower_count",
                period: "day",
                since: formatDateForAPI(previousPeriodStart),
                until: formatDateForAPI(previousPeriodEnd),
                access_token: accessToken,
              },
            }
          );
          previousInsightsData = previousInsightsResp.data.data || [];
        } catch (prevError) {
          console.warn(
            "Could not fetch previous period insights, will estimate:",
            prevError
          );
        }
      }

      const basicData = basicResp.data;
      const currentMediaData = currentMediaResp.data.data || [];
      const currentInsightsData = currentInsightsResp.data.data || [];

      // Move filter here so it's defined before use
      currentPeriodPosts = currentMediaData.filter((post: any) => {
        const postDate = new Date(post.timestamp);
        return postDate >= currentPeriodStart && postDate <= yesterday;
      });

      // Current data
      currentData.followersCount = basicData.followers_count || 0;
      currentData.mediaCount = basicData.media_count || 0;

      // Calculate current engagement rate
      if (currentPeriodPosts.length > 0 && currentData.followersCount > 0) {
        const totalEngagement = currentPeriodPosts.reduce(
          (sum: number, post: any) => {
            const likes = post.like_count || 0;
            const comments = post.comments_count || 0;
            return sum + likes + comments;
          },
          0
        );

        const avgEngagementPerPost =
          totalEngagement / currentPeriodPosts.length;
        currentData.engagementRate = parseFloat(
          ((avgEngagementPerPost / currentData.followersCount) * 100).toFixed(2)
        );
      }

      // Calculate current average reach (Instagram uses 'reach', not 'page_impressions')
      const currentReach = currentInsightsData.find(
        (d: any) => d.name === "reach"
      );
      if (
        currentReach &&
        currentReach.values &&
        currentReach.values.length > 0
      ) {
        const totalReach = currentReach.values.reduce(
          (sum: number, v: any) => sum + (v.value || 0),
          0
        );
        currentData.avgReachPerPost =
          currentPeriodPosts.length > 0
            ? Math.round(totalReach / currentPeriodPosts.length)
            : Math.round(totalReach / Math.max(1, currentReach.values.length));
      }

      // Process previous period data if available
      if (previousInsightsData.length > 0) {
        const previousReach = previousInsightsData.find(
          (d: any) => d.name === "reach"
        );
        if (
          previousReach &&
          previousReach.values &&
          previousReach.values.length > 0
        ) {
          const totalReach = previousReach.values.reduce(
            (sum: number, v: any) => sum + (v.value || 0),
            0
          );
          previousData.avgReachPerPost = Math.round(
            totalReach / Math.max(1, previousReach.values.length)
          );
        }

        // Get previous follower count from the earliest data point in previous period
        const previousFollowerCount = previousInsightsData.find(
          (d: any) => d.name === "follower_count"
        );
        if (
          previousFollowerCount &&
          previousFollowerCount.values &&
          previousFollowerCount.values.length > 0
        ) {
          // Use the first value from the previous period (earliest date)
          previousData.followersCount =
            previousFollowerCount.values[0].value || 0;
        }

        // Calculate previous engagement rate with proper media count estimation
        const previousPeriodPostCount = Math.floor(
          currentPeriodPosts.length * 0.8
        ); // More realistic estimate
        previousData.mediaCount = Math.max(
          0,
          currentData.mediaCount - currentPeriodPosts.length
        );

        // Estimate previous engagement rate based on typical patterns
        if (previousData.followersCount > 0 && previousPeriodPostCount > 0) {
          // Assume similar engagement pattern but slightly lower
          const estimatedPreviousEngagement = currentData.engagementRate * 0.9;
          previousData.engagementRate = parseFloat(
            estimatedPreviousEngagement.toFixed(2)
          );
        }
      } else {
        // Estimate previous data when we can't fetch it
        const currentFollowerData = currentInsightsData.find(
          (d: any) => d.name === "follower_count"
        );
        if (
          currentFollowerData &&
          currentFollowerData.values &&
          currentFollowerData.values.length > 0
        ) {
          // Use the earliest follower count from current period as baseline
          const sortedValues = currentFollowerData.values.sort(
            (a: any, b: any) =>
              new Date(a.end_time).getTime() - new Date(b.end_time).getTime()
          );
          previousData.followersCount =
            sortedValues[0].value || currentData.followersCount;
        } else {
          // If no follower data available, estimate a slightly lower count
          previousData.followersCount = Math.max(
            0,
            Math.floor(currentData.followersCount * 0.95)
          );
        }

        // More realistic previous media count estimation
        const estimatedPostsInPreviousPeriod = Math.floor(
          currentPeriodPosts.length * 0.8
        );
        previousData.mediaCount = Math.max(
          0,
          currentData.mediaCount -
            currentPeriodPosts.length -
            estimatedPostsInPreviousPeriod
        );

        // Estimate other previous metrics more realistically
        previousData.avgReachPerPost = Math.max(
          1,
          Math.round(currentData.avgReachPerPost * 0.85)
        );
        previousData.engagementRate = parseFloat(
          (currentData.engagementRate * 0.9).toFixed(2)
        );
      }

      // Get follower growth for chart
      const followerCountData = currentInsightsData.find(
        (d: any) => d.name === "follower_count"
      );
      if (followerCountData && followerCountData.values) {
        followerGrowth = followerCountData.values
          .map((v: any) => ({
            date: new Date(v.end_time),
            value: v.value || 0,
          }))
          .sort((a: any, b: any) => a.date.getTime() - b.date.getTime());
      }

      console.log(
        "Debug - Current insights data:",
        currentInsightsData.map((d: any) => ({
          name: d.name,
          valueCount: d.values?.length,
        }))
      );

      // Calculate percentage changes
      const calculatePercentageChange = (
        current: number,
        previous: number
      ): number => {
        if (previous === 0) return current > 0 ? 100 : 0;
        return parseFloat((((current - previous) / previous) * 100).toFixed(1));
      };

      const metrics = {
        followersCount: currentData.followersCount,
        followersGrowth: calculatePercentageChange(
          currentData.followersCount,
          previousData.followersCount
        ),

        mediaCount: currentData.mediaCount,
        mediaGrowth: calculatePercentageChange(
          currentData.mediaCount,
          previousData.mediaCount
        ),

        engagementRate: currentData.engagementRate,
        engagementGrowth: calculatePercentageChange(
          currentData.engagementRate,
          previousData.engagementRate
        ),

        avgReachPerPost: currentData.avgReachPerPost,
        reachGrowth: calculatePercentageChange(
          currentData.avgReachPerPost,
          previousData.avgReachPerPost
        ),
      };

      // Store the insights in the database
      await prisma.accountAnalytics.create({
        data: {
          socialAccountId: socialAccountId,
          followersCount: metrics.followersCount,
          mediaCount: metrics.mediaCount,
          engagementRate: metrics.engagementRate,
          avgReachPerPost: metrics.avgReachPerPost,
          followerGrowth: JSON.stringify(followerGrowth),
          // Store comparison data as well
          previousFollowersCount: previousData.followersCount,
          previousMediaCount: previousData.mediaCount,
          previousEngagementRate: previousData.engagementRate,
          previousAvgReachPerPost: previousData.avgReachPerPost,
          engagementGrowthPercent: metrics.engagementGrowth,
          reachGrowthPercent: metrics.reachGrowth,
          mediaGrowthPercent: metrics.mediaGrowth,
          followersGrowthPercent: metrics.followersGrowth,
        },
      });

      console.log(`Analytics fetched for account ${socialAccountId}:`, {
        current: currentData,
        previous: previousData,
        growth: {
          followers: `${metrics.followersGrowth > 0 ? "+" : ""}${metrics.followersGrowth}%`,
          posts: `${metrics.mediaGrowth > 0 ? "+" : ""}${metrics.mediaGrowth}%`,
          engagement: `${metrics.engagementGrowth > 0 ? "+" : ""}${metrics.engagementGrowth}%`,
          reach: `${metrics.reachGrowth > 0 ? "+" : ""}${metrics.reachGrowth}%`,
        },
        dataPoints: followerGrowth.length,
        periodInfo: {
          currentPeriodPosts: currentPeriodPosts.length,
          currentPeriodStart: formatDateForAPI(currentPeriodStart),
          currentPeriodEnd: formatDateForAPI(yesterday),
        },
      });
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        console.error(`API Error:`, {
          status: error.response.status,
          data: error.response.data,
          url: error.config?.url,
        });
      } else {
        console.error(`Error:`, error);
      }
      throw error;
    }
  }

  /**
   * Fetch initial heatmap data when a social account is connected
   */
  static async fetchInitialHeatmapData(socialAccountId: string): Promise<{
    success: boolean;
    data?: any;
    error?: string;
  }> {
    try {
      console.log(
        `🔥 Fetching initial heatmap data for account: ${socialAccountId}`
      );

      // Fetch the social account details
      const account = await prisma.socialAccount.findUnique({
        where: { id: socialAccountId },
        select: { accessToken: true, profileId: true, platform: true },
      });

      if (!account || !account.accessToken || !account.profileId) {
        throw new Error("Missing credentials or account not found");
      }

      const { accessToken, profileId, platform } = account;

      // Date range: Last 30 days for comprehensive analysis
      const endDate = new Date();
      const startDate = subDays(endDate, 30);

      let posts: any[] = [];
      let engagementData: Array<{
        timestamp: Date;
        engagement: number;
        reach?: number;
        impressions?: number;
      }> = [];

      if (platform === "INSTAGRAM") {
        console.log(
          `📱 Fetching Instagram posts and insights for profileId: ${profileId}`
        );

        // Get recent media posts (last 30 days)
        const mediaResp = await axios.get(
          `https://graph.facebook.com/v22.0/${profileId}/media`,
          {
            params: {
              fields:
                "id,caption,timestamp,like_count,comments_count,media_type,media_url",
              limit: 100, // Get more posts for better analysis
              access_token: accessToken,
            },
          }
        );

        posts = mediaResp.data.data || [];

        // Filter posts within our date range
        const filteredPosts = posts.filter((post: any) => {
          const postDate = new Date(post.timestamp);
          return postDate >= startDate && postDate <= endDate;
        });

        console.log(
          `📊 Found ${filteredPosts.length} posts in the last 30 days`
        );

        // Get detailed insights for each post
        for (const post of filteredPosts.slice(0, 50)) {
          // Limit to 50 posts to avoid rate limits
          try {
            const insightsResp = await axios.get(
              `https://graph.facebook.com/v22.0/${post.id}/insights`,
              {
                params: {
                  metric: "likes,comments,shares,saved,reach",
                  period: "lifetime", // Required parameter for post insights
                  access_token: accessToken,
                },
              }
            );

            const insights = insightsResp.data.data || [];
            // Calculate total engagement from individual metrics
            const likes =
              insights.find((i: any) => i.name === "likes")?.values[0]?.value ||
              0;
            const comments =
              insights.find((i: any) => i.name === "comments")?.values[0]
                ?.value || 0;
            const shares =
              insights.find((i: any) => i.name === "shares")?.values[0]
                ?.value || 0;
            const saved =
              insights.find((i: any) => i.name === "saved")?.values[0]?.value ||
              0;
            const engagement = likes + comments + shares + saved; // Total engagement
            const reach =
              insights.find((i: any) => i.name === "reach")?.values[0]?.value ||
              0;

            engagementData.push({
              timestamp: new Date(post.timestamp),
              engagement: engagement || post.like_count + post.comments_count, // Fallback to basic engagement
              reach,
            });

            // Small delay to respect rate limits
            await new Promise((resolve) => setTimeout(resolve, 100));
          } catch (error: any) {
            console.warn(
              `⚠️ Could not fetch insights for post ${post.id}, using basic metrics`
            );

            // Use basic engagement metrics as fallback
            engagementData.push({
              timestamp: new Date(post.timestamp),
              engagement: (post.like_count || 0) + (post.comments_count || 0),
              reach: 0,
            });
          }
        }
      } else if (platform === "FACEBOOK") {
        console.log(`📘 Fetching Facebook posts for profileId: ${profileId}`);

        // Get recent posts
        const postsResp = await axios.get(
          `https://graph.facebook.com/v22.0/${profileId}/posts`,
          {
            params: {
              fields:
                "id,message,created_time,reactions.summary(true),comments.summary(true),shares",
              limit: 50,
              since: Math.floor(startDate.getTime() / 1000),
              until: Math.floor(endDate.getTime() / 1000),
              access_token: accessToken,
            },
          }
        );

        posts = postsResp.data.data || [];
        console.log(
          `📊 Found ${posts.length} Facebook posts in the last 30 days`
        );

        // Process Facebook engagement data
        engagementData = posts.map((post: any) => {
          const reactions = post.reactions?.summary?.total_count || 0;
          const comments = post.comments?.summary?.total_count || 0;
          const shares = post.shares?.count || 0;

          return {
            timestamp: new Date(post.created_time),
            engagement: reactions + comments + shares,
            reach: 0, // Facebook post insights require additional API calls
          };
        });
      } else {
        throw new Error(`Unsupported platform: ${platform}`);
      }

      // Analyze engagement patterns
      const heatmapData = this.analyzeEngagementPatterns(engagementData);

      // Ambil teamId dari socialAccount
      const teamId = (
        await prisma.socialAccount.findUnique({
          where: { id: socialAccountId },
          select: { teamId: true },
        })
      )?.teamId;
      if (!teamId) throw new Error("teamId not found for this social account");

      // Siapkan data untuk createMany
      const hotspotRows: Array<{
        socialAccountId: string;
        teamId: string;
        dayOfWeek: number;
        hourOfDay: number;
        score: number;
      }> = [];
      // heatmapData.hourlyData: Array<{ hour: number, totalEngagement: number, postCount: number, avgEngagement: number }>
      // heatmapData.weeklyData: Array<{ day: string, dayIndex: number, ... }>
      for (let day = 0; day < 7; day++) {
        for (let hour = 0; hour < 24; hour++) {
          // Skor: gunakan avgEngagement dari hourlyData (per jam), atau bisa juga gabungan dengan weeklyData jika ingin
          const hourData = heatmapData.hourlyData[hour];
          // Jika ingin lebih spesifik, bisa juga gunakan kombinasi day & hour dari data mentah
          const score = hourData?.avgEngagement ?? 0;
          hotspotRows.push({
            socialAccountId,
            teamId,
            dayOfWeek: day,
            hourOfDay: hour,
            score,
          });
        }
      }
      // Hapus data lama, lalu insert batch baru
      await prisma.engagementHotspot.deleteMany({ where: { socialAccountId } });
      await prisma.engagementHotspot.createMany({ data: hotspotRows });

      console.log(
        `✅ Successfully created initial heatmap for account ${socialAccountId}`
      );
      console.log(`📈 Analysis summary:`, {
        totalPosts: engagementData.length,
        peakHour: heatmapData.peakHours[0],
        bestDay: heatmapData.weeklyData.reduce((best: any, day: any) =>
          day.avgEngagement > best.avgEngagement ? day : best
        ).day,
        dateRange: `${formatDateForAPI(startDate)} to ${formatDateForAPI(endDate)}`,
      });

      return {
        success: true,
        data: {
          heatmapData: heatmapData.hourlyData,
          weeklyData: heatmapData.weeklyData,
          peakHours: heatmapData.peakHours,
          bestPostingTimes: heatmapData.bestPostingTimes,
          totalPosts: engagementData.length,
          dateRange: { start: startDate, end: endDate },
        },
      };
    } catch (error) {
      console.error(
        `❌ Error fetching initial heatmap data for ${socialAccountId}:`,
        error
      );

      if (axios.isAxiosError(error) && error.response) {
        console.error(`API Error:`, {
          status: error.response.status,
          data: error.response.data,
          url: error.config?.url,
        });
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Analyze engagement patterns from post data
   */
  private static analyzeEngagementPatterns(
    engagementData: Array<{
      timestamp: Date;
      engagement: number;
      reach?: number;
      impressions?: number;
    }>
  ) {
    // Initialize hourly data (0-23 hours)
    const hourlyData = Array.from({ length: 24 }, (_, hour) => ({
      hour,
      totalEngagement: 0,
      postCount: 0,
      avgEngagement: 0,
    }));

    // Initialize weekly data (0-6 days, 0 = Sunday)
    const weeklyData = Array.from({ length: 7 }, (_, day) => ({
      day: [
        "Sunday",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
      ][day],
      dayIndex: day,
      totalEngagement: 0,
      postCount: 0,
      avgEngagement: 0,
    }));

    // Process each engagement data point
    engagementData.forEach(({ timestamp, engagement }) => {
      const hour = timestamp.getHours();
      const dayOfWeek = timestamp.getDay();

      // Update hourly data
      hourlyData[hour].totalEngagement += engagement;
      hourlyData[hour].postCount += 1;

      // Update weekly data
      weeklyData[dayOfWeek].totalEngagement += engagement;
      weeklyData[dayOfWeek].postCount += 1;
    });

    // Calculate averages
    hourlyData.forEach((data) => {
      data.avgEngagement =
        data.postCount > 0 ? data.totalEngagement / data.postCount : 0;
    });

    weeklyData.forEach((data) => {
      data.avgEngagement =
        data.postCount > 0 ? data.totalEngagement / data.postCount : 0;
    });

    // Find peak hours (top 3 hours with highest average engagement)
    const peakHours = hourlyData
      .filter((data) => data.postCount > 0)
      .sort((a, b) => b.avgEngagement - a.avgEngagement)
      .slice(0, 3)
      .map((data) => ({
        hour: data.hour,
        timeLabel: `${data.hour.toString().padStart(2, "0")}:00`,
        avgEngagement: Math.round(data.avgEngagement),
        postCount: data.postCount,
      }));

    // Find best posting times (combining day and hour with good engagement)
    const bestPostingTimes = [];
    const threshold = Math.max(1, Math.ceil(engagementData.length / 20)); // At least 5% of total posts

    for (const hourData of hourlyData) {
      if (hourData.postCount >= threshold && hourData.avgEngagement > 0) {
        for (const dayData of weeklyData) {
          if (dayData.postCount >= threshold && dayData.avgEngagement > 0) {
            const combinedScore =
              (hourData.avgEngagement + dayData.avgEngagement) / 2;
            bestPostingTimes.push({
              day: dayData.day,
              hour: hourData.hour,
              timeLabel: `${dayData.day} ${hourData.hour.toString().padStart(2, "0")}:00`,
              score: Math.round(combinedScore),
              hourEngagement: Math.round(hourData.avgEngagement),
              dayEngagement: Math.round(dayData.avgEngagement),
            });
          }
        }
      }
    }

    // Sort and limit best posting times
    bestPostingTimes.sort((a, b) => b.score - a.score);
    const topPostingTimes = bestPostingTimes.slice(0, 10);

    return {
      hourlyData,
      weeklyData,
      peakHours,
      bestPostingTimes: topPostingTimes,
    };
  }
}
