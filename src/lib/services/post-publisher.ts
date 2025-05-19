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

      switch (socialAccount.platform) {
        case SocialPlatform.FACEBOOK:
          result = await this.publishToFacebook(post, socialAccount);
          break;
        case SocialPlatform.INSTAGRAM:
          result = await this.publishToInstagram(post, socialAccount);
          break;
        case SocialPlatform.TWITTER:
          result = await this.publishToTwitter(post, socialAccount);
          break;
        case SocialPlatform.LINKEDIN:
          result = await this.publishToLinkedin(post, socialAccount);
          break;
        default:
          return {
            success: false,
            error: `Platform ${socialAccount.platform} tidak didukung`,
          };
      }

      // Update status posting
      if (result.success) {
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

  // Platform-specific implementations
  private static async publishToFacebook(
    post: PostWithRelations,
    socialAccount: SocialAccountWithRelations
  ): Promise<PublishResult> {
    // Implementasi sebenarnya akan memanggil Facebook API dengan token akses
    // Untuk contoh ini, kita hanya simulasikan berhasil
    console.log(`Publishing to Facebook: ${post.content}`);

    // Simulasi keberhasilan dengan 90% probabilitas
    if (Math.random() > 0.1) {
      return {
        success: true,
        platformPostId: `fb_${Date.now()}`,
      };
    }

    return {
      success: false,
      error: "Facebook API error: Could not authenticate",
    };
  }

  private static async publishToInstagram(
    post: PostWithRelations,
    socialAccount: SocialAccountWithRelations
  ): Promise<PublishResult> {
    console.log(`Publishing to Instagram: ${post.content}`);

    // Simulasi keberhasilan dengan 80% probabilitas
    if (Math.random() > 0.2) {
      return {
        success: true,
        platformPostId: `ig_${Date.now()}`,
      };
    }

    return {
      success: false,
      error: "Instagram API error: Invalid media format",
    };
  }

  private static async publishToTwitter(
    post: PostWithRelations,
    socialAccount: SocialAccountWithRelations
  ): Promise<PublishResult> {
    console.log(`Publishing to Twitter: ${post.content}`);

    // Simulasi keberhasilan dengan 95% probabilitas
    if (Math.random() > 0.05) {
      return {
        success: true,
        platformPostId: `tw_${Date.now()}`,
      };
    }

    return {
      success: false,
      error: "Twitter API error: Rate limit exceeded",
    };
  }

  private static async publishToLinkedin(
    post: PostWithRelations,
    socialAccount: SocialAccountWithRelations
  ): Promise<PublishResult> {
    console.log(`Publishing to LinkedIn: ${post.content}`);

    // Simulasi keberhasilan dengan 85% probabilitas
    if (Math.random() > 0.15) {
      return {
        success: true,
        platformPostId: `li_${Date.now()}`,
      };
    }

    return {
      success: false,
      error: "LinkedIn API error: Content too long",
    };
  }
}
