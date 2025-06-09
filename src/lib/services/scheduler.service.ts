import { prisma } from "@/lib/prisma/client";
import axios from "axios";
import { PostPublisherService } from "./post-publisher";
import {
  PostStatus,
  ApprovalStatus,
  PostSocialAccount,
  PostAnalytics,
} from "@prisma/client";
import { ApprovalEdgeCaseHandler } from "./approval-edge-case-handler";
import { addDays, subDays, startOfDay } from "date-fns";

interface HeatmapCell {
  totalScore: number;
  count: number;
}

type Heatmap = Map<number, Map<number, HeatmapCell>>;

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

      // Run all edge case checks
      const reports = await ApprovalEdgeCaseHandler.runAllEdgeCaseChecks();

      const totalIssues = reports.reduce(
        (sum, report) => sum + report.count,
        0
      );

      // Log the results
      await prisma.cronLog.create({
        data: {
          name: "process_approval_edge_cases",
          status: "SUCCESS",
          message: `Processed ${totalIssues} edge cases across ${reports.length} categories`,
        },
      });

      // Log individual reports for detailed tracking
      for (const report of reports) {
        if (report.count > 0) {
          await prisma.cronLog.create({
            data: {
              name: `edge_case_${report.type}`,
              status: "INFO",
              message: `Found and processed ${report.count} cases of type: ${report.type}`,
            },
          });
        }
      }

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
      await prisma.$transaction([
        // Delete existing hotspots for this account
        prisma.engagementHotspot.deleteMany({
          where: { socialAccountId },
        }),
        // Insert new hotspots
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
    // Fetch all social accounts with credentials
    const accounts = await prisma.socialAccount.findMany({
      select: { id: true, accessToken: true, profileId: true, platform: true },
    });
    let success = 0;
    let failed = 0;
    for (const account of accounts) {
      try {
        const { id, accessToken, profileId, platform } = account;
        if (!accessToken || !profileId) throw new Error("Missing credentials");
        let followersCount: number;
        let mediaCount: number;
        let engagementRate = 0;
        let avgReachPerPost = 0;
        let followerGrowth: Array<{ date: Date; value: number }> = [];
        if (platform === "INSTAGRAM") {
          const [basicResp, insightsResp] = await Promise.all([
            axios.get(`https://graph.facebook.com/v22.0/${profileId}`, {
              params: {
                fields: "followers_count,media_count",
                access_token: accessToken,
              },
            }),
            axios.get(
              `https://graph.facebook.com/v22.0/${profileId}/insights`,
              {
                params: {
                  metric: "engagement,reach,follower_count",
                  period: "lifetime",
                  access_token: accessToken,
                },
              }
            ),
          ]);
          const basicData = basicResp.data;
          const insightsData = insightsResp.data.data;
          followersCount = basicData.followers_count;
          mediaCount = basicData.media_count;
          const eng = insightsData.find((d: any) => d.name === "engagement");
          const reach = insightsData.find((d: any) => d.name === "reach");
          const growth = insightsData.find(
            (d: any) => d.name === "follower_count"
          );
          engagementRate =
            eng && basicData.followers_count
              ? parseFloat(
                  (
                    (eng.values[0].value / basicData.followers_count) *
                    100
                  ).toFixed(2)
                )
              : 0;
          avgReachPerPost =
            reach && basicData.media_count
              ? Math.round(reach.values[0].value / basicData.media_count)
              : 0;
          followerGrowth = growth
            ? growth.values.map((v: any) => ({
                date: new Date(v.end_time),
                value: v.value,
              }))
            : [];
        } else if (platform === "FACEBOOK") {
          const [basicResp, insightsResp] = await Promise.all([
            axios.get(`https://graph.facebook.com/v22.0/${profileId}`, {
              params: {
                fields: "fan_count,posts.summary(true).limit(0)",
                access_token: accessToken,
              },
            }),
            axios.get(
              `https://graph.facebook.com/v22.0/${profileId}/insights`,
              {
                params: {
                  metric: "page_engaged_users,page_impressions",
                  period: "lifetime",
                  access_token: accessToken,
                },
              }
            ),
          ]);
          const basicData = basicResp.data;
          const insightsData = insightsResp.data.data;
          followersCount = basicData.fan_count;
          mediaCount = basicData.posts?.summary?.total_count || 0;
          const engUser = insightsData.find(
            (d: any) => d.name === "page_engaged_users"
          );
          const impressions = insightsData.find(
            (d: any) => d.name === "page_impressions"
          );
          engagementRate =
            engUser && basicData.fan_count
              ? parseFloat(
                  (
                    (engUser.values[0].value / basicData.fan_count) *
                    100
                  ).toFixed(2)
                )
              : 0;
          avgReachPerPost =
            impressions && basicData.posts?.summary?.total_count
              ? Math.round(
                  impressions.values[0].value /
                    basicData.posts.summary.total_count
                )
              : 0;
          followerGrowth = [];
        } else {
          continue; // unsupported platform
        }
        // @ts-ignore: accountAnalytics model will be available after Prisma migration
        await prisma.accountAnalytics.create({
          data: {
            socialAccountId: id,
            followersCount,
            mediaCount,
            engagementRate,
            avgReachPerPost,
            followerGrowth: JSON.stringify(followerGrowth),
          },
        });
        success++;
      } catch (error) {
        console.error(`Failed account insights for ${account.id}:`, error);
        failed++;
      }
    }
    return { total: accounts.length, success, failed };
  }
}
