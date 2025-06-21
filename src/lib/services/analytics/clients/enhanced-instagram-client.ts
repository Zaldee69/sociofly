import axios, { AxiosInstance } from "axios";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export interface EnhancedInstagramInsights {
  // Basic account data (always available)
  followersCount: number;
  mediaCount: number;

  // Aggregated from individual posts
  totalReach: number;
  totalImpressions: number;
  totalLikes: number;
  totalComments: number;
  totalShares: number;
  totalSaves: number;

  // Calculated metrics
  engagementRate: number;
  averageReachPerPost: number;
  averageEngagementPerPost: number;

  // Additional insights
  topPerformingPosts: Array<{
    id: string;
    reach: number;
    engagement: number;
    mediaType: string;
  }>;

  // Stories data (if available)
  storyViews: number;
  storyReplies: number;

  // Data collection metadata
  postsAnalyzed: number;
  dataCollectedAt: Date;
  dataQuality: "excellent" | "good" | "limited" | "basic";
}

export class EnhancedInstagramClient {
  private httpClient: AxiosInstance;
  private baseURL = "https://graph.facebook.com";
  private apiVersion = "v22.0";

  constructor() {
    this.httpClient = axios.create({
      baseURL: `${this.baseURL}/${this.apiVersion}`,
      timeout: 30000,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }

  /**
   * Get comprehensive Instagram insights by combining multiple data sources
   */
  async getComprehensiveInsights(
    profileId: string,
    accessToken: string,
    options: {
      mediaLimit?: number;
      includeStories?: boolean;
      daysBack?: number;
    } = {}
  ): Promise<EnhancedInstagramInsights> {
    const { mediaLimit = 25, includeStories = true, daysBack = 30 } = options;

    console.log("🔍 Starting comprehensive Instagram insights collection...");

    try {
      // 1. Get basic account data (always works)
      const basicData = await this.getBasicAccountData(profileId, accessToken);
      console.log(
        `✅ Basic data: ${basicData.followersCount} followers, ${basicData.mediaCount} posts`
      );

      // 2. Get account-level reach insights (new approach)
      const reachData = await this.getAccountReachInsights(
        profileId,
        accessToken,
        daysBack
      );
      console.log(
        `✅ Account reach: ${reachData.totalReach} reach over ${daysBack} days`
      );

      // 3. Get recent media for individual insights
      const mediaData = await this.getRecentMediaWithInsights(
        profileId,
        accessToken,
        mediaLimit,
        daysBack
      );
      console.log(
        `✅ Analyzed ${mediaData.successfulInsights} out of ${mediaData.totalPosts} posts`
      );

      // 4. Get stories insights (if enabled)
      let storiesData = { views: 0, replies: 0 };
      if (includeStories) {
        storiesData = await this.getStoriesInsights(profileId, accessToken);
        console.log(
          `✅ Stories data: ${storiesData.views} views, ${storiesData.replies} replies`
        );
      }

      // 5. Calculate comprehensive metrics
      const insights = this.calculateComprehensiveMetrics(
        basicData,
        mediaData,
        storiesData,
        reachData
      );

      console.log(
        `🎯 Final insights: ${insights.totalReach} reach, ${insights.engagementRate}% engagement`
      );

      return insights;
    } catch (error) {
      console.error("❌ Error in comprehensive insights collection:", error);
      throw error;
    }
  }

  /**
   * Get basic account data (followers, media count)
   */
  private async getBasicAccountData(profileId: string, accessToken: string) {
    try {
      const response = await this.httpClient.get(`/${profileId}`, {
        params: {
          fields: "id,name,username,followers_count,media_count",
          access_token: accessToken,
        },
      });

      return {
        id: response.data.id,
        followersCount: response.data.followers_count || 0,
        mediaCount: response.data.media_count || 0,
        name: response.data.name,
        username: response.data.username,
      };
    } catch (error) {
      console.error("❌ Basic account data error:", error);
      throw error;
    }
  }

  /**
   * Get account-level reach insights using correct period
   */
  private async getAccountReachInsights(
    profileId: string,
    accessToken: string,
    daysBack: number
  ) {
    try {
      // Calculate date range for reach insights
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysBack);

      // Format dates for API (YYYY-MM-DD)
      const since = startDate.toISOString().split("T")[0];
      const until = endDate.toISOString().split("T")[0];

      console.log(`📊 Fetching reach insights from ${since} to ${until}`);

      // Try different approaches to get reach data
      const approaches = [
        // Approach 1: Daily reach data
        { period: "day", since, until },
        // Approach 2: days_28 period (if within 28 days)
        ...(daysBack <= 28 ? [{ period: "days_28" }] : []),
      ];

      for (const params of approaches) {
        try {
          const response = await this.httpClient.get(`/${profileId}/insights`, {
            params: {
              metric: "reach",
              access_token: accessToken,
              ...params,
            },
          });

          const reachData = response.data.data.find(
            (d: any) => d.name === "reach"
          );

          if (reachData && reachData.values) {
            const totalReach = reachData.values.reduce(
              (sum: number, v: any) => sum + (v.value || 0),
              0
            );

            console.log(
              `✅ Got reach data using period: ${params.period}, total: ${totalReach}`
            );

            return {
              totalReach,
              dailyReach: reachData.values,
              period: params.period,
            };
          }
        } catch (error: any) {
          console.log(
            `⚠️  Reach approach failed (${params.period}): ${error.response?.data?.error?.message || error.message}`
          );
          continue;
        }
      }

      // If all approaches fail, return zero reach
      console.log("⚠️  No reach data available, using zero");
      return {
        totalReach: 0,
        dailyReach: [],
        period: "none",
      };
    } catch (error) {
      console.error("❌ Account reach insights error:", error);
      return {
        totalReach: 0,
        dailyReach: [],
        period: "error",
      };
    }
  }

  /**
   * Get recent media with individual post insights
   */
  private async getRecentMediaWithInsights(
    profileId: string,
    accessToken: string,
    limit: number,
    daysBack: number
  ) {
    try {
      // Get recent media list
      const mediaResponse = await this.httpClient.get(`/${profileId}/media`, {
        params: {
          fields: "id,caption,timestamp,media_type,like_count,comments_count",
          limit: limit,
          access_token: accessToken,
        },
      });

      const mediaList = mediaResponse.data.data || [];
      console.log(`📱 Found ${mediaList.length} recent posts`);

      // Filter by date if needed
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysBack);

      const recentMedia = mediaList.filter((media: any) => {
        const postDate = new Date(media.timestamp);
        return postDate >= cutoffDate;
      });

      console.log(
        `📅 ${recentMedia.length} posts within last ${daysBack} days`
      );

      // Get insights for each post
      const mediaWithInsights = [];
      let successfulInsights = 0;

      for (const media of recentMedia) {
        try {
          const insights = await this.getIndividualPostInsights(
            media.id,
            accessToken
          );

          mediaWithInsights.push({
            ...media,
            insights,
          });

          successfulInsights++;

          // Only log if we got comprehensive insights (reduce noise)
          if (insights.reach > 0 || insights.impressions > 0) {
            console.log(
              `✅ Full insights for post ${media.id}: ${insights.reach} reach, ${insights.impressions} views, ${insights.likes} likes`
            );
          }
        } catch (error) {
          // Use basic engagement data even if insights fail
          const basicInsights = {
            reach: 0,
            impressions: 0,
            likes: media.like_count || 0,
            comments: media.comments_count || 0,
            shares: 0,
            saves: 0,
          };

          mediaWithInsights.push({
            ...media,
            insights: basicInsights,
          });

          // Only log if we couldn't get basic likes data
          if (!media.like_count) {
            console.log(`⚠️  No data available for post ${media.id}`);
          }
        }

        // Rate limiting delay
        await new Promise((resolve) => setTimeout(resolve, 200));
      }

      return {
        posts: mediaWithInsights,
        totalPosts: recentMedia.length,
        successfulInsights,
        dataQuality: this.assessDataQuality(
          successfulInsights,
          recentMedia.length
        ),
      };
    } catch (error) {
      console.error("❌ Media insights error:", error);
      throw error;
    }
  }

  /**
   * Get insights for individual post
   */
  private async getIndividualPostInsights(
    mediaId: string,
    accessToken: string
  ) {
    // Use only v22.0+ supported metrics (impressions deprecated March 2025)
    const metricSets = [
      // Most comprehensive set (v22.0+ compatible - uses 'views' instead of 'impressions')
      ["reach", "views", "likes", "comments", "saved", "shares"],

      // Basic engagement metrics (always available)
      ["likes", "comments", "saved", "shares"],

      // Views and reach only (fallback)
      ["views", "reach"],

      // Engagement only (more likely to work)
      ["likes", "comments", "saved"],

      // Basic engagement (most reliable fallback)
      ["likes", "comments"],

      // Single metric (ultimate fallback)
      ["likes"],
    ];

    let lastError = null;

    for (let i = 0; i < metricSets.length; i++) {
      const metrics = metricSets[i];

      try {
        const response = await this.httpClient.get(`/${mediaId}/insights`, {
          params: {
            metric: metrics.join(","),
            access_token: accessToken,
          },
        });

        const insights: any = {};

        // Process insights data
        response.data.data.forEach((insight: any) => {
          const value =
            insight.values?.[0]?.value || insight.total_value?.value || 0;
          insights[insight.name] = value;
        });

        // Only log success for debugging (reduce noise)
        if (i === 0) {
          console.log(
            `✅ Full insights for ${mediaId}: reach=${insights.reach || 0}, views=${insights.views || 0}, likes=${insights.likes || 0}`
          );
        }

        // Return structured insights (using views as impressions replacement in v22.0+)
        return {
          reach: insights.reach || 0,
          impressions: insights.views || 0, // v22.0+: views replaces impressions
          likes: insights.likes || 0,
          comments: insights.comments || 0,
          shares: insights.shares || 0,
          saves: insights.saved || 0, // Instagram uses 'saved' not 'saves'
        };
      } catch (error: any) {
        lastError = error;

        // Only log the first two failures (reduce noise)
        if (i < 2) {
          const errorMsg =
            error.response?.data?.error?.message || error.message;
          console.log(
            `⚠️  Metric set [${metrics.join(", ")}] failed: ${errorMsg.substring(0, 100)}...`
          );
        }
        continue;
      }
    }

    // If all metric sets fail, throw error with last error details
    const errorMsg =
      lastError?.response?.data?.error?.message ||
      lastError?.message ||
      "Unknown error";
    throw new Error(`No insights available for post ${mediaId}: ${errorMsg}`);
  }

  /**
   * Get stories insights
   */
  private async getStoriesInsights(profileId: string, accessToken: string) {
    try {
      const response = await this.httpClient.get(`/${profileId}/stories`, {
        params: {
          fields: "id,media_type,timestamp",
          access_token: accessToken,
        },
      });

      const stories = response.data.data || [];
      let totalViews = 0;
      let totalReplies = 0;

      for (const story of stories) {
        try {
          const insightsResponse = await this.httpClient.get(
            `/${story.id}/insights`,
            {
              params: {
                metric: "reach,replies",
                access_token: accessToken,
              },
            }
          );

          insightsResponse.data.data.forEach((insight: any) => {
            const value = insight.values?.[0]?.value || 0;
            if (insight.name === "reach") totalViews += value; // v22.0+: using reach instead of impressions
            if (insight.name === "replies") totalReplies += value;
          });
        } catch (error) {
          console.log(`⚠️  No insights for story ${story.id}`);
        }

        await new Promise((resolve) => setTimeout(resolve, 200));
      }

      return { views: totalViews, replies: totalReplies };
    } catch (error) {
      console.log("⚠️  Stories insights not available");
      return { views: 0, replies: 0 };
    }
  }

  /**
   * Calculate comprehensive metrics from all data sources
   */
  private calculateComprehensiveMetrics(
    basicData: any,
    mediaData: any,
    storiesData: any,
    reachData: any
  ): EnhancedInstagramInsights {
    const { posts, successfulInsights, dataQuality } = mediaData;

    // Aggregate metrics from all posts
    const totals = posts.reduce(
      (acc: any, post: any) => {
        const insights = post.insights || {};
        return {
          reach: acc.reach + (insights.reach || 0),
          impressions: acc.impressions + (insights.impressions || 0),
          likes: acc.likes + (insights.likes || 0),
          comments: acc.comments + (insights.comments || 0),
          shares: acc.shares + (insights.shares || 0),
          saves: acc.saves + (insights.saves || 0),
        };
      },
      { reach: 0, impressions: 0, likes: 0, comments: 0, shares: 0, saves: 0 }
    );

    // Use account-level reach if available, otherwise use aggregated post reach
    const finalReach =
      reachData.totalReach > 0 ? reachData.totalReach : totals.reach;

    // Calculate engagement rate (correct formula: engagement / reach * 100)
    const totalEngagement =
      totals.likes + totals.comments + totals.shares + totals.saves;
    const engagementRate =
      finalReach > 0 ? (totalEngagement / finalReach) * 100 : 0;

    // Find top performing posts
    const topPerformingPosts = posts
      .map((post: any) => ({
        id: post.id,
        reach: post.insights?.reach || 0,
        engagement:
          (post.insights?.likes || 0) + (post.insights?.comments || 0),
        mediaType: post.media_type,
      }))
      .sort((a: any, b: any) => b.engagement - a.engagement)
      .slice(0, 5);

    return {
      // Basic account data
      followersCount: basicData.followersCount,
      mediaCount: basicData.mediaCount,

      // Aggregated metrics (using account-level reach when available)
      totalReach: finalReach,
      totalImpressions: totals.impressions,
      totalLikes: totals.likes,
      totalComments: totals.comments,
      totalShares: totals.shares,
      totalSaves: totals.saves,

      // Calculated metrics
      engagementRate: Math.round(engagementRate * 100) / 100,
      averageReachPerPost:
        posts.length > 0 ? Math.round(finalReach / posts.length) : 0,
      averageEngagementPerPost:
        posts.length > 0 ? Math.round(totalEngagement / posts.length) : 0,

      // Additional insights
      topPerformingPosts,

      // Stories data
      storyViews: storiesData.views,
      storyReplies: storiesData.replies,

      // Metadata
      postsAnalyzed: posts.length,
      dataCollectedAt: new Date(),
      dataQuality,
    };
  }

  /**
   * Assess data quality based on successful insights collection
   */
  private assessDataQuality(
    successful: number,
    total: number
  ): "excellent" | "good" | "limited" | "basic" {
    if (total === 0) return "basic";

    const successRate = successful / total;

    if (successRate >= 0.8) return "excellent";
    if (successRate >= 0.6) return "good";
    if (successRate >= 0.3) return "limited";
    return "basic";
  }
}
