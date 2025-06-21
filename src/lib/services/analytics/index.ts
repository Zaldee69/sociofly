/**
 * Analytics Services - Main Index
 * Centralized exports for all analytics-related services
 */

// Core Services
export { AnalyticsComparisonService } from "./core/analytics-comparison.service";
export { HotspotAnalyzer } from "./hotspots/hotspot-analyzer";
export { InsightsCollector } from "./core/insights-collector";

// Platform Services (from clients directory)
export { RealSocialAnalyticsService } from "./clients/real-analytics-service";
export { EnhancedInstagramClient } from "./clients/enhanced-instagram-client";
export { FacebookAnalyticsClient } from "./clients/facebook-client";
export { InstagramAnalyticsClient } from "./clients/instagram-client";
export { SocialMediaRateLimiter } from "./clients/rate-limiter";
export { SocialMediaDataNormalizer } from "./clients/data-normalizer";

// Content Analytics
export { calculateAnalytics } from "./content/content-analytics";
