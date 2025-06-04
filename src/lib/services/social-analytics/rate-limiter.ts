import { SocialPlatform } from "@prisma/client";
import { PlatformRateLimit, RateLimitStrategy, PlatformError } from "./types";

interface RateLimitEntry {
  count: number;
  resetTime: Date;
  lastRequest: Date;
}

interface RequestQueue {
  resolve: (value: boolean) => void;
  reject: (error: Error) => void;
  timestamp: Date;
  priority: number;
}

export class SocialMediaRateLimiter {
  private rateLimits: Map<string, RateLimitEntry> = new Map();
  private requestQueues: Map<string, RequestQueue[]> = new Map();
  private processingQueues: Set<string> = new Set();

  // Platform-specific configurations
  private readonly PLATFORM_LIMITS: Record<
    SocialPlatform,
    {
      requests_per_hour: number;
      requests_per_day: number;
      burst_limit: number;
      window_size: number;
    }
  > = {
    FACEBOOK: {
      requests_per_hour: 200,
      requests_per_day: 4800,
      burst_limit: 50,
      window_size: 3600, // 1 hour in seconds
    },
    INSTAGRAM: {
      requests_per_hour: 200,
      requests_per_day: 4800,
      burst_limit: 50,
      window_size: 3600,
    },
    TWITTER: {
      requests_per_hour: 100, // More restrictive for Twitter
      requests_per_day: 1500,
      burst_limit: 25,
      window_size: 3600,
    },
    LINKEDIN: {
      requests_per_hour: 100,
      requests_per_day: 1000,
      burst_limit: 25,
      window_size: 3600,
    },
    TIKTOK: {
      requests_per_hour: 50,
      requests_per_day: 500,
      burst_limit: 15,
      window_size: 3600,
    },
    YOUTUBE: {
      requests_per_hour: 100,
      requests_per_day: 1000,
      burst_limit: 25,
      window_size: 3600,
    },
  };

  private readonly DEFAULT_STRATEGY: RateLimitStrategy = {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 30000,
    backoffMultiplier: 2,
    jitterEnabled: true,
  };

  /**
   * Check if request can be made immediately
   */
  async canMakeRequest(
    platform: SocialPlatform,
    endpoint: string,
    priority: number = 1
  ): Promise<boolean> {
    const key = this.getRateLimitKey(platform, endpoint);
    const now = new Date();

    // Get current rate limit info
    const current = this.rateLimits.get(key);
    const limit = this.getPlatformLimit(platform);

    if (!current) {
      // First request for this key
      this.rateLimits.set(key, {
        count: 1,
        resetTime: new Date(now.getTime() + limit.window_size * 1000),
        lastRequest: now,
      });
      return true;
    }

    // Check if window has reset
    if (now >= current.resetTime) {
      this.rateLimits.set(key, {
        count: 1,
        resetTime: new Date(now.getTime() + limit.window_size * 1000),
        lastRequest: now,
      });
      return true;
    }

    // Check if we're under the limit
    if (current.count < limit.requests_per_hour) {
      current.count++;
      current.lastRequest = now;
      return true;
    }

    // Rate limit exceeded, queue the request
    return this.queueRequest(key, priority);
  }

  /**
   * Queue a request for later execution
   */
  private async queueRequest(key: string, priority: number): Promise<boolean> {
    return new Promise((resolve, reject) => {
      if (!this.requestQueues.has(key)) {
        this.requestQueues.set(key, []);
      }

      const queue = this.requestQueues.get(key)!;
      queue.push({
        resolve,
        reject,
        timestamp: new Date(),
        priority,
      });

      // Sort by priority (higher priority first)
      queue.sort((a, b) => b.priority - a.priority);

      // Start processing queue if not already processing
      if (!this.processingQueues.has(key)) {
        this.processQueue(key);
      }
    });
  }

  /**
   * Process queued requests
   */
  private async processQueue(key: string): Promise<void> {
    if (this.processingQueues.has(key)) {
      return;
    }

    this.processingQueues.add(key);

    try {
      const queue = this.requestQueues.get(key);
      if (!queue || queue.length === 0) {
        return;
      }

      while (queue.length > 0) {
        const current = this.rateLimits.get(key);
        if (!current) {
          break;
        }

        const now = new Date();

        // Check if we can make a request now
        if (
          now >= current.resetTime ||
          current.count <
            this.getPlatformLimit(this.extractPlatformFromKey(key))
              .requests_per_hour
        ) {
          const request = queue.shift()!;

          if (now >= current.resetTime) {
            // Reset the window
            current.count = 1;
            current.resetTime = new Date(
              now.getTime() +
                this.getPlatformLimit(this.extractPlatformFromKey(key))
                  .window_size *
                  1000
            );
          } else {
            current.count++;
          }

          current.lastRequest = now;
          request.resolve(true);
        } else {
          // Wait until we can make the next request
          const waitTime = Math.max(
            1000, // Minimum 1 second
            current.resetTime.getTime() - now.getTime()
          );

          await this.sleep(Math.min(waitTime, 60000)); // Maximum 1 minute wait
        }
      }
    } finally {
      this.processingQueues.delete(key);
    }
  }

  /**
   * Execute request with retry logic and exponential backoff
   */
  async executeWithRetry<T>(
    platform: SocialPlatform,
    endpoint: string,
    requestFn: () => Promise<T>,
    strategy: RateLimitStrategy = this.DEFAULT_STRATEGY
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= strategy.maxRetries; attempt++) {
      try {
        // Wait for rate limit clearance
        const canProceed = await this.canMakeRequest(platform, endpoint);
        if (!canProceed) {
          throw new Error(`Rate limit exceeded for ${platform}:${endpoint}`);
        }

        // Execute the request
        const result = await requestFn();

        // Reset error count on success
        this.resetErrorCount(platform, endpoint);

        return result;
      } catch (error: any) {
        lastError = error;

        // Check if it's a rate limit error
        if (this.isRateLimitError(error)) {
          await this.handleRateLimitError(platform, endpoint, error);
          continue;
        }

        // Check if it's a temporary error worth retrying
        if (this.isRetryableError(error) && attempt < strategy.maxRetries) {
          const delay = this.calculateBackoffDelay(attempt, strategy);
          console.warn(
            `Request failed, retrying in ${delay}ms:`,
            error.message
          );
          await this.sleep(delay);
          continue;
        }

        // Non-retryable error or max retries exceeded
        throw error;
      }
    }

    throw lastError || new Error("Max retries exceeded");
  }

  /**
   * Handle rate limit errors from platform APIs
   */
  private async handleRateLimitError(
    platform: SocialPlatform,
    endpoint: string,
    error: any
  ): Promise<void> {
    const key = this.getRateLimitKey(platform, endpoint);
    const retryAfter = this.extractRetryAfter(error);

    if (retryAfter) {
      // Update rate limit info based on platform response
      const resetTime = new Date(Date.now() + retryAfter * 1000);
      const current = this.rateLimits.get(key);

      if (current) {
        current.resetTime = resetTime;
        current.count = this.getPlatformLimit(platform).requests_per_hour; // Mark as exceeded
      }

      console.warn(
        `Rate limit hit for ${platform}:${endpoint}, waiting ${retryAfter}s`
      );
      await this.sleep(retryAfter * 1000);
    } else {
      // Default backoff
      await this.sleep(60000); // Wait 1 minute
    }
  }

  /**
   * Calculate exponential backoff delay with jitter
   */
  private calculateBackoffDelay(
    attempt: number,
    strategy: RateLimitStrategy
  ): number {
    const exponentialDelay = Math.min(
      strategy.baseDelay * Math.pow(strategy.backoffMultiplier, attempt),
      strategy.maxDelay
    );

    if (strategy.jitterEnabled) {
      // Add random jitter (±25% of calculated delay)
      const jitter = exponentialDelay * 0.25 * (Math.random() * 2 - 1);
      return Math.max(100, exponentialDelay + jitter);
    }

    return exponentialDelay;
  }

  /**
   * Get rate limit information for a platform/endpoint
   */
  getRateLimitInfo(
    platform: SocialPlatform,
    endpoint: string
  ): PlatformRateLimit {
    const key = this.getRateLimitKey(platform, endpoint);
    const current = this.rateLimits.get(key);
    const limit = this.getPlatformLimit(platform);

    if (!current) {
      return {
        platform,
        endpoint,
        limit: limit.requests_per_hour,
        window: limit.window_size,
        remaining: limit.requests_per_hour,
        resetTime: new Date(Date.now() + limit.window_size * 1000),
      };
    }

    return {
      platform,
      endpoint,
      limit: limit.requests_per_hour,
      window: limit.window_size,
      remaining: Math.max(0, limit.requests_per_hour - current.count),
      resetTime: current.resetTime,
    };
  }

  /**
   * Clear rate limit data (useful for testing)
   */
  clear(): void {
    this.rateLimits.clear();
    this.requestQueues.clear();
    this.processingQueues.clear();
  }

  // Helper methods
  private getRateLimitKey(platform: SocialPlatform, endpoint: string): string {
    return `${platform}:${endpoint}`;
  }

  private getPlatformLimit(platform: SocialPlatform) {
    return this.PLATFORM_LIMITS[platform];
  }

  private extractPlatformFromKey(key: string): SocialPlatform {
    return key.split(":")[0] as SocialPlatform;
  }

  private isRateLimitError(error: any): boolean {
    if (error.response?.status === 429) return true;
    if (error.code === "RATE_LIMITED" || error.code === "RATE_LIMIT_EXCEEDED")
      return true;
    if (error.message?.toLowerCase().includes("rate limit")) return true;
    return false;
  }

  private isRetryableError(error: any): boolean {
    // Network errors
    if (error.code === "ECONNRESET" || error.code === "ETIMEDOUT") return true;

    // HTTP 5xx errors
    if (error.response?.status >= 500 && error.response?.status < 600)
      return true;

    // Specific API errors that are retryable
    if (error.response?.status === 502 || error.response?.status === 503)
      return true;

    return false;
  }

  private extractRetryAfter(error: any): number | null {
    // From headers
    if (error.response?.headers?.["retry-after"]) {
      return parseInt(error.response.headers["retry-after"]);
    }

    // From error body
    if (error.response?.data?.retry_after) {
      return error.response.data.retry_after;
    }

    return null;
  }

  private resetErrorCount(platform: SocialPlatform, endpoint: string): void {
    // Implementation for tracking consecutive errors
    // This could be used for circuit breaker pattern
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
