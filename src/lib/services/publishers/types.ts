import { SocialAccount, SocialPlatform } from "@prisma/client";

// Central interface for publish results
export interface PublishResult {
  success: boolean;
  error?: string;
  platformPostId?: string;
  platform: SocialPlatform;
}

// Extended social account interface with required fields
export interface SocialAccountWithRelations extends SocialAccount {
  platform: SocialPlatform;
  accessToken: string;
}

// Abstract interface for platform-specific publishers
export interface SocialMediaPublisher {
  platform: SocialPlatform;

  publish(
    socialAccount: SocialAccountWithRelations,
    content: string,
    mediaUrls: string[]
  ): Promise<PublishResult>;

  validateToken(socialAccount: SocialAccountWithRelations): Promise<boolean>;
}

// Rate limiting configuration for publishers
export interface RateLimitConfig {
  delayMs: number;
  maxRetries: number;
  backoffMultiplier: number;
}

// Publisher factory interface
export interface PublisherFactory {
  getPublisher(platform: SocialPlatform): SocialMediaPublisher;
}
