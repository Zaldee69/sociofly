/**
 * Data Collector
 * Handles fetching analytics data from various social media platforms
 *
 * This class is responsible for:
 * - Connecting to platform APIs
 * - Fetching account and post metrics
 * - Handling rate limiting and errors
 * - Normalizing data format
 */

import { getPlatformConfig } from "../config/platforms";
import { AccountMetric, PostMetric } from "../config/metrics";
import { CollectionOptions } from "./analytics-manager";

export class DataCollector {
  // Track last operation errors for external access
  public lastApiErrors: string[] = [];
  public lastWarnings: string[] = [];
  public lastFallbackUsed: boolean = false;

  /**
   * Fetch account-level metrics
   *
   * @param accountId - Account ID
   * @param options - Collection options
   * @returns Account metrics
   */
  async fetchAccountMetrics(
    accountId: string,
    options: CollectionOptions
  ): Promise<AccountMetric> {
    // Reset tracking
    this.lastApiErrors = [];
    this.lastWarnings = [];
    this.lastFallbackUsed = false;

    try {
      console.log(
        `📊 Fetching account metrics for ${accountId} on ${options.platform}`
      );

      const platformConfig = getPlatformConfig(options.platform);

      // Implement actual API calls based on platform
      switch (options.platform.toLowerCase()) {
        case "instagram":
          return await this.fetchInstagramAccountMetrics(
            accountId,
            options,
            platformConfig
          );
        case "facebook":
          return await this.fetchFacebookAccountMetrics(
            accountId,
            options,
            platformConfig
          );
        default:
          this.lastApiErrors.push(`Unsupported platform: ${options.platform}`);
          this.lastFallbackUsed = true;
          throw new Error(`Unsupported platform: ${options.platform}`);
      }
    } catch (error) {
      console.error(
        `❌ Failed to fetch account metrics for ${accountId}:`,
        error
      );
      this.lastApiErrors.push(
        error instanceof Error ? error.message : "Unknown error"
      );
      this.lastFallbackUsed = true;
      throw error;
    }
  }

  /**
   * Fetch post-level metrics
   *
   * @param accountId - Account ID
   * @param options - Collection options
   * @returns Array of post metrics
   */
  async fetchPostMetrics(
    accountId: string,
    options: CollectionOptions
  ): Promise<PostMetric[]> {
    try {
      console.log(
        `📊 Fetching post metrics for ${accountId} on ${options.platform}`
      );

      const platformConfig = getPlatformConfig(options.platform);

      // TODO: Implement actual API calls based on platform
      switch (options.platform.toLowerCase()) {
        case "instagram":
          return await this.fetchInstagramPostMetrics(
            accountId,
            options,
            platformConfig
          );
        case "facebook":
          return await this.fetchFacebookPostMetrics(
            accountId,
            options,
            platformConfig
          );
        default:
          throw new Error(`Unsupported platform: ${options.platform}`);
      }
    } catch (error) {
      console.error(`❌ Failed to fetch post metrics for ${accountId}:`, error);
      throw error;
    }
  }

  // Platform-specific implementations with error tracking

  private async fetchInstagramAccountMetrics(
    accountId: string,
    options: CollectionOptions,
    config: any
  ): Promise<AccountMetric> {
    try {
      // Import and use real Instagram client
      const { EnhancedInstagramClient } = await import(
        "@/lib/services/analytics/clients/enhanced-instagram-client"
      );
      const client = new EnhancedInstagramClient();

      // Get real data from Instagram API
      // Need to fetch actual credentials from database
      const { PrismaClient } = await import("@prisma/client");
      const prisma = new PrismaClient();

      const account = await prisma.socialAccount.findUnique({
        where: { id: accountId },
        select: { accessToken: true, profileId: true },
      });

      await prisma.$disconnect();

      if (!account?.accessToken || !account?.profileId) {
        throw new Error("Instagram account credentials not found");
      }

      const insights = await client.getComprehensiveInsights(
        account.profileId, // ✅ Use correct Instagram profileId
        account.accessToken, // ✅ Use real access token from database
        {
          mediaLimit: options.limit || 25,
          daysBack: options.days_back || 7,
          includeStories: options.include_stories || false,
        }
      );

      const result = {
        followers: insights.followersCount,
        following: 0, // Not available in Instagram Business API
        posts: insights.mediaCount,
        engagement_rate: insights.engagementRate,
        avg_reach: insights.averageReachPerPost,
        profile_visits: 0, // Would need additional API call
      };

      if (insights.dataQuality !== "excellent") {
        this.lastWarnings.push(
          `Instagram data quality: ${insights.dataQuality}`
        );
      }

      return result;
    } catch (error) {
      console.error("❌ Instagram API error, using fallback data:", error);

      // Track the error
      this.lastFallbackUsed = true;
      this.lastApiErrors.push(
        error instanceof Error
          ? error.message
          : "Instagram API connection failed"
      );

      // Add specific error details
      if (error instanceof Error && error.message.includes("400")) {
        this.lastApiErrors.push("Invalid Instagram credentials or permissions");
        this.lastWarnings.push(
          "Please check Instagram access token and account permissions"
        );
      }

      // Return fallback data instead of failing completely
      return {
        followers: 0,
        following: 0,
        posts: 0,
        engagement_rate: 0,
        avg_reach: 0,
        profile_visits: 0,
      };
    }
  }

  private async fetchFacebookAccountMetrics(
    accountId: string,
    options: CollectionOptions,
    config: any
  ): Promise<AccountMetric> {
    try {
      // Import and use real Facebook client
      const { FacebookAnalyticsClient } = await import(
        "@/lib/services/analytics/clients/facebook-client"
      );
      const { SocialMediaRateLimiter } = await import(
        "@/lib/services/analytics/clients/rate-limiter"
      );

      const rateLimiter = new SocialMediaRateLimiter();
      const client = new FacebookAnalyticsClient(rateLimiter);

      // Get recent posts to calculate basic metrics from available data
      const recentPosts = await client.getPagePosts(
        accountId, // Use as pageId
        config.accessToken || "",
        options.limit || 25,
        new Date(Date.now() - (options.days_back || 7) * 24 * 60 * 60 * 1000)
      );

      // Calculate basic metrics from post data
      let totalLikes = 0;
      let totalComments = 0;
      let estimatedReach = 0;

      for (const post of recentPosts) {
        if (post.likes?.summary) {
          totalLikes += post.likes.summary.total_count || 0;
        }
        if (post.comments?.summary) {
          totalComments += post.comments.summary.total_count || 0;
        }
        // Estimate reach based on engagement (rough approximation)
        const postEngagement = totalLikes + totalComments;
        estimatedReach += Math.round(postEngagement * 10);
      }

      const totalEngagement = totalLikes + totalComments;
      const engagementRate =
        estimatedReach > 0 ? (totalEngagement / estimatedReach) * 100 : 0;

      return {
        followers: 0, // Would need page insights API for accurate count
        following: 0, // Facebook pages don't have following
        posts: recentPosts.length,
        engagement_rate: Math.round(engagementRate * 100) / 100,
        avg_reach:
          recentPosts.length > 0
            ? Math.round(estimatedReach / recentPosts.length)
            : 0,
        profile_visits: 0, // Would need page insights API
      };
    } catch (error) {
      console.error("❌ Facebook API error, using fallback data:", error);
      // Return fallback data instead of failing completely
      return {
        followers: 0,
        following: 0,
        posts: 0,
        engagement_rate: 0,
        avg_reach: 0,
        profile_visits: 0,
      };
    }
  }

  private async fetchInstagramPostMetrics(
    accountId: string,
    options: CollectionOptions,
    config: any
  ): Promise<PostMetric[]> {
    try {
      // Import and use real Instagram client
      const { EnhancedInstagramClient } = await import(
        "@/lib/services/analytics/clients/enhanced-instagram-client"
      );
      const client = new EnhancedInstagramClient();

      // Get real post data from Instagram API
      // Need to fetch actual credentials from database
      const { PrismaClient } = await import("@prisma/client");
      const prisma = new PrismaClient();

      const account = await prisma.socialAccount.findUnique({
        where: { id: accountId },
        select: { accessToken: true, profileId: true },
      });

      await prisma.$disconnect();

      if (!account?.accessToken || !account?.profileId) {
        throw new Error("Instagram account credentials not found");
      }

      const insights = await client.getComprehensiveInsights(
        account.profileId, // ✅ Use correct Instagram profileId
        account.accessToken, // ✅ Use real access token from database
        {
          mediaLimit: options.limit || 25,
          daysBack: options.days_back || 7,
          includeStories: false, // Focus on posts only
        }
      );

      // Convert top performing posts to PostMetric format
      return insights.topPerformingPosts.map((post) => ({
        likes: Math.round(post.engagement * 0.8), // Estimate likes from engagement
        comments: Math.round(post.engagement * 0.15), // Estimate comments
        shares: Math.round(post.engagement * 0.03), // Estimate shares
        saves: Math.round(post.engagement * 0.02), // Estimate saves
        reach: post.reach,
        impressions: Math.round(post.reach * 1.2), // Estimate impressions
      }));
    } catch (error) {
      console.error("❌ Instagram post API error, using fallback data:", error);
      // Return empty array instead of failing completely
      return [];
    }
  }

  private async fetchFacebookPostMetrics(
    accountId: string,
    options: CollectionOptions,
    config: any
  ): Promise<PostMetric[]> {
    try {
      // Import and use real Facebook client
      const { FacebookAnalyticsClient } = await import(
        "@/lib/services/analytics/clients/facebook-client"
      );
      const { SocialMediaRateLimiter } = await import(
        "@/lib/services/analytics/clients/rate-limiter"
      );

      const rateLimiter = new SocialMediaRateLimiter();
      const client = new FacebookAnalyticsClient(rateLimiter);

      // Get recent posts data
      const recentPosts = await client.getPagePosts(
        accountId, // Use as pageId
        config.accessToken || "",
        options.limit || 25,
        new Date(Date.now() - (options.days_back || 7) * 24 * 60 * 60 * 1000)
      );

      // Convert Facebook posts to PostMetric format
      const postMetrics: PostMetric[] = [];

      for (const post of recentPosts) {
        const likes = post.likes?.summary?.total_count || 0;
        const comments = post.comments?.summary?.total_count || 0;

        // Estimate other metrics based on available data
        const totalEngagement = likes + comments;
        const estimatedReach = Math.round(totalEngagement * 10); // Rough estimation
        const estimatedImpressions = Math.round(estimatedReach * 1.5);

        postMetrics.push({
          likes,
          comments,
          shares: Math.round(totalEngagement * 0.1), // Estimate shares
          saves: 0, // Facebook doesn't have saves
          reach: estimatedReach,
          impressions: estimatedImpressions,
        });
      }

      return postMetrics;
    } catch (error) {
      console.error("❌ Facebook post API error, using fallback data:", error);
      // Return empty array instead of failing completely
      return [];
    }
  }
}
