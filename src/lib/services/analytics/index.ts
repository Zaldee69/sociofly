/**
 * Analytics Services - Main Index
 * Centralized exports for all analytics-related services
 */

// Core analytics services
export { AnalyticsComparisonService } from "./core/analytics-comparison.service";
export { InsightsCollector } from "./core/insights-collector";
export { AnalyticsMasterService } from "./core/analytics-master.service";

// Hotspot analysis
export { HotspotAnalyzer } from "./hotspots/hotspot-analyzer";

// Platform clients
export { EnhancedInstagramClient } from "./clients/enhanced-instagram-client";
export { RealSocialAnalyticsService } from "./clients/real-analytics-service";
export { FacebookAnalyticsClient } from "./clients/facebook-client";
export { InstagramAnalyticsClient } from "./clients/instagram-client";
export { SocialMediaRateLimiter } from "./clients/rate-limiter";
export { SocialMediaDataNormalizer } from "./clients/data-normalizer";

// Content analytics (functions)
export { calculateAnalytics } from "./content/content-analytics";

// Re-export types
export type {
  AnalyticsRunResult,
  AnalyticsRunOptions,
} from "./core/analytics-master.service";
