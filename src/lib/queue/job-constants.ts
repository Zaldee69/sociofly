// job-constants.ts - New file untuk constants
export const JOB_CONSTANTS = {
  // Special job identifiers
  SPECIAL_POST_IDS: {
    BATCH_DUE_POSTS: "batch_due_posts",
    BATCH_EXPIRED_TOKENS: "batch_expired_tokens",
    SYSTEM_MAINTENANCE: "system_maintenance",
  },

  // Job retry configurations
  RETRY_CONFIG: {
    DEFAULT_ATTEMPTS: 3,
    HIGH_PRIORITY_ATTEMPTS: 5,
    MAINTENANCE_ATTEMPTS: 1,
    EXPONENTIAL_DELAY: 2000,
    FIXED_DELAY: 1000,
  },

  // Job cleanup settings
  CLEANUP_CONFIG: {
    KEEP_COMPLETED: 50,
    KEEP_FAILED: 20,
    DEFAULT_CLEANUP_AGE_MS: 3600000, // 1 hour
    LOG_CLEANUP_DAYS: 30,
  },

  // Queue concurrency settings
  QUEUE_CONCURRENCY: {
    HIGH_PRIORITY: 5,
    SCHEDULER: 3,
    NOTIFICATIONS: 10,
    WEBHOOKS: 5,
    REPORTS: 2,
    SOCIAL_SYNC: 3,
    MAINTENANCE: 1,
  },

  // Job timeouts (in milliseconds)
  TIMEOUTS: {
    QUICK_JOB: 30000, // 30 seconds
    NORMAL_JOB: 300000, // 5 minutes
    LONG_JOB: 1800000, // 30 minutes
    MAINTENANCE_JOB: 3600000, // 1 hour
  },

  // Analytics collection settings
  ANALYTICS: {
    MAX_POSTS_PER_BATCH: 100,
    DEFAULT_ANALYSIS_DAYS: 7,
    HOTSPOT_TOP_COUNT: 10,
    CONTENT_PERFORMANCE_LIMIT: 50,
  },

  // Error messages
  ERROR_MESSAGES: {
    UNKNOWN_JOB_TYPE: "Unknown job type",
    MISSING_POST_ID: "Missing or invalid postId",
    MISSING_USER_ID: "Missing or invalid userId",
    SOCIAL_ACCOUNT_NOT_FOUND: "Social account not found",
    INSUFFICIENT_DATA: "Insufficient data for analysis",
    INVALID_DATE_RANGE: "Invalid date range provided",
  },

  // Job status
  JOB_STATUS: {
    PENDING: "pending",
    PROCESSING: "processing",
    COMPLETED: "completed",
    FAILED: "failed",
    RETRYING: "retrying",
    CANCELLED: "cancelled",
  },

  // Platform identifiers
  PLATFORMS: {
    FACEBOOK: "facebook",
    INSTAGRAM: "instagram",
    TWITTER: "twitter",
    LINKEDIN: "linkedin",
    TIKTOK: "tiktok",
    YOUTUBE: "youtube",
  },

  // Notification priorities
  NOTIFICATION_PRIORITY: {
    LOW: "low",
    NORMAL: "normal",
    HIGH: "high",
    URGENT: "urgent",
  },

  // Report formats
  REPORT_FORMATS: {
    PDF: "pdf",
    CSV: "csv",
    JSON: "json",
    XLSX: "xlsx",
  },

  // Analytics sync types
  SYNC_TYPES: {
    ALL: "all",
    RECENT: "recent",
    SPECIFIC: "specific",
    INCREMENTAL: "incremental",
  },

  // Health check types
  HEALTH_CHECK_TYPES: {
    FULL: "full",
    QUICK: "quick",
    CRITICAL: "critical",
    NETWORK: "network",
    DATABASE: "database",
  },

  // Log types
  LOG_TYPES: {
    CRON: "cron",
    SYSTEM: "system",
    ERROR: "error",
    AUDIT: "audit",
    ALL: "all",
  },
} as const;

// Type definitions for constants
export type SpecialPostId =
  (typeof JOB_CONSTANTS.SPECIAL_POST_IDS)[keyof typeof JOB_CONSTANTS.SPECIAL_POST_IDS];
export type JobStatus =
  (typeof JOB_CONSTANTS.JOB_STATUS)[keyof typeof JOB_CONSTANTS.JOB_STATUS];
export type Platform =
  (typeof JOB_CONSTANTS.PLATFORMS)[keyof typeof JOB_CONSTANTS.PLATFORMS];
export type NotificationPriority =
  (typeof JOB_CONSTANTS.NOTIFICATION_PRIORITY)[keyof typeof JOB_CONSTANTS.NOTIFICATION_PRIORITY];
export type ReportFormat =
  (typeof JOB_CONSTANTS.REPORT_FORMATS)[keyof typeof JOB_CONSTANTS.REPORT_FORMATS];
export type SyncType =
  (typeof JOB_CONSTANTS.SYNC_TYPES)[keyof typeof JOB_CONSTANTS.SYNC_TYPES];
export type HealthCheckType =
  (typeof JOB_CONSTANTS.HEALTH_CHECK_TYPES)[keyof typeof JOB_CONSTANTS.HEALTH_CHECK_TYPES];
export type LogType =
  (typeof JOB_CONSTANTS.LOG_TYPES)[keyof typeof JOB_CONSTANTS.LOG_TYPES];
