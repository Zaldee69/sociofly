import { SocialPlatform } from "@prisma/client";

// Base types for all platforms
export interface SocialAnalyticsData {
  postId: string;
  platform: SocialPlatform;
  platformPostId: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  clicks?: number;
  reach: number;
  impressions: number;
  engagement: number;
  recordedAt: Date;
}

export interface PlatformCredentials {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  pageId?: string; // For Facebook pages
  userId?: string;
}

export interface RateLimitInfo {
  platform: SocialPlatform;
  remaining: number;
  resetTime: Date;
  dailyLimit: number;
  hourlyLimit?: number;
}

// Facebook specific types
export interface FacebookInsights {
  post_impressions: Array<{ value: number }>;
  post_engaged_users: Array<{ value: number }>;
  post_clicks: Array<{ value: number }>;
  post_reactions_like_total: Array<{ value: number }>;
  post_video_views?: Array<{ value: number }>;
}

export interface FacebookPostData {
  id: string;
  message?: string;
  created_time: string;
  insights?: {
    data: Array<{
      name: string;
      values: Array<{ value: number }>;
    }>;
  };
  likes?: {
    summary: {
      total_count: number;
    };
  };
  reactions?: {
    summary: {
      total_count: number;
    };
  };
  comments?: {
    summary: {
      total_count: number;
    };
  };
  shares?: {
    count: number;
  };
}

// Instagram specific types
export interface InstagramInsights {
  impressions: Array<{ value: number }>;
  reach: Array<{ value: number }>;
  engagement: Array<{ value: number }>;
  likes: Array<{ value: number }>;
  comments: Array<{ value: number }>;
  shares: Array<{ value: number }>;
  saves: Array<{ value: number }>;
}

export interface InstagramMediaData {
  id: string;
  caption?: string;
  timestamp: string;
  media_type: string;
  insights?: {
    data: Array<{
      name: string;
      values: Array<{ value: number }>;
    }>;
  };
}

// Error types
export interface PlatformError {
  platform: SocialPlatform;
  code: string;
  message: string;
  type: "RATE_LIMIT" | "AUTH_ERROR" | "API_ERROR" | "NETWORK_ERROR";
  retryAfter?: number;
  timestamp: Date;
}

// Rate limiting types
export interface RateLimitStrategy {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  jitterEnabled: boolean;
}

export interface PlatformRateLimit {
  platform: SocialPlatform;
  endpoint: string;
  limit: number;
  window: number; // in seconds
  remaining: number;
  resetTime: Date;
}

// Analytics response types
export interface AnalyticsResponse {
  success: boolean;
  data?: SocialAnalyticsData;
  error?: PlatformError;
  rateLimitInfo?: RateLimitInfo;
}

export interface BatchAnalyticsResponse {
  platform: SocialPlatform;
  results: AnalyticsResponse[];
  totalRequests: number;
  successCount: number;
  errorCount: number;
  rateLimitHit: boolean;
}

// Configuration types
export interface PlatformConfig {
  platform: SocialPlatform;
  baseUrl: string;
  apiVersion: string;
  rateLimit: RateLimitStrategy;
  endpoints: {
    insights: string;
    posts: string;
    media: string;
  };
  requiredScopes: string[];
}

export interface SocialAnalyticsConfig {
  platforms: Record<SocialPlatform, PlatformConfig>;
  defaultRetryStrategy: RateLimitStrategy;
  maxConcurrentRequests: number;
  requestTimeout: number;
  cacheEnabled: boolean;
  cacheTtl: number;
}
