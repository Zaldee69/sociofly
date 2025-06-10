import { SocialPlatform } from "@prisma/client";
import { BasePublisher } from "./base-publisher";
import { SocialAccountWithRelations, PublishResult } from "./types";

export class InstagramPublisher extends BasePublisher {
  readonly platform = SocialPlatform.INSTAGRAM;

  // Override rate limiting config for Instagram's stricter limits
  protected readonly rateLimitConfig = {
    delayMs: 3000, // 3 seconds between API calls for Instagram
    maxRetries: 3,
    backoffMultiplier: 2,
  };

  /**
   * Publish method implementation for SocialMediaPublisher interface
   */
  async publish(
    socialAccount: SocialAccountWithRelations,
    content: string,
    mediaUrls: string[] = []
  ): Promise<PublishResult> {
    try {
      if (!socialAccount.profileId) {
        return this.createErrorResult(
          "Instagram account ID (profileId) is required"
        );
      }

      // Validate token first
      const isTokenValid = await this.validateToken(socialAccount);
      if (!isTokenValid) {
        return this.createErrorResult(
          "Instagram access token is invalid or expired"
        );
      }

      if (mediaUrls.length === 0) {
        return this.createErrorResult(
          "Instagram posts require at least one image or video"
        );
      }

      // Add delay before publishing to prevent rate limiting
      await this.addDelay();

      // Use retry mechanism for publishing
      const postId = await this.retryWithBackoff(async () => {
        if (mediaUrls.length === 1) {
          return await this.createSingleMediaPost(
            socialAccount,
            content,
            mediaUrls[0]
          );
        } else {
          return await this.createCarouselPost(
            socialAccount,
            content,
            mediaUrls
          );
        }
      });

      return this.createSuccessResult(postId);
    } catch (error) {
      console.error("Error publishing to Instagram:", error);

      const errorMessage =
        error instanceof Error ? error.message : "Unknown Instagram error";

      // Check if this is a rate limit error
      if (this.isRateLimitError(errorMessage)) {
        return this.createErrorResult(
          `Instagram rate limit reached: ${errorMessage}. Please try again later.`
        );
      }

      return this.createErrorResult(errorMessage);
    }
  }

  /**
   * Validate Instagram access token and account
   */
  async validateToken(
    socialAccount: SocialAccountWithRelations
  ): Promise<boolean> {
    try {
      if (!socialAccount.profileId) {
        return false;
      }

      const response = await fetch(
        `https://graph.facebook.com/v22.0/${socialAccount.profileId}?fields=id,username&access_token=${socialAccount.accessToken}`
      );

      const data = await response.json();

      if (data.error) {
        console.error("Instagram token validation failed:", data.error);
        return false;
      }

      if (!data.id || !data.username) {
        console.error(
          "Instagram token validation failed: Missing required fields"
        );
        return false;
      }

      return true;
    } catch (error) {
      console.error("Instagram token validation failed:", error);
      return false;
    }
  }

  /**
   * Get Instagram account information
   */
  async getAccountInfo(
    accessToken: string,
    instagramAccountId: string
  ): Promise<{
    isValid: boolean;
    accountInfo?: {
      id: string;
      username: string;
      accountType?: string;
      name?: string;
    };
    error?: string;
  }> {
    try {
      let response = await fetch(
        `https://graph.facebook.com/v22.0/${instagramAccountId}?fields=id,username,account_type,name&access_token=${accessToken}`
      );

      let data = await response.json();

      // If account_type field causes an error, try without it
      if (data.error && data.error.message.includes("account_type")) {
        console.log("Account type field not available, trying without it...");
        response = await fetch(
          `https://graph.facebook.com/v22.0/${instagramAccountId}?fields=id,username,name&access_token=${accessToken}`
        );
        data = await response.json();
      }

      if (data.error) {
        return {
          isValid: false,
          error: data.error.message,
        };
      }

      return {
        isValid: true,
        accountInfo: {
          id: data.id,
          username: data.username,
          accountType: data.account_type,
          name: data.name,
        },
      };
    } catch (error: any) {
      return {
        isValid: false,
        error: error.message,
      };
    }
  }

  /**
   * Create single media post (photo or video)
   */
  private async createSingleMediaPost(
    socialAccount: SocialAccountWithRelations,
    caption: string,
    mediaUrl: string
  ): Promise<string> {
    try {
      const instagramAccountId = socialAccount.profileId!;
      const accessToken = socialAccount.accessToken;

      console.log(
        `📸 Creating Instagram single media post for account: ${instagramAccountId}`
      );

      // Step 1: Create media container
      const mediaType = this.getMediaType(mediaUrl);
      const containerResponse = await fetch(
        `https://graph.facebook.com/v22.0/${instagramAccountId}/media`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            image_url: mediaType === "IMAGE" ? mediaUrl : undefined,
            video_url: mediaType === "VIDEO" ? mediaUrl : undefined,
            media_type: mediaType,
            caption: caption,
            access_token: accessToken,
          }),
        }
      );

      const containerData = await containerResponse.json();

      if (containerData.error) {
        throw new Error(
          `Failed to create media container: ${containerData.error.message}`
        );
      }

      const containerId = containerData.id;
      console.log(`✅ Media container created: ${containerId}`);

      // Step 2: Wait for media processing (if video)
      if (mediaType === "VIDEO") {
        await this.waitForMediaProcessing(accessToken, containerId);
      }

      // Step 3: Publish the media
      const publishResponse = await fetch(
        `https://graph.facebook.com/v22.0/${instagramAccountId}/media_publish`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            creation_id: containerId,
            access_token: accessToken,
          }),
        }
      );

      const publishData = await publishResponse.json();

      if (publishData.error) {
        throw new Error(
          `Failed to publish media: ${publishData.error.message}`
        );
      }

      console.log(
        `🎉 Instagram post published successfully: ${publishData.id}`
      );
      return publishData.id;
    } catch (error) {
      console.error("Error creating single media post:", error);
      throw error;
    }
  }

  /**
   * Create carousel post (multiple media)
   */
  private async createCarouselPost(
    socialAccount: SocialAccountWithRelations,
    caption: string,
    mediaUrls: string[]
  ): Promise<string> {
    try {
      const instagramAccountId = socialAccount.profileId!;
      const accessToken = socialAccount.accessToken;

      console.log(
        `🎠 Creating Instagram carousel post with ${mediaUrls.length} media items`
      );

      // Step 1: Create media containers for each item
      const containerIds: string[] = [];

      for (let i = 0; i < mediaUrls.length; i++) {
        const mediaUrl = mediaUrls[i];
        const mediaType = this.getMediaType(mediaUrl);

        // Add delay between media container creation to prevent rate limiting
        if (i > 0) {
          await this.addDelay();
        }

        const containerResponse = await fetch(
          `https://graph.facebook.com/v22.0/${instagramAccountId}/media`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              image_url: mediaType === "IMAGE" ? mediaUrl : undefined,
              video_url: mediaType === "VIDEO" ? mediaUrl : undefined,
              media_type: mediaType,
              is_carousel_item: true,
              access_token: accessToken,
            }),
          }
        );

        const containerData = await containerResponse.json();

        if (containerData.error) {
          throw new Error(
            `Failed to create media container ${i + 1}: ${containerData.error.message}`
          );
        }

        containerIds.push(containerData.id);
        console.log(`✅ Media container ${i + 1} created: ${containerData.id}`);
      }

      // Add delay before creating carousel container
      await this.addDelay();

      // Step 2: Create carousel container
      const carouselResponse = await fetch(
        `https://graph.facebook.com/v22.0/${instagramAccountId}/media`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            media_type: "CAROUSEL",
            children: containerIds.join(","),
            caption: caption,
            access_token: accessToken,
          }),
        }
      );

      const carouselData = await carouselResponse.json();

      if (carouselData.error) {
        throw new Error(
          `Failed to create carousel: ${carouselData.error.message}`
        );
      }

      const carouselId = carouselData.id;
      console.log(`✅ Carousel container created: ${carouselId}`);

      // Step 3: Publish the carousel
      const publishResponse = await fetch(
        `https://graph.facebook.com/v22.0/${instagramAccountId}/media_publish`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            creation_id: carouselId,
            access_token: accessToken,
          }),
        }
      );

      const publishData = await publishResponse.json();

      if (publishData.error) {
        throw new Error(
          `Failed to publish carousel: ${publishData.error.message}`
        );
      }

      console.log(
        `🎉 Instagram carousel published successfully: ${publishData.id}`
      );
      return publishData.id;
    } catch (error) {
      console.error("Error creating carousel post:", error);
      throw error;
    }
  }

  /**
   * Wait for video processing to complete
   */
  private async waitForMediaProcessing(
    accessToken: string,
    containerId: string,
    maxAttempts: number = 30
  ): Promise<void> {
    console.log("⏳ Waiting for video processing...");

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const statusResponse = await fetch(
          `https://graph.facebook.com/v22.0/${containerId}?fields=status_code&access_token=${accessToken}`
        );

        const statusData = await statusResponse.json();

        if (statusData.error) {
          throw new Error(
            `Failed to check status: ${statusData.error.message}`
          );
        }

        const statusCode = statusData.status_code;

        if (statusCode === "FINISHED") {
          console.log("✅ Video processing completed");
          return;
        } else if (statusCode === "ERROR") {
          throw new Error("Video processing failed");
        }

        console.log(
          `⏳ Video processing... (${attempt}/${maxAttempts}) - Status: ${statusCode}`
        );

        // Wait 2 seconds before next check
        await new Promise((resolve) => setTimeout(resolve, 2000));
      } catch (error) {
        if (attempt === maxAttempts) {
          throw new Error("Video processing timeout");
        }
        console.log(`Retry ${attempt}/${maxAttempts} - ${error}`);
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }

    throw new Error("Video processing timeout after maximum attempts");
  }

  /**
   * Determine media type from URL
   */
  private getMediaType(mediaUrl: string): "IMAGE" | "VIDEO" {
    const videoExtensions = [".mp4", ".mov", ".avi", ".mkv", ".webm"];
    const imageExtensions = [".jpg", ".jpeg", ".png", ".gif", ".webp"];

    const urlLower = mediaUrl.toLowerCase();

    if (videoExtensions.some((ext) => urlLower.includes(ext))) {
      return "VIDEO";
    } else if (imageExtensions.some((ext) => urlLower.includes(ext))) {
      return "IMAGE";
    }

    // Default to IMAGE if cannot determine
    return "IMAGE";
  }

  /**
   * Get Instagram accounts connected to a Facebook Page
   */
  async getConnectedInstagramAccounts(
    pageAccessToken: string,
    pageId: string
  ): Promise<Array<{ id: string; username: string; accountType?: string }>> {
    try {
      const response = await fetch(
        `https://graph.facebook.com/v22.0/${pageId}?fields=instagram_business_account&access_token=${pageAccessToken}`
      );

      const data = await response.json();

      if (data.error) {
        console.error("Failed to get Instagram accounts:", data.error);
        return [];
      }

      if (!data.instagram_business_account) {
        return [];
      }

      // Get Instagram account details
      const instagramId = data.instagram_business_account.id;
      const accountInfo = await this.getAccountInfo(
        pageAccessToken,
        instagramId
      );

      if (accountInfo.isValid && accountInfo.accountInfo) {
        return [
          {
            id: accountInfo.accountInfo.id,
            username: accountInfo.accountInfo.username,
            accountType: accountInfo.accountInfo.accountType,
          },
        ];
      }

      return [];
    } catch (error) {
      console.error("Error getting Instagram accounts:", error);
      return [];
    }
  }

  /**
   * Refresh Instagram access token
   */
  async refreshToken(
    socialAccount: SocialAccountWithRelations
  ): Promise<string | null> {
    try {
      // Instagram uses the same token as the connected Facebook Page
      // Token refresh is handled at the Facebook Page level
      console.log("Instagram token refresh is handled by Facebook Page token");
      return socialAccount.accessToken;
    } catch (error) {
      console.error("Error refreshing Instagram token:", error);
      return null;
    }
  }
}
