// Centralized analytics collection configuration
// This ensures all collection methods use identical parameters

export const ANALYTICS_COLLECTION_CONFIG = {
  // Standard parameters for all Instagram analytics collection
  INSTAGRAM: {
    mediaLimit: 25,
    daysBack: 7,
    includeStories: false,
  },

  // Standard parameters for Facebook analytics collection
  FACEBOOK: {
    mediaLimit: 25,
    daysBack: 7,
    includeStories: false,
  },

  // Standard parameters for comprehensive insights
  COMPREHENSIVE_INSIGHTS: {
    mediaLimit: 25,
    daysBack: 7,
    includeStories: false,
  },

  // Standard parameters for historical data collection
  HISTORICAL_DATA: {
    mediaLimit: 50,
    daysBack: 30,
    includeStories: true,
  },

  // Standard parameters for quick collection (onboarding)
  QUICK_COLLECTION: {
    mediaLimit: 25,
    daysBack: 7,
    includeStories: false,
  },

  // NEW: Daily incremental sync parameters
  DAILY_INCREMENTAL: {
    mediaLimit: 25,
    daysBack: 1, // Only get yesterday's data
    includeStories: false,
  },

  // NEW: Smart sync parameters - adapts based on last collection
  SMART_SYNC: {
    mediaLimit: 25,
    daysBack: 3, // Never go beyond 3 days
    includeStories: false,
  },
} as const;

// Type definitions for better TypeScript support
export type AnalyticsCollectionParams = {
  mediaLimit: number;
  daysBack: number;
  includeStories: boolean;
};

export type CollectionType =
  | "INSTAGRAM"
  | "FACEBOOK"
  | "COMPREHENSIVE_INSIGHTS"
  | "HISTORICAL_DATA"
  | "QUICK_COLLECTION"
  | "DAILY_INCREMENTAL"
  | "SMART_SYNC";

// Helper function to get standardized parameters
export function getStandardParams(
  type: CollectionType
): AnalyticsCollectionParams {
  return ANALYTICS_COLLECTION_CONFIG[type];
}

// Default parameters (used when type is not specified)
export const DEFAULT_COLLECTION_PARAMS =
  ANALYTICS_COLLECTION_CONFIG.COMPREHENSIVE_INSIGHTS;

// Validation function to ensure parameters are consistent
export function validateCollectionParams(
  params: AnalyticsCollectionParams
): boolean {
  return (
    typeof params.mediaLimit === "number" &&
    params.mediaLimit > 0 &&
    typeof params.daysBack === "number" &&
    params.daysBack > 0 &&
    typeof params.includeStories === "boolean"
  );
}

// Logging function for debugging
export function logCollectionParams(
  method: string,
  params: AnalyticsCollectionParams,
  accountName?: string
): void {
  console.log(
    `📊 [${method}] Collection params for ${accountName || "account"}:`,
    {
      mediaLimit: params.mediaLimit,
      daysBack: params.daysBack,
      includeStories: params.includeStories,
    }
  );
}

// NEW: Function to determine optimal sync parameters based on last collection
export function getOptimalSyncParams(lastCollectionDate?: Date) {
  if (!lastCollectionDate) {
    // First time collection - get more historical data
    return ANALYTICS_COLLECTION_CONFIG.COMPREHENSIVE_INSIGHTS;
  }

  const daysSinceLastCollection = Math.floor(
    (Date.now() - lastCollectionDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysSinceLastCollection <= 1) {
    // Recent collection - minimal sync
    return ANALYTICS_COLLECTION_CONFIG.DAILY_INCREMENTAL;
  } else if (daysSinceLastCollection <= 3) {
    // Moderate gap - get the missing days
    return {
      mediaLimit: 25,
      daysBack: daysSinceLastCollection + 1,
      includeStories: false,
    };
  } else {
    // Large gap - comprehensive sync but limited
    return ANALYTICS_COLLECTION_CONFIG.COMPREHENSIVE_INSIGHTS;
  }
}

export const SYNC_STRATEGIES = {
  FULL_HISTORICAL: "full_historical", // Complete historical backfill
  INCREMENTAL_DAILY: "incremental_daily", // Only get new data since last sync
  SMART_ADAPTIVE: "smart_adaptive", // Adapt based on last collection time
  GAP_FILLING: "gap_filling", // Fill specific date gaps
} as const;

export type SyncStrategy =
  (typeof SYNC_STRATEGIES)[keyof typeof SYNC_STRATEGIES];
