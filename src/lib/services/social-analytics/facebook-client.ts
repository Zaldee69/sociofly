import axios, { AxiosInstance, AxiosError } from "axios";
import { SocialPlatform } from "@prisma/client";
import {
  FacebookPostData,
  FacebookInsights,
  PlatformCredentials,
  AnalyticsResponse,
  PlatformError,
  SocialAnalyticsData,
} from "./types";
import { SocialMediaRateLimiter } from "./rate-limiter";
import { SocialMediaDataNormalizer } from "./data-normalizer";

export class FacebookAnalyticsClient {
  private httpClient: AxiosInstance;
  private rateLimiter: SocialMediaRateLimiter;
  private baseURL = "https://graph.facebook.com";
  private apiVersion = "v22.0";

  constructor(rateLimiter: SocialMediaRateLimiter) {
    this.rateLimiter = rateLimiter;
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
   * Convert PlatformRateLimit to RateLimitInfo
   */
  private convertRateLimitInfo(platformRateLimit: any): any {
    return {
      platform: platformRateLimit.platform,
      remaining: platformRateLimit.remaining,
      resetTime: platformRateLimit.resetTime,
      dailyLimit: 4800,
      hourlyLimit: 200,
    };
  }

  /**
   * Fetch analytics data for a specific Facebook post
   */
  async getPostAnalytics(
    platformPostId: string,
    credentials: PlatformCredentials,
    postId: string
  ): Promise<AnalyticsResponse> {
    try {
      const requestFn = async () => {
        return await this.fetchPostInsights(
          platformPostId,
          credentials.accessToken
        );
      };

      const postData = await this.rateLimiter.executeWithRetry(
        SocialPlatform.FACEBOOK,
        "insights",
        requestFn
      );

      const normalizedData = SocialMediaDataNormalizer.normalizeFacebookData(
        postData,
        postId
      );

      // Validate the normalized data
      const validationError =
        SocialMediaDataNormalizer.validateNormalizedData(normalizedData);
      if (validationError) {
        return {
          success: false,
          error: validationError,
          rateLimitInfo: this.convertRateLimitInfo(
            this.rateLimiter.getRateLimitInfo(
              SocialPlatform.FACEBOOK,
              "insights"
            )
          ),
        };
      }

      return {
        success: true,
        data: normalizedData,
        rateLimitInfo: this.convertRateLimitInfo(
          this.rateLimiter.getRateLimitInfo(SocialPlatform.FACEBOOK, "insights")
        ),
      };
    } catch (error: any) {
      return {
        success: false,
        error: this.createPlatformError(error),
        rateLimitInfo: this.convertRateLimitInfo(
          this.rateLimiter.getRateLimitInfo(SocialPlatform.FACEBOOK, "insights")
        ),
      };
    }
  }

  /**
   * Fetch multiple posts analytics in batch
   */
  async getBatchPostAnalytics(
    posts: Array<{ platformPostId: string; postId: string }>,
    credentials: PlatformCredentials
  ): Promise<AnalyticsResponse[]> {
    const results: AnalyticsResponse[] = [];

    // Process posts in chunks to respect rate limits
    const chunkSize = 10;
    const chunks = this.chunkArray(posts, chunkSize);

    for (const chunk of chunks) {
      const chunkPromises = chunk.map((post) =>
        this.getPostAnalytics(post.platformPostId, credentials, post.postId)
      );

      const chunkResults = await Promise.allSettled(chunkPromises);

      for (const result of chunkResults) {
        if (result.status === "fulfilled") {
          results.push(result.value);
        } else {
          results.push({
            success: false,
            error: this.createPlatformError(result.reason),
            rateLimitInfo: this.convertRateLimitInfo(
              this.rateLimiter.getRateLimitInfo(
                SocialPlatform.FACEBOOK,
                "insights"
              )
            ),
          });
        }
      }

      // Small delay between chunks to avoid overwhelming the API
      if (chunks.indexOf(chunk) < chunks.length - 1) {
        await this.sleep(1000);
      }
    }

    return results;
  }

  /**
   * Fetch insights for a specific Facebook post
   */
  private async fetchPostInsights(
    postId: string,
    accessToken: string
  ): Promise<FacebookPostData> {
    // Using only valid (non-deprecated) metrics as of 2024
    // Based on Facebook Pages API Changelog: https://developers.facebook.com/docs/pages-api/changelog/
    const insights = [
      "post_impressions", // ✅ Still valid
      "post_impressions_unique", // ✅ Still valid
      "post_impressions_paid", // ✅ Still valid
      "post_impressions_organic", // ✅ Still valid
      "post_clicks", // ✅ Still valid (post_clicks_unique is deprecated)
      "post_reactions_like_total", // ✅ Still valid
      "post_reactions_love_total", // ✅ Still valid
      "post_reactions_wow_total", // ✅ Still valid
      "post_reactions_haha_total", // ✅ Still valid
      "post_reactions_sorry_total", // ✅ Still valid
      "post_reactions_anger_total", // ✅ Still valid
    ].join(",");

    console.log(`🔍 Facebook: Fetching insights for post ${postId}`);

    try {
      // First, try to get actual insights data
      console.log(`📊 Facebook: Trying to get insights data for ${postId}`);
      const insightsResponse = await this.httpClient.get(
        `/${postId}/insights`,
        {
          params: {
            access_token: accessToken,
            metric: insights,
          },
        }
      );

      console.log(
        `✅ Facebook: Successfully fetched insights data for ${postId}`
      );
      console.log(`📊 Facebook: Insights response data:`, {
        dataLength: insightsResponse.data.data?.length || 0,
        data: insightsResponse.data.data,
      });

      // Get basic post data separately (without conflicting fields)
      // If insights are empty, we'll get more detailed basic data
      const hasInsights = insightsResponse.data.data?.length > 0;

      let postResponse;
      if (hasInsights) {
        // If we have insights, we only need minimal post data
        postResponse = await this.httpClient.get(`/${postId}`, {
          params: {
            access_token: accessToken,
            fields: "id,created_time",
          },
        });
      } else {
        // If no insights, get more detailed basic data
        console.log(
          `📋 Facebook: No insights data, fetching detailed basic data for ${postId}`
        );
        try {
          postResponse = await this.httpClient.get(`/${postId}`, {
            params: {
              access_token: accessToken,
              fields:
                "id,created_time,likes.summary(true),comments.summary(true)",
            },
          });
        } catch (error) {
          console.warn(
            `⚠️ Facebook: Detailed basic data failed, using minimal fields`
          );
          postResponse = await this.httpClient.get(`/${postId}`, {
            params: {
              access_token: accessToken,
              fields: "id,created_time,likes.summary(true)",
            },
          });
        }
      }

      return {
        ...postResponse.data,
        insights: {
          data: insightsResponse.data.data || [],
        },
      };
    } catch (error: any) {
      console.warn(
        `⚠️ Facebook: Insights failed for ${postId}, trying basic data...`,
        {
          error: error.response?.data?.error?.message || error.message,
        }
      );

      // Fallback to basic fields that work for all post types (including photos)
      // Note: reactions field doesn't work with photo posts in v22.0+
      const basicFields = `id,created_time,likes.summary(true),comments.summary(true)`;

      try {
        console.log(`Trying basic fields for all post types: ${basicFields}`);
        const response = await this.httpClient.get(`/${postId}`, {
          params: {
            access_token: accessToken,
            fields: basicFields,
          },
        });

        const data = response.data;
        console.log(`✅ Successfully fetched basic data for post`);
        return data;
      } catch (basicError: any) {
        // If basic fields fail, try with even more minimal fields
        console.warn(
          `Basic fields failed for post ${postId}, trying minimal fields...`
        );

        const minimalFields = `id,created_time,likes.summary(true)`;

        try {
          console.log(`Trying minimal fields: ${minimalFields}`);
          const minimalResponse = await this.httpClient.get(`/${postId}`, {
            params: {
              access_token: accessToken,
              fields: minimalFields,
            },
          });

          const data = minimalResponse.data;
          console.log(`✅ Successfully fetched minimal data for post`);
          return data;
        } catch (minimalError: any) {
          console.log(
            `❌ Failed minimal data: ${minimalError.response?.data?.error?.message || minimalError.message}`
          );
          throw minimalError;
        }
      }
    }
  }

  /**
   * Validate Facebook access token
   */
  async validateAccessToken(accessToken: string): Promise<{
    valid: boolean;
    expiresAt?: Date;
    scopes?: string[];
    error?: string;
  }> {
    try {
      const response = await this.httpClient.get("/me", {
        params: {
          access_token: accessToken,
          fields: "id,name",
        },
      });

      // Get token info
      const tokenInfo = await this.httpClient.get("/debug_token", {
        params: {
          input_token: accessToken,
          access_token: accessToken, // App token would be better here
        },
      });

      const data = tokenInfo.data.data;

      return {
        valid: data.is_valid,
        expiresAt: data.expires_at
          ? new Date(data.expires_at * 1000)
          : undefined,
        scopes: data.scopes || [],
      };
    } catch (error: any) {
      return {
        valid: false,
        error: error.response?.data?.error?.message || error.message,
      };
    }
  }

  /**
   * Get Facebook page posts for analytics collection
   */
  async getPagePosts(
    pageId: string,
    accessToken: string,
    limit: number = 25,
    since?: Date
  ): Promise<FacebookPostData[]> {
    try {
      const params: any = {
        access_token: accessToken,
        fields: "id,message,caption,created_time",
        limit,
      };

      if (since) {
        params.since = Math.floor(since.getTime() / 1000);
      }

      const response = await this.httpClient.get(`/${pageId}/posts`, {
        params,
      });

      // Handle both message and caption fields for each post
      const posts = response.data.data || [];
      return posts.map((post: any) => {
        if (!post.message && post.caption) {
          post.message = post.caption;
        }
        return post;
      });
    } catch (error: any) {
      console.error("Error fetching Facebook page posts:", error);
      throw error;
    }
  }

  /**
   * Handle HTTP errors and convert to platform errors
   */
  private handleHttpError(error: AxiosError): Promise<never> {
    const platformError = this.createPlatformError(error);
    return Promise.reject(platformError);
  }

  /**
   * Create standardized platform error
   */
  private createPlatformError(error: any): PlatformError {
    let code = "UNKNOWN_ERROR";
    let message = "An unknown error occurred";
    let type: PlatformError["type"] = "API_ERROR";
    let retryAfter: number | undefined;

    // Log full error for debugging
    console.error("Full Facebook API error:", {
      response: error.response?.data,
      status: error.response?.status,
      headers: error.response?.headers,
      message: error.message,
      code: error.code,
    });

    if (error.response) {
      const status = error.response.status;
      const errorData = error.response.data?.error;

      switch (status) {
        case 400:
          code = errorData?.code?.toString() || "BAD_REQUEST";
          message = errorData?.message || "Bad request";
          type = "API_ERROR";
          break;
        case 401:
          code = "UNAUTHORIZED";
          message = "Invalid or expired access token";
          type = "AUTH_ERROR";
          break;
        case 403:
          code = "FORBIDDEN";
          message = errorData?.message || "Insufficient permissions";
          type = "AUTH_ERROR";
          break;
        case 429:
          code = "RATE_LIMITED";
          message = "Rate limit exceeded";
          type = "RATE_LIMIT";
          retryAfter = parseInt(error.response.headers["retry-after"]) || 3600;
          break;
        case 500:
        case 502:
        case 503:
        case 504:
          code = "SERVER_ERROR";
          message = "Facebook server error";
          type = "API_ERROR";
          break;
        default:
          code = `HTTP_${status}`;
          message = errorData?.message || `HTTP ${status} error`;
      }
    } else if (error.code === "ECONNABORTED") {
      code = "TIMEOUT";
      message = "Request timeout";
      type = "NETWORK_ERROR";
    } else if (error.code === "ENOTFOUND" || error.code === "ECONNREFUSED") {
      code = "NETWORK_ERROR";
      message = "Network connection error";
      type = "NETWORK_ERROR";
    } else {
      // Include original error message for debugging
      message = error.message || "An unknown error occurred";
    }

    return {
      platform: SocialPlatform.FACEBOOK,
      code,
      message,
      type,
      retryAfter,
      timestamp: new Date(),
    };
  }

  /**
   * Utility methods
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get required scopes for Facebook analytics
   */
  static getRequiredScopes(): string[] {
    return [
      "pages_read_engagement",
      "pages_show_list",
      "read_insights",
      "business_management",
    ];
  }

  /**
   * Generate Facebook OAuth URL for authorization
   */
  static generateAuthUrl(
    clientId: string,
    redirectUri: string,
    state?: string
  ): string {
    const scopes = this.getRequiredScopes().join(",");
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: scopes,
      response_type: "code",
      ...(state && { state }),
    });

    return `https://www.facebook.com/v22.0/dialog/oauth?${params.toString()}`;
  }
}
