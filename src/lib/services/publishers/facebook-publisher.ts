import { FacebookAdsApi, User, Page } from "facebook-nodejs-business-sdk";
import { SocialAccount, SocialPlatform } from "@prisma/client";
import { prisma } from "@/lib/prisma/client";

export interface PublishResult {
  success: boolean;
  error?: string;
  platformPostId?: string;
  platform: SocialPlatform;
}

export interface SocialAccountWithRelations extends SocialAccount {
  platform: SocialPlatform;
  accessToken: string;
}

export class FacebookPublisher {
  /**
   * Static publish method to match SocialMediaPublisher interface
   */
  static async publish(
    socialAccount: SocialAccountWithRelations,
    content: string,
    mediaUrls: string[] = []
  ): Promise<PublishResult> {
    return this.publishToFacebook(socialAccount, content, mediaUrls);
  }

  /**
   * Validate Facebook access token
   */
  static async validateToken(
    socialAccount: SocialAccountWithRelations
  ): Promise<boolean> {
    try {
      FacebookAdsApi.init(socialAccount.accessToken);
      const user = new User("me");
      await user.read(["id", "name"]);
      return true;
    } catch (error) {
      console.error("Facebook token validation failed:", error);
      return false;
    }
  }

  /**
   * Publish content to Facebook
   */
  static async publishToFacebook(
    socialAccount: SocialAccountWithRelations,
    content: string,
    mediaUrls: string[] = []
  ): Promise<PublishResult> {
    try {
      // Validate token first
      const isTokenValid = await this.validateToken(socialAccount);
      if (!isTokenValid) {
        return {
          success: false,
          error: "Facebook access token is invalid or expired",
          platform: SocialPlatform.FACEBOOK,
        };
      }

      // Initialize Facebook API
      FacebookAdsApi.init(socialAccount.accessToken);

      let postId: string;

      // Check if this is a page account (has profileId which would be the page ID)
      if (socialAccount.profileId) {
        postId = await this.publishToPage(socialAccount, content, mediaUrls);
      } else {
        postId = await this.publishToProfile(content, mediaUrls);
      }

      return {
        success: true,
        platformPostId: postId,
        platform: SocialPlatform.FACEBOOK,
      };
    } catch (error) {
      console.error("Error publishing to Facebook:", error);

      // Check if error is due to expired/invalid token
      if (this.isTokenError(error)) {
        return {
          success: false,
          error: "Facebook access token expired or invalid",
          platform: SocialPlatform.FACEBOOK,
        };
      }

      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown Facebook error",
        platform: SocialPlatform.FACEBOOK,
      };
    }
  }

  /**
   * Publish to Facebook Page
   */
  private static async publishToPage(
    socialAccount: SocialAccountWithRelations,
    content: string,
    mediaUrls: string[]
  ): Promise<string> {
    try {
      // Get user's pages and find the target page
      const user = new User("me");
      const pages = await user.getAccounts(["id", "name", "access_token"]);

      const targetPage = pages.find(
        (page: any) => page.id === socialAccount.profileId
      );
      if (!targetPage) {
        throw new Error(
          `Facebook page ${socialAccount.profileId} not found or no access`
        );
      }

      // Use page access token for publishing
      FacebookAdsApi.init(targetPage.access_token);
      const page = new Page(socialAccount.profileId!);

      let result: any;

      if (mediaUrls.length > 0) {
        // Post with media (photo)
        result = await page.createPhoto([], {
          message: content,
          url: mediaUrls[0], // Facebook Graph API supports one image per photo post
        });
      } else {
        // Text-only post
        result = await page.createFeed([], {
          message: content,
        });
      }

      return result.id;
    } catch (error) {
      console.error("Error publishing to Facebook page:", error);
      throw error;
    }
  }

  /**
   * Publish to User Profile (personal timeline)
   */
  private static async publishToProfile(
    content: string,
    mediaUrls: string[]
  ): Promise<string> {
    try {
      const user = new User("me");
      let result: any;

      if (mediaUrls.length > 0) {
        // Post with photo
        result = await user.createPhoto([], {
          message: content,
          url: mediaUrls[0],
        });
      } else {
        // Text-only post
        result = await user.createFeed([], {
          message: content,
        });
      }

      return result.id;
    } catch (error) {
      console.error("Error publishing to Facebook profile:", error);
      throw error;
    }
  }

  /**
   * Check if error is related to token issues
   */
  private static isTokenError(error: any): boolean {
    if (!error) return false;

    const errorMessage = error.message?.toLowerCase() || "";
    const errorCode = error.code;

    // Common Facebook token error codes and messages
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

  /**
   * Refresh page access token if needed
   */
  static async refreshPageToken(
    socialAccount: SocialAccountWithRelations
  ): Promise<string | null> {
    try {
      FacebookAdsApi.init(socialAccount.accessToken);
      const user = new User("me");
      const pages = await user.getAccounts(["id", "name", "access_token"]);

      const targetPage = pages.find(
        (page: any) => page.id === socialAccount.profileId
      );
      if (!targetPage) {
        return null;
      }

      // Update the stored access token if it's different
      if (targetPage.access_token !== socialAccount.accessToken) {
        await prisma.socialAccount.update({
          where: { id: socialAccount.id },
          data: { accessToken: targetPage.access_token },
        });
      }

      return targetPage.access_token;
    } catch (error) {
      console.error("Error refreshing Facebook page token:", error);
      return null;
    }
  }
}
