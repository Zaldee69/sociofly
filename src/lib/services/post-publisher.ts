import { PostStatus, Post } from "@prisma/client";
import { prisma } from "@/lib/prisma/client";
import { publisherFactory } from "./publishers/publisher-factory";
import { PublishResult } from "./publishers/types";

// Add a simple in-memory lock to prevent duplicate processing
const processingLocks = new Set<string>();

export class PostPublisherService {
  /**
   * Publish a post to a specific social media platform
   */
  public static async publishToSocialMedia(
    postId: string,
    socialAccountId: string
  ): Promise<PublishResult> {
    // Create a unique lock key for this post-account combination
    const lockKey = `${postId}-${socialAccountId}`;

    // Check if this post-account is already being processed
    if (processingLocks.has(lockKey)) {
      console.log(
        `⏸️  Post ${postId} for account ${socialAccountId} is already being processed, skipping...`
      );
      return {
        success: false,
        error: "Post is already being processed",
        platform: "UNKNOWN" as any,
      };
    }

    try {
      // Add lock
      processingLocks.add(lockKey);

      // Check if this specific post to social account has already been published
      const existingPostSocialAccount =
        await prisma.postSocialAccount.findUnique({
          where: {
            postId_socialAccountId: {
              postId,
              socialAccountId,
            },
          },
        });

      if (existingPostSocialAccount?.status === PostStatus.PUBLISHED) {
        console.log(
          `✅ Post ${postId} already published to account ${socialAccountId}, skipping...`
        );
        // Get the social account to retrieve platform info
        const socialAccount = await prisma.socialAccount.findUnique({
          where: { id: socialAccountId },
          select: { platform: true },
        });

        return {
          success: true,
          error: "Already published",
          platform: socialAccount?.platform || ("UNKNOWN" as any),
          platformPostId: existingPostSocialAccount.platformPostId || undefined,
        };
      }

      // Get post and social account details
      const [post, socialAccount] = await Promise.all([
        prisma.post.findUnique({
          where: { id: postId },
        }),
        prisma.socialAccount.findUnique({
          where: { id: socialAccountId },
        }),
      ]);

      if (!post) {
        return {
          success: false,
          error: "Post not found",
          platform: "UNKNOWN" as any,
        };
      }

      if (!socialAccount) {
        return {
          success: false,
          error: "Social account not found",
          platform: "UNKNOWN" as any,
        };
      }

      // Get the appropriate publisher
      const publisher = publisherFactory.getPublisher(socialAccount.platform);

      // Publish the post
      const publishResult = await publisher.publish(
        socialAccount,
        post.content,
        post.mediaUrls
      );

      if (publishResult.success && publishResult.platformPostId) {
        // Update post social account status
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
        await this.updatePostStatusIfAllPublished(postId);

        return publishResult;
      } else {
        // Mark as failed
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

        // Update post status if all failed
        await this.updatePostStatusIfAllFailed(postId);

        return publishResult;
      }
    } catch (error) {
      console.error("Error publishing post:", error);

      // Try to update the post social account as failed
      try {
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
      } catch (updateError) {
        console.error("Error updating failed status:", updateError);
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        platform: publisherFactory.getSupportedPlatforms()[0], // Fallback platform
      };
    } finally {
      // Always remove the lock, even if an error occurs
      processingLocks.delete(lockKey);
    }
  }

  /**
   * Publish a post to all associated social media platforms
   */
  public static async publishToAllPlatforms(
    postId: string
  ): Promise<PublishResult[]> {
    try {
      // Check if post is already being processed globally
      if (processingLocks.has(postId)) {
        console.log(
          `⏸️  Post ${postId} is already being processed globally, skipping...`
        );
        return [
          {
            success: false,
            error: "Post is already being processed",
            platform: "UNKNOWN" as any,
          },
        ];
      }

      // Add global post lock
      processingLocks.add(postId);

      // Additional check: ensure post is in correct state for publishing
      const post = await prisma.post.findUnique({
        where: { id: postId },
        include: {
          postSocialAccounts: {
            include: {
              socialAccount: true,
            },
          },
        },
      });

      if (!post) {
        return [
          {
            success: false,
            error: "Post not found",
            platform: "UNKNOWN" as any,
          },
        ];
      }

      // Check if post is already fully published
      const allAlreadyPublished = post.postSocialAccounts.every(
        (psa) => psa.status === PostStatus.PUBLISHED
      );

      if (allAlreadyPublished) {
        console.log(
          `✅ Post ${postId} is already fully published, skipping...`
        );
        return post.postSocialAccounts.map((psa) => ({
          success: true,
          error: "Already published",
          platform: psa.socialAccount?.platform || ("UNKNOWN" as any),
          platformPostId: psa.platformPostId || undefined,
        }));
      }

      // Get all social accounts associated with the post that haven't been published yet
      const postSocialAccounts = post.postSocialAccounts.filter(
        (psa) => psa.status !== PostStatus.PUBLISHED
      );

      if (postSocialAccounts.length === 0) {
        console.log(`✅ No pending social accounts for post ${postId}`);
        return [
          {
            success: true,
            error: "No pending publications",
            platform: "UNKNOWN" as any,
          },
        ];
      }

      // Publish to each platform in parallel for better performance
      const results = await Promise.allSettled(
        postSocialAccounts.map((psa) =>
          this.publishToSocialMedia(postId, psa.socialAccountId)
        )
      );

      // Extract results from Promise.allSettled
      return results.map((result) => {
        if (result.status === "fulfilled") {
          return result.value;
        } else {
          // Handle rejected promises
          console.error("Failed to publish:", result.reason);
          return {
            success: false,
            error:
              result.reason instanceof Error
                ? result.reason.message
                : "Unknown error",
            platform: publisherFactory.getSupportedPlatforms()[0], // Fallback platform
          };
        }
      });
    } catch (error) {
      console.error("Error publishing to all platforms:", error);
      return [
        {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
          platform: publisherFactory.getSupportedPlatforms()[0], // Fallback platform
        },
      ];
    } finally {
      // Remove global post lock
      processingLocks.delete(postId);
    }
  }

  /**
   * Check if a post is ready for publishing (handles approval workflow)
   */
  public static async isPostReadyForPublishing(
    postId: string
  ): Promise<boolean> {
    try {
      const post = await prisma.post.findUnique({
        where: { id: postId },
        include: {
          approvalInstances: {
            select: { status: true },
          },
        },
      });

      if (!post) {
        return false;
      }

      // Check if post is scheduled and due
      if (post.status !== PostStatus.SCHEDULED || !post.scheduledAt) {
        return false;
      }

      if (post.scheduledAt > new Date()) {
        return false; // Not due yet
      }

      // Check approval status
      const hasApprovalInstances = post.approvalInstances.length > 0;
      if (hasApprovalInstances) {
        const isApproved = post.approvalInstances.some(
          (instance) => instance.status === "APPROVED"
        );
        return isApproved;
      }

      // No approval required
      return true;
    } catch (error) {
      console.error("Error checking if post is ready:", error);
      return false;
    }
  }

  /**
   * Schedule a post for future publishing (used by job scheduler)
   */
  public static async schedulePost(postId: string): Promise<boolean> {
    try {
      const isReady = await this.isPostReadyForPublishing(postId);

      if (!isReady) {
        return false;
      }

      // Publish the post
      const results = await this.publishToAllPlatforms(postId);

      // Check if at least one platform succeeded
      const hasSuccess = results.some((result) => result.success);
      return hasSuccess;
    } catch (error) {
      console.error("Error in schedulePost:", error);
      return false;
    }
  }

  /**
   * Validate tokens for all social accounts
   */
  public static async validateAllTokens(): Promise<{
    total: number;
    valid: number;
    invalid: number;
    details: Array<{ accountId: string; platform: string; isValid: boolean }>;
  }> {
    try {
      const socialAccounts = await prisma.socialAccount.findMany();

      const validationResults = await Promise.allSettled(
        socialAccounts.map(async (account) => {
          try {
            const publisher = publisherFactory.getPublisher(account.platform);
            const isValid = await publisher.validateToken(account);

            return {
              accountId: account.id,
              platform: account.platform,
              isValid,
            };
          } catch (error) {
            console.error(`Error validating token for ${account.id}:`, error);
            return {
              accountId: account.id,
              platform: account.platform,
              isValid: false,
            };
          }
        })
      );

      const details = validationResults.map((result) =>
        result.status === "fulfilled"
          ? result.value
          : {
              accountId: "unknown",
              platform: "unknown",
              isValid: false,
            }
      );

      const valid = details.filter((d) => d.isValid).length;
      const invalid = details.length - valid;

      return {
        total: details.length,
        valid,
        invalid,
        details,
      };
    } catch (error) {
      console.error("Error validating all tokens:", error);
      return {
        total: 0,
        valid: 0,
        invalid: 0,
        details: [],
      };
    }
  }

  /**
   * Helper method to update post status if all social accounts are published
   */
  private static async updatePostStatusIfAllPublished(
    postId: string
  ): Promise<void> {
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
  }

  /**
   * Helper method to update post status if all social accounts failed
   */
  private static async updatePostStatusIfAllFailed(
    postId: string
  ): Promise<void> {
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
}
