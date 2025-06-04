import {
  PostStatus,
  SocialPlatform,
  Post,
  SocialAccount,
  PostSocialAccount,
} from "@prisma/client";
import { prisma } from "@/lib/prisma/client";
import {
  FacebookPublisher,
  PublishResult,
} from "./publishers/facebook-publisher";
import { InstagramPublisher } from "./publishers/instagram-publisher";

interface PublishResponse {
  postId: string;
  results: PublishResult[];
  summary: {
    totalPlatforms: number;
    successCount: number;
    failedCount: number;
    skippedCount: number;
  };
}

type PostWithRelations = Post & {
  mediaUrls: string[];
  content: string;
};

type SocialAccountWithRelations = SocialAccount & {
  platform: SocialPlatform;
  accessToken: string;
};

// Abstract interface for platform-specific publishers
interface SocialMediaPublisher {
  publish(
    socialAccount: SocialAccountWithRelations,
    content: string,
    mediaUrls: string[]
  ): Promise<PublishResult>;
}

// Twitter implementation (placeholder for now)
class TwitterPublisher implements SocialMediaPublisher {
  async publish(
    socialAccount: SocialAccountWithRelations,
    content: string,
    mediaUrls: string[]
  ): Promise<PublishResult> {
    try {
      // TODO: Implement real Twitter API integration
      console.log(`Publishing to Twitter...`);
      console.log(`Content: ${content}`);
      console.log(`Media: ${mediaUrls.join(", ")}`);

      // Simulate API call delay
      await new Promise((resolve) => setTimeout(resolve, 1000));

      return {
        success: true,
        platformPostId: `tweet_${Date.now()}`,
        platform: SocialPlatform.TWITTER,
      };
    } catch (error) {
      console.error("Error publishing to Twitter:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown Twitter error",
        platform: SocialPlatform.TWITTER,
      };
    }
  }
}

// Wrapper class for InstagramPublisher to match interface
class InstagramPublisherClass implements SocialMediaPublisher {
  async publish(
    socialAccount: SocialAccountWithRelations,
    content: string,
    mediaUrls: string[]
  ): Promise<PublishResult> {
    return InstagramPublisher.publish(socialAccount, content, mediaUrls);
  }
}

// LinkedIn implementation (placeholder for now)
class LinkedInPublisher implements SocialMediaPublisher {
  async publish(
    socialAccount: SocialAccountWithRelations,
    content: string,
    mediaUrls: string[]
  ): Promise<PublishResult> {
    try {
      // TODO: Implement real LinkedIn API integration
      console.log(`Publishing to LinkedIn...`);
      console.log(`Content: ${content}`);
      console.log(`Media: ${mediaUrls.join(", ")}`);

      // Simulate API call delay
      await new Promise((resolve) => setTimeout(resolve, 1000));

      return {
        success: true,
        platformPostId: `linkedin_post_${Date.now()}`,
        platform: SocialPlatform.LINKEDIN,
      };
    } catch (error) {
      console.error("Error publishing to LinkedIn:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown LinkedIn error",
        platform: SocialPlatform.LINKEDIN,
      };
    }
  }
}

// TikTok implementation (placeholder for now)
class TikTokPublisher implements SocialMediaPublisher {
  async publish(
    socialAccount: SocialAccountWithRelations,
    content: string,
    mediaUrls: string[]
  ): Promise<PublishResult> {
    try {
      // TODO: Implement real TikTok API integration
      console.log(`Publishing to TikTok...`);
      console.log(`Content: ${content}`);
      console.log(`Media: ${mediaUrls.join(", ")}`);

      // Simulate API call delay
      await new Promise((resolve) => setTimeout(resolve, 1000));

      return {
        success: true,
        platformPostId: `tiktok_video_${Date.now()}`,
        platform: SocialPlatform.TIKTOK,
      };
    } catch (error) {
      console.error("Error publishing to TikTok:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown TikTok error",
        platform: SocialPlatform.TIKTOK,
      };
    }
  }
}

// Factory to get the appropriate publisher
function getPublisherForPlatform(
  platform: SocialPlatform
): SocialMediaPublisher {
  switch (platform) {
    case SocialPlatform.FACEBOOK:
      return new FacebookPublisherClass();
    case SocialPlatform.TWITTER:
      return new TwitterPublisher();
    case SocialPlatform.INSTAGRAM:
      return new InstagramPublisherClass();
    case SocialPlatform.LINKEDIN:
      return new LinkedInPublisher();
    case SocialPlatform.TIKTOK:
      return new TikTokPublisher();
    default:
      throw new Error(`Unsupported platform: ${platform}`);
  }
}

// Wrapper class for FacebookPublisher to match interface
class FacebookPublisherClass implements SocialMediaPublisher {
  async publish(
    socialAccount: SocialAccountWithRelations,
    content: string,
    mediaUrls: string[]
  ): Promise<PublishResult> {
    return FacebookPublisher.publish(socialAccount, content, mediaUrls);
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
          platform: SocialPlatform.FACEBOOK, // Default, but this shouldn't happen
        };
      }

      const { post, socialAccount } = postSocialAccount;

      // Implementasikan publikasi ke platform yang berbeda
      const publisher = getPublisherForPlatform(socialAccount.platform);
      const publishResult = await publisher.publish(
        socialAccount,
        post.content,
        post.mediaUrls
      );

      if (publishResult.success && publishResult.platformPostId) {
        // Update status posting dan simpan platformPostId
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
            platformPostId: publishResult.platformPostId,
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

        return {
          success: true,
          platformPostId: publishResult.platformPostId,
          platform: socialAccount.platform,
        };
      } else {
        // Jika gagal, update status menjadi FAILED
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

        return {
          success: false,
          error: publishResult.error || "Publikasi gagal",
          platform: socialAccount.platform,
        };
      }
    } catch (error) {
      console.error("Error publishing post:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        platform: SocialPlatform.FACEBOOK, // Default for error cases
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
          platform: SocialPlatform.FACEBOOK, // Default for error cases
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
