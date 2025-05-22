import {
  PostStatus,
  SocialPlatform,
  Post,
  SocialAccount,
  PostSocialAccount,
} from "@prisma/client";
import { prisma } from "@/lib/prisma/client";

interface PublishResult {
  success: boolean;
  error?: string;
  platformPostId?: string;
}

type PostWithRelations = Post & {
  mediaUrls: string[];
  content: string;
};

type SocialAccountWithRelations = SocialAccount & {
  platform: SocialPlatform;
  accessToken: string;
};
6;
// Abstract interface for platform-specific publishers
interface SocialMediaPublisher {
  publish(
    socialAccountId: string,
    content: string,
    mediaUrls: string[]
  ): Promise<string | null>;
}

// Facebook implementation
class FacebookPublisher implements SocialMediaPublisher {
  async publish(
    socialAccountId: string,
    content: string,
    mediaUrls: string[]
  ): Promise<string | null> {
    try {
      // Get the social account with its access token
      const socialAccount = await prisma.socialAccount.findUnique({
        where: { id: socialAccountId },
      });

      if (!socialAccount) {
        throw new Error(`Social account ${socialAccountId} not found`);
      }

      // Here you would implement the actual Facebook API call
      // This is a placeholder for the actual implementation
      console.log(
        `Publishing to Facebook with token ${socialAccount.accessToken.substring(0, 5)}...`
      );
      console.log(`Content: ${content}`);
      console.log(`Media: ${mediaUrls.join(", ")}`);

      // For demonstration, we'll return a mock post ID
      return `fb_post_${Date.now()}`;
    } catch (error) {
      console.error("Error publishing to Facebook:", error);
      return null;
    }
  }
}

// Twitter implementation
class TwitterPublisher implements SocialMediaPublisher {
  async publish(
    socialAccountId: string,
    content: string,
    mediaUrls: string[]
  ): Promise<string | null> {
    try {
      // Get the social account with its access token
      const socialAccount = await prisma.socialAccount.findUnique({
        where: { id: socialAccountId },
      });

      if (!socialAccount) {
        throw new Error(`Social account ${socialAccountId} not found`);
      }

      // Here you would implement the actual Twitter API call
      // This is a placeholder for the actual implementation
      console.log(
        `Publishing to Twitter with token ${socialAccount.accessToken.substring(0, 5)}...`
      );
      console.log(`Content: ${content}`);
      console.log(`Media: ${mediaUrls.join(", ")}`);

      // For demonstration, we'll return a mock tweet ID
      return `tweet_${Date.now()}`;
    } catch (error) {
      console.error("Error publishing to Twitter:", error);
      return null;
    }
  }
}

// Instagram implementation
class InstagramPublisher implements SocialMediaPublisher {
  async publish(
    socialAccountId: string,
    content: string,
    mediaUrls: string[]
  ): Promise<string | null> {
    try {
      // Get the social account with its access token
      const socialAccount = await prisma.socialAccount.findUnique({
        where: { id: socialAccountId },
      });

      if (!socialAccount) {
        throw new Error(`Social account ${socialAccountId} not found`);
      }

      // Here you would implement the actual Instagram API call
      // This is a placeholder for the actual implementation
      console.log(
        `Publishing to Instagram with token ${socialAccount.accessToken.substring(0, 5)}...`
      );
      console.log(`Content: ${content}`);
      console.log(`Media: ${mediaUrls.join(", ")}`);

      // For demonstration, we'll return a mock media ID
      return `ig_media_${Date.now()}`;
    } catch (error) {
      console.error("Error publishing to Instagram:", error);
      return null;
    }
  }
}

// LinkedIn implementation
class LinkedInPublisher implements SocialMediaPublisher {
  async publish(
    socialAccountId: string,
    content: string,
    mediaUrls: string[]
  ): Promise<string | null> {
    try {
      // Get the social account with its access token
      const socialAccount = await prisma.socialAccount.findUnique({
        where: { id: socialAccountId },
      });

      if (!socialAccount) {
        throw new Error(`Social account ${socialAccountId} not found`);
      }

      // Here you would implement the actual LinkedIn API call
      // This is a placeholder for the actual implementation
      console.log(
        `Publishing to LinkedIn with token ${socialAccount.accessToken.substring(0, 5)}...`
      );
      console.log(`Content: ${content}`);
      console.log(`Media: ${mediaUrls.join(", ")}`);

      // For demonstration, we'll return a mock post ID
      return `linkedin_post_${Date.now()}`;
    } catch (error) {
      console.error("Error publishing to LinkedIn:", error);
      return null;
    }
  }
}

// TikTok implementation
class TikTokPublisher implements SocialMediaPublisher {
  async publish(
    socialAccountId: string,
    content: string,
    mediaUrls: string[]
  ): Promise<string | null> {
    try {
      // Get the social account with its access token
      const socialAccount = await prisma.socialAccount.findUnique({
        where: { id: socialAccountId },
      });

      if (!socialAccount) {
        throw new Error(`Social account ${socialAccountId} not found`);
      }

      // Here you would implement the actual TikTok API call
      // This is a placeholder for the actual implementation
      console.log(
        `Publishing to TikTok with token ${socialAccount.accessToken.substring(0, 5)}...`
      );
      console.log(`Content: ${content}`);
      console.log(`Media: ${mediaUrls.join(", ")}`);

      // For demonstration, we'll return a mock video ID
      return `tiktok_video_${Date.now()}`;
    } catch (error) {
      console.error("Error publishing to TikTok:", error);
      return null;
    }
  }
}

// Factory to get the appropriate publisher
function getPublisherForPlatform(
  platform: SocialPlatform
): SocialMediaPublisher {
  switch (platform) {
    case SocialPlatform.FACEBOOK:
      return new FacebookPublisher();
    case SocialPlatform.TWITTER:
      return new TwitterPublisher();
    case SocialPlatform.INSTAGRAM:
      return new InstagramPublisher();
    case SocialPlatform.LINKEDIN:
      return new LinkedInPublisher();
    case SocialPlatform.TIKTOK:
      return new TikTokPublisher();
    default:
      throw new Error(`Unsupported platform: ${platform}`);
  }
}

/**
 * Service untuk mempublikasikan post ke berbagai platform sosial media
 */
export class PostPublisherService {
  /**
   * Mempublikasikan post ke platform sosial media yang ditentukan
   */
  public static async publishToSocialMedia(
    postId: string,
    socialAccountId: string
  ): Promise<PublishResult> {
    try {
      // Dapatkan data post dan akun sosial
      const postSocialAccount = await prisma.postSocialAccount.findUnique({
        where: {
          postId_socialAccountId: {
            postId,
            socialAccountId,
          },
        },
        include: {
          post: true,
          socialAccount: true,
        },
      });

      if (!postSocialAccount) {
        return {
          success: false,
          error: "Post atau akun sosial tidak ditemukan",
        };
      }

      const { post, socialAccount } = postSocialAccount;

      // Implementasikan publikasi ke platform yang berbeda
      let result: PublishResult;

      const publisher = getPublisherForPlatform(socialAccount.platform);
      const platformPostId = await publisher.publish(
        socialAccount.id,
        post.content,
        post.mediaUrls
      );

      if (platformPostId) {
        result = {
          success: true,
          platformPostId,
        };

        // Update status posting
        await prisma.postSocialAccount.update({
          where: {
            postId_socialAccountId: {
              postId,
              socialAccountId,
            },
          },
          data: {
            status: PostStatus.PUBLISHED,
            publishedAt: new Date(),
          },
        });

        // Check if all social accounts are published
        const allSocialAccounts = await prisma.postSocialAccount.findMany({
          where: { postId },
        });

        const allPublished = allSocialAccounts.every(
          (psa) => psa.status === PostStatus.PUBLISHED
        );

        if (allPublished) {
          await prisma.post.update({
            where: { id: postId },
            data: {
              status: PostStatus.PUBLISHED,
              publishedAt: new Date(),
            },
          });
        }
      } else {
        // Jika gagal, update status menjadi FAILED
        result = {
          success: false,
          error: "Publikasi gagal",
        };

        await prisma.postSocialAccount.update({
          where: {
            postId_socialAccountId: {
              postId,
              socialAccountId,
            },
          },
          data: {
            status: PostStatus.FAILED,
          },
        });

        // Juga update post jika semua social account gagal
        const allSocialAccounts = await prisma.postSocialAccount.findMany({
          where: { postId },
        });

        const allFailed = allSocialAccounts.every(
          (psa) => psa.status === PostStatus.FAILED
        );

        if (allFailed) {
          await prisma.post.update({
            where: { id: postId },
            data: {
              status: PostStatus.FAILED,
            },
          });
        }
      }

      return result;
    } catch (error) {
      console.error("Error publishing post:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Mempublikasikan post ke semua platform sosial yang terkait
   */
  public static async publishToAllPlatforms(
    postId: string
  ): Promise<PublishResult[]> {
    try {
      // Dapatkan semua akun sosial yang terkait dengan post
      const postSocialAccounts = await prisma.postSocialAccount.findMany({
        where: { postId },
        select: { socialAccountId: true },
      });

      // Publikasikan ke setiap platform
      const results = await Promise.all(
        postSocialAccounts.map((psa: { socialAccountId: string }) =>
          this.publishToSocialMedia(postId, psa.socialAccountId)
        )
      );

      return results;
    } catch (error) {
      console.error("Error publishing to all platforms:", error);
      return [
        {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        },
      ];
    }
  }

  // Schedule posts for future publishing
  static async schedulePost(postId: string): Promise<boolean> {
    try {
      // This method would be called by a cron job or scheduler
      // to check if a post is due for publishing

      const post = await prisma.post.findUnique({
        where: { id: postId },
      });

      if (!post) {
        throw new Error(`Post ${postId} not found`);
      }

      // Check if post is scheduled and due
      if (
        post.status === PostStatus.SCHEDULED &&
        post.scheduledAt <= new Date()
      ) {
        // Check if post needs approval and is approved
        const approvalInstance = await prisma.approvalInstance.findFirst({
          where: {
            postId,
            status: { not: "APPROVED" }, // If not approved, don't publish
          },
        });

        if (approvalInstance) {
          console.log(`Post ${postId} needs approval before publishing`);
          return false;
        }

        // If approved or no approval needed, publish
        await this.publishToAllPlatforms(postId);
        return true;
      }

      return false;
    } catch (error) {
      console.error("Error in schedulePost:", error);
      return false;
    }
  }
}
