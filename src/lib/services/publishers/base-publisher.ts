import { SocialPlatform } from "@prisma/client";
import {
  SocialMediaPublisher,
  SocialAccountWithRelations,
  PublishResult,
  RateLimitConfig,
} from "./types";

export abstract class BasePublisher implements SocialMediaPublisher {
  abstract readonly platform: SocialPlatform;

  protected readonly rateLimitConfig: RateLimitConfig = {
    delayMs: 2000,
    maxRetries: 3,
    backoffMultiplier: 2,
  };

  // Abstract methods that must be implemented by each platform
  abstract publish(
    socialAccount: SocialAccountWithRelations,
    content: string,
    mediaUrls: string[]
  ): Promise<PublishResult>;

  abstract validateToken(
    socialAccount: SocialAccountWithRelations
  ): Promise<boolean>;

  // Common rate limiting functionality
  protected async addDelay(
    ms: number = this.rateLimitConfig.delayMs
  ): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }

  // Common retry with exponential backoff
  protected async retryWithBackoff<T>(
    operation: () => Promise<T>,
    retries: number = this.rateLimitConfig.maxRetries
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      if (retries > 0 && this.isRateLimitError(errorMessage)) {
        const backoffDelay =
          (this.rateLimitConfig.maxRetries - retries + 1) *
          this.rateLimitConfig.delayMs *
          this.rateLimitConfig.backoffMultiplier;

        console.log(
          `⏳ Rate limit detected, retrying in ${backoffDelay}ms... (${retries} attempts left)`
        );

        await new Promise((resolve) => setTimeout(resolve, backoffDelay));
        return this.retryWithBackoff(operation, retries - 1);
      }

      throw error;
    }
  }

  // Common rate limit error detection
  protected isRateLimitError(errorMessage: string): boolean {
    const rateLimitKeywords = [
      "rate limit",
      "request limit",
      "too many requests",
      "quota exceeded",
      "throttled",
    ];

    return rateLimitKeywords.some((keyword) =>
      errorMessage.toLowerCase().includes(keyword.toLowerCase())
    );
  }

  // Common error handling for token issues
  protected isTokenError(error: any): boolean {
    if (!error) return false;

    const errorMessage = error.message?.toLowerCase() || "";
    const errorCode = error.code;

    const tokenErrorCodes = [190, 463, 467, 102];
    const tokenErrorMessages = [
      "access_token",
      "token",
      "expired",
      "invalid",
      "permissions",
      "authorization",
    ];

    return (
      tokenErrorCodes.includes(errorCode) ||
      tokenErrorMessages.some((msg) => errorMessage.includes(msg))
    );
  }

  // Common method to create error result
  protected createErrorResult(error: string): PublishResult {
    return {
      success: false,
      error,
      platform: this.platform,
    };
  }

  // Common method to create success result
  protected createSuccessResult(platformPostId: string): PublishResult {
    return {
      success: true,
      platformPostId,
      platform: this.platform,
    };
  }
}
