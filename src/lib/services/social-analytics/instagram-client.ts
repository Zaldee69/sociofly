import axios, { AxiosInstance, AxiosError } from "axios";
import { SocialPlatform } from "@prisma/client";
import {
  InstagramMediaData,
  InstagramInsights,
  PlatformCredentials,
  AnalyticsResponse,
  PlatformError,
  SocialAnalyticsData,
} from "./types";
import { SocialMediaRateLimiter } from "./rate-limiter";
import { SocialMediaDataNormalizer } from "./data-normalizer";

export class InstagramAnalyticsClient {
  private httpClient: AxiosInstance;
  private rateLimiter: SocialMediaRateLimiter;
  private baseURL = "https://graph.facebook.com";
  private apiVersion = "v18.0";

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
   * Fetch analytics data for a specific Instagram media
   */
  async getPostAnalytics(
    platformPostId: string,
    credentials: PlatformCredentials,
    postId: string
  ): Promise<AnalyticsResponse> {
    try {
      const requestFn = async () => {
        return await this.fetchMediaInsights(
          platformPostId,
          credentials.accessToken
        );
      };

      const mediaData = await this.rateLimiter.executeWithRetry(
        SocialPlatform.INSTAGRAM,
        "insights",
        requestFn
      );

      const normalizedData = SocialMediaDataNormalizer.normalizeInstagramData(
        mediaData,
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
              SocialPlatform.INSTAGRAM,
              "insights"
            )
          ),
        };
      }

      return {
        success: true,
        data: normalizedData,
        rateLimitInfo: this.convertRateLimitInfo(
          this.rateLimiter.getRateLimitInfo(
            SocialPlatform.INSTAGRAM,
            "insights"
          )
        ),
      };
    } catch (error: any) {
      return {
        success: false,
        error: this.createPlatformError(error),
        rateLimitInfo: this.convertRateLimitInfo(
          this.rateLimiter.getRateLimitInfo(
            SocialPlatform.INSTAGRAM,
            "insights"
          )
        ),
      };
    }
  }

  /**
   * Fetch multiple media analytics in batch
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
                SocialPlatform.INSTAGRAM,
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
   * Fetch insights for a specific Instagram media
   */
  private async fetchMediaInsights(
    mediaId: string,
    accessToken: string
  ): Promise<InstagramMediaData> {
    // Different insights based on media type
    const photoInsights = [
      "impressions",
      "reach",
      "engagement",
      "likes",
      "comments",
      "shares",
      "saves",
    ];

    const videoInsights = [
      "impressions",
      "reach",
      "engagement",
      "likes",
      "comments",
      "shares",
      "saves",
      "video_views",
    ];

    // First, get media info to determine type
    const mediaInfo = await this.httpClient.get(`/${mediaId}`, {
      params: {
        access_token: accessToken,
        fields: "id,caption,timestamp,media_type",
      },
    });

    const mediaType = mediaInfo.data.media_type;
    const insights = mediaType === "VIDEO" ? videoInsights : photoInsights;

    // Then get insights
    const insightsResponse = await this.httpClient.get(`/${mediaId}/insights`, {
      params: {
        access_token: accessToken,
        metric: insights.join(","),
      },
    });

    return {
      ...mediaInfo.data,
      insights: {
        data: insightsResponse.data.data,
      },
    };
  }

  /**
   * Validate Instagram access token
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
          fields: "id,username",
        },
      });

      // Get token info for Instagram
      const tokenInfo = await this.httpClient.get("/debug_token", {
        params: {
          input_token: accessToken,
          access_token: accessToken,
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
   * Get Instagram business account media for analytics collection
   */
  async getAccountMedia(
    userId: string,
    accessToken: string,
    limit: number = 25,
    since?: Date
  ): Promise<InstagramMediaData[]> {
    try {
      const params: any = {
        access_token: accessToken,
        fields: "id,caption,timestamp,media_type",
        limit,
      };

      if (since) {
        params.since = Math.floor(since.getTime() / 1000);
      }

      const response = await this.httpClient.get(`/${userId}/media`, {
        params,
      });

      return response.data.data || [];
    } catch (error: any) {
      console.error("Error fetching Instagram media:", error);
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

    if (error.response) {
      const status = error.response.status;
      const errorData = error.response.data?.error;

      switch (status) {
        case 400:
          code = errorData?.code || "BAD_REQUEST";
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
          message = "Instagram server error";
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
    }

    return {
      platform: SocialPlatform.INSTAGRAM,
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
   * Get required scopes for Instagram analytics
   */
  static getRequiredScopes(): string[] {
    return [
      "instagram_basic",
      "instagram_manage_insights",
      "business_management",
      "pages_read_engagement",
    ];
  }

  /**
   * Generate Instagram OAuth URL for authorization (via Facebook)
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

    return `https://www.facebook.com/v18.0/dialog/oauth?${params.toString()}`;
  }
}
