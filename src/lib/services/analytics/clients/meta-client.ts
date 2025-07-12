import axios, { AxiosInstance, AxiosError } from "axios";
import { SocialPlatform } from "@prisma/client";
import { SocialMediaRateLimiter } from "./rate-limiter";

export interface MetaCredentials {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  platform: "INSTAGRAM" | "FACEBOOK";
  profileId?: string;
}

export interface AnalyticsData {
  id: string;
  platform: "INSTAGRAM" | "FACEBOOK";
  type: "post" | "story" | "account";
  timestamp: string;
  content?: string;
  mediaUrls?: string[]; // Array of media URLs
  insights: {
    impressions: number;
    reach: number;
    engagement: number;
    likes: number;
    comments: number;
    shares: number;
    saves?: number;
    clicks?: number;
    reactions?: number;
    video_views?: number;
    views?: number; // Instagram API v22.0+ views metric
  };
  rawData: any;
}

export interface AccountInsights {
  platform: "INSTAGRAM" | "FACEBOOK";
  follower_count: number;
  media_count: number;
  impressions: number;
  reach: number;
  engagement: number;
  profile_views?: number;
  website_clicks?: number;
}

/**
 * Meta Graph API Client
 * Consolidates Instagram and Facebook API calls into one efficient client
 * Eliminates redundancy between multiple client implementations
 */
export class MetaClient {
  private httpClient: AxiosInstance;
  private rateLimiter: SocialMediaRateLimiter;
  private baseURL = "https://graph.facebook.com";
  private apiVersion = "v22.0";
  private credentials: MetaCredentials;

  constructor(
    credentials: MetaCredentials,
    rateLimiter?: SocialMediaRateLimiter
  ) {
    this.credentials = credentials;
    this.rateLimiter = rateLimiter || new SocialMediaRateLimiter();

    this.httpClient = axios.create({
      baseURL: `${this.baseURL}/${this.apiVersion}`,
      timeout: 30000,
      headers: {
        "Content-Type": "application/json",
      },
    });

    // Add response interceptor for error handling
    this.httpClient.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => this.handleHttpError(error)
    );
  }

  /**
   * Unified method to get account insights for both Instagram and Facebook
   */
  async getAccountInsights(
    accountId: string,
    period: "day" | "week" | "days_28" = "week"
  ): Promise<AccountInsights> {
    const platform = this.credentials.platform;

    try {
      if (platform === "INSTAGRAM") {
        return await this.getInstagramAccountInsights(accountId, period);
      } else {
        return await this.getFacebookAccountInsights(accountId, period);
      }
    } catch (error) {
      console.error(`Failed to fetch ${platform} account insights:`, error);
      throw error;
    }
  }

  /**
   * Unified method to get media/posts analytics for both platforms
   */
  async getMediaAnalytics(
    accountId: string,
    limit: number = 25,
    since?: string,
    until?: string
  ): Promise<AnalyticsData[]> {
    const platform = this.credentials.platform;

    try {
      if (platform === "INSTAGRAM") {
        return await this.getInstagramMediaAnalytics(
          accountId,
          limit,
          since,
          until
        );
      } else {
        return await this.getFacebookPostAnalytics(
          accountId,
          limit,
          since,
          until
        );
      }
    } catch (error) {
      console.error(`Failed to fetch ${platform} media analytics:`, error);
      throw error;
    }
  }

  /**
   * Get single post/media analytics
   */
  async getSingleMediaAnalytics(mediaId: string): Promise<AnalyticsData> {
    const platform = this.credentials.platform;

    try {
      if (platform === "INSTAGRAM") {
        return await this.getInstagramSingleMedia(mediaId);
      } else {
        return await this.getFacebookSinglePost(mediaId);
      }
    } catch (error) {
      console.error(
        `Failed to fetch ${platform} single media analytics:`,
        error
      );
      throw error;
    }
  }

  /**
   * Validate access token for both platforms
   */
  async validateToken(): Promise<{
    isValid: boolean;
    expiresAt?: Date;
    scopes?: string[];
    error?: string;
  }> {
    try {
      const response = await this.httpClient.get("/me", {
        params: {
          access_token: this.credentials.accessToken,
          fields: "id,name",
        },
      });

      // Get token info
      const tokenInfo = await this.httpClient.get("/debug_token", {
        params: {
          input_token: this.credentials.accessToken,
          access_token: this.credentials.accessToken,
        },
      });

      const data = tokenInfo.data.data;

      return {
        isValid: data.is_valid,
        expiresAt: data.expires_at
          ? new Date(data.expires_at * 1000)
          : undefined,
        scopes: data.scopes || [],
      };
    } catch (error: any) {
      return {
        isValid: false,
        error: error.response?.data?.error?.message || error.message,
      };
    }
  }

  // Private Instagram-specific methods
  private async getInstagramAccountInsights(
    accountId: string,
    period: string
  ): Promise<AccountInsights> {
    try {
      // For Instagram Business accounts, use supported metrics in v22.0+
      // Based on: https://developers.facebook.com/docs/instagram-platform/api-reference/instagram-user/insights
      //
      // Important limitations from the documentation:
      // - 'impressions' is deprecated in v22.0+, replaced with 'views'
      // - Some metrics not available for accounts with < 100 followers
      // - Data may be delayed up to 48 hours
      // - Only 'day' period supported for interaction metrics
      const accountMetrics = ["views", "reach", "accounts_engaged"];

      const url = `/${accountId}/insights`;
      const params = {
        metric: accountMetrics.join(","),
        period,
        metric_type: "total_value",
        access_token: this.credentials.accessToken,
      };

      const response = await this.httpClient.get(url, { params });
      const data = response.data;

      console.log(
        `📊 Instagram insights response structure:`,
        JSON.stringify(data, null, 2)
      );

      const insights: any = {};
      data.data.forEach((metric: any) => {
        // When using metric_type=total_value, the structure is different
        const value =
          metric.total_value?.value || metric.values?.[0]?.value || 0;
        insights[metric.name] = value;
        console.log(`📊 Metric ${metric.name}: ${value}`);
      });

      // Get basic account info (follower count, media count)
      let followerCount = 0;
      let mediaCount = 0;

      try {
        const accountInfoResponse = await this.httpClient.get(`/${accountId}`, {
          params: {
            fields: "followers_count,media_count",
            access_token: this.credentials.accessToken,
          },
        });

        followerCount = accountInfoResponse.data.followers_count || 0;
        mediaCount = accountInfoResponse.data.media_count || 0;
      } catch (error) {
        console.warn("Could not fetch Instagram account basic info:", error);
      }

      return {
        platform: "INSTAGRAM",
        follower_count: followerCount,
        media_count: mediaCount,
        impressions: insights.views || 0, // 'views' replaces 'impressions' in v22.0+
        reach: insights.reach || 0,
        engagement: insights.accounts_engaged || 0, // Direct engagement metric
        profile_views: 0, // Not available in v22.0+ account insights
        website_clicks: 0, // Not available in basic insights
      };
    } catch (error: any) {
      console.error(
        "Failed to fetch INSTAGRAM account insights:",
        error.response?.data || error
      );

      // Try to get basic account info even if insights fail
      let followerCount = 0;
      let mediaCount = 0;

      try {
        const accountInfoResponse = await this.httpClient.get(`/${accountId}`, {
          params: {
            fields: "followers_count,media_count",
            access_token: this.credentials.accessToken,
          },
        });

        followerCount = accountInfoResponse.data.followers_count || 0;
        mediaCount = accountInfoResponse.data.media_count || 0;

        console.log(
          `📊 Retrieved basic account info: ${followerCount} followers, ${mediaCount} media`
        );
      } catch (basicInfoError) {
        console.warn(
          "Could not fetch basic Instagram account info:",
          basicInfoError
        );
      }

      // Fallback: return basic structure with available data
      return {
        platform: "INSTAGRAM",
        follower_count: followerCount,
        media_count: mediaCount,
        impressions: 0,
        reach: 0,
        engagement: 0,
        profile_views: 0,
        website_clicks: 0,
      };
    }
  }

  private async getFacebookAccountInsights(
    pageId: string,
    period: string
  ): Promise<AccountInsights> {
    const metrics = [
      "page_fans",
      "page_impressions",
      "page_engaged_users",
      "page_post_engagements",
    ];

    const url = `/${pageId}/insights`;
    const params = {
      metric: metrics.join(","),
      period,
      access_token: this.credentials.accessToken,
    };

    const response = await this.httpClient.get(url, { params });
    const data = response.data;

    const insights: any = {};
    data.data.forEach((metric: any) => {
      insights[metric.name] = metric.values[0]?.value || 0;
    });

    return {
      platform: "FACEBOOK",
      follower_count: insights.page_fans || 0,
      media_count: 0, // Would need separate API call
      impressions: insights.page_impressions || 0,
      reach: 0, // Not directly available
      engagement: insights.page_engaged_users || 0,
    };
  }

  private async getInstagramMediaAnalytics(
    accountId: string,
    limit: number,
    since?: string,
    until?: string
  ): Promise<AnalyticsData[]> {
    // Step 1: Get media list
    const mediaParams: any = {
      fields:
        "id,media_type,caption,timestamp,media_url,thumbnail_url,permalink",
      limit: limit.toString(),
      access_token: this.credentials.accessToken,
    };

    if (since) mediaParams.since = since;
    if (until) mediaParams.until = until;

    const mediaResponse = await this.httpClient.get(`/${accountId}/media`, {
      params: mediaParams,
    });

    const mediaList = mediaResponse.data.data || [];
    const results: AnalyticsData[] = [];

    // Step 2: Get insights for each media
    for (const media of mediaList) {
      try {
        const insights = await this.getInstagramMediaInsights(
          media.id,
          media.media_type
        );

        // Extract media URLs
        const mediaUrls: string[] = [];
        if (media.media_url) {
          mediaUrls.push(media.media_url);
        }
        if (media.thumbnail_url && media.thumbnail_url !== media.media_url) {
          mediaUrls.push(media.thumbnail_url);
        }

        results.push({
          id: media.id,
          platform: "INSTAGRAM",
          type: "post",
          timestamp: media.timestamp,
          content: media.caption,
          mediaUrls: mediaUrls.length > 0 ? mediaUrls : undefined,
          insights,
          rawData: media,
        });
      } catch (error) {
        console.warn(
          `Failed to get insights for Instagram media ${media.id}:`,
          error
        );
      }
    }

    return results;
  }

  private async getFacebookPostAnalytics(
    pageId: string,
    limit: number,
    since?: string,
    until?: string
  ): Promise<AnalyticsData[]> {
    // Step 1: Get posts list
    const postsParams: any = {
      fields: "id,message,created_time", // Removed 'type' field (deprecated in v3.3+)
      limit: limit.toString(),
      access_token: this.credentials.accessToken,
    };

    if (since) postsParams.since = since;
    if (until) postsParams.until = until;

    const postsResponse = await this.httpClient.get(`/${pageId}/posts`, {
      params: postsParams,
    });

    const postsList = postsResponse.data.data || [];
    const results: AnalyticsData[] = [];

    // Step 2: Get insights for each post
    for (const post of postsList) {
      try {
        const insights = await this.getFacebookPostInsights(post.id);

        results.push({
          id: post.id,
          platform: "FACEBOOK",
          type: "post",
          timestamp: post.created_time,
          content: post.message,
          insights,
          rawData: post,
        });
      } catch (error) {
        console.warn(
          `Failed to get insights for Facebook post ${post.id}:`,
          error
        );
      }
    }

    return results;
  }

  private async getInstagramSingleMedia(
    mediaId: string
  ): Promise<AnalyticsData> {
    // Get media info
    const mediaResponse = await this.httpClient.get(`/${mediaId}`, {
      params: {
        access_token: this.credentials.accessToken,
        fields:
          "id,caption,timestamp,media_type,media_url,thumbnail_url,permalink",
      },
    });

    const media = mediaResponse.data;
    const insights = await this.getInstagramMediaInsights(
      mediaId,
      media.media_type
    );

    // Extract media URLs
    const mediaUrls: string[] = [];
    if (media.media_url) {
      mediaUrls.push(media.media_url);
    }
    if (media.thumbnail_url && media.thumbnail_url !== media.media_url) {
      mediaUrls.push(media.thumbnail_url);
    }

    return {
      id: mediaId,
      platform: "INSTAGRAM",
      type: "post",
      timestamp: media.timestamp,
      content: media.caption,
      mediaUrls: mediaUrls.length > 0 ? mediaUrls : undefined,
      insights,
      rawData: media,
    };
  }

  private async getFacebookSinglePost(postId: string): Promise<AnalyticsData> {
    // Get post info
    const postResponse = await this.httpClient.get(`/${postId}`, {
      params: {
        access_token: this.credentials.accessToken,
        fields: "id,message,created_time", // Removed 'type' field (deprecated in v3.3+)
      },
    });

    const post = postResponse.data;
    const insights = await this.getFacebookPostInsights(postId);

    return {
      id: postId,
      platform: "FACEBOOK",
      type: "post",
      timestamp: post.created_time,
      content: post.message,
      insights,
      rawData: post,
    };
  }

  private async getInstagramMediaInsights(mediaId: string, mediaType: string) {
    // Based on official documentation: https://developers.facebook.com/docs/instagram-platform/reference/instagram-media/insights
    //
    // Important changes in v22.0+:
    // - 'impressions' deprecated for media created after July 2, 2024
    // - 'plays', 'video_views', 'clips_replays_count' deprecated
    // - New 'views' metric introduced for all media types

    // Core metrics supported for FEED posts
    const baseMetrics = [
      "views", // New metric replacing impressions/plays
      "reach", // Unique users who saw the media
      "likes", // Number of likes
      "comments", // Number of comments
      "shares", // Number of shares
      "saved", // Number of saves (note: API returns 'saved', not 'saves')
    ];

    // Additional metrics for FEED posts
    const feedMetrics =
      mediaType !== "VIDEO"
        ? [
            "profile_visits", // Profile visits from this post
            "profile_activity", // Actions taken on profile after viewing post
          ]
        : [];

    // Video/Reels specific metrics (non-deprecated)
    const videoMetrics =
      mediaType === "VIDEO"
        ? [
            "ig_reels_avg_watch_time", // Average watch time for reels
            "ig_reels_video_view_total_time", // Total watch time for reels
            "total_interactions", // Total interactions (likes + saves + comments + shares - unlikes - unsaves - deleted comments)
          ]
        : [];

    const metrics = [...baseMetrics, ...feedMetrics, ...videoMetrics];

    try {
      const response = await this.httpClient.get(`/${mediaId}/insights`, {
        params: {
          metric: metrics.join(","),
          access_token: this.credentials.accessToken,
        },
      });

      const data = response.data.data || [];
      const insights: any = {};

      data.forEach((metric: any) => {
        insights[metric.name] = metric.values[0]?.value || 0;
      });

      // Use total_interactions if available (for videos), otherwise calculate engagement
      const calculatedEngagement =
        insights.total_interactions ||
        (insights.likes || 0) +
          (insights.comments || 0) +
          (insights.shares || 0) +
          (insights.saved || 0);

      return {
        impressions: insights.views || 0, // 'views' replaces 'impressions' in v22.0+
        reach: insights.reach || 0,
        engagement: calculatedEngagement,
        likes: insights.likes || 0,
        comments: insights.comments || 0,
        shares: insights.shares || 0,
        saves: insights.saved || 0, // Note: API returns 'saved', not 'saves'
        video_views: insights.views || 0, // 'views' also replaces video-specific metrics
        views: insights.views || 0, // Add dedicated views field for clarity
        clicks: 0, // Not available in media insights
        reactions: insights.likes || 0, // Use likes as reactions for consistency
      };
    } catch (error: any) {
      console.warn(
        `Failed to get insights for Instagram media ${mediaId}:`,
        error
      );

      // Check if it's a deprecated metric error and provide helpful context
      if (
        error.message?.includes("impressions metric is no longer supported")
      ) {
        console.log(
          `📊 Media ${mediaId} was created after July 2, 2024 - 'impressions' metric deprecated, using 'views' instead`
        );
      }

      // Return basic structure with zeros if insights fail
      return {
        impressions: 0,
        reach: 0,
        engagement: 0,
        likes: 0,
        comments: 0,
        shares: 0,
        saves: 0,
        video_views: 0,
        views: 0,
        clicks: 0,
        reactions: 0,
      };
    }
  }

  private async getFacebookPostInsights(postId: string) {
    // Updated metrics for Facebook Graph API v22.0+
    // Note: post_engaged_users and post_clicks were deprecated on September 16, 2024
    // Reference: https://developers.facebook.com/docs/graph-api/changelog/version22.0
    const metrics = [
      "post_impressions", // Still available
      "post_reactions_like_total", // Still available
      // Removed deprecated metrics:
      // - "post_engaged_users" (deprecated Sept 16, 2024)
      // - "post_clicks" (deprecated Sept 16, 2024)
    ];

    try {
      const response = await this.httpClient.get(`/${postId}/insights`, {
        params: {
          metric: metrics.join(","),
          access_token: this.credentials.accessToken,
        },
      });

      const data = response.data.data || [];
      const insights: any = {};

      data.forEach((metric: any) => {
        insights[metric.name] = metric.values[0]?.value || 0;
      });

      return {
        impressions: insights.post_impressions || 0,
        reach: 0, // Not directly available
        engagement: 0, // post_engaged_users deprecated, would need alternative calculation
        likes: insights.post_reactions_like_total || 0,
        comments: 0, // Would need separate API call
        shares: 0, // Would need separate API call
        clicks: 0, // post_clicks deprecated, no direct replacement available
        reactions: insights.post_reactions_like_total || 0,
      };
    } catch (error) {
      // Fallback to basic post data if insights fail
      console.warn(`Insights failed for post ${postId}, using basic data`);

      const basicResponse = await this.httpClient.get(`/${postId}`, {
        params: {
          access_token: this.credentials.accessToken,
          fields: "id,likes.summary(true),comments.summary(true)",
        },
      });

      const basicData = basicResponse.data;

      return {
        impressions: 0,
        reach: 0,
        engagement: 0,
        likes: basicData.likes?.summary?.total_count || 0,
        comments: basicData.comments?.summary?.total_count || 0,
        shares: 0,
        clicks: 0,
        reactions: basicData.likes?.summary?.total_count || 0,
      };
    }
  }

  private handleHttpError(error: AxiosError): Promise<never> {
    const errorData = error.response?.data as any;
    const platformError = {
      code: errorData?.error?.code || error.response?.status || 500,
      message: errorData?.error?.message || error.message,
      type: errorData?.error?.type || "network_error",
      fbtrace_id: errorData?.error?.fbtrace_id,
    };

    console.error("Meta Graph API Error:", platformError);
    return Promise.reject(platformError);
  }
}
