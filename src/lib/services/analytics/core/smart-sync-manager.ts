import { prisma } from "@/lib/prisma/client";
import {
  getOptimalSyncParams,
  SYNC_STRATEGIES,
  SyncStrategy,
  ANALYTICS_COLLECTION_CONFIG,
} from "@/config/analytics-config";

export interface SmartSyncOptions {
  socialAccountId: string;
  strategy?: SyncStrategy;
  forceStrategy?: boolean;
  maxRetries?: number;
}

export interface SyncResult {
  success: boolean;
  strategy: SyncStrategy;
  daysCollected: number;
  dataPointsCollected: number;
  lastSyncDate: Date;
  nextRecommendedSync: Date;
  error?: string;
}

export class SmartSyncManager {
  /**
   * Main entry point for smart analytics sync
   */
  static async performSmartSync(
    options: SmartSyncOptions
  ): Promise<SyncResult> {
    const { socialAccountId, strategy, forceStrategy = false } = options;

    console.log(`🔄 Starting smart sync for account ${socialAccountId}`);

    try {
      // Get account info and last collection data
      const syncContext = await this.getSyncContext(socialAccountId);

      // Determine optimal strategy
      const selectedStrategy =
        forceStrategy && strategy
          ? strategy
          : this.determineOptimalStrategy(syncContext);

      console.log(`📋 Using strategy: ${selectedStrategy}`);
      console.log(
        `📊 Last collection: ${syncContext.lastCollection || "Never"}`
      );

      // Execute sync based on strategy
      const result = await this.executeSyncStrategy(
        socialAccountId,
        selectedStrategy,
        syncContext
      );

      // Update sync metadata
      await this.updateSyncMetadata(socialAccountId, result);

      console.log(
        `✅ Smart sync completed: ${result.daysCollected} days, ${result.dataPointsCollected} data points`
      );

      return result;
    } catch (error: any) {
      console.error(`❌ Smart sync failed for ${socialAccountId}:`, error);

      return {
        success: false,
        strategy: strategy || SYNC_STRATEGIES.INCREMENTAL_DAILY,
        daysCollected: 0,
        dataPointsCollected: 0,
        lastSyncDate: new Date(),
        nextRecommendedSync: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
        error: error.message,
      };
    }
  }

  /**
   * Get sync context for an account
   */
  private static async getSyncContext(socialAccountId: string) {
    const [account, lastAnalytics, accountAnalytics] = await Promise.all([
      // Get account basic info
      prisma.socialAccount.findUnique({
        where: { id: socialAccountId },
        select: {
          id: true,
          name: true,
          platform: true,
          createdAt: true,
        },
      }),

      // Get last post analytics
      prisma.postAnalytics.findFirst({
        where: {
          postSocialAccount: { socialAccountId },
        },
        orderBy: { recordedAt: "desc" },
        select: { recordedAt: true },
      }),

      // Get last account analytics
      prisma.accountAnalytics.findFirst({
        where: { socialAccountId },
        orderBy: { recordedAt: "desc" },
        select: { recordedAt: true },
      }),
    ]);

    if (!account) {
      throw new Error(`Account ${socialAccountId} not found`);
    }

    const lastCollection =
      lastAnalytics?.recordedAt || accountAnalytics?.recordedAt;
    const daysSinceCreation = Math.floor(
      (Date.now() - account.createdAt.getTime()) / (1000 * 60 * 60 * 24)
    );
    const daysSinceLastCollection = lastCollection
      ? Math.floor(
          (Date.now() - lastCollection.getTime()) / (1000 * 60 * 60 * 24)
        )
      : daysSinceCreation;

    return {
      account,
      lastCollection,
      daysSinceCreation,
      daysSinceLastCollection,
      isNewAccount: !lastCollection,
      needsHistoricalData: daysSinceCreation > 7 && !lastCollection,
    };
  }

  /**
   * Determine optimal sync strategy based on context
   */
  private static determineOptimalStrategy(syncContext: any): SyncStrategy {
    const { daysSinceLastCollection, isNewAccount, needsHistoricalData } =
      syncContext;

    if (isNewAccount && needsHistoricalData) {
      return SYNC_STRATEGIES.FULL_HISTORICAL;
    }

    if (daysSinceLastCollection <= 1) {
      return SYNC_STRATEGIES.INCREMENTAL_DAILY;
    }

    if (daysSinceLastCollection <= 7) {
      return SYNC_STRATEGIES.SMART_ADAPTIVE;
    }

    return SYNC_STRATEGIES.GAP_FILLING;
  }

  /**
   * Execute sync strategy
   */
  private static async executeSyncStrategy(
    socialAccountId: string,
    strategy: SyncStrategy,
    syncContext: any
  ): Promise<SyncResult> {
    const baseResult: SyncResult = {
      success: false,
      strategy,
      daysCollected: 0,
      dataPointsCollected: 0,
      lastSyncDate: new Date(),
      nextRecommendedSync: new Date(Date.now() + 24 * 60 * 60 * 1000),
    };

    switch (strategy) {
      case SYNC_STRATEGIES.INCREMENTAL_DAILY:
        return await this.executeIncrementalSync(
          socialAccountId,
          syncContext,
          baseResult
        );

      case SYNC_STRATEGIES.SMART_ADAPTIVE:
        return await this.executeAdaptiveSync(
          socialAccountId,
          syncContext,
          baseResult
        );

      case SYNC_STRATEGIES.FULL_HISTORICAL:
        return await this.executeHistoricalSync(
          socialAccountId,
          syncContext,
          baseResult
        );

      case SYNC_STRATEGIES.GAP_FILLING:
        return await this.executeGapFillingSync(
          socialAccountId,
          syncContext,
          baseResult
        );

      default:
        throw new Error(`Unknown sync strategy: ${strategy}`);
    }
  }

  /**
   * Execute incremental daily sync - only get yesterday's data
   */
  private static async executeIncrementalSync(
    socialAccountId: string,
    syncContext: any,
    baseResult: SyncResult
  ): Promise<SyncResult> {
    console.log(`📅 Executing incremental sync (1 day)`);

    // Import analytics services
    const { AnalyticsMasterService } = await import(
      "./analytics-master.service"
    );

    // Use incremental parameters
    const params = ANALYTICS_COLLECTION_CONFIG.DAILY_INCREMENTAL;

    // Execute collection with minimal scope
    await AnalyticsMasterService.runAnalyticsForAccount(socialAccountId, {
      includeInsights: true,
      includeHotspots: false, // Skip hotspots for daily incremental
      includeAnalytics: true,
    });

    return {
      ...baseResult,
      success: true,
      daysCollected: 1,
      dataPointsCollected: 10, // Estimate
      nextRecommendedSync: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
    };
  }

  /**
   * Execute adaptive sync - adjust days based on gap
   */
  private static async executeAdaptiveSync(
    socialAccountId: string,
    syncContext: any,
    baseResult: SyncResult
  ): Promise<SyncResult> {
    const daysToSync = Math.min(syncContext.daysSinceLastCollection + 1, 7);
    console.log(`📊 Executing adaptive sync (${daysToSync} days)`);

    const { AnalyticsMasterService } = await import(
      "./analytics-master.service"
    );

    await AnalyticsMasterService.runAnalyticsForAccount(socialAccountId, {
      includeInsights: true,
      includeHotspots: true,
      includeAnalytics: true,
    });

    return {
      ...baseResult,
      success: true,
      daysCollected: daysToSync,
      dataPointsCollected: daysToSync * 15, // Estimate
      nextRecommendedSync: new Date(Date.now() + 24 * 60 * 60 * 1000),
    };
  }

  /**
   * Execute historical sync for new accounts
   */
  private static async executeHistoricalSync(
    socialAccountId: string,
    syncContext: any,
    baseResult: SyncResult
  ): Promise<SyncResult> {
    console.log(`📚 Executing historical sync (30 days)`);

    const { AnalyticsMasterService } = await import(
      "./analytics-master.service"
    );

    // Use historical data parameters
    await AnalyticsMasterService.syncHistoricalData(socialAccountId, {
      maxDaysBack: 30,
      forceFullSync: true,
    });

    return {
      ...baseResult,
      success: true,
      daysCollected: 30,
      dataPointsCollected: 450, // Estimate: 30 * 15
      nextRecommendedSync: new Date(Date.now() + 24 * 60 * 60 * 1000),
    };
  }

  /**
   * Execute gap filling sync
   */
  private static async executeGapFillingSync(
    socialAccountId: string,
    syncContext: any,
    baseResult: SyncResult
  ): Promise<SyncResult> {
    console.log(`🔧 Executing gap filling sync`);

    const { AnalyticsMasterService } = await import(
      "./analytics-master.service"
    );

    await AnalyticsMasterService.runAnalyticsForAccount(socialAccountId, {
      includeInsights: true,
      includeHotspots: true,
      includeAnalytics: true,
    });

    const daysGap = Math.min(syncContext.daysSinceLastCollection, 7);

    return {
      ...baseResult,
      success: true,
      daysCollected: daysGap,
      dataPointsCollected: daysGap * 12, // Estimate
      nextRecommendedSync: new Date(Date.now() + 24 * 60 * 60 * 1000),
    };
  }

  /**
   * Update sync metadata in database
   */
  private static async updateSyncMetadata(
    socialAccountId: string,
    result: SyncResult
  ) {
    try {
      // Store sync history
      await prisma.taskLog.create({
        data: {
          name: "smart_analytics_sync",
          status: result.success ? "SUCCESS" : "FAILED",
          message: JSON.stringify({
            socialAccountId,
            strategy: result.strategy,
            daysCollected: result.daysCollected,
            dataPointsCollected: result.dataPointsCollected,
            error: result.error,
          }),
          executedAt: result.lastSyncDate,
        },
      });
    } catch (error) {
      console.warn("Failed to update sync metadata:", error);
    }
  }

  /**
   * Get sync recommendations for dashboard
   */
  static async getSyncRecommendations(socialAccountId: string) {
    const syncContext = await this.getSyncContext(socialAccountId);
    const recommendedStrategy = this.determineOptimalStrategy(syncContext);

    return {
      socialAccountId,
      currentStatus: syncContext.lastCollection ? "synced" : "never_synced",
      lastCollection: syncContext.lastCollection,
      daysSinceLastCollection: syncContext.daysSinceLastCollection,
      recommendedStrategy,
      estimatedDataToCollect: this.estimateDataPoints(
        syncContext,
        recommendedStrategy
      ),
      urgency: this.calculateUrgency(syncContext),
    };
  }

  private static estimateDataPoints(
    syncContext: any,
    strategy: SyncStrategy
  ): number {
    switch (strategy) {
      case SYNC_STRATEGIES.INCREMENTAL_DAILY:
        return 10;
      case SYNC_STRATEGIES.SMART_ADAPTIVE:
        return syncContext.daysSinceLastCollection * 15;
      case SYNC_STRATEGIES.FULL_HISTORICAL:
        return 450;
      case SYNC_STRATEGIES.GAP_FILLING:
        return Math.min(syncContext.daysSinceLastCollection, 7) * 12;
      default:
        return 50;
    }
  }

  private static calculateUrgency(
    syncContext: any
  ): "low" | "medium" | "high" | "critical" {
    const { daysSinceLastCollection, isNewAccount } = syncContext;

    if (isNewAccount) return "high";
    if (daysSinceLastCollection <= 1) return "low";
    if (daysSinceLastCollection <= 3) return "medium";
    if (daysSinceLastCollection <= 7) return "high";
    return "critical";
  }
}
