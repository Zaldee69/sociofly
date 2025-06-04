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
   * Get token type (USER or PAGE) and basic info
   */
  static async getTokenInfo(accessToken: string): Promise<{
    type: "USER" | "PAGE";
    id: string;
    name: string;
    isValid: boolean;
  } | null> {
    try {
      FacebookAdsApi.init(accessToken);
      const user = new User("me");
      const userInfo = await user.read(["id", "name", "category"]);

      // If category exists, it's likely a Page token
      const isPage = "category" in userInfo;

      return {
        type: isPage ? "PAGE" : "USER",
        id: userInfo.id,
        name: userInfo.name,
        isValid: true,
      };
    } catch (error) {
      console.error("Failed to get token info:", error);
      return null;
    }
  }

  /**
   * Get token permissions
   */
  static async getTokenPermissions(accessToken: string): Promise<string[]> {
    try {
      FacebookAdsApi.init(accessToken);
      const user = new User("me");
      const permissionsResponse = await user.read([], {
        fields: ["permissions"],
      });

      if (
        permissionsResponse.permissions &&
        Array.isArray(permissionsResponse.permissions.data)
      ) {
        return permissionsResponse.permissions.data
          .filter((perm: any) => perm.status === "granted")
          .map((perm: any) => perm.permission);
      }

      return [];
    } catch (error) {
      console.error("Failed to get token permissions:", error);
      return [];
    }
  }

  /**
   * Validate Page token and get Page information
   * Specifically for Page Access Tokens stored in database
   */
  static async validatePageToken(
    accessToken: string,
    pageId: string
  ): Promise<{
    isValid: boolean;
    pageInfo?: {
      id: string;
      name: string;
      category: string;
    };
    error?: string;
  }> {
    try {
      FacebookAdsApi.init(accessToken);
      const page = new Page(pageId);

      // Try to read page information
      const pageInfo = await page.read(["id", "name", "category"]);

      return {
        isValid: true,
        pageInfo: {
          id: pageInfo.id,
          name: pageInfo.name,
          category: pageInfo.category,
        },
      };
    } catch (error: any) {
      console.error("Page token validation failed:", error);

      let errorMessage = "Unknown error";
      if (error.message) {
        errorMessage = error.message;
      }

      return {
        isValid: false,
        error: errorMessage,
      };
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
    if (!socialAccount.profileId) {
      throw new Error("Page ID (profileId) is required for page posting");
    }

    try {
      // Initialize with the stored Page access token
      FacebookAdsApi.init(socialAccount.accessToken);
      const page = new Page(socialAccount.profileId);

      // First, validate that this is a valid Page token for the specified page
      console.log(
        `🔍 Validating Page token for Page ID: ${socialAccount.profileId}`
      );
      const pageInfo = await page.read(["id", "name", "category"]);
      console.log(`✅ Page validated: ${pageInfo.name} (${pageInfo.id})`);

      // Proceed with publishing
      let result: any;
      if (mediaUrls.length > 0) {
        console.log(`📸 Publishing post with media to Page: ${pageInfo.name}`);
        result = await page.createPhoto([], {
          message: content,
          url: mediaUrls[0], // Facebook supports one image per photo post
        });
      } else {
        console.log(`📝 Publishing text post to Page: ${pageInfo.name}`);
        result = await page.createFeed([], {
          message: content,
        });
      }

      console.log(`🎉 Successfully published to Page. Post ID: ${result.id}`);
      return result.id;
    } catch (directPageError: any) {
      console.error("❌ Direct page publishing failed:", directPageError);

      // Check if this is a token/permission error
      if (this.isTokenError(directPageError)) {
        throw new Error(
          `Page Access Token is invalid or expired for Page ID: ${socialAccount.profileId}. ` +
            `Please refresh the Page token. Error: ${directPageError.message}`
        );
      }

      // Check if this is a permission error
      if (directPageError.message?.includes("permissions")) {
        throw new Error(
          `Insufficient permissions to post to Page ID: ${socialAccount.profileId}. ` +
            `Required permissions: pages_manage_posts. Error: ${directPageError.message}`
        );
      }

      // For database-stored Page tokens, we should NOT fallback to user accounts method
      // since the token is specifically for this page
      throw new Error(
        `Failed to publish to Facebook Page ${socialAccount.profileId}. ` +
          `This appears to be a Page Access Token issue. ` +
          `Please verify: 1) Token is valid, 2) Token has pages_manage_posts permission, ` +
          `3) Page ID is correct. Original error: ${directPageError.message}`
      );
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
