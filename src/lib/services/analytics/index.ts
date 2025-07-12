/**
 * Analytics Services - Main Index
 * Centralized exports for all analytics-related services
 */

// Core analytics services
export { AnalyticsComparisonService } from "./core/analytics-comparison.service";
export { SocialSyncService } from "./core/social-sync-service";
export { InsightGenerator } from "./core/insight-generator";
export { DataAnalyzer } from "./core/data-analyzer";

// Hotspot analysis
export { HotspotAnalyzer } from "./hotspots/hotspot-analyzer";

// Unified platform client (replaces separate Instagram/Facebook clients)
export { MetaClient } from "./clients/meta-client";
export { SocialMediaRateLimiter } from "./clients/rate-limiter";
export { SocialMediaDataNormalizer } from "./clients/data-normalizer";

// Database services
export { AnalyticsDatabaseService } from "./database/analytics-database.service";

// Content analytics (functions)
export { calculateAnalytics } from "./content/content-analytics";

// Configuration
export { PLATFORMS } from "./config/platforms";
export type { Metric } from "./config/metrics";

// Re-export types
export type {
  MetaCredentials,
  AnalyticsData,
  AccountInsights,
} from "./clients/meta-client";
