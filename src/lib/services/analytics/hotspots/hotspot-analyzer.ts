import { prisma } from "@/lib/prisma/client";
import { PostAnalytics, PostSocialAccount } from "@prisma/client";
import { subDays, startOfDay } from "date-fns";
import axios from "axios";

interface HeatmapCell {
  totalScore: number;
  count: number;
}

type Heatmap = Map<number, Map<number, HeatmapCell>>;

// Format dates properly for Instagram API (YYYY-MM-DD format)
const formatDateForAPI = (date: Date): string => {
  return date.toISOString().split("T")[0];
};

export class HotspotAnalyzer {
  /**
   * Analyzes historical post data to identify optimal posting times
   * This should be called by the job scheduler every 24 hours
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
        await prisma.taskLog.create({
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
      await prisma.taskLog.create({
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
      await prisma.taskLog.create({
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
   * This should be called by the job scheduler every 24 hours
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
      await prisma.taskLog.create({
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
      await prisma.taskLog.create({
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

      // Get teamId from socialAccount
      const teamId = (
        await prisma.socialAccount.findUnique({
          where: { id: socialAccountId },
          select: { teamId: true },
        })
      )?.teamId;
      if (!teamId) throw new Error("teamId not found for this social account");

      // Prepare data for createMany
      const hotspotRows: Array<{
        socialAccountId: string;
        teamId: string;
        dayOfWeek: number;
        hourOfDay: number;
        score: number;
      }> = [];

      for (let day = 0; day < 7; day++) {
        for (let hour = 0; hour < 24; hour++) {
          // Score: use avgEngagement from hourlyData per hour
          const hourData = heatmapData.hourlyData[hour];
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

      // Delete old data, then insert new batch
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
