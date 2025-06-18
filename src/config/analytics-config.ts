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
  | "QUICK_COLLECTION";

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
