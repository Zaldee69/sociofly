// Job types for BullMQ queues
export enum JobType {
  PUBLISH_POST = "publish_post",
  PROCESS_APPROVAL = "process_approval",
  CHECK_EXPIRED_TOKENS = "check_expired_tokens",
  SYSTEM_HEALTH_CHECK = "system_health_check",
  CLEANUP_OLD_LOGS = "cleanup_old_logs",
  SEND_NOTIFICATION = "send_notification",
  PROCESS_WEBHOOK = "process_webhook",
  GENERATE_REPORT = "generate_report",
  SOCIAL_MEDIA_SYNC = "social_media_sync",
  ANALYZE_HOTSPOTS = "analyze_hotspots",
  ANALYZE_ACCOUNT_INSIGHTS = "analyze_account_insights",
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

// Union type for all job data
export type JobData =
  | PublishPostJobData
  | ProcessApprovalJobData
  | CheckExpiredTokensJobData
  | SystemHealthCheckJobData
  | CleanupOldLogsJobData
  | SendNotificationJobData
  | ProcessWebhookJobData
  | GenerateReportJobData
  | SocialMediaSyncJobData;

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
