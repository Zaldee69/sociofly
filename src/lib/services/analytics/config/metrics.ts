/**
 * Metrics Definitions
 * All possible metrics that can be collected and analyzed
 */

export interface AccountMetric {
  followers: number;
  following: number;
  posts: number;
  engagement_rate: number;
  avg_reach: number;
  profile_visits?: number;
}

export interface PostMetric {
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  reach: number;
  impressions: number;
}

export interface StoryMetric {
  views: number;
  reach: number;
  impressions: number;
  replies: number;
  exits: number;
}

export interface InsightMetric {
  best_time: string;
  best_day: string;
  audience_age: Record<string, number>;
  audience_gender: Record<string, number>;
  top_content: string[];
}

// Union type for all metrics
export type Metric = AccountMetric | PostMetric | StoryMetric | InsightMetric;

// Metric categories for easier organization
export const METRIC_CATEGORIES = {
  ACCOUNT: ["followers", "following", "posts", "engagement_rate", "avg_reach"],
  POST: ["likes", "comments", "shares", "saves", "reach", "impressions"],
  STORY: ["views", "reach", "impressions", "replies", "exits"],
  INSIGHT: ["best_time", "best_day", "audience_age", "audience_gender"],
} as const;

// Helper function to validate metrics
export function validateMetric(
  category: keyof typeof METRIC_CATEGORIES,
  metric: any
): boolean {
  const requiredFields = METRIC_CATEGORIES[category];
  return requiredFields.every((field) => field in metric);
}
