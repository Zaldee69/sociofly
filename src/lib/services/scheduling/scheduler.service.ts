import { prisma } from "@/lib/prisma/client";
import { PostPublisherService } from "../post-publisher";
import { PostStatus, ApprovalStatus } from "@prisma/client";
import { NotificationService } from "../notification.service";

// Add tracking for posts currently being processed
const processingPosts = new Set<string>();

export class SchedulerService {
  /**
   * Checks for and publishes all posts that are due to be published
   * This should be called by the job scheduler on a regular interval (every 1 minute)
   * Optimized for performance with batching and parallel processing
   */
  static async processDuePublications(): Promise<{
    success: number;
    failed: number;
    skipped: number;
    rate_limited: number;
    processed: number;
    total: number;
  }> {
    try {
      // Get current time
      const now = new Date();
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000); // 5 minutes ago

      // Limit processing to prevent overwhelming the system
      // Reduced batch size to prevent Instagram API rate limiting
      const BATCH_SIZE = parseInt(process.env.CRON_BATCH_SIZE || "3");

      // First, count total due posts for reporting
      const totalDue = await prisma.post.count({
        where: {
          status: PostStatus.SCHEDULED,
          scheduledAt: {
            lte: now,
          },
        },
      });

      if (totalDue === 0) {
        return {
          success: 0,
          failed: 0,
          skipped: 0,
          rate_limited: 0,
          processed: 0,
          total: 0,
        };
      }

      // Find scheduled posts that are due (with limit for performance)
      // Exclude posts that recently failed due to rate limits
      // Exclude posts that are already being processed
      const duePosts = await prisma.post.findMany({
        where: {
          status: PostStatus.SCHEDULED,
          scheduledAt: {
            lte: now, // Less than or equal to now
          },
          // Skip posts that failed due to rate limits in the last 10 minutes
          NOT: {
            AND: [
              { status: PostStatus.FAILED },
              {
                updatedAt: {
                  gte: new Date(Date.now() - 10 * 60 * 1000), // 10 minutes ago
                },
              },
            ],
          },
          // Additional filter: exclude posts that were recently updated (to prevent race conditions)
          // BUT allow posts that were just scheduled for retry (scheduledAt within last minute)
          OR: [
            {
              updatedAt: {
                lt: fiveMinutesAgo, // Only process posts that haven't been updated in the last 5 minutes
              },
            },
            {
              // Allow immediate processing for retry posts (scheduledAt set to current time)
              scheduledAt: {
                gte: new Date(Date.now() - 60 * 1000), // Within last minute (retry posts)
              },
            },
          ],
        },
        include: {
          postSocialAccounts: {
            select: {
              socialAccountId: true,
              status: true,
            },
          },
          approvalInstances: {
            select: {
              status: true,
            },
          },
        },
        orderBy: {
          scheduledAt: "asc", // Process oldest first
        },
        take: BATCH_SIZE, // Limit to prevent overwhelming system
      });

      // Filter out posts that are already being processed
      const availablePosts = duePosts.filter(
        (post) => !processingPosts.has(post.id)
      );

      console.log(
        `📋 Processing ${availablePosts.length} of ${totalDue} due posts (batch size: ${BATCH_SIZE}, ${duePosts.length - availablePosts.length} already processing)`
      );

      // Log if there are any posts that were scheduled but no longer exist
      if (totalDue > availablePosts.length) {
        console.log(
          `ℹ️  Note: ${totalDue - availablePosts.length} scheduled posts may have been deleted, are being rate-limited, or already processing`
        );
      }

      // Track results
      let successCount = 0;
      let failedCount = 0;
      let skippedCount = 0;
      let rateLimitedCount = 0;

      // Use Promise.allSettled for parallel processing with error isolation
      // But add sequential delays to prevent API overload
      const postPromises = availablePosts.map(async (post, index) => {
        try {
          // Mark post as being processed
          processingPosts.add(post.id);

          // Add staggered delay to prevent all posts hitting API simultaneously
          if (index > 0) {
            await new Promise((resolve) => setTimeout(resolve, index * 1000)); // 1s delay per post
          }

          // Double-check post is still schedulable (race condition protection)
          const freshPost = await prisma.post.findUnique({
            where: { id: post.id },
            select: {
              id: true,
              status: true,
              scheduledAt: true,
              postSocialAccounts: {
                select: {
                  status: true,
                },
              },
            },
          });

          if (!freshPost || freshPost.status !== PostStatus.SCHEDULED) {
            console.log(
              `⏩ Skipping post ${post.id} - status changed during processing`
            );
            return {
              status: "skipped",
              postId: post.id,
              reason: "status changed",
            };
          }

          // Check if any social accounts are already published (partial publishing scenario)
          const hasPublishedAccounts = freshPost.postSocialAccounts.some(
            (psa) => psa.status === PostStatus.PUBLISHED
          );

          if (hasPublishedAccounts) {
            console.log(
              `⏩ Skipping post ${post.id} - some accounts already published`
            );
            return {
              status: "skipped",
              postId: post.id,
              reason: "partially published",
            };
          }

          // Check if post needs approval
          const hasApprovalInstances = post.approvalInstances.length > 0;
          const isApproved = post.approvalInstances.some(
            (instance) => instance.status === ApprovalStatus.APPROVED
          );

          if (hasApprovalInstances && !isApproved) {
            console.log(`⏩ Skipping post ${post.id} - awaiting approval`);
            return {
              status: "skipped",
              postId: post.id,
              reason: "awaiting approval",
            };
          }

          // Publish the post
          const publishResult =
            await PostPublisherService.publishToAllPlatforms(post.id);

          // Check if all publications were successful
          const allSuccessful = publishResult.every((result) => result.success);

          if (allSuccessful) {
            console.log(`✅ Successfully published post ${post.id}`);
            
            // Send success notification to post author
            try {
              const postDetails = await prisma.post.findUnique({
                where: { id: post.id },
                include: {
                  postSocialAccounts: {
                    include: {
                      socialAccount: {
                        select: { platform: true }
                      }
                    }
                  },
                  team: {
                    select: { name: true }
                  }
                }
              });
              
              if (postDetails) {
                const platforms = postDetails.postSocialAccounts.map(psa => psa.socialAccount.platform).join(', ');
                
                await NotificationService.send({
                  userId: postDetails.userId,
                  type: 'POST_PUBLISHED',
                  title: 'Post Published Successfully',
                  body: `Your post in ${postDetails.team.name} has been published to ${platforms}`,
                  metadata: {
                    postId: post.id,
                    teamId: postDetails.teamId,
                    platforms: postDetails.postSocialAccounts.map(psa => psa.socialAccount.platform)
                  }
                });
              }
            } catch (notificationError) {
              console.error(`Failed to send success notification for post ${post.id}:`, notificationError);
            }
            
            return { status: "success", postId: post.id };
          } else {
            const errorMessage = publishResult
              .filter((r) => !r.success)
              .map((r) => r.error)
              .join(", ");

            // Check if this is a rate limit error
            const isRateLimitError =
              errorMessage.toLowerCase().includes("rate limit") ||
              errorMessage.toLowerCase().includes("request limit reached");

            if (isRateLimitError) {
              console.error(
                `🚨 Rate limit hit for post ${post.id}: ${errorMessage}`
              );
              return {
                status: "rate_limited",
                postId: post.id,
                error: errorMessage,
              };
            }

            console.error(
              `❌ Failed to publish post ${post.id}: ${errorMessage}`
            );
            
            // Send failure notification to post author
            try {
              const postDetails = await prisma.post.findUnique({
                where: { id: post.id },
                include: {
                  team: {
                    select: { name: true }
                  }
                }
              });
              
              if (postDetails) {
                await NotificationService.send({
                  userId: postDetails.userId,
                  type: 'POST_FAILED',
                  title: 'Post Publishing Failed',
                  body: `Failed to publish your post in ${postDetails.team.name}: ${errorMessage}`,
                  metadata: {
                    postId: post.id,
                    teamId: postDetails.teamId,
                    error: errorMessage
                  }
                });
              }
            } catch (notificationError) {
              console.error(`Failed to send failure notification for post ${post.id}:`, notificationError);
            }
            
            return { status: "failed", postId: post.id, error: errorMessage };
          }
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          console.error(`❌ Error processing post ${post.id}:`, errorMessage);
          return { status: "failed", postId: post.id, error: errorMessage };
        } finally {
          // Always remove from processing set
          processingPosts.delete(post.id);
        }
      });

      // Wait for all posts to be processed
      const postResults = await Promise.allSettled(postPromises);

      // Count results
      postResults.forEach((result) => {
        if (result.status === "fulfilled") {
          switch (result.value.status) {
            case "success":
              successCount++;
              break;
            case "failed":
              failedCount++;
              break;
            case "skipped":
              skippedCount++;
              break;
            case "rate_limited":
              rateLimitedCount++;
              break;
          }
        } else {
          failedCount++; // Promise was rejected
        }
      });

      // Single batch log entry instead of individual logs (reduces DB writes significantly)
      if (availablePosts.length > 0) {
        const batchData = {
          processed: availablePosts.length,
          success: successCount,
          failed: failedCount,
          skipped: skippedCount,
          rate_limited: rateLimitedCount,
          total: totalDue,
          remaining: totalDue - availablePosts.length,
          batchSize: BATCH_SIZE,
          alreadyProcessing: duePosts.length - availablePosts.length,
        };

        const logData = {
          name: "publish_due_posts_batch",
          status:
            failedCount > 0
              ? successCount > 0
                ? "PARTIAL"
                : "FAILED"
              : "SUCCESS",
          message: `Batch processed ${availablePosts.length} posts: ${successCount} success, ${failedCount} failed, ${skippedCount} skipped, ${rateLimitedCount} rate_limited. ${totalDue - availablePosts.length} remaining. ${batchData.alreadyProcessing} already processing. Data: ${JSON.stringify(batchData)}`,
        };

        await prisma.taskLog.create({ data: logData });
      }

      return {
        success: successCount,
        failed: failedCount,
        skipped: skippedCount,
        rate_limited: rateLimitedCount,
        processed: availablePosts.length,
        total: totalDue,
      };
    } catch (error) {
      console.error("❌ Error in processDuePublications:", error);

      // Log the overall error
      await prisma.taskLog.create({
        data: {
          name: "publish_due_posts_error",
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
        rate_limited: 0,
        processed: 0,
        total: 0,
      };
    }
  }

  /**
   * Checks for social accounts with expired tokens and marks them as needing reauthorization
   * This should be called by the job scheduler on a daily basis
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
        await prisma.taskLog.create({
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

      await prisma.taskLog.create({
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

  /**
   * Process all approval edge cases
   * This should be called by the job scheduler every hour to handle various edge cases
   */
  static async processApprovalEdgeCases(): Promise<{
    totalIssues: number;
    reports: any[];
  }> {
    try {
      console.log("Starting approval edge case processing...");

      // Temporarily disabled to fix circular dependency
      // TODO: Implement edge case processing without circular dependency
      const reports: any[] = [];
      const totalIssues = 0;

      // Log the results
      await prisma.taskLog.create({
        data: {
          name: "process_approval_edge_cases",
          status: "SUCCESS",
          message: `Edge case processing temporarily disabled - ${totalIssues} issues processed`,
        },
      });

      console.log(
        `Completed edge case processing. Total issues handled: ${totalIssues}`
      );

      return {
        totalIssues,
        reports,
      };
    } catch (error) {
      console.error("Error in processApprovalEdgeCases:", error);

      await prisma.taskLog.create({
        data: {
          name: "process_approval_edge_cases",
          status: "ERROR",
          message: `Error processing approval edge cases: ${
            error instanceof Error ? error.message : String(error)
          }`,
        },
      });

      return {
        totalIssues: 0,
        reports: [],
      };
    }
  }

  /**
   * Get health statistics for the approval system
   */
  static async getApprovalSystemHealth(): Promise<{
    pendingApprovals: number;
    overduePosts: number;
    stuckApprovals: number;
    expiredTokens: number;
    healthScore: number;
  }> {
    try {
      const now = new Date();

      // Count pending approvals
      const pendingApprovals = await prisma.approvalAssignment.count({
        where: {
          status: ApprovalStatus.PENDING,
        },
      });

      // Count overdue posts (scheduled time passed but still in approval)
      const overduePosts = await prisma.post.count({
        where: {
          status: PostStatus.DRAFT,
          scheduledAt: {
            lt: now,
          },
          approvalInstances: {
            some: {
              status: ApprovalStatus.IN_PROGRESS,
            },
          },
        },
      });

      // Count stuck approvals (more than 48 hours old)
      const stuckThreshold = new Date(now.getTime() - 48 * 60 * 60 * 1000);
      const stuckApprovals = await prisma.approvalInstance.count({
        where: {
          status: ApprovalStatus.IN_PROGRESS,
          createdAt: {
            lt: stuckThreshold,
          },
          assignments: {
            every: {
              status: ApprovalStatus.PENDING,
              completedAt: null,
            },
          },
        },
      });

      // Count expired tokens
      const expiredTokens = await prisma.socialAccount.count({
        where: {
          expiresAt: {
            lte: now,
          },
        },
      });

      // Calculate health score (0-100)
      // Lower scores indicate more issues
      let healthScore = 100;

      // Deduct points for issues
      healthScore -= Math.min(overduePosts * 10, 50); // Max 50 points deduction
      healthScore -= Math.min(stuckApprovals * 15, 30); // Max 30 points deduction
      healthScore -= Math.min(expiredTokens * 5, 20); // Max 20 points deduction

      // Ensure health score doesn't go below 0
      healthScore = Math.max(healthScore, 0);

      return {
        pendingApprovals,
        overduePosts,
        stuckApprovals,
        expiredTokens,
        healthScore,
      };
    } catch (error) {
      console.error("Error getting approval system health:", error);
      return {
        pendingApprovals: 0,
        overduePosts: 0,
        stuckApprovals: 0,
        expiredTokens: 0,
        healthScore: 0,
      };
    }
  }
}
