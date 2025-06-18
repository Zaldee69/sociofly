import { PrismaClient } from "@prisma/client";

export interface MetaAPICredentials {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  platform: "INSTAGRAM" | "FACEBOOK";
}

export interface InstagramMediaInsights {
  id: string;
  media_type: "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM";
  caption?: string;
  timestamp: string;
  insights: {
    impressions: number;
    reach: number;
    engagement: number;
    likes: number;
    comments: number;
    shares: number;
    saves: number;
    video_views?: number;
  };
}

export interface InstagramAccountInsights {
  follower_count: number;
  media_count: number;
  impressions: number;
  reach: number;
  profile_views: number;
  website_clicks: number;
}

export interface FacebookPageInsights {
  page_fans: number;
  page_impressions: number;
  page_engaged_users: number;
  page_post_engagements: number;
  page_video_views: number;
}

export class MetaGraphAPI {
  private baseUrl = "https://graph.facebook.com/v19.0";
  private credentials: MetaAPICredentials;

  constructor(credentials: MetaAPICredentials) {
    this.credentials = credentials;
  }

  /**
   * Instagram Business Account Analytics
   */
  async getInstagramAccountInsights(
    accountId: string,
    period: "day" | "week" | "days_28" = "days_28"
  ): Promise<InstagramAccountInsights> {
    const metrics = [
      "follower_count",
      "media_count",
      "impressions",
      "reach",
      "profile_views",
      "website_clicks",
    ];

    const url = `${this.baseUrl}/${accountId}/insights`;
    const params = new URLSearchParams({
      metric: metrics.join(","),
      period,
      access_token: this.credentials.accessToken,
    });

    try {
      const response = await fetch(`${url}?${params}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          `Instagram API Error: ${data.error?.message || response.statusText}`
        );
      }

      // Transform API response to our format
      const insights: any = {};
      data.data.forEach((metric: any) => {
        insights[metric.name] = metric.values[0]?.value || 0;
      });

      return {
        follower_count: insights.follower_count || 0,
        media_count: insights.media_count || 0,
        impressions: insights.impressions || 0,
        reach: insights.reach || 0,
        profile_views: insights.profile_views || 0,
        website_clicks: insights.website_clicks || 0,
      };
    } catch (error) {
      console.error("Failed to fetch Instagram account insights:", error);
      throw error;
    }
  }

  /**
   * Instagram Media (Posts) Analytics
   */
  async getInstagramMediaInsights(
    accountId: string,
    limit: number = 25,
    since?: string,
    until?: string
  ): Promise<InstagramMediaInsights[]> {
    // Step 1: Get media IDs
    const mediaUrl = `${this.baseUrl}/${accountId}/media`;
    const mediaParams = new URLSearchParams({
      fields: "id,media_type,caption,timestamp",
      limit: limit.toString(),
      access_token: this.credentials.accessToken,
    });

    if (since) mediaParams.append("since", since);
    if (until) mediaParams.append("until", until);

    try {
      const mediaResponse = await fetch(`${mediaUrl}?${mediaParams}`);
      const mediaData = await mediaResponse.json();

      if (!mediaResponse.ok) {
        throw new Error(
          `Instagram Media API Error: ${mediaData.error?.message}`
        );
      }

      // Step 2: Get insights for each media
      const mediaWithInsights: InstagramMediaInsights[] = [];

      for (const media of mediaData.data) {
        try {
          const insights = await this.getMediaInsights(
            media.id,
            media.media_type
          );

          mediaWithInsights.push({
            id: media.id,
            media_type: media.media_type,
            caption: media.caption,
            timestamp: media.timestamp,
            insights,
          });
        } catch (error) {
          console.warn(`Failed to get insights for media ${media.id}:`, error);
          // Continue with other media even if one fails
        }
      }

      return mediaWithInsights;
    } catch (error) {
      console.error("Failed to fetch Instagram media:", error);
      throw error;
    }
  }

  /**
   * Get insights for specific media
   */
  private async getMediaInsights(mediaId: string, mediaType: string) {
    const metrics =
      mediaType === "VIDEO"
        ? [
            "impressions",
            "reach",
            "engagement",
            "likes",
            "comments",
            "shares",
            "saves",
            "video_views",
          ]
        : [
            "impressions",
            "reach",
            "engagement",
            "likes",
            "comments",
            "shares",
            "saves",
          ];

    const url = `${this.baseUrl}/${mediaId}/insights`;
    const params = new URLSearchParams({
      metric: metrics.join(","),
      access_token: this.credentials.accessToken,
    });

    const response = await fetch(`${url}?${params}`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(`Media Insights API Error: ${data.error?.message}`);
    }

    const insights: any = {};
    data.data.forEach((metric: any) => {
      insights[metric.name] = metric.values[0]?.value || 0;
    });

    return {
      impressions: insights.impressions || 0,
      reach: insights.reach || 0,
      engagement: insights.engagement || 0,
      likes: insights.likes || 0,
      comments: insights.comments || 0,
      shares: insights.shares || 0,
      saves: insights.saves || 0,
      video_views: insights.video_views || 0,
    };
  }

  /**
   * Instagram Stories Analytics
   */
  async getInstagramStoriesInsights(
    accountId: string,
    since?: string,
    until?: string
  ): Promise<any[]> {
    const url = `${this.baseUrl}/${accountId}/stories`;
    const params = new URLSearchParams({
      fields: "id,media_type,timestamp",
      access_token: this.credentials.accessToken,
    });

    if (since) params.append("since", since);
    if (until) params.append("until", until);

    try {
      const response = await fetch(`${url}?${params}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(`Instagram Stories API Error: ${data.error?.message}`);
      }

      const storiesWithInsights = [];

      for (const story of data.data) {
        try {
          const insights = await this.getStoryInsights(story.id);
          storiesWithInsights.push({
            id: story.id,
            media_type: story.media_type,
            timestamp: story.timestamp,
            insights,
          });
        } catch (error) {
          console.warn(`Failed to get insights for story ${story.id}:`, error);
        }
      }

      return storiesWithInsights;
    } catch (error) {
      console.error("Failed to fetch Instagram stories:", error);
      throw error;
    }
  }

  /**
   * Get insights for specific story
   */
  private async getStoryInsights(storyId: string) {
    const metrics = [
      "impressions",
      "reach",
      "replies",
      "exits",
      "taps_forward",
      "taps_back",
    ];

    const url = `${this.baseUrl}/${storyId}/insights`;
    const params = new URLSearchParams({
      metric: metrics.join(","),
      access_token: this.credentials.accessToken,
    });

    const response = await fetch(`${url}?${params}`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(`Story Insights API Error: ${data.error?.message}`);
    }

    const insights: any = {};
    data.data.forEach((metric: any) => {
      insights[metric.name] = metric.values[0]?.value || 0;
    });

    return {
      impressions: insights.impressions || 0,
      reach: insights.reach || 0,
      replies: insights.replies || 0,
      exits: insights.exits || 0,
      taps_forward: insights.taps_forward || 0,
      taps_back: insights.taps_back || 0,
      completion_rate:
        insights.reach > 0
          ? ((insights.reach - insights.exits) / insights.reach) * 100
          : 0,
    };
  }

  /**
   * Instagram Audience Insights
   */
  async getInstagramAudienceInsights(
    accountId: string,
    period: "lifetime" | "day" | "week" | "days_28" = "lifetime"
  ): Promise<any> {
    const metrics = [
      "audience_gender_age",
      "audience_locale",
      "audience_country",
      "audience_city",
      "online_followers",
    ];

    const url = `${this.baseUrl}/${accountId}/insights`;
    const params = new URLSearchParams({
      metric: metrics.join(","),
      period,
      access_token: this.credentials.accessToken,
    });

    try {
      const response = await fetch(`${url}?${params}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(`Instagram Audience API Error: ${data.error?.message}`);
      }

      const insights: any = {};
      data.data.forEach((metric: any) => {
        insights[metric.name] = metric.values[0]?.value || {};
      });

      return {
        demographics: insights.audience_gender_age || {},
        locations: {
          countries: insights.audience_country || {},
          cities: insights.audience_city || {},
          locales: insights.audience_locale || {},
        },
        onlineFollowers: insights.online_followers || {},
      };
    } catch (error) {
      console.error("Failed to fetch Instagram audience insights:", error);
      throw error;
    }
  }

  /**
   * Facebook Page Analytics
   */
  async getFacebookPageInsights(
    pageId: string,
    period: "day" | "week" | "days_28" = "days_28"
  ): Promise<FacebookPageInsights> {
    const metrics = [
      "page_fans",
      "page_impressions",
      "page_engaged_users",
      "page_post_engagements",
      "page_video_views",
    ];

    const url = `${this.baseUrl}/${pageId}/insights`;
    const params = new URLSearchParams({
      metric: metrics.join(","),
      period,
      access_token: this.credentials.accessToken,
    });

    try {
      const response = await fetch(`${url}?${params}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(`Facebook Page API Error: ${data.error?.message}`);
      }

      const insights: any = {};
      data.data.forEach((metric: any) => {
        insights[metric.name] = metric.values[0]?.value || 0;
      });

      return {
        page_fans: insights.page_fans || 0,
        page_impressions: insights.page_impressions || 0,
        page_engaged_users: insights.page_engaged_users || 0,
        page_post_engagements: insights.page_post_engagements || 0,
        page_video_views: insights.page_video_views || 0,
      };
    } catch (error) {
      console.error("Failed to fetch Facebook page insights:", error);
      throw error;
    }
  }

  /**
   * Facebook Posts Analytics
   */
  async getFacebookPostsInsights(
    pageId: string,
    limit: number = 25,
    since?: string,
    until?: string
  ): Promise<any[]> {
    // Step 1: Get posts
    const postsUrl = `${this.baseUrl}/${pageId}/posts`;
    const postsParams = new URLSearchParams({
      fields: "id,message,created_time,type",
      limit: limit.toString(),
      access_token: this.credentials.accessToken,
    });

    if (since) postsParams.append("since", since);
    if (until) postsParams.append("until", until);

    try {
      const postsResponse = await fetch(`${postsUrl}?${postsParams}`);
      const postsData = await postsResponse.json();

      if (!postsResponse.ok) {
        throw new Error(
          `Facebook Posts API Error: ${postsData.error?.message}`
        );
      }

      // Step 2: Get insights for each post
      const postsWithInsights = [];

      for (const post of postsData.data) {
        try {
          const insights = await this.getFacebookPostInsights(post.id);
          postsWithInsights.push({
            id: post.id,
            message: post.message,
            created_time: post.created_time,
            type: post.type,
            insights,
          });
        } catch (error) {
          console.warn(`Failed to get insights for post ${post.id}:`, error);
        }
      }

      return postsWithInsights;
    } catch (error) {
      console.error("Failed to fetch Facebook posts:", error);
      throw error;
    }
  }

  /**
   * Get insights for specific Facebook post
   */
  private async getFacebookPostInsights(postId: string) {
    const metrics = [
      "post_impressions",
      "post_engaged_users",
      "post_clicks",
      "post_reactions_like_total",
      "post_reactions_love_total",
      "post_reactions_wow_total",
      "post_reactions_haha_total",
      "post_reactions_sorry_total",
      "post_reactions_anger_total",
    ];

    const url = `${this.baseUrl}/${postId}/insights`;
    const params = new URLSearchParams({
      metric: metrics.join(","),
      access_token: this.credentials.accessToken,
    });

    const response = await fetch(`${url}?${params}`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        `Facebook Post Insights API Error: ${data.error?.message}`
      );
    }

    const insights: any = {};
    data.data.forEach((metric: any) => {
      insights[metric.name] = metric.values[0]?.value || 0;
    });

    // Calculate total reactions
    const totalReactions =
      (insights.post_reactions_like_total || 0) +
      (insights.post_reactions_love_total || 0) +
      (insights.post_reactions_wow_total || 0) +
      (insights.post_reactions_haha_total || 0) +
      (insights.post_reactions_sorry_total || 0) +
      (insights.post_reactions_anger_total || 0);

    return {
      impressions: insights.post_impressions || 0,
      engaged_users: insights.post_engaged_users || 0,
      clicks: insights.post_clicks || 0,
      reactions: totalReactions,
      likes: insights.post_reactions_like_total || 0,
      loves: insights.post_reactions_love_total || 0,
      wows: insights.post_reactions_wow_total || 0,
      hahas: insights.post_reactions_haha_total || 0,
      sorrys: insights.post_reactions_sorry_total || 0,
      angers: insights.post_reactions_anger_total || 0,
    };
  }

  /**
   * Validate access token
   */
  async validateToken(): Promise<{
    isValid: boolean;
    expiresIn?: number;
    error?: string;
  }> {
    try {
      const url = `${this.baseUrl}/me`;
      const params = new URLSearchParams({
        fields: "id,name",
        access_token: this.credentials.accessToken,
      });

      const response = await fetch(`${url}?${params}`);
      const data = await response.json();

      if (!response.ok) {
        return {
          isValid: false,
          error: data.error?.message || "Token validation failed",
        };
      }

      // Get token info for expiration
      const debugUrl = `${this.baseUrl}/debug_token`;
      const debugParams = new URLSearchParams({
        input_token: this.credentials.accessToken,
        access_token: this.credentials.accessToken,
      });

      const debugResponse = await fetch(`${debugUrl}?${debugParams}`);
      const debugData = await debugResponse.json();

      return {
        isValid: true,
        expiresIn: debugData.data?.expires_at
          ? debugData.data.expires_at - Math.floor(Date.now() / 1000)
          : undefined,
      };
    } catch (error) {
      return {
        isValid: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Refresh access token (for long-lived tokens)
   */
  async refreshAccessToken(
    clientId: string,
    clientSecret: string
  ): Promise<{
    accessToken?: string;
    expiresIn?: number;
    error?: string;
  }> {
    try {
      const url = `${this.baseUrl}/oauth/access_token`;
      const params = new URLSearchParams({
        grant_type: "fb_exchange_token",
        client_id: clientId,
        client_secret: clientSecret,
        fb_exchange_token: this.credentials.accessToken,
      });

      const response = await fetch(`${url}?${params}`);
      const data = await response.json();

      if (!response.ok) {
        return {
          error: data.error?.message || "Token refresh failed",
        };
      }

      return {
        accessToken: data.access_token,
        expiresIn: data.expires_in,
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
}
