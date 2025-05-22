import { prisma } from "@/lib/prisma/client";
import { PostPublisherService } from "./post-publisher";
import { PostStatus, ApprovalStatus } from "@prisma/client";

export class SchedulerService {
  /**
   * Checks for and publishes all posts that are due to be published
   * This should be called by a cron job on a regular interval
   */
  static async processDuePublications(): Promise<{
    success: number;
    failed: number;
    skipped: number;
  }> {
    try {
      // Get current time
      const now = new Date();

      // Find all scheduled posts that are due
      const duePosts = await prisma.post.findMany({
        where: {
          status: PostStatus.SCHEDULED,
          scheduledAt: {
            lte: now, // Less than or equal to now
          },
        },
        include: {
          approvalInstances: {
            where: {
              // Either no approval instances or all are approved
              OR: [{ status: ApprovalStatus.APPROVED }],
            },
          },
        },
      });

      console.log(`Found ${duePosts.length} posts due for publishing`);

      // Track results
      const results = {
        success: 0,
        failed: 0,
        skipped: 0,
      };

      // Process each post
      for (const post of duePosts) {
        try {
          // Skip posts that need approval but aren't approved yet
          const needsApproval = await prisma.approvalInstance.count({
            where: {
              postId: post.id,
            },
          });

          const isApproved = post.approvalInstances.some(
            (instance) => instance.status === ApprovalStatus.APPROVED
          );

          if (needsApproval && !isApproved) {
            console.log(`Skipping post ${post.id} - awaiting approval`);
            results.skipped++;
            continue;
          }

          // Publish the post
          const publishResult =
            await PostPublisherService.publishToAllPlatforms(post.id);

          // Check if all publications were successful
          const allSuccessful = publishResult.every((result) => result.success);

          if (allSuccessful) {
            results.success++;
            console.log(`Successfully published post ${post.id}`);

            // Log to CronLog
            await prisma.cronLog.create({
              data: {
                name: "publish_scheduled_post",
                status: "SUCCESS",
                message: `Published post ${post.id}`,
              },
            });
          } else {
            results.failed++;
            console.error(`Failed to publish post ${post.id}`);

            // Log the error
            await prisma.cronLog.create({
              data: {
                name: "publish_scheduled_post",
                status: "FAILED",
                message: `Failed to publish post ${post.id}: ${publishResult
                  .filter((r) => !r.success)
                  .map((r) => r.error)
                  .join(", ")}`,
              },
            });
          }
        } catch (error) {
          results.failed++;
          console.error(`Error processing post ${post.id}:`, error);

          // Log the error
          await prisma.cronLog.create({
            data: {
              name: "publish_scheduled_post",
              status: "ERROR",
              message: `Error processing post ${post.id}: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          });
        }
      }

      return results;
    } catch (error) {
      console.error("Error in processDuePublications:", error);

      // Log the overall error
      await prisma.cronLog.create({
        data: {
          name: "publish_scheduled_post",
          status: "ERROR",
          message: `Overall error in processDuePublications: ${
            error instanceof Error ? error.message : String(error)
          }`,
        },
      });

      return {
        success: 0,
        failed: 0,
        skipped: 0,
      };
    }
  }

  /**
   * Checks for social accounts with expired tokens and marks them as needing reauthorization
   * This should be called by a cron job on a daily basis
   */
  static async checkExpiredTokens(): Promise<number> {
    try {
      const now = new Date();

      // Find accounts with expired tokens
      const expiredAccounts = await prisma.socialAccount.findMany({
        where: {
          expiresAt: {
            lte: now,
          },
        },
      });

      console.log(
        `Found ${expiredAccounts.length} accounts with expired tokens`
      );

      // Here you would implement logic to:
      // 1. Try to refresh tokens if refreshToken is available
      // 2. Mark accounts as needing reauthorization if refresh fails or no refreshToken

      // For now, we'll just log it
      if (expiredAccounts.length > 0) {
        await prisma.cronLog.create({
          data: {
            name: "check_expired_tokens",
            status: "INFO",
            message: `Found ${expiredAccounts.length} accounts with expired tokens`,
          },
        });
      }

      return expiredAccounts.length;
    } catch (error) {
      console.error("Error checking expired tokens:", error);

      await prisma.cronLog.create({
        data: {
          name: "check_expired_tokens",
          status: "ERROR",
          message: `Error checking expired tokens: ${
            error instanceof Error ? error.message : String(error)
          }`,
        },
      });

      return 0;
    }
  }
}
