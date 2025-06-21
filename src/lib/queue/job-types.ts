// Job types for BullMQ queues
export enum JobType {
  // Core system jobs
  PUBLISH_POST = "publish_post",
  PROCESS_APPROVAL = "process_approval",
  CHECK_EXPIRED_TOKENS = "check_expired_tokens",
  SYSTEM_HEALTH_CHECK = "system_health_check",
  CLEANUP_OLD_LOGS = "cleanup_old_logs",
  SEND_NOTIFICATION = "send_notification",
  PROCESS_WEBHOOK = "process_webhook",
  GENERATE_REPORT = "generate_report",
  SOCIAL_MEDIA_SYNC = "social_media_sync",

  // Main analytics job (unified)
  RUN_COMPLETE_ANALYTICS = "run_complete_analytics", // NEW: Replaces all individual analytics jobs

  // Historical data collection (still needed for onboarding)
  COLLECT_HISTORICAL_DATA = "collect_historical_data",

  // Individual Post Analytics Collection (still needed for real-time)
  COLLECT_POST_ANALYTICS = "collect_post_analytics",
  COLLECT_BATCH_POST_ANALYTICS = "collect_batch_post_analytics",

  // NEW: Smart daily sync for incremental collection
  SMART_DAILY_SYNC = "smart_daily_sync",

  // DEPRECATED: Individual analytics jobs (replaced by RUN_COMPLETE_ANALYTICS)
  // These are kept for backward compatibility but should not be used in new code
  COLLECT_ANALYTICS = "collect_analytics", // DEPRECATED: Use RUN_COMPLETE_ANALYTICS
  ANALYZE_COMPREHENSIVE_INSIGHTS = "analyze_comprehensive_insights", // DEPRECATED: Use RUN_COMPLETE_ANALYTICS
  ANALYZE_HOTSPOTS = "analyze_hotspots", // DEPRECATED: Use RUN_COMPLETE_ANALYTICS
  ANALYZE_ACCOUNT_INSIGHTS = "analyze_account_insights", // DEPRECATED: Use RUN_COMPLETE_ANALYTICS
  COLLECT_POSTS_ANALYTICS = "collect_posts_analytics", // DEPRECATED: Use RUN_COMPLETE_ANALYTICS
}

// Job data interfaces
export interface PublishPostJobData {
  postId: string;
  userId: string;
  platform: string;
  scheduledAt: Date;
  socialAccountId?: string; // Optional: if specified, publish only to this account
  content: {
    text?: string;
    media?: string[];
    hashtags?: string[];
  };
}

export interface CollectPostAnalyticsJobData {
  postId: string;
  userId: string;
  teamId?: string;
  platforms?: string[]; // Optional: specific platforms to collect from
  maxRetries?: number;
}

export interface CollectBatchPostAnalyticsJobData {
  postIds: string[];
  userId: string;
  teamId?: string;
  batchSize?: number;
  maxRetries?: number;
}

export interface ProcessApprovalJobData {
  postId: string;
  approverUserId: string;
  action: "approve" | "reject";
  feedback?: string;
}

export interface CheckExpiredTokensJobData {
  userId?: string; // If specified, check only this user's tokens
  platform?: string; // If specified, check only this platform
}

export interface SystemHealthCheckJobData {
  checkType: "full" | "quick" | "critical";
  alertThreshold?: number;
}

export interface CleanupOldLogsJobData {
  olderThanDays: number;
  logType?: "cron" | "system" | "all";
}

export interface SendNotificationJobData {
  userId: string;
  type: "email" | "push" | "sms";
  template: string;
  data: Record<string, any>;
  priority: "low" | "normal" | "high" | "urgent";
}

export interface ProcessWebhookJobData {
  platform: string;
  payload: Record<string, any>;
  signature?: string;
  timestamp: Date;
}

export interface GenerateReportJobData {
  userId: string;
  reportType: "analytics" | "performance" | "usage";
  dateRange: {
    start: Date;
    end: Date;
  };
  format: "pdf" | "csv" | "json";
}

export interface SocialMediaSyncJobData {
  userId: string;
  platform: string;
  syncType: "posts" | "metrics" | "followers" | "all";
  lastSyncAt?: Date;
}

export interface CollectPostsAnalyticsJobData {
  userId?: string;
  teamId?: string;
  platform?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
  postIds?: string[]; // Specific posts to analyze
  syncType: "all" | "recent" | "specific";
}

export interface AnalyzeHotspotsJobData {
  userId?: string;
  teamId?: string;
  socialAccountId?: string;
  platform?: string;
  analyzePeriod: "week" | "month" | "quarter";
}

export interface AnalyzeAccountInsightsJobData {
  userId: string;
  teamId?: string;
  socialAccountId: string;
  platform: string;
  insightTypes: (
    | "demographics"
    | "engagement"
    | "growth"
    | "content_performance"
  )[];
}

// New unified analytics job data
export interface CollectAnalyticsJobData {
  socialAccountId: string;
  platform: string;
  accountName: string;
  teamId: string;
  collectTypes: (
    | "account"
    | "posts"
    | "stories"
    | "audience"
    | "hashtags"
    | "links"
  )[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  priority: "low" | "normal" | "high";
  // Standardized collection parameters
  collectionParams?: {
    mediaLimit: number;
    daysBack: number;
    includeStories: boolean;
  };
}

// Unified comprehensive insights analysis
export interface AnalyzeComprehensiveInsightsJobData {
  userId?: string;
  teamId?: string;
  socialAccountId?: string;
  platform?: string;
  analysisTypes: (
    | "hotspots"
    | "account_insights"
    | "analytics_data"
    | "demographics"
    | "engagement"
    | "growth"
    | "content_performance"
    | "competitor_analysis"
  )[];
  analyzePeriod: "week" | "month" | "quarter" | "year" | "adaptive";
  includeComparisons: boolean;
  // Additional properties for complete analytics run
  includeInsights?: boolean;
  includeHotspots?: boolean;
  includeAnalytics?: boolean;

  // 🧠 Smart Sync Integration
  useSmartSync?: boolean; // Enable smart sync logic
  syncStrategy?:
    | "incremental_daily"
    | "smart_adaptive"
    | "gap_filling"
    | "full_historical"; // Force specific strategy
}

// Historical data collection job
export interface CollectHistoricalDataJobData {
  socialAccountId: string;
  platform: string;
  accountName: string;
  teamId: string;
  userId: string;
  daysBack: number; // How many days back to collect (default: 90)
  priority: "low" | "normal" | "high";
  collectTypes: ("posts" | "stories" | "audience" | "hashtags" | "links")[];
  immediate: boolean; // Process immediately or schedule
}

// Updated union type for all job data
export type JobData =
  | PublishPostJobData
  | ProcessApprovalJobData
  | CheckExpiredTokensJobData
  | SystemHealthCheckJobData
  | CleanupOldLogsJobData
  | SendNotificationJobData
  | ProcessWebhookJobData
  | GenerateReportJobData
  | SocialMediaSyncJobData
  | CollectAnalyticsJobData
  | AnalyzeComprehensiveInsightsJobData
  | CollectHistoricalDataJobData
  // Legacy types (deprecated)
  | CollectPostsAnalyticsJobData
  | AnalyzeHotspotsJobData
  | AnalyzeAccountInsightsJobData;

// Job options interface
export interface JobOptions {
  delay?: number; // Delay in milliseconds
  repeat?: {
    pattern?: string; // Cron pattern
    every?: number; // Repeat every X milliseconds
    limit?: number; // Maximum number of repetitions
  };
  attempts?: number; // Number of retry attempts
  backoff?: {
    type: "fixed" | "exponential";
    delay: number;
  };
  removeOnComplete?: number; // Keep only X completed jobs
  removeOnFail?: number; // Keep only X failed jobs
  priority?: number; // Job priority (higher = more priority)
}

// Job result interface
export interface JobResult {
  success: boolean;
  message: string;
  data?: any;
  executionTime: number;
  processedAt: Date;
}

// Queue metrics interface
export interface QueueMetrics {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: number;
}
