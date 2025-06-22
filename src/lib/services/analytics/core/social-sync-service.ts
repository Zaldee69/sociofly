import { PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma/client";
import {
  UnifiedMetaClient,
  UnifiedMetaCredentials,
} from "@/lib/services/analytics/clients/unified-meta-client";
import { SocialMediaRateLimiter } from "@/lib/services/analytics/clients/rate-limiter";
import {
  InitialSyncJobData,
  IncrementalSyncJobData,
  DailySyncJobData,
} from "@/lib/queue/job-types";
import { HotspotAnalyzer } from "../hotspots/hotspot-analyzer";

export interface SyncResult {
  success: boolean;
  accountId: string;
  syncType: "initial" | "incremental" | "daily";
  postsProcessed: number;
  analyticsUpdated: number;
  errors: string[];
  executionTimeMs: number;
}

/**
 * Simplified Social Sync Service using Unified Meta Client
 * Eliminates redundancy and provides clean webhook-free sync
 */
export class SocialSyncService {
  private prisma: PrismaClient;
  private rateLimiter: SocialMediaRateLimiter;

  constructor(prismaClient?: PrismaClient) {
    this.prisma = prismaClient || prisma;
    this.rateLimiter = new SocialMediaRateLimiter();
  }

  /**
   * 1. Initial Sync - Triggered when user connects a social media account for the first time
   * Purpose: Fetch historical post and analytics data (e.g., last 30–90 days)
   */
  async performInitialSync(data: InitialSyncJobData): Promise<SyncResult> {
    const startTime = Date.now();
    console.log(
      `🚀 Starting initial sync for account ${data.accountId} (${data.platform})`
    );

    const result: SyncResult = {
      success: false,
      accountId: data.accountId,
      syncType: "initial",
      postsProcessed: 0,
      analyticsUpdated: 0,
      errors: [],
      executionTimeMs: 0,
    };

    try {
      // Get social account details
      const socialAccount = await this.prisma.socialAccount.findUnique({
        where: { id: data.accountId },
        include: { team: true, user: true },
      });

      if (!socialAccount) {
        throw new Error(`Social account ${data.accountId} not found`);
      }

      // Create unified client
      const unifiedClient = new UnifiedMetaClient(
        {
          accessToken: socialAccount.accessToken,
          refreshToken: socialAccount.refreshToken || undefined,
          expiresAt: socialAccount.expiresAt || undefined,
          platform: socialAccount.platform as "INSTAGRAM" | "FACEBOOK",
          profileId: socialAccount.profileId || undefined,
        },
        this.rateLimiter
      );

      // Validate access token
      const tokenValidation = await unifiedClient.validateToken();
      if (!tokenValidation.isValid) {
        throw new Error(`Invalid access token: ${tokenValidation.error}`);
      }

      console.log(`✅ Token valid for ${data.platform} account`);

      // Set historical date range (default 30-90 days)
      const daysBack = data.daysBack || 30;
      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - daysBack);

      const since = Math.floor(fromDate.getTime() / 1000).toString();

      // Fetch historical media and analytics
      const mediaAnalytics = await unifiedClient.getMediaAnalytics(
        socialAccount.profileId || socialAccount.id,
        50, // Larger limit for historical sync
        since
      );

      // Process each media item
      for (const media of mediaAnalytics) {
        try {
          await this.processMediaAnalytics(media, socialAccount, result);
        } catch (error: any) {
          console.warn(`⚠️ Failed to process media ${media.id}:`, error);
          result.errors.push(`Media ${media.id}: ${error.message}`);
        }
      }

      // Update sync metadata in TaskLog
      await this.logSyncCompletion(data.accountId, "initial", result);

      result.success = true;
      result.executionTimeMs = Date.now() - startTime;

      console.log(
        `✅ Initial sync completed for ${data.accountId}: ${result.postsProcessed} posts, ${result.analyticsUpdated} analytics`
      );
    } catch (error: any) {
      console.error(`❌ Initial sync failed for ${data.accountId}:`, error);
      result.errors.push(error.message);
      result.executionTimeMs = Date.now() - startTime;
    }

    return result;
  }

  /**
   * 2. Incremental Sync - Scheduled every 1–2 hours per connected account
   * Purpose: Sync newly created posts and update engagement for recent content
   */
  async performIncrementalSync(
    data: IncrementalSyncJobData
  ): Promise<SyncResult> {
    const startTime = Date.now();
    console.log(
      `🔄 Starting incremental sync for account ${data.accountId} (${data.platform})`
    );

    const result: SyncResult = {
      success: false,
      accountId: data.accountId,
      syncType: "incremental",
      postsProcessed: 0,
      analyticsUpdated: 0,
      errors: [],
      executionTimeMs: 0,
    };

    try {
      // Handle special case: "system" means process all accounts
      if (data.accountId === "system") {
        return await this.performIncrementalSyncForAllAccounts(data, startTime);
      }

      // Get social account details
      const socialAccount = await this.prisma.socialAccount.findUnique({
        where: { id: data.accountId },
      });

      if (!socialAccount) {
        throw new Error(`Social account ${data.accountId} not found`);
      }

      // Use the extracted helper method
      const singleAccountResult =
        await this.performIncrementalSyncForSingleAccount(data, socialAccount);

      // Copy results
      result.success = singleAccountResult.success;
      result.postsProcessed = singleAccountResult.postsProcessed;
      result.analyticsUpdated = singleAccountResult.analyticsUpdated;
      result.errors = singleAccountResult.errors;
      result.executionTimeMs = Date.now() - startTime;

      console.log(
        `✅ Incremental sync completed for ${data.accountId}: ${result.postsProcessed} posts, ${result.analyticsUpdated} analytics`
      );
    } catch (error: any) {
      console.error(`❌ Incremental sync failed for ${data.accountId}:`, error);
      result.errors.push(error.message);
      result.executionTimeMs = Date.now() - startTime;
    }

    return result;
  }

  /**
   * 3. Daily Sync - Scheduled once daily, typically at 01:00 AM
   * Purpose: Update slow-changing metrics (e.g., follower growth, demographics)
   */
  async performDailySync(data: DailySyncJobData): Promise<SyncResult> {
    const startTime = Date.now();
    console.log(
      `📊 Starting daily sync for account ${data.accountId} (${data.platform})`
    );

    const result: SyncResult = {
      success: false,
      accountId: data.accountId,
      syncType: "daily",
      postsProcessed: 0,
      analyticsUpdated: 0,
      errors: [],
      executionTimeMs: 0,
    };

    try {
      // Handle special case: "system" means process all accounts
      if (data.accountId === "system") {
        return await this.performDailySyncForAllAccounts(data, startTime);
      }

      // Get social account details
      const socialAccount = await this.prisma.socialAccount.findUnique({
        where: { id: data.accountId },
      });

      if (!socialAccount) {
        throw new Error(`Social account ${data.accountId} not found`);
      }

      // Use the extracted helper method
      const singleAccountResult = await this.performDailySyncForSingleAccount(
        data,
        socialAccount
      );

      // Copy results
      result.success = singleAccountResult.success;
      result.analyticsUpdated = singleAccountResult.analyticsUpdated;
      result.errors = singleAccountResult.errors;
      result.executionTimeMs = Date.now() - startTime;

      console.log(
        `✅ Daily sync completed for ${data.accountId}: ${result.analyticsUpdated} analytics updated`
      );
    } catch (error: any) {
      console.error(`❌ Daily sync failed for ${data.accountId}:`, error);
      result.errors.push(error.message);
      result.executionTimeMs = Date.now() - startTime;
    }

    return result;
  }

  /**
   * Perform daily sync for all social accounts
   */
  private async performDailySyncForAllAccounts(
    data: DailySyncJobData,
    startTime: number
  ): Promise<SyncResult> {
    console.log(`📊 Starting daily sync for ALL accounts...`);

    const result: SyncResult = {
      success: false,
      accountId: "system",
      syncType: "daily",
      postsProcessed: 0,
      analyticsUpdated: 0,
      errors: [],
      executionTimeMs: 0,
    };

    try {
      // Get all active social accounts with valid access tokens
      const socialAccounts = await this.prisma.socialAccount.findMany({
        where: {
          // Only include Instagram and Facebook for now
          platform: {
            in: ["INSTAGRAM", "FACEBOOK"],
          },
        },
        include: {
          team: true,
          user: true,
        },
      });

      // Filter accounts with valid access tokens
      const validAccounts = socialAccounts.filter(
        (account) => account.accessToken && account.accessToken.trim() !== ""
      );

      console.log(
        `📊 Found ${validAccounts.length} valid social accounts to sync (out of ${socialAccounts.length} total)`
      );

      if (validAccounts.length === 0) {
        result.success = true;
        result.executionTimeMs = Date.now() - startTime;
        console.log(`ℹ️ No valid social accounts found for daily sync`);
        return result;
      }

      // Process each account
      let successCount = 0;
      let totalAnalyticsUpdated = 0;

      for (const account of validAccounts) {
        try {
          console.log(
            `📊 Processing daily sync for account ${account.id} (${account.platform})`
          );

          // Create individual sync data for this account
          const accountSyncData: DailySyncJobData = {
            accountId: account.id,
            teamId: account.teamId,
            platform: account.platform as any,
            includeAudience: data.includeAudience,
            includeHashtags: data.includeHashtags,
            includeLinks: data.includeLinks,
          };

          // Perform sync for this specific account
          const accountResult = await this.performDailySyncForSingleAccount(
            accountSyncData,
            account
          );

          if (accountResult.success) {
            successCount++;
            totalAnalyticsUpdated += accountResult.analyticsUpdated;
          } else {
            result.errors.push(
              `Account ${account.id}: ${accountResult.errors.join(", ")}`
            );
          }
        } catch (error: any) {
          console.error(
            `❌ Daily sync failed for account ${account.id}:`,
            error
          );
          result.errors.push(`Account ${account.id}: ${error.message}`);
        }
      }

      result.analyticsUpdated = totalAnalyticsUpdated;
      result.success = result.errors.length === 0;
      result.executionTimeMs = Date.now() - startTime;

      console.log(
        `✅ Daily sync for all accounts completed: ${successCount}/${validAccounts.length} successful, ${totalAnalyticsUpdated} analytics updated`
      );

      return result;
    } catch (error: any) {
      console.error(`❌ Daily sync for all accounts failed:`, error);
      result.errors.push(error.message);
      result.executionTimeMs = Date.now() - startTime;
      return result;
    }
  }

  /**
   * Perform incremental sync for all social accounts
   */
  private async performIncrementalSyncForAllAccounts(
    data: IncrementalSyncJobData,
    startTime: number
  ): Promise<SyncResult> {
    console.log(`🔄 Starting incremental sync for ALL accounts...`);

    const result: SyncResult = {
      success: false,
      accountId: "system",
      syncType: "incremental",
      postsProcessed: 0,
      analyticsUpdated: 0,
      errors: [],
      executionTimeMs: 0,
    };

    try {
      // Get all active social accounts with valid access tokens
      const socialAccounts = await this.prisma.socialAccount.findMany({
        where: {
          // Only include Instagram and Facebook for now
          platform: {
            in: ["INSTAGRAM", "FACEBOOK"],
          },
        },
        include: {
          team: true,
          user: true,
        },
      });

      // Filter accounts with valid access tokens
      const validAccounts = socialAccounts.filter(
        (account) => account.accessToken && account.accessToken.trim() !== ""
      );

      console.log(
        `🔄 Found ${validAccounts.length} valid social accounts to sync (out of ${socialAccounts.length} total)`
      );

      // Debug: Log details about each account
      validAccounts.forEach((account, index) => {
        console.log(
          `🔄 Account ${index + 1}: ${account.id} (${account.platform}) - Access Token: ${account.accessToken ? "Present" : "Missing"}`
        );
      });

      if (validAccounts.length === 0) {
        result.success = true;
        result.executionTimeMs = Date.now() - startTime;
        console.log(`ℹ️ No valid social accounts found for incremental sync`);
        return result;
      }

      // Process each account
      let successCount = 0;
      let totalPostsProcessed = 0;
      let totalAnalyticsUpdated = 0;

      for (const account of validAccounts) {
        try {
          console.log(
            `🔄 Processing incremental sync for account ${account.id} (${account.platform})`
          );

          // Create individual sync data for this account
          const accountSyncData: IncrementalSyncJobData = {
            accountId: account.id,
            teamId: account.teamId,
            platform: account.platform as any,
            limit: data.limit,
            lastSyncDate: data.lastSyncDate,
          };

          // Perform sync for this specific account
          const accountResult =
            await this.performIncrementalSyncForSingleAccount(
              accountSyncData,
              account
            );

          if (accountResult.success) {
            successCount++;
            totalPostsProcessed += accountResult.postsProcessed;
            totalAnalyticsUpdated += accountResult.analyticsUpdated;
          } else {
            result.errors.push(
              `Account ${account.id}: ${accountResult.errors.join(", ")}`
            );
          }
        } catch (error: any) {
          console.error(
            `❌ Incremental sync failed for account ${account.id}:`,
            error
          );
          result.errors.push(`Account ${account.id}: ${error.message}`);
        }
      }

      result.postsProcessed = totalPostsProcessed;
      result.analyticsUpdated = totalAnalyticsUpdated;
      result.success = result.errors.length === 0;
      result.executionTimeMs = Date.now() - startTime;

      console.log(
        `✅ Incremental sync for all accounts completed: ${successCount}/${validAccounts.length} successful, ${totalPostsProcessed} posts, ${totalAnalyticsUpdated} analytics`
      );

      return result;
    } catch (error: any) {
      console.error(`❌ Incremental sync for all accounts failed:`, error);
      result.errors.push(error.message);
      result.executionTimeMs = Date.now() - startTime;
      return result;
    }
  }

  /**
   * Perform incremental sync for a single account (extracted logic)
   */
  private async performIncrementalSyncForSingleAccount(
    data: IncrementalSyncJobData,
    socialAccount: any
  ): Promise<SyncResult> {
    const result: SyncResult = {
      success: false,
      accountId: data.accountId,
      syncType: "incremental",
      postsProcessed: 0,
      analyticsUpdated: 0,
      errors: [],
      executionTimeMs: 0,
    };

    try {
      // Get last sync date from TaskLog or use provided date
      const lastSyncDate =
        data.lastSyncDate ||
        (await this.getLastSyncDate(data.accountId, "incremental"));

      console.log(`📅 Last sync: ${lastSyncDate?.toISOString() || "Never"}`);

      // Create unified client
      const unifiedClient = new UnifiedMetaClient(
        {
          accessToken: socialAccount.accessToken,
          refreshToken: socialAccount.refreshToken || undefined,
          expiresAt: socialAccount.expiresAt || undefined,
          platform: socialAccount.platform as "INSTAGRAM" | "FACEBOOK",
          profileId: socialAccount.profileId || undefined,
        },
        this.rateLimiter
      );

      // Validate access token
      const tokenValidation = await unifiedClient.validateToken();
      if (!tokenValidation.isValid) {
        throw new Error(`Invalid access token: ${tokenValidation.error}`);
      }

      // Fetch recent posts (limit=25, filtered by since=lastSyncDate)
      const limit = data.limit || 25;
      const since = lastSyncDate
        ? Math.floor(lastSyncDate.getTime() / 1000).toString()
        : undefined;

      console.log(
        `🔄 Fetching media analytics with limit=${limit}, since=${since || "no date filter"}`
      );

      const mediaAnalytics = await unifiedClient.getMediaAnalytics(
        socialAccount.profileId || socialAccount.id,
        limit,
        since
      );

      console.log(
        `📊 Retrieved ${mediaAnalytics.length} media items for account ${socialAccount.id}`
      );

      // Process each media item
      for (const media of mediaAnalytics) {
        try {
          console.log(`📊 Processing media ${media.id} (${media.platform})`);
          await this.processMediaAnalytics(media, socialAccount, result, true);
          console.log(`✅ Successfully processed media ${media.id}`);
        } catch (error: any) {
          console.warn(`⚠️ Failed to process media ${media.id}:`, error);
          result.errors.push(`Media ${media.id}: ${error.message}`);
        }
      }

      // Update today's analytics for existing posts
      await this.updateTodaysAnalytics(data.accountId, result);

      // Run hotspot analysis after all post data is updated
      if (result.postsProcessed > 0 || result.analyticsUpdated > 0) {
        try {
          console.log(
            `🔥 Running hotspot analysis for account ${socialAccount.id}`
          );
          await HotspotAnalyzer.analyzeAndStoreHotspots(socialAccount.id);
          console.log(
            `✅ Hotspot analysis completed for account ${socialAccount.id}`
          );
        } catch (error: any) {
          console.warn(
            `⚠️ Hotspot analysis failed for account ${socialAccount.id}:`,
            error
          );
          result.errors.push(`Hotspot analysis: ${error.message}`);
        }
      }

      result.success = true;

      console.log(
        `🔄 Incremental sync completed for account ${data.accountId}:`,
        {
          postsProcessed: result.postsProcessed,
          analyticsUpdated: result.analyticsUpdated,
          errors: result.errors.length,
        }
      );

      return result;
    } catch (error: any) {
      result.errors.push(error.message);
      return result;
    }
  }

  /**
   * Perform daily sync for a single account (extracted logic)
   */
  private async performDailySyncForSingleAccount(
    data: DailySyncJobData,
    socialAccount: any
  ): Promise<SyncResult> {
    const result: SyncResult = {
      success: false,
      accountId: data.accountId,
      syncType: "daily",
      postsProcessed: 0,
      analyticsUpdated: 0,
      errors: [],
      executionTimeMs: 0,
    };

    try {
      // Create unified client
      const unifiedClient = new UnifiedMetaClient(
        {
          accessToken: socialAccount.accessToken,
          refreshToken: socialAccount.refreshToken || undefined,
          expiresAt: socialAccount.expiresAt || undefined,
          platform: socialAccount.platform as "INSTAGRAM" | "FACEBOOK",
          profileId: socialAccount.profileId || undefined,
        },
        this.rateLimiter
      );

      // Validate access token
      const tokenValidation = await unifiedClient.validateToken();
      if (!tokenValidation.isValid) {
        throw new Error(`Invalid access token: ${tokenValidation.error}`);
      }

      // Update account-level analytics
      await this.updateAccountAnalytics(socialAccount, unifiedClient, result);

      // NEW: Aggregate post-level metrics for comprehensive analytics
      await this.aggregatePostMetrics(socialAccount, unifiedClient, result);

      // Calculate daily deltas for trend analysis
      await this.calculateDailyDeltas(data.accountId, result);

      result.success = true;

      return result;
    } catch (error: any) {
      result.errors.push(error.message);
      return result;
    }
  }

  // Helper methods
  private async processMediaAnalytics(
    media: any,
    socialAccount: any,
    result: SyncResult,
    isIncremental: boolean = false
  ): Promise<void> {
    console.log(
      `📊 Processing media analytics for ${media.id} (isIncremental: ${isIncremental})`
    );

    // Check if post already exists
    let postSocialAccount = await this.prisma.postSocialAccount.findFirst({
      where: {
        socialAccountId: socialAccount.id,
        platformPostId: media.id,
      },
    });

    if (!postSocialAccount) {
      console.log(`📝 Creating new post for media ${media.id}`);

      // Create new post entry
      const post = await this.prisma.post.create({
        data: {
          content: media.content || "",
          mediaUrls: media.mediaUrls || [],
          scheduledAt: new Date(media.timestamp),
          platform: socialAccount.platform,
          status: "PUBLISHED",
          publishedAt: new Date(media.timestamp),
          userId: socialAccount.userId,
          teamId: socialAccount.teamId,
        },
      });

      // Create PostSocialAccount junction
      postSocialAccount = await this.prisma.postSocialAccount.create({
        data: {
          postId: post.id,
          socialAccountId: socialAccount.id,
          status: "PUBLISHED",
          publishedAt: new Date(media.timestamp),
          platformPostId: media.id,
        },
      });

      result.postsProcessed++;
      console.log(
        `✅ Created new post, postsProcessed now: ${result.postsProcessed}`
      );
    } else {
      console.log(`📄 Post already exists for media ${media.id}`);

      // Update existing post with media URLs if not already set
      const existingPost = await this.prisma.post.findUnique({
        where: { id: postSocialAccount.postId },
        select: { mediaUrls: true },
      });

      if (
        existingPost &&
        (!existingPost.mediaUrls || existingPost.mediaUrls.length === 0) &&
        media.mediaUrls &&
        media.mediaUrls.length > 0
      ) {
        console.log(
          `📸 Updating post ${postSocialAccount.postId} with media URLs`
        );
        await this.prisma.post.update({
          where: { id: postSocialAccount.postId },
          data: {
            mediaUrls: media.mediaUrls,
          },
        });
        console.log(
          `✅ Updated post with ${media.mediaUrls.length} media URLs`
        );
      }
    }

    // For incremental sync, only create today's analytics if not exists
    if (isIncremental) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const existingAnalytics = await this.prisma.postAnalytics.findFirst({
        where: {
          postSocialAccountId: postSocialAccount.id,
          recordedAt: {
            gte: today,
          },
        },
      });

      if (existingAnalytics) {
        console.log(
          `📊 Analytics already exist for today for media ${media.id}, skipping...`
        );
        return; // Skip if today's analytics already exists
      }
    }

    console.log(`📊 Creating analytics entry for media ${media.id}`);
    console.log(`📊 Insights data:`, {
      views: media.insights.video_views || 0,
      likes: media.insights.likes,
      comments: media.insights.comments,
      shares: media.insights.shares,
      saves: media.insights.saves || 0,
      reach: media.insights.reach,
      impressions: media.insights.impressions,
      engagement: media.insights.engagement,
    });

    // Create analytics entry
    await this.prisma.postAnalytics.create({
      data: {
        postSocialAccountId: postSocialAccount.id,
        views: media.insights.video_views || 0,
        likes: media.insights.likes,
        comments: media.insights.comments,
        shares: media.insights.shares,
        saves: media.insights.saves || 0,
        reach: media.insights.reach,
        impressions: media.insights.impressions,
        engagement: media.insights.engagement,
        clicks: media.insights.clicks || 0,
        reactions: media.insights.reactions || 0,
        recordedAt: new Date(),
        rawInsights: media.rawData,
      },
    });

    result.analyticsUpdated++;
    console.log(
      `✅ Created analytics entry, analyticsUpdated now: ${result.analyticsUpdated}`
    );
  }

  /**
   * Aggregate post-level metrics to get comprehensive analytics
   * This solves the limitation where account insights don't provide total likes, comments, etc.
   */
  private async aggregatePostMetrics(
    socialAccount: any,
    unifiedClient: UnifiedMetaClient,
    result: SyncResult
  ): Promise<void> {
    try {
      console.log(
        `📊 Aggregating post metrics for ${socialAccount.platform} account ${socialAccount.id}`
      );

      // Get recent posts (last 30 days) to aggregate metrics
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const since = Math.floor(thirtyDaysAgo.getTime() / 1000).toString();

      const mediaAnalytics = await unifiedClient.getMediaAnalytics(
        socialAccount.profileId || socialAccount.id,
        25, // Consistent with Post Performance limit
        since
      );

      console.log(
        `📊 Retrieved ${mediaAnalytics.length} recent posts for aggregation`
      );

      if (mediaAnalytics.length === 0) {
        console.log(`ℹ️ No recent posts found for aggregation`);
        return;
      }

      // Aggregate metrics from all posts
      let totalLikes = 0;
      let totalComments = 0;
      let totalShares = 0;
      let totalSaves = 0;
      let totalViews = 0;
      let totalReach = 0;
      let totalEngagement = 0;

      for (const media of mediaAnalytics) {
        totalLikes += media.insights.likes || 0;
        totalComments += media.insights.comments || 0;
        totalShares += media.insights.shares || 0;
        totalSaves += media.insights.saves || 0;
        totalViews += media.insights.impressions || 0; // Using impressions as views
        totalReach += media.insights.reach || 0;
        totalEngagement += media.insights.engagement || 0;
      }

      // Calculate averages per post
      const postCount = mediaAnalytics.length;
      const avgLikesPerPost = postCount > 0 ? totalLikes / postCount : 0;
      const avgCommentsPerPost = postCount > 0 ? totalComments / postCount : 0;
      const avgSharesPerPost = postCount > 0 ? totalShares / postCount : 0;
      const avgSavesPerPost = postCount > 0 ? totalSaves / postCount : 0;
      const avgReachPerPost =
        postCount > 0 ? Math.round(totalReach / postCount) : 0;
      const avgEngagementPerPost =
        postCount > 0
          ? (totalLikes + totalComments + totalShares + totalSaves) / postCount
          : 0;

      console.log(`📊 Aggregated metrics:`, {
        totalLikes,
        totalComments,
        totalShares,
        totalSaves,
        totalViews,
        totalReach,
        totalEngagement,
        postsAnalyzed: mediaAnalytics.length,
        // Log calculated averages
        avgLikesPerPost: avgLikesPerPost.toFixed(1),
        avgCommentsPerPost: avgCommentsPerPost.toFixed(1),
        avgSharesPerPost: avgSharesPerPost.toFixed(1),
        avgSavesPerPost: avgSavesPerPost.toFixed(1),
        avgReachPerPost,
        avgEngagementPerPost: avgEngagementPerPost.toFixed(1),
      });

      // Check if aggregated analytics already exists for today
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const existingAggregation = await this.prisma.accountAnalytics.findFirst({
        where: {
          socialAccountId: socialAccount.id,
          recordedAt: {
            gte: today,
          },
        },
      });

      if (existingAggregation) {
        // Update existing record with aggregated post metrics AND averages
        await this.prisma.accountAnalytics.update({
          where: { id: existingAggregation.id },
          data: {
            // Keep existing account-level data, add post aggregations
            totalLikes: totalLikes,
            totalComments: totalComments,
            totalShares: totalShares,
            totalSaves: totalSaves,
            // Update impressions with aggregated views if higher
            totalImpressions: Math.max(
              existingAggregation.totalImpressions || 0,
              totalViews
            ),
            totalReach: Math.max(
              existingAggregation.totalReach || 0,
              totalReach
            ),
            // IMPORTANT: Update totalFollowers field for dashboard
            totalFollowers: existingAggregation.followersCount || 0,
            totalPosts: mediaAnalytics.length,
            // Store analytics metadata
            postsAnalyzed: mediaAnalytics.length,
            totalPostsOnPlatform: existingAggregation.mediaCount || 0, // Keep platform total
            // Calculate and store averages per post
            avgLikesPerPost: avgLikesPerPost,
            avgCommentsPerPost: avgCommentsPerPost,
            avgSharesPerPost: avgSharesPerPost,
            avgSavesPerPost: avgSavesPerPost,
            avgReachPerPost: avgReachPerPost,
            avgEngagementPerPost: avgEngagementPerPost,
            // Calculate engagement rate
            engagementRate:
              totalViews > 0
                ? ((totalLikes + totalComments + totalShares + totalSaves) /
                    totalViews) *
                  100
                : 0,
          },
        });

        console.log(
          `✅ Updated existing analytics with aggregated post metrics and averages`
        );
      } else {
        // Create new record with aggregated metrics AND averages
        await this.prisma.accountAnalytics.create({
          data: {
            socialAccountId: socialAccount.id,
            followersCount: 0, // Will be updated by updateAccountAnalytics
            followingCount: 0,
            mediaCount: mediaAnalytics.length,
            totalReach: totalReach,
            totalImpressions: totalViews,
            totalLikes: totalLikes,
            totalComments: totalComments,
            totalShares: totalShares,
            totalSaves: totalSaves,
            // IMPORTANT: Set totalFollowers and totalPosts for dashboard
            totalFollowers: 0, // Will be updated by updateAccountAnalytics
            totalPosts: mediaAnalytics.length,
            // Store analytics metadata
            postsAnalyzed: mediaAnalytics.length,
            totalPostsOnPlatform: 0, // Will be updated by updateAccountAnalytics
            // Store calculated averages per post
            avgLikesPerPost: avgLikesPerPost,
            avgCommentsPerPost: avgCommentsPerPost,
            avgSharesPerPost: avgSharesPerPost,
            avgSavesPerPost: avgSavesPerPost,
            avgReachPerPost: avgReachPerPost,
            avgEngagementPerPost: avgEngagementPerPost,
            profileVisits: 0,
            bioLinkClicks: 0,
            followerGrowth: JSON.stringify({}),
            engagementRate:
              totalViews > 0
                ? ((totalLikes + totalComments + totalShares + totalSaves) /
                    totalViews) *
                  100
                : 0,
            recordedAt: new Date(),
          },
        });

        console.log(
          `✅ Created new analytics record with aggregated post metrics and averages`
        );
      }

      result.analyticsUpdated++;
    } catch (error: any) {
      console.warn(
        `⚠️ Failed to aggregate post metrics for ${socialAccount.platform}:`,
        error
      );
      result.errors.push(`Post aggregation: ${error.message}`);
    }
  }

  private async updateAccountAnalytics(
    socialAccount: any,
    unifiedClient: UnifiedMetaClient,
    result: SyncResult
  ): Promise<void> {
    try {
      console.log(
        `📊 Updating account analytics for ${socialAccount.platform} (ID: ${socialAccount.id})`
      );

      // Use the correct account ID based on platform
      const accountIdToUse = socialAccount.profileId || socialAccount.id;
      console.log(`📊 Using account ID: ${accountIdToUse}`);

      const accountInsights = await unifiedClient.getAccountInsights(
        accountIdToUse,
        "day" // Required period for interaction metrics in v22.0+
      );

      console.log(`📊 Retrieved insights:`, {
        follower_count: accountInsights.follower_count,
        media_count: accountInsights.media_count,
        impressions: accountInsights.impressions,
        reach: accountInsights.reach,
        profile_views: accountInsights.profile_views,
      });

      // Debug: Check if follower count is actually retrieved
      if (accountInsights.follower_count === 0) {
        console.warn(
          `⚠️ Follower count is 0 - this might indicate API limitations or account issues`
        );
      }

      // Check if analytics already exists for today
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const existingAnalytics = await this.prisma.accountAnalytics.findFirst({
        where: {
          socialAccountId: socialAccount.id,
          recordedAt: {
            gte: today,
          },
        },
      });

      if (existingAnalytics) {
        console.log(
          `📊 Analytics already exist for today, updating follower data...`
        );

        // Update existing record with latest follower data
        await this.prisma.accountAnalytics.update({
          where: { id: existingAnalytics.id },
          data: {
            followersCount: accountInsights.follower_count,
            mediaCount: accountInsights.media_count,
            // IMPORTANT: Update totalFollowers for dashboard
            totalFollowers: accountInsights.follower_count,
            totalPosts: accountInsights.media_count,
            // Update platform metadata
            totalPostsOnPlatform: accountInsights.media_count,
            profileVisits: accountInsights.profile_views || 0,
            bioLinkClicks: accountInsights.website_clicks || 0,
          },
        });

        result.analyticsUpdated++;
        console.log(`✅ Updated existing analytics with latest follower data`);
        return;
      }

      await this.prisma.accountAnalytics.create({
        data: {
          socialAccountId: socialAccount.id,
          followersCount: accountInsights.follower_count,
          followingCount: 0, // Not available in basic insights
          mediaCount: accountInsights.media_count,
          totalReach: accountInsights.reach,
          totalImpressions: accountInsights.impressions,
          // IMPORTANT: Set totalFollowers for dashboard compatibility
          totalFollowers: accountInsights.follower_count,
          totalPosts: accountInsights.media_count,
          profileVisits: accountInsights.profile_views || 0,
          bioLinkClicks: accountInsights.website_clicks || 0,
          followerGrowth: JSON.stringify({}), // Will be calculated in calculateDailyDeltas
          recordedAt: new Date(),
        },
      });

      result.analyticsUpdated++;
      console.log(
        `✅ Successfully updated account analytics for ${socialAccount.platform}`
      );
    } catch (error: any) {
      console.warn(
        `⚠️ Failed to update account analytics for ${socialAccount.platform}:`,
        error
      );
      result.errors.push(`Account analytics: ${error.message}`);
    }
  }

  private async getLastSyncDate(
    accountId: string,
    syncType: string
  ): Promise<Date | null> {
    const lastSync = await this.prisma.taskLog.findFirst({
      where: {
        name: {
          startsWith: `${syncType}_sync_${accountId}`,
        },
        status: "completed",
      },
      orderBy: {
        executedAt: "desc",
      },
    });

    return lastSync?.executedAt || null;
  }

  private async updateTodaysAnalytics(
    accountId: string,
    result: SyncResult
  ): Promise<void> {
    // Implementation for updating today's analytics for existing posts
    // This would involve fetching recent posts and updating their analytics
    console.log(`📊 Updating today's analytics for account ${accountId}`);
    // Placeholder - implement based on specific requirements
  }

  private async calculateDailyDeltas(
    accountId: string,
    result: SyncResult
  ): Promise<void> {
    // Implementation for calculating daily growth deltas
    console.log(`📈 Calculating daily deltas for account ${accountId}`);
    // Placeholder - implement based on specific requirements
  }

  private async logSyncCompletion(
    accountId: string,
    syncType: string,
    result: SyncResult
  ): Promise<void> {
    await this.prisma.taskLog.create({
      data: {
        name: `${syncType}_sync_${accountId}`,
        status: result.success ? "completed" : "failed",
        message: JSON.stringify({
          postsProcessed: result.postsProcessed,
          analyticsUpdated: result.analyticsUpdated,
          errors: result.errors,
          executionTimeMs: result.executionTimeMs,
        }),
        executedAt: new Date(),
      },
    });
  }
}
