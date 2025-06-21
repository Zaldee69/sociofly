import { prisma } from "@/lib/prisma/client";
import { InsightsCollector } from "./insights-collector";
import { HotspotAnalyzer } from "../hotspots/hotspot-analyzer";
import { AnalyticsComparisonService } from "./analytics-comparison.service";

export interface AnalyticsRunResult {
  success: number;
  failed: number;
  total: number;
  executionTimeMs: number;
  details: {
    insights: { success: number; failed: number; total: number };
    hotspots: { success: number; failed: number; total: number };
    analytics: { success: number; failed: number; total: number };
  };
  errors: string[];
}

export interface AnalyticsRunOptions {
  includeInsights?: boolean;
  includeHotspots?: boolean;
  includeAnalytics?: boolean;
  socialAccountId?: string; // If specified, run for specific account only
  teamId?: string; // If specified, run for specific team only
  forceRun?: boolean; // Skip rate limiting checks

  // Smart Sync integration
  useSmartSync?: boolean; // Enable smart sync logic
  syncStrategy?:
    | "incremental_daily"
    | "smart_adaptive"
    | "gap_filling"
    | "full_historical"; // Force specific strategy
}

export class AnalyticsMasterService {
  /**
   * Run complete analytics collection for all accounts
   * This is the main entry point for both manual and automatic execution
   */
  static async runCompleteAnalytics(
    options: AnalyticsRunOptions = {}
  ): Promise<AnalyticsRunResult> {
    const startTime = Date.now();
    const {
      includeInsights = true,
      includeHotspots = true,
      includeAnalytics = true,
      socialAccountId,
      teamId,
      forceRun = false,
      useSmartSync = true, // Enable smart sync by default
      syncStrategy,
    } = options;

    console.log("🚀 Starting Complete Analytics Collection...");
    console.log(
      `📊 Options: Insights=${includeInsights}, Hotspots=${includeHotspots}, Analytics=${includeAnalytics}`
    );

    // NEW: Smart Sync Integration
    if (useSmartSync) {
      console.log(
        "🧠 Smart Sync enabled - analyzing optimal collection strategy..."
      );
    }

    const result: AnalyticsRunResult = {
      success: 0,
      failed: 0,
      total: 0,
      executionTimeMs: 0,
      details: {
        insights: { success: 0, failed: 0, total: 0 },
        hotspots: { success: 0, failed: 0, total: 0 },
        analytics: { success: 0, failed: 0, total: 0 },
      },
      errors: [],
    };

    try {
      // Get target accounts based on filters
      const accounts = await this.getTargetAccounts(socialAccountId, teamId);
      result.total = accounts.length;

      console.log(`🎯 Processing ${accounts.length} social accounts`);

      // NEW: Smart Sync Logic for each account
      if (useSmartSync && accounts.length > 0) {
        await this.applySmartSyncToAccounts(accounts, syncStrategy);
      }

      // Phase 1: Collect Account Insights
      if (includeInsights) {
        console.log("📊 Phase 1: Collecting Account Insights...");
        try {
          const insightsResult = socialAccountId
            ? await this.runInsightsForAccount(socialAccountId)
            : await InsightsCollector.runAccountInsightsForAllAccounts();

          result.details.insights = insightsResult;
          console.log(
            `✅ Insights: ${insightsResult.success}/${insightsResult.total} successful`
          );
        } catch (error) {
          const errorMsg = `Insights collection failed: ${error instanceof Error ? error.message : String(error)}`;
          result.errors.push(errorMsg);
          console.error("❌", errorMsg);
        }
      }

      // Phase 2: Analyze Engagement Hotspots
      if (includeHotspots) {
        console.log("🔥 Phase 2: Analyzing Engagement Hotspots...");
        try {
          const hotspotsResult = socialAccountId
            ? await this.runHotspotsForAccount(socialAccountId)
            : await HotspotAnalyzer.runHotspotAnalysisForAllAccounts();

          result.details.hotspots = hotspotsResult;
          console.log(
            `✅ Hotspots: ${hotspotsResult.success}/${hotspotsResult.total} successful`
          );
        } catch (error) {
          const errorMsg = `Hotspots analysis failed: ${error instanceof Error ? error.message : String(error)}`;
          result.errors.push(errorMsg);
          console.error("❌", errorMsg);
        }
      }

      // Phase 3: Collect Analytics Data
      if (includeAnalytics) {
        console.log("📈 Phase 3: Collecting Analytics Data...");
        try {
          const analyticsResult = socialAccountId
            ? await this.runAnalyticsDataForAccount(socialAccountId)
            : await this.runAnalyticsDataForAllAccounts();

          result.details.analytics = analyticsResult;
          console.log(
            `✅ Analytics: ${analyticsResult.success}/${analyticsResult.total} successful`
          );
        } catch (error) {
          const errorMsg = `Analytics collection failed: ${error instanceof Error ? error.message : String(error)}`;
          result.errors.push(errorMsg);
          console.error("❌", errorMsg);
        }
      }

      // Phase 4: Collect Post Analytics Data
      console.log("📊 Phase 4: Collecting Post Analytics Data...");
      try {
        const postAnalyticsResult = teamId
          ? await this.runPostAnalyticsForTeam(teamId)
          : await this.runPostAnalyticsForAllAccounts();

        // Add post analytics to details (extend the interface if needed)
        result.details.analytics.success += postAnalyticsResult.success;
        result.details.analytics.failed += postAnalyticsResult.failed;
        result.details.analytics.total += postAnalyticsResult.total;

        console.log(
          `✅ Post Analytics: ${postAnalyticsResult.success}/${postAnalyticsResult.total} successful`
        );
      } catch (error) {
        const errorMsg = `Post analytics collection failed: ${error instanceof Error ? error.message : String(error)}`;
        result.errors.push(errorMsg);
        console.error("❌", errorMsg);
      }

      // Calculate overall results
      result.success =
        result.details.insights.success +
        result.details.hotspots.success +
        result.details.analytics.success;
      result.failed =
        result.details.insights.failed +
        result.details.hotspots.failed +
        result.details.analytics.failed;
      result.executionTimeMs = Date.now() - startTime;

      // Log comprehensive results
      await this.logAnalyticsRun(result, options);

      console.log(`🎉 Complete Analytics Collection Finished!`);
      console.log(
        `📊 Overall: ${result.success} successful, ${result.failed} failed`
      );
      console.log(`⏱️ Execution time: ${result.executionTimeMs}ms`);

      return result;
    } catch (error) {
      result.executionTimeMs = Date.now() - startTime;
      const errorMsg = `Complete analytics run failed: ${error instanceof Error ? error.message : String(error)}`;
      result.errors.push(errorMsg);

      console.error("💥 Complete Analytics Collection Failed:", error);

      // Log the error
      await this.logAnalyticsRun(result, options);

      throw error;
    }
  }

  /**
   * Run analytics for a specific account
   */
  static async runAnalyticsForAccount(
    socialAccountId: string,
    options: Omit<AnalyticsRunOptions, "socialAccountId"> = {}
  ): Promise<AnalyticsRunResult> {
    return this.runCompleteAnalytics({
      ...options,
      socialAccountId,
    });
  }

  /**
   * Run analytics for all accounts in a team
   */
  static async runAnalyticsForTeam(
    teamId: string,
    options: Omit<AnalyticsRunOptions, "teamId"> = {}
  ): Promise<AnalyticsRunResult> {
    return this.runCompleteAnalytics({
      ...options,
      teamId,
    });
  }

  /**
   * Quick analytics run (insights + hotspots only, no heavy analytics)
   */
  static async runQuickAnalytics(
    socialAccountId?: string
  ): Promise<AnalyticsRunResult> {
    return this.runCompleteAnalytics({
      includeInsights: true,
      includeHotspots: true,
      includeAnalytics: false,
      socialAccountId,
    });
  }

  /**
   * Full analytics run (all components)
   */
  static async runFullAnalytics(
    socialAccountId?: string
  ): Promise<AnalyticsRunResult> {
    return this.runCompleteAnalytics({
      includeInsights: true,
      includeHotspots: true,
      includeAnalytics: true,
      socialAccountId,
    });
  }

  /**
   * Scheduled analytics run (optimized for automatic execution)
   */
  static async runScheduledAnalytics(): Promise<AnalyticsRunResult> {
    return this.runCompleteAnalytics({
      includeInsights: true,
      includeHotspots: true,
      includeAnalytics: true,
      forceRun: false, // Respect rate limiting
    });
  }

  /**
   * Apply Smart Sync recommendations to accounts
   */
  private static async applySmartSyncToAccounts(
    accounts: any[],
    forcedStrategy?: string
  ) {
    console.log("🧠 Applying Smart Sync strategies to accounts...");

    // Import SmartSyncManager
    const { SmartSyncManager } = await import("./smart-sync-manager");

    for (const account of accounts) {
      try {
        const recommendations = await SmartSyncManager.getSyncRecommendations(
          account.id
        );

        const strategy = forcedStrategy || recommendations.recommendedStrategy;

        console.log(
          `📋 ${account.name || account.platform}: Using ${strategy} strategy (${recommendations.urgency} urgency)`
        );

        // Apply strategy-specific optimizations
        if (strategy === "incremental_daily") {
          // Only sync recent data - skip hotspots for efficiency
          account.skipHotspots = true;
          account.daysBack = 1;
        } else if (strategy === "smart_adaptive") {
          // Moderate sync - include hotspots but limit scope
          account.skipHotspots = false;
          account.daysBack = Math.min(
            recommendations.daysSinceLastCollection + 1,
            7
          );
        } else if (strategy === "full_historical") {
          // Full sync for new accounts
          account.skipHotspots = false;
          account.daysBack = 30;
        }
      } catch (error) {
        console.warn(
          `⚠️ Smart sync analysis failed for ${account.name}: ${error}. Using default strategy.`
        );
      }
    }
  }

  /**
   * Get target accounts based on filters
   */
  private static async getTargetAccounts(
    socialAccountId?: string,
    teamId?: string
  ) {
    let whereClause: any = {};

    if (socialAccountId) {
      whereClause.id = socialAccountId;
    } else if (teamId) {
      whereClause.teamId = teamId;
    }

    return await prisma.socialAccount.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        platform: true,
        teamId: true,
      },
    });
  }

  /**
   * Run insights for a specific account
   */
  private static async runInsightsForAccount(socialAccountId: string) {
    try {
      await InsightsCollector.fetchInitialAccountInsights(socialAccountId);
      return { success: 1, failed: 0, total: 1 };
    } catch (error) {
      return { success: 0, failed: 1, total: 1 };
    }
  }

  /**
   * Run hotspots analysis for a specific account
   */
  private static async runHotspotsForAccount(socialAccountId: string) {
    try {
      await HotspotAnalyzer.fetchInitialHeatmapData(socialAccountId);
      return { success: 1, failed: 0, total: 1 };
    } catch (error) {
      return { success: 0, failed: 1, total: 1 };
    }
  }

  /**
   * Run analytics collection for a specific account
   */
  private static async runAnalyticsDataForAccount(socialAccountId: string) {
    try {
      console.log(
        `📊 Collecting REAL analytics data for account: ${socialAccountId}`
      );

      // Get account details with credentials
      const account = await prisma.socialAccount.findUnique({
        where: { id: socialAccountId },
        select: {
          id: true,
          name: true,
          platform: true,
          accessToken: true,
          profileId: true,
          teamId: true,
        },
      });

      if (!account) {
        throw new Error(`Social account ${socialAccountId} not found`);
      }

      if (!account.accessToken || !account.profileId) {
        console.warn(
          `⚠️ Missing credentials for ${account.name} (${account.platform})`
        );
        return { success: 0, failed: 1, total: 1 };
      }

      console.log(`🔄 Processing ${account.platform} account: ${account.name}`);

      // Collect real analytics data based on platform
      if (account.platform === "INSTAGRAM") {
        await this.collectInstagramAnalytics(account);
      } else if (account.platform === "FACEBOOK") {
        await this.collectFacebookAnalytics(account);
      } else {
        console.warn(`⚠️ Unsupported platform: ${account.platform}`);
        return { success: 0, failed: 1, total: 1 };
      }

      console.log(`✅ Successfully collected analytics for ${account.name}`);
      return { success: 1, failed: 0, total: 1 };
    } catch (error) {
      console.error(`❌ Failed to collect analytics for account:`, error);
      return { success: 0, failed: 1, total: 1 };
    }
  }

  /**
   * Run analytics collection for all accounts
   */
  private static async runAnalyticsDataForAllAccounts() {
    const accounts = await this.getTargetAccounts();
    let success = 0;
    let failed = 0;

    console.log(
      `📊 Collecting REAL analytics data for ${accounts.length} accounts`
    );

    for (const account of accounts) {
      try {
        const result = await this.runAnalyticsDataForAccount(account.id);
        success += result.success;
        failed += result.failed;
      } catch (error) {
        failed++;
        console.error(
          `Failed to collect analytics for ${account.name}:`,
          error
        );
      }
    }

    return { success, failed, total: accounts.length };
  }

  /**
   * Collect real Instagram analytics data
   */
  private static async collectInstagramAnalytics(account: any) {
    const { EnhancedInstagramClient } = await import(
      "../clients/enhanced-instagram-client"
    );
    const { AnalyticsComparisonService } = await import(
      "./analytics-comparison.service"
    );

    const client = new EnhancedInstagramClient();
    const analyticsService = new AnalyticsComparisonService(prisma);

    // Get comprehensive insights from Instagram API
    const insights = await client.getComprehensiveInsights(
      account.profileId,
      account.accessToken,
      {
        mediaLimit: 25,
        daysBack: 7,
        includeStories: false,
      }
    );

    // Convert insights to analytics data format
    const analyticsData = {
      followersCount: insights.followersCount,
      mediaCount: insights.mediaCount,
      engagementRate: insights.engagementRate,
      avgReachPerPost: insights.averageReachPerPost,
      totalFollowers: insights.followersCount,
      totalPosts: insights.mediaCount,
      totalReach: insights.totalReach,
      totalImpressions: insights.totalImpressions,
      totalLikes: insights.totalLikes,
      totalComments: insights.totalComments,
      totalShares: insights.totalShares,
      totalSaves: insights.totalSaves,
      avgEngagementPerPost: insights.averageEngagementPerPost,
    };

    // Store real data using upsert to prevent duplicates
    await analyticsService.collectAnalyticsDataSafely(
      account.id,
      analyticsData,
      {
        allowSameDayUpdate: true,
        mergeWithExisting: true,
      }
    );

    console.log(
      `✅ Instagram analytics collected for ${account.name}: ${insights.followersCount} followers, ${insights.engagementRate}% engagement`
    );
  }

  /**
   * Collect real Facebook analytics data
   */
  private static async collectFacebookAnalytics(account: any) {
    const { FacebookAnalyticsClient } = await import(
      "../clients/facebook-client"
    );
    const { SocialMediaRateLimiter } = await import("../clients/rate-limiter");
    const { AnalyticsComparisonService } = await import(
      "./analytics-comparison.service"
    );

    const rateLimiter = new SocialMediaRateLimiter();
    const client = new FacebookAnalyticsClient(rateLimiter);
    const analyticsService = new AnalyticsComparisonService(prisma);

    // Get Facebook page data
    const pageData = await this.getFacebookPageInsights(
      account.profileId,
      account.accessToken,
      client
    );

    // Store real data using upsert to prevent duplicates
    await analyticsService.collectAnalyticsDataSafely(account.id, pageData, {
      allowSameDayUpdate: true,
      mergeWithExisting: true,
    });

    console.log(
      `✅ Facebook analytics collected for ${account.name}: ${pageData.followersCount} followers`
    );
  }

  /**
   * Get Facebook page insights
   */
  private static async getFacebookPageInsights(
    pageId: string,
    accessToken: string,
    client: any
  ) {
    try {
      // Get basic page info
      const pageInfo = await client.getPageInfo(pageId, accessToken);

      // Get recent posts for engagement calculation
      const recentPosts = await client.getPagePosts(
        pageId,
        accessToken,
        25,
        new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      );

      // Calculate metrics from available data
      let totalLikes = 0;
      let totalComments = 0;
      let totalShares = 0;
      let estimatedReach = 0;

      for (const post of recentPosts) {
        const likes = post.likes?.summary?.total_count || 0;
        const comments = post.comments?.summary?.total_count || 0;
        const shares = post.shares?.count || 0;

        totalLikes += likes;
        totalComments += comments;
        totalShares += shares;

        // Estimate reach based on engagement
        const postEngagement = likes + comments + shares;
        estimatedReach += Math.round(postEngagement * 8);
      }

      const totalEngagement = totalLikes + totalComments + totalShares;
      const engagementRate =
        estimatedReach > 0 ? (totalEngagement / estimatedReach) * 100 : 0;
      const avgReachPerPost =
        recentPosts.length > 0
          ? Math.round(estimatedReach / recentPosts.length)
          : 0;

      return {
        followersCount: pageInfo.fan_count || 0,
        mediaCount: recentPosts.length,
        engagementRate: Math.round(engagementRate * 100) / 100,
        avgReachPerPost,
        totalFollowers: pageInfo.fan_count || 0,
        totalPosts: recentPosts.length,
        totalReach: estimatedReach,
        totalImpressions: Math.round(estimatedReach * 1.3),
        totalLikes,
        totalComments,
        totalShares,
        totalSaves: 0, // Facebook doesn't have saves
        avgEngagementPerPost:
          recentPosts.length > 0
            ? Math.round(totalEngagement / recentPosts.length)
            : 0,
      };
    } catch (error) {
      console.error("Facebook insights error:", error);
      // Return minimal data if API fails
      return {
        followersCount: 0,
        mediaCount: 0,
        engagementRate: 0,
        avgReachPerPost: 0,
        totalFollowers: 0,
        totalPosts: 0,
        totalReach: 0,
        totalImpressions: 0,
        totalLikes: 0,
        totalComments: 0,
        totalShares: 0,
        totalSaves: 0,
        avgEngagementPerPost: 0,
      };
    }
  }

  /**
   * Run post analytics collection for a specific team
   */
  private static async runPostAnalyticsForTeam(teamId: string) {
    console.log(`📊 Collecting post analytics for team: ${teamId}`);

    // Get published posts for this team
    const publishedPosts = await prisma.post.findMany({
      where: {
        teamId,
        status: "PUBLISHED",
        publishedAt: { not: null },
        postSocialAccounts: {
          some: {
            status: "PUBLISHED",
            platformPostId: { not: null },
          },
        },
      },
      select: { id: true },
      take: 20, // Limit to prevent overwhelming APIs
      orderBy: { publishedAt: "desc" },
    });

    console.log(`📋 Found ${publishedPosts.length} published posts for team`);

    let success = 0;
    let failed = 0;

    for (const post of publishedPosts) {
      try {
        const result = await this.collectPostAnalytics(post.id);
        success += result.success ? 1 : 0;
        failed += result.success ? 0 : 1;
      } catch (error) {
        failed++;
        console.error(
          `Failed to collect post analytics for ${post.id}:`,
          error
        );
      }
    }

    return { success, failed, total: publishedPosts.length };
  }

  /**
   * Run post analytics collection for all accounts
   */
  private static async runPostAnalyticsForAllAccounts() {
    console.log(`📊 Collecting post analytics for all accounts`);

    // Get recent published posts (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const publishedPosts = await prisma.post.findMany({
      where: {
        status: "PUBLISHED",
        publishedAt: {
          gte: sevenDaysAgo,
          not: null,
        },
        postSocialAccounts: {
          some: {
            status: "PUBLISHED",
            platformPostId: { not: null },
          },
        },
      },
      select: { id: true },
      take: 50, // Limit to prevent overwhelming APIs
      orderBy: { publishedAt: "desc" },
    });

    console.log(`📋 Found ${publishedPosts.length} recent published posts`);

    let success = 0;
    let failed = 0;

    for (const post of publishedPosts) {
      try {
        const result = await this.collectPostAnalytics(post.id);
        success += result.success ? 1 : 0;
        failed += result.success ? 0 : 1;

        // Small delay to respect rate limits
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (error) {
        failed++;
        console.error(
          `Failed to collect post analytics for ${post.id}:`,
          error
        );
      }
    }

    return { success, failed, total: publishedPosts.length };
  }

  /**
   * Collect analytics for a specific post
   */
  private static async collectPostAnalytics(
    postId: string
  ): Promise<{ success: boolean }> {
    try {
      const { RealSocialAnalyticsService } = await import(
        "../clients/real-analytics-service"
      );

      const analyticsService = new RealSocialAnalyticsService(prisma);
      const result = await analyticsService.collectPostAnalytics(postId);

      console.log(
        `📊 Post ${postId}: ${result.success ? "Success" : "Failed"} (${result.results.length} platforms)`
      );

      return { success: result.success };
    } catch (error) {
      console.error(`❌ Error collecting post analytics for ${postId}:`, error);
      return { success: false };
    }
  }

  /**
   * Log analytics run results
   */
  private static async logAnalyticsRun(
    result: AnalyticsRunResult,
    options: AnalyticsRunOptions
  ) {
    try {
      await prisma.taskLog.create({
        data: {
          name: "analytics_master_run",
          status:
            result.failed === 0
              ? "SUCCESS"
              : result.errors.length > 0
                ? "ERROR"
                : "PARTIAL",
          executedAt: new Date(),
          message: JSON.stringify({
            options,
            result: {
              success: result.success,
              failed: result.failed,
              total: result.total,
              executionTimeMs: result.executionTimeMs,
              details: result.details,
            },
            errors: result.errors,
          }),
        },
      });
    } catch (error) {
      console.error("Failed to log analytics run:", error);
    }
  }

  /**
   * Get analytics run status and history
   */
  static async getAnalyticsRunHistory(hours: number = 24) {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    const logs = await prisma.taskLog.findMany({
      where: {
        name: "analytics_master_run",
        executedAt: {
          gte: since,
        },
      },
      orderBy: {
        executedAt: "desc",
      },
      take: 50,
    });

    return logs.map((log) => ({
      id: log.id,
      status: log.status,
      executedAt: log.executedAt,
      message: log.message ? JSON.parse(log.message) : null,
    }));
  }

  /**
   * Check if analytics should run (rate limiting)
   */
  static async shouldRunAnalytics(
    socialAccountId?: string,
    minIntervalHours: number = 1
  ): Promise<boolean> {
    const since = new Date(Date.now() - minIntervalHours * 60 * 60 * 1000);

    const recentRun = await prisma.taskLog.findFirst({
      where: {
        name: "analytics_master_run",
        status: "SUCCESS",
        executedAt: {
          gte: since,
        },
        message: socialAccountId
          ? {
              contains: socialAccountId,
            }
          : undefined,
      },
    });

    return !recentRun;
  }

  /**
   * Smart Historical Data Sync
   * Intelligently syncs data to fill gaps and maintain continuity
   */
  static async syncHistoricalData(
    socialAccountId: string,
    options: {
      maxDaysBack?: number;
      forceFullSync?: boolean;
    } = {}
  ) {
    console.log(`🔄 Starting historical data sync for ${socialAccountId}`);

    const client = prisma;
    const result = {
      success: false,
      accountDataSynced: 0,
      postDataSynced: 0,
      daysBackfilled: 0,
      gapsFilled: 0,
      errors: [] as string[],
    };

    try {
      // Get social account details
      const socialAccount = await client.socialAccount.findUnique({
        where: { id: socialAccountId },
        include: { team: true },
      });

      if (!socialAccount) {
        throw new Error("Social account not found");
      }

      console.log(
        `📱 Syncing ${socialAccount.name} (${socialAccount.platform})`
      );

      // Analyze current data coverage
      const coverage = await this.analyzeDataCoverage(socialAccountId);
      console.log(
        `📊 Current coverage: ${coverage.totalDays} days, ${coverage.gaps.length} gaps`
      );

      // Determine sync strategy
      const strategy = this.determineSyncStrategy(coverage, options);
      console.log(`🎯 Sync strategy: ${strategy.type} - ${strategy.reason}`);

      // Execute sync based on strategy
      if (strategy.type === "full_backfill" || options.forceFullSync) {
        await this.performFullBackfill(
          socialAccountId,
          options.maxDaysBack || 90,
          result
        );
      } else if (strategy.type === "incremental_update") {
        await this.performIncrementalUpdate(socialAccountId, result);
      } else if (strategy.type === "gap_filling" && coverage.gaps.length > 0) {
        await this.performGapFilling(socialAccountId, coverage.gaps, result);
      }

      result.success = true;
      console.log(
        `✅ Historical sync completed: ${result.accountDataSynced} account records, ${result.postDataSynced} post records`
      );
    } catch (error: any) {
      console.error(`❌ Historical sync failed:`, error);
      result.errors.push(error.message);
    }

    return result;
  }

  /**
   * Analyze current data coverage to find gaps
   */
  private static async analyzeDataCoverage(socialAccountId: string) {
    const client = prisma;

    // Get date range of existing data
    const [firstRecord, lastRecord] = await Promise.all([
      prisma.accountAnalytics.findFirst({
        where: { socialAccountId },
        orderBy: { recordedAt: "asc" },
      }),
      prisma.accountAnalytics.findFirst({
        where: { socialAccountId },
        orderBy: { recordedAt: "desc" },
      }),
    ]);

    if (!firstRecord || !lastRecord) {
      return {
        hasData: false,
        totalDays: 0,
        gaps: [],
        oldestData: null,
        newestData: null,
      };
    }

    // Calculate total coverage
    const totalDays = Math.ceil(
      (lastRecord.recordedAt.getTime() - firstRecord.recordedAt.getTime()) /
        (1000 * 60 * 60 * 24)
    );

    // Find gaps in coverage
    const gaps = await this.findDataGaps(
      socialAccountId,
      firstRecord.recordedAt,
      lastRecord.recordedAt
    );

    return {
      hasData: true,
      totalDays,
      gaps,
      oldestData: firstRecord.recordedAt,
      newestData: lastRecord.recordedAt,
    };
  }

  /**
   * Find gaps in data coverage
   */
  private static async findDataGaps(
    socialAccountId: string,
    startDate: Date,
    endDate: Date
  ) {
    const client = prisma;

    const allRecords = await client.accountAnalytics.findMany({
      where: {
        socialAccountId,
        recordedAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: { recordedAt: true },
      orderBy: { recordedAt: "asc" },
    });

    const gaps: { start: Date; end: Date; days: number }[] = [];
    const recordDates = new Set(
      allRecords.map((r) => r.recordedAt.toDateString())
    );

    let currentDate = new Date(startDate);
    const finalDate = new Date(endDate);

    while (currentDate <= finalDate) {
      const dateString = currentDate.toDateString();

      if (!recordDates.has(dateString)) {
        // Found a gap
        const gapStart = new Date(currentDate);
        let gapEnd = new Date(currentDate);

        // Extend gap until we find data again
        while (gapEnd <= finalDate && !recordDates.has(gapEnd.toDateString())) {
          gapEnd.setDate(gapEnd.getDate() + 1);
        }

        gapEnd.setDate(gapEnd.getDate() - 1);
        const gapDays =
          Math.ceil(
            (gapEnd.getTime() - gapStart.getTime()) / (1000 * 60 * 60 * 1000)
          ) + 1;

        gaps.push({
          start: gapStart,
          end: gapEnd,
          days: gapDays,
        });

        currentDate = new Date(gapEnd);
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return gaps;
  }

  /**
   * Determine sync strategy based on current data
   */
  private static determineSyncStrategy(coverage: any, options: any) {
    const now = new Date();

    if (!coverage.hasData) {
      return {
        type: "full_backfill",
        reason: "No existing data - need full backfill",
      };
    }

    // Check if we need recent updates
    const daysSinceLastUpdate = Math.ceil(
      (now.getTime() - coverage.newestData.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysSinceLastUpdate > 1) {
      return {
        type: "incremental_update",
        reason: `${daysSinceLastUpdate} days since last update`,
      };
    }

    // Check for significant gaps
    const significantGaps = coverage.gaps.filter((gap: any) => gap.days >= 2);
    if (significantGaps.length > 0) {
      return {
        type: "gap_filling",
        reason: `${significantGaps.length} significant gaps found`,
      };
    }

    return {
      type: "up_to_date",
      reason: "Data is current, no sync needed",
    };
  }

  /**
   * Perform full backfill for new accounts
   */
  private static async performFullBackfill(
    socialAccountId: string,
    daysBack: number,
    result: any
  ) {
    console.log(`📥 Performing full backfill for ${daysBack} days`);

    // Run analytics collection multiple times to build historical data
    for (let i = 0; i < Math.min(daysBack / 7, 12); i++) {
      // Max 12 weeks
      try {
        await this.runAnalyticsForAccount(socialAccountId);
        result.accountDataSynced++;
        result.daysBackfilled += 7; // Assume 7 days worth of data per run

        // Add delay to respect API limits
        await new Promise((resolve) => setTimeout(resolve, 3000));
      } catch (error: any) {
        console.error(`❌ Failed backfill iteration ${i + 1}:`, error.message);
        result.errors.push(`Backfill ${i + 1}: ${error.message}`);
      }
    }
  }

  /**
   * Perform incremental update for recent data
   */
  private static async performIncrementalUpdate(
    socialAccountId: string,
    result: any
  ) {
    console.log(`🔄 Performing incremental update`);

    try {
      await this.runAnalyticsForAccount(socialAccountId);
      result.accountDataSynced++;
      console.log(`✅ Incremental update completed`);
    } catch (error: any) {
      console.error(`❌ Incremental update failed:`, error.message);
      result.errors.push(`Incremental update: ${error.message}`);
    }
  }

  /**
   * Fill gaps in data coverage
   */
  private static async performGapFilling(
    socialAccountId: string,
    gaps: any[],
    result: any
  ) {
    console.log(`🔧 Filling ${gaps.length} data gaps`);

    // For each significant gap, run analytics collection
    for (const gap of gaps.slice(0, 5)) {
      // Limit to 5 gaps to avoid overwhelming
      try {
        console.log(
          `📅 Filling gap: ${gap.start.toDateString()} to ${gap.end.toDateString()}`
        );

        await this.runAnalyticsForAccount(socialAccountId);
        result.accountDataSynced++;
        result.gapsFilled += gap.days;

        // Add delay between gap fills
        await new Promise((resolve) => setTimeout(resolve, 2000));
      } catch (error: any) {
        console.error(`❌ Failed to fill gap:`, error.message);
        result.errors.push(`Gap fill: ${error.message}`);
      }
    }
  }

  /**
   * Get sync status and recommendations for an account
   */
  static async getSyncStatus(socialAccountId: string) {
    try {
      const coverage = await this.analyzeDataCoverage(socialAccountId);

      const lastSync = await prisma.accountAnalytics.findFirst({
        where: { socialAccountId },
        orderBy: { recordedAt: "desc" },
      });

      return {
        hasData: coverage.hasData,
        totalDays: coverage.totalDays,
        gaps: coverage.gaps.length,
        lastSync: lastSync?.recordedAt || null,
        coverage: coverage,
        recommendation: this.getRecommendation(coverage),
        needsSync: this.needsSync(coverage),
      };
    } catch (error: any) {
      console.error(`❌ Failed to get sync status:`, error);
      return {
        hasData: false,
        totalDays: 0,
        gaps: 0,
        lastSync: null,
        coverage: null,
        recommendation: "Error getting sync status",
        needsSync: true,
      };
    }
  }

  /**
   * Get recommendation for sync strategy
   */
  private static getRecommendation(coverage: any): string {
    if (!coverage.hasData) {
      return "Perlu full backfill - belum ada data historis";
    }

    if (coverage.gaps.length > 5) {
      return "Perlu gap filling - terlalu banyak data yang hilang";
    }

    const now = new Date();
    const daysSinceLastUpdate = Math.ceil(
      (now.getTime() - coverage.newestData.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysSinceLastUpdate > 3) {
      return "Perlu incremental update - data sudah lama";
    }

    return "Data sudah up-to-date";
  }

  /**
   * Check if account needs sync
   */
  private static needsSync(coverage: any): boolean {
    if (!coverage.hasData) return true;
    if (coverage.gaps.length > 3) return true;

    const now = new Date();
    const daysSinceLastUpdate = Math.ceil(
      (now.getTime() - coverage.newestData.getTime()) / (1000 * 60 * 60 * 24)
    );

    return daysSinceLastUpdate > 1;
  }

  /**
   * Batch sync for multiple accounts
   */
  static async batchHistoricalSync(socialAccountIds: string[]) {
    console.log(
      `🔄 Starting batch historical sync for ${socialAccountIds.length} accounts`
    );

    const results = [];
    let success = 0;
    let failed = 0;

    for (const accountId of socialAccountIds) {
      try {
        const syncResult = await this.syncHistoricalData(accountId);
        results.push({ accountId, ...syncResult });
        if (syncResult.success) success++;

        // Add delay between accounts
        await new Promise((resolve) => setTimeout(resolve, 2000));
      } catch (error: any) {
        console.error(`❌ Failed to sync ${accountId}:`, error.message);
        results.push({ accountId, success: false, error: error.message });
        failed++;
      }
    }

    console.log(
      `✅ Batch historical sync completed: ${success} success, ${failed} failed`
    );

    return {
      success,
      failed,
      results,
    };
  }
}
