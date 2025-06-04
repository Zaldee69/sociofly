import { prisma } from "@/lib/prisma/client";
import { PostPublisherService } from "./post-publisher";
import { PostStatus, ApprovalStatus } from "@prisma/client";
import { ApprovalEdgeCaseHandler } from "./approval-edge-case-handler";

export class SchedulerService {
  /**
   * Checks for and publishes all posts that are due to be published
   * This should be called by a cron job on a regular interval (every 1 minute)
   * Optimized for performance with batching and parallel processing
   */
  static async processDuePublications(): Promise<{
    success: number;
    failed: number;
    skipped: number;
    processed: number;
    total: number;
  }> {
    try {
      // Get current time
      const now = new Date();

      // Limit processing to prevent overwhelming the system
      const BATCH_SIZE = parseInt(process.env.CRON_BATCH_SIZE || "10");

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
          processed: 0,
          total: 0,
        };
      }

      // Find scheduled posts that are due (with limit for performance)
      const duePosts = await prisma.post.findMany({
        where: {
          status: PostStatus.SCHEDULED,
          scheduledAt: {
            lte: now, // Less than or equal to now
          },
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

      console.log(
        `📋 Processing ${duePosts.length} of ${totalDue} due posts (batch size: ${BATCH_SIZE})`
      );

      // Track results
      let successCount = 0;
      let failedCount = 0;
      let skippedCount = 0;

      // Use Promise.allSettled for parallel processing with error isolation
      const postPromises = duePosts.map(async (post) => {
        try {
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
            return { status: "success", postId: post.id };
          } else {
            const errorMessage = publishResult
              .filter((r) => !r.success)
              .map((r) => r.error)
              .join(", ");
            console.error(
              `❌ Failed to publish post ${post.id}: ${errorMessage}`
            );
            return { status: "failed", postId: post.id, error: errorMessage };
          }
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          console.error(`❌ Error processing post ${post.id}:`, errorMessage);
          return { status: "failed", postId: post.id, error: errorMessage };
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
          }
        } else {
          failedCount++; // Promise was rejected
        }
      });

      // Single batch log entry instead of individual logs (reduces DB writes significantly)
      if (duePosts.length > 0) {
        const batchData = {
          processed: duePosts.length,
          success: successCount,
          failed: failedCount,
          skipped: skippedCount,
          total: totalDue,
          remaining: totalDue - duePosts.length,
          batchSize: BATCH_SIZE,
        };

        const logData = {
          name: "publish_due_posts_batch",
          status:
            failedCount > 0
              ? successCount > 0
                ? "PARTIAL"
                : "FAILED"
              : "SUCCESS",
          message: `Batch processed ${duePosts.length} posts: ${successCount} success, ${failedCount} failed, ${skippedCount} skipped. ${totalDue - duePosts.length} remaining. Data: ${JSON.stringify(batchData)}`,
        };

        await prisma.cronLog.create({ data: logData });
      }

      return {
        success: successCount,
        failed: failedCount,
        skipped: skippedCount,
        processed: duePosts.length,
        total: totalDue,
      };
    } catch (error) {
      console.error("❌ Error in processDuePublications:", error);

      // Log the overall error
      await prisma.cronLog.create({
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
        processed: 0,
        total: 0,
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

  /**
   * Process all approval edge cases
   * This should be called by a cron job every hour to handle various edge cases
   */
  static async processApprovalEdgeCases(): Promise<{
    totalIssues: number;
    reports: any[];
  }> {
    try {
      console.log("Starting approval edge case processing...");

      // Run all edge case checks
      const reports = await ApprovalEdgeCaseHandler.runAllEdgeCaseChecks();

      const totalIssues = reports.reduce(
        (sum, report) => sum + report.count,
        0
      );

      // Log the results
      await prisma.cronLog.create({
        data: {
          name: "process_approval_edge_cases",
          status: "SUCCESS",
          message: `Processed ${totalIssues} edge cases across ${reports.length} categories`,
        },
      });

      // Log individual reports for detailed tracking
      for (const report of reports) {
        if (report.count > 0) {
          await prisma.cronLog.create({
            data: {
              name: `edge_case_${report.type}`,
              status: "INFO",
              message: `Found and processed ${report.count} cases of type: ${report.type}`,
            },
          });
        }
      }

      console.log(
        `Completed edge case processing. Total issues handled: ${totalIssues}`
      );

      return {
        totalIssues,
        reports,
      };
    } catch (error) {
      console.error("Error in processApprovalEdgeCases:", error);

      await prisma.cronLog.create({
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
