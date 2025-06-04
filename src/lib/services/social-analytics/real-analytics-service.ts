import { PrismaClient, SocialPlatform } from "@prisma/client";
import {
  SocialAnalyticsData,
  PlatformCredentials,
  AnalyticsResponse,
  BatchAnalyticsResponse,
  PlatformError,
  SocialAnalyticsConfig,
} from "./types";
import { SocialMediaRateLimiter } from "./rate-limiter";
import { FacebookAnalyticsClient } from "./facebook-client";
import { InstagramAnalyticsClient } from "./instagram-client";
import { SocialMediaDataNormalizer } from "./data-normalizer";

export class RealSocialAnalyticsService {
  private prisma: PrismaClient;
  private rateLimiter: SocialMediaRateLimiter;
  private facebookClient: FacebookAnalyticsClient;
  private instagramClient: InstagramAnalyticsClient;
  private config: SocialAnalyticsConfig;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
    this.rateLimiter = new SocialMediaRateLimiter();
    this.facebookClient = new FacebookAnalyticsClient(this.rateLimiter);
    this.instagramClient = new InstagramAnalyticsClient(this.rateLimiter);
    this.config = this.getDefaultConfig();
  }

  /**
   * Collect analytics for a specific post across all connected platforms
   */
  async collectPostAnalytics(postId: string): Promise<{
    success: boolean;
    results: AnalyticsResponse[];
    errors: PlatformError[];
  }> {
    try {
      // Get post with social accounts
      const post = await this.prisma.post.findUnique({
        where: { id: postId },
        include: {
          postSocialAccounts: {
            where: { status: "PUBLISHED" },
            include: {
              socialAccount: true,
            },
          },
        },
      });

      if (!post) {
        throw new Error(`Post ${postId} not found`);
      }

      const results: AnalyticsResponse[] = [];
      const errors: PlatformError[] = [];

      // Process each published platform
      for (const psa of post.postSocialAccounts) {
        if (!psa.platformPostId) {
          continue; // Skip if no platform post ID
        }

        try {
          // Get credentials for this social account
          const credentials = await this.getAccountCredentials(
            psa.socialAccountId
          );
          if (!credentials) {
            errors.push({
              platform: psa.socialAccount.platform,
              code: "MISSING_CREDENTIALS",
              message: `No credentials found for ${psa.socialAccount.platform} account`,
              type: "AUTH_ERROR",
              timestamp: new Date(),
            });
            continue;
          }

          // Collect analytics based on platform
          const result = await this.collectPlatformAnalytics(
            psa.socialAccount.platform,
            psa.platformPostId,
            credentials,
            postId
          );

          results.push(result);

          // Store analytics data in database if successful
          if (result.success && result.data) {
            await this.storeAnalyticsData(psa.id, result.data);
          } else if (result.error) {
            errors.push(result.error);
          }
        } catch (error: any) {
          errors.push({
            platform: psa.socialAccount.platform,
            code: "COLLECTION_ERROR",
            message: error.message,
            type: "API_ERROR",
            timestamp: new Date(),
          });
        }
      }

      return {
        success: errors.length === 0,
        results,
        errors,
      };
    } catch (error: any) {
      return {
        success: false,
        results: [],
        errors: [
          {
            platform: SocialPlatform.FACEBOOK, // Default platform for general errors
            code: "SERVICE_ERROR",
            message: error.message,
            type: "API_ERROR",
            timestamp: new Date(),
          },
        ],
      };
    }
  }

  /**
   * Collect analytics for multiple posts in batch
   */
  async collectBatchAnalytics(postIds: string[]): Promise<{
    totalPosts: number;
    successCount: number;
    errorCount: number;
    platformResults: Record<SocialPlatform, BatchAnalyticsResponse>;
    errors: PlatformError[];
  }> {
    const allErrors: PlatformError[] = [];
    const platformResults: Record<SocialPlatform, BatchAnalyticsResponse> =
      {} as any;
    let successCount = 0;
    let errorCount = 0;

    // Initialize platform results
    Object.values(SocialPlatform).forEach((platform) => {
      platformResults[platform] = {
        platform,
        results: [],
        totalRequests: 0,
        successCount: 0,
        errorCount: 0,
        rateLimitHit: false,
      };
    });

    // Process posts in smaller batches to manage memory and rate limits
    const batchSize = 5;
    const batches = this.chunkArray(postIds, batchSize);

    for (const batch of batches) {
      const batchPromises = batch.map((postId) =>
        this.collectPostAnalytics(postId)
      );
      const batchResults = await Promise.allSettled(batchPromises);

      for (const result of batchResults) {
        if (result.status === "fulfilled") {
          const postResult = result.value;

          if (postResult.success) {
            successCount++;
          } else {
            errorCount++;
          }

          // Aggregate results by platform
          for (const analyticsResult of postResult.results) {
            const platform = this.extractPlatformFromResult(analyticsResult);
            if (platform) {
              platformResults[platform].results.push(analyticsResult);
              platformResults[platform].totalRequests++;

              if (analyticsResult.success) {
                platformResults[platform].successCount++;
              } else {
                platformResults[platform].errorCount++;

                if (analyticsResult.error?.type === "RATE_LIMIT") {
                  platformResults[platform].rateLimitHit = true;
                }
              }
            }
          }

          allErrors.push(...postResult.errors);
        } else {
          errorCount++;
          allErrors.push({
            platform: SocialPlatform.FACEBOOK,
            code: "BATCH_ERROR",
            message: result.reason?.message || "Unknown batch error",
            type: "API_ERROR",
            timestamp: new Date(),
          });
        }
      }

      // Add delay between batches to avoid overwhelming the APIs
      if (batches.indexOf(batch) < batches.length - 1) {
        await this.sleep(2000);
      }
    }

    return {
      totalPosts: postIds.length,
      successCount,
      errorCount,
      platformResults,
      errors: allErrors,
    };
  }

  /**
   * Get analytics data from database for a post
   */
  async getStoredAnalytics(postId: string): Promise<{
    success: boolean;
    data?: any;
    error?: string;
  }> {
    try {
      const post = await this.prisma.post.findUnique({
        where: { id: postId },
        include: {
          postSocialAccounts: {
            include: {
              socialAccount: true,
              analytics: {
                orderBy: { recordedAt: "desc" },
                take: 7, // Last 7 days
              },
            },
          },
        },
      });

      if (!post) {
        return {
          success: false,
          error: "Post not found",
        };
      }

      // Format data to match expected structure
      const platforms = post.postSocialAccounts.map((psa) => ({
        platform: psa.socialAccount.platform,
        overview: this.calculateOverview(psa.analytics),
        historical: psa.analytics.map((analytics) => ({
          date: analytics.recordedAt.toISOString().split("T")[0],
          views: analytics.views,
          likes: analytics.likes,
          comments: analytics.comments,
          shares: analytics.shares,
          clicks: analytics.clicks || 0,
          reach: analytics.reach,
          impressions: analytics.impressions,
          engagement: analytics.engagement,
        })),
        demographics: this.generateDemographics(psa.socialAccount.platform),
      }));

      return {
        success: true,
        data: {
          postId,
          platforms,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Schedule automatic analytics collection for all published posts
   */
  async scheduleAnalyticsCollection(): Promise<void> {
    try {
      // Get all published posts from the last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const publishedPosts = await this.prisma.postSocialAccount.findMany({
        where: {
          status: "PUBLISHED",
          publishedAt: {
            gte: thirtyDaysAgo,
          },
          platformPostId: {
            not: null,
          },
        },
        select: {
          postId: true,
        },
        distinct: ["postId"],
      });

      const postIds = publishedPosts.map((p) => p.postId);

      console.log(
        `🔄 Starting scheduled analytics collection for ${postIds.length} posts`
      );

      const result = await this.collectBatchAnalytics(postIds);

      console.log(`✅ Analytics collection completed:`, {
        totalPosts: result.totalPosts,
        successCount: result.successCount,
        errorCount: result.errorCount,
        errors: result.errors.length,
      });

      // Log platform-specific results
      Object.entries(result.platformResults).forEach(
        ([platform, platformResult]) => {
          if (platformResult.totalRequests > 0) {
            console.log(`📊 ${platform}:`, {
              requests: platformResult.totalRequests,
              success: platformResult.successCount,
              errors: platformResult.errorCount,
              rateLimitHit: platformResult.rateLimitHit,
            });
          }
        }
      );
    } catch (error: any) {
      console.error("❌ Scheduled analytics collection failed:", error);
    }
  }

  /**
   * Private helper methods
   */

  private async collectPlatformAnalytics(
    platform: SocialPlatform,
    platformPostId: string,
    credentials: PlatformCredentials,
    postId: string
  ): Promise<AnalyticsResponse> {
    switch (platform) {
      case SocialPlatform.FACEBOOK:
        return await this.facebookClient.getPostAnalytics(
          platformPostId,
          credentials,
          postId
        );

      case SocialPlatform.INSTAGRAM:
        return await this.instagramClient.getPostAnalytics(
          platformPostId,
          credentials,
          postId
        );

      default:
        return {
          success: false,
          error: {
            platform,
            code: "UNSUPPORTED_PLATFORM",
            message: `Analytics collection not implemented for ${platform}`,
            type: "API_ERROR",
            timestamp: new Date(),
          },
        };
    }
  }

  private async getAccountCredentials(
    socialAccountId: string
  ): Promise<PlatformCredentials | null> {
    try {
      const account = await this.prisma.socialAccount.findUnique({
        where: { id: socialAccountId },
        select: {
          accessToken: true,
          refreshToken: true,
          expiresAt: true,
          platform: true,
          profileId: true,
        },
      });

      if (!account || !account.accessToken) {
        console.log(`❌ No credentials found for account ${socialAccountId}`);
        return null;
      }

      // Return credentials in the format expected by platform clients
      return {
        accessToken: account.accessToken,
        refreshToken: account.refreshToken || undefined,
        expiresAt: account.expiresAt || undefined,
        pageId: account.profileId || undefined, // Use profileId as pageId for Facebook
        userId: account.profileId || undefined, // Use profileId as userId for Instagram
      };
    } catch (error) {
      console.error("Error getting account credentials:", error);
      return null;
    }
  }

  private async storeAnalyticsData(
    postSocialAccountId: string,
    analyticsData: SocialAnalyticsData
  ): Promise<void> {
    await this.prisma.postAnalytics.create({
      data: {
        postSocialAccountId,
        views: analyticsData.views,
        likes: analyticsData.likes,
        comments: analyticsData.comments,
        shares: analyticsData.shares,
        clicks: analyticsData.clicks || 0,
        reach: analyticsData.reach,
        impressions: analyticsData.impressions,
        engagement: analyticsData.engagement,
        recordedAt: analyticsData.recordedAt,
      },
    });
  }

  private calculateOverview(analytics: any[]): any {
    if (analytics.length === 0) {
      return { views: 0, likes: 0, engagement: 0 };
    }

    const latest = analytics[0];
    return {
      views: latest.views,
      likes: latest.likes,
      comments: latest.comments,
      shares: latest.shares,
      reach: latest.reach,
      impressions: latest.impressions,
      engagement: latest.engagement,
    };
  }

  private generateDemographics(platform: SocialPlatform): any {
    // This would be replaced with real demographic data from the platform APIs
    return {
      ageGroups: {
        "18-24": 25,
        "25-34": 35,
        "35-44": 20,
        "45-54": 15,
        "55+": 5,
      },
      gender: {
        male: 45,
        female: 53,
        other: 2,
      },
      topCountries: [
        { country: "US", percentage: 40 },
        { country: "CA", percentage: 15 },
        { country: "UK", percentage: 12 },
        { country: "AU", percentage: 8 },
        { country: "DE", percentage: 6 },
      ],
    };
  }

  private extractPlatformFromResult(
    result: AnalyticsResponse
  ): SocialPlatform | null {
    if (result.data) {
      return result.data.platform;
    }
    if (result.error) {
      return result.error.platform;
    }
    return null;
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private getDefaultConfig(): SocialAnalyticsConfig {
    return {
      platforms: {} as any, // Would be populated with platform-specific configs
      defaultRetryStrategy: {
        maxRetries: 3,
        baseDelay: 1000,
        maxDelay: 30000,
        backoffMultiplier: 2,
        jitterEnabled: true,
      },
      maxConcurrentRequests: 10,
      requestTimeout: 30000,
      cacheEnabled: true,
      cacheTtl: 300000, // 5 minutes
    };
  }
}
