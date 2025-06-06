import { SocialPlatform } from "@prisma/client";
import {
  SocialAnalyticsData,
  FacebookInsights,
  FacebookPostData,
  InstagramInsights,
  InstagramMediaData,
  PlatformError,
} from "./types";

export class SocialMediaDataNormalizer {
  /**
   * Normalize a date to the start of the day (00:00:00.000)
   * This ensures all analytics for the same day have identical timestamps
   */
  private static normalizeToStartOfDay(date: Date): Date {
    return new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      0,
      0,
      0,
      0
    );
  }

  /**
   * Normalize Facebook analytics data to standard format
   */
  static normalizeFacebookData(
    postData: FacebookPostData,
    postId: string
  ): SocialAnalyticsData {
    const insights = postData.insights?.data || [];

    // Extract metrics from Facebook insights format
    const getMetricValue = (metricName: string): number => {
      const metric = insights.find((insight) => insight.name === metricName);
      return metric?.values?.[0]?.value || 0;
    };

    // Get available metrics (using only non-deprecated ones)
    const impressions = getMetricValue("post_impressions");
    const impressionsUnique = getMetricValue("post_impressions_unique");
    const impressionsPaid = getMetricValue("post_impressions_paid");
    const impressionsOrganic = getMetricValue("post_impressions_organic");
    const clicks = getMetricValue("post_clicks");

    // Reactions (all still valid)
    const likesReactions = getMetricValue("post_reactions_like_total");
    const loveReactions = getMetricValue("post_reactions_love_total");
    const wowReactions = getMetricValue("post_reactions_wow_total");
    const hahaReactions = getMetricValue("post_reactions_haha_total");
    const sorryReactions = getMetricValue("post_reactions_sorry_total");
    const angerReactions = getMetricValue("post_reactions_anger_total");

    // Total reactions from insights
    let totalReactions =
      likesReactions +
      loveReactions +
      wowReactions +
      hahaReactions +
      sorryReactions +
      angerReactions;

    // Use impressions_unique as reach (closest available metric)
    let reach = impressionsUnique || impressions;

    // Always get comments from basic post data if available
    let comments = postData.comments?.summary?.total_count || 0;
    let shares = 0;
    let dataSource = "insights";

    // If insights data is not available, use basic post data as fallback
    if (insights.length === 0 && postData.likes) {
      console.log(
        `Using fallback data from basic post info for post ${postData.id}`
      );
      dataSource = "fallback";

      // Use basic post data
      totalReactions =
        postData.reactions?.summary?.total_count ||
        postData.likes?.summary?.total_count ||
        0;
      // comments already set above
      shares = postData.shares?.count || 0;

      // For fallback, use more realistic estimates for reach based on engagement
      // Industry average: reach is typically 6-10x the total engagement for organic posts
      const totalEngagementMetrics = totalReactions + comments + shares;
      if (totalEngagementMetrics > 0) {
        // Use 8x multiplier as middle ground, with minimum of actual engagement
        reach = Math.max(totalEngagementMetrics * 8, totalEngagementMetrics);
      } else {
        // If no engagement data, use a very conservative estimate
        reach = 50; // Minimal reach for published posts
      }
    }

    // Calculate engagement rate based on available data
    const totalEngagement = totalReactions + comments + shares + clicks;
    const engagementRate = reach > 0 ? (totalEngagement / reach) * 100 : 0;

    // For views calculation, use more realistic approach
    let calculatedViews = impressions;
    if (!calculatedViews) {
      // If no impressions data, estimate based on reach
      // Typically impressions are 1.2-3x reach (people see posts multiple times)
      calculatedViews = reach > 0 ? Math.round(reach * 1.5) : reach;
    }

    // For impressions calculation, ensure it's at least equal to reach
    const calculatedImpressions = impressions || calculatedViews || reach;

    const result = {
      postId,
      platform: SocialPlatform.FACEBOOK,
      platformPostId: postData.id,
      views: calculatedViews,
      likes: totalReactions,
      comments,
      shares,
      clicks,
      reach,
      impressions: calculatedImpressions,
      engagement: Math.round(engagementRate * 100) / 100,
      recordedAt: this.normalizeToStartOfDay(new Date()),
      rawInsights: postData.insights?.data || [],
    };

    console.log(`Facebook analytics normalized for ${postData.id}:`, {
      dataSource,
      hasInsights: insights.length > 0,
      likes: result.likes,
      reach: result.reach,
      views: result.views,
      engagement: result.engagement + "%",
    });

    return result;
  }

  /**
   * Normalize Instagram analytics data to standard format
   */
  static normalizeInstagramData(
    mediaData: InstagramMediaData,
    postId: string
  ): SocialAnalyticsData {
    const insights = mediaData.insights?.data || [];

    // Extract metrics from Instagram insights format
    const getMetricValue = (metricName: string): number => {
      const metric = insights.find((insight) => insight.name === metricName);
      return metric?.values?.[0]?.value || 0;
    };

    // Updated for Instagram API v22.0+ metrics
    const views = getMetricValue("views"); // New metric replacing impressions
    const reach = getMetricValue("reach");
    const likes = getMetricValue("likes");
    const comments = getMetricValue("comments");
    const shares = getMetricValue("shares");
    const saves = getMetricValue("saves");

    // For compatibility, use views as impressions since impressions is deprecated
    const impressions = views; // In v22.0+, views replaces impressions

    // For Instagram, engagement includes likes, comments, shares, and saves
    const totalEngagement = likes + comments + shares + saves;
    const engagementRate = reach > 0 ? (totalEngagement / reach) * 100 : 0;

    console.log(`📊 Instagram: Normalized data for ${mediaData.id}:`, {
      views,
      reach,
      likes,
      comments,
      shares,
      saves,
      totalEngagement,
      engagementRate: Math.round(engagementRate * 100) / 100,
    });

    return {
      postId,
      platform: SocialPlatform.INSTAGRAM,
      platformPostId: mediaData.id,
      views,
      likes,
      comments,
      shares,
      clicks: 0, // Instagram doesn't provide click data in basic insights
      reach,
      impressions, // Using views as impressions for compatibility
      engagement: Math.round(engagementRate * 100) / 100,
      recordedAt: this.normalizeToStartOfDay(new Date()),
      rawInsights: mediaData.insights?.data || [],
    };
  }

  /**
   * Validate normalized data for consistency
   */
  static validateNormalizedData(
    data: SocialAnalyticsData
  ): PlatformError | null {
    const errors: string[] = [];

    // Basic validation
    if (!data.postId) errors.push("Missing postId");
    if (!data.platformPostId) errors.push("Missing platformPostId");
    if (data.views < 0) errors.push("Views cannot be negative");
    if (data.likes < 0) errors.push("Likes cannot be negative");
    if (data.comments < 0) errors.push("Comments cannot be negative");
    if (data.shares < 0) errors.push("Shares cannot be negative");
    if (data.reach < 0) errors.push("Reach cannot be negative");
    if (data.impressions < 0) errors.push("Impressions cannot be negative");
    if (data.engagement < 0 || data.engagement > 100) {
      errors.push("Engagement rate must be between 0 and 100");
    }

    // Logical validation
    if (data.reach > data.impressions && data.impressions > 0) {
      errors.push("Reach cannot be greater than impressions");
    }

    if (
      data.likes + data.comments + data.shares > data.reach &&
      data.reach > 0
    ) {
      // This might be acceptable in some cases, but worth flagging
      console.warn(
        "Total engagement exceeds reach, which may indicate data quality issues"
      );
    }

    if (errors.length > 0) {
      return {
        platform: data.platform,
        code: "VALIDATION_ERROR",
        message: `Data validation failed: ${errors.join(", ")}`,
        type: "API_ERROR",
        timestamp: new Date(),
      };
    }

    return null;
  }

  /**
   * Aggregate multiple analytics data points (e.g., for date ranges)
   */
  static aggregateAnalyticsData(
    dataPoints: SocialAnalyticsData[]
  ): SocialAnalyticsData | null {
    if (dataPoints.length === 0) return null;

    const first = dataPoints[0];

    // Use the latest data point for basic info
    const latest = dataPoints[dataPoints.length - 1];

    // Sum up metrics
    const aggregated: SocialAnalyticsData = {
      postId: first.postId,
      platform: first.platform,
      platformPostId: first.platformPostId,
      views: dataPoints.reduce((sum, data) => sum + data.views, 0),
      likes: dataPoints.reduce((sum, data) => sum + data.likes, 0),
      comments: dataPoints.reduce((sum, data) => sum + data.comments, 0),
      shares: dataPoints.reduce((sum, data) => sum + data.shares, 0),
      clicks: dataPoints.reduce((sum, data) => sum + (data.clicks || 0), 0),
      reach: Math.max(...dataPoints.map((data) => data.reach)), // Use max reach
      impressions: dataPoints.reduce((sum, data) => sum + data.impressions, 0),
      engagement: 0, // Will be calculated below
      recordedAt: latest.recordedAt,
    };

    // Recalculate engagement rate based on aggregated data
    const totalEngagement =
      aggregated.likes + aggregated.comments + aggregated.shares;
    aggregated.engagement =
      aggregated.reach > 0
        ? Math.round((totalEngagement / aggregated.reach) * 10000) / 100
        : 0;

    return aggregated;
  }

  /**
   * Compare analytics data between platforms or time periods
   */
  static compareAnalyticsData(
    baseData: SocialAnalyticsData,
    compareData: SocialAnalyticsData
  ): {
    viewsChange: number;
    likesChange: number;
    commentsChange: number;
    sharesChange: number;
    reachChange: number;
    engagementChange: number;
  } {
    const calculateChange = (current: number, previous: number): number => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return Math.round(((current - previous) / previous) * 10000) / 100;
    };

    return {
      viewsChange: calculateChange(compareData.views, baseData.views),
      likesChange: calculateChange(compareData.likes, baseData.likes),
      commentsChange: calculateChange(compareData.comments, baseData.comments),
      sharesChange: calculateChange(compareData.shares, baseData.shares),
      reachChange: calculateChange(compareData.reach, baseData.reach),
      engagementChange: calculateChange(
        compareData.engagement,
        baseData.engagement
      ),
    };
  }

  /**
   * Convert analytics data to different formats for reporting
   */
  static formatForReporting(data: SocialAnalyticsData): {
    formatted: Record<string, string>;
    raw: SocialAnalyticsData;
  } {
    return {
      formatted: {
        platform: data.platform,
        views: data.views.toLocaleString(),
        likes: data.likes.toLocaleString(),
        comments: data.comments.toLocaleString(),
        shares: data.shares.toLocaleString(),
        reach: data.reach.toLocaleString(),
        impressions: data.impressions.toLocaleString(),
        engagement: `${data.engagement}%`,
        recordedAt: data.recordedAt.toLocaleDateString(),
      },
      raw: data,
    };
  }

  /**
   * Detect anomalies in analytics data
   */
  static detectAnomalies(
    currentData: SocialAnalyticsData,
    historicalData: SocialAnalyticsData[]
  ): {
    hasAnomalies: boolean;
    anomalies: string[];
    severity: "low" | "medium" | "high";
  } {
    if (historicalData.length < 3) {
      return { hasAnomalies: false, anomalies: [], severity: "low" };
    }

    const anomalies: string[] = [];

    // Calculate historical averages
    const avgViews =
      historicalData.reduce((sum, data) => sum + data.views, 0) /
      historicalData.length;
    const avgLikes =
      historicalData.reduce((sum, data) => sum + data.likes, 0) /
      historicalData.length;
    const avgEngagement =
      historicalData.reduce((sum, data) => sum + data.engagement, 0) /
      historicalData.length;

    // Check for significant deviations (more than 200% increase or 50% decrease)
    if (currentData.views > avgViews * 3) {
      anomalies.push(
        `Views spike: ${currentData.views} vs avg ${Math.round(avgViews)}`
      );
    } else if (currentData.views < avgViews * 0.5 && avgViews > 100) {
      anomalies.push(
        `Views drop: ${currentData.views} vs avg ${Math.round(avgViews)}`
      );
    }

    if (currentData.likes > avgLikes * 3) {
      anomalies.push(
        `Likes spike: ${currentData.likes} vs avg ${Math.round(avgLikes)}`
      );
    } else if (currentData.likes < avgLikes * 0.5 && avgLikes > 10) {
      anomalies.push(
        `Likes drop: ${currentData.likes} vs avg ${Math.round(avgLikes)}`
      );
    }

    if (
      Math.abs(currentData.engagement - avgEngagement) > 5 &&
      avgEngagement > 1
    ) {
      anomalies.push(
        `Engagement rate change: ${currentData.engagement}% vs avg ${avgEngagement.toFixed(1)}%`
      );
    }

    const severity =
      anomalies.length > 2 ? "high" : anomalies.length > 0 ? "medium" : "low";

    return {
      hasAnomalies: anomalies.length > 0,
      anomalies,
      severity,
    };
  }
}
