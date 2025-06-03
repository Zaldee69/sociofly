import { prisma } from "@/lib/prisma/client";
import { ApprovalStatus, PostStatus } from "@prisma/client";
import { sendApprovalRequestEmail, sendApprovalStatusEmail } from "@/lib/email";
import { addHours, subHours, isPast } from "date-fns";

export interface EdgeCaseReport {
  type: string;
  count: number;
  posts: Array<{
    id: string;
    content: string;
    scheduledAt: Date;
    issue: string;
    action: string;
  }>;
}

export class ApprovalEdgeCaseHandler {
  /**
   * Menangani posts yang waktu posting-nya sudah lewat tapi masih dalam proses approval
   */
  static async handleExpiredScheduledPosts(): Promise<EdgeCaseReport> {
    const now = new Date();

    // Cari posts yang:
    // 1. Masih dalam status DRAFT (sedang approval)
    // 2. Waktu posting sudah lewat
    // 3. Masih ada approval instance yang IN_PROGRESS
    const expiredPosts = await prisma.post.findMany({
      where: {
        status: PostStatus.DRAFT,
        scheduledAt: {
          lt: now, // Waktu posting sudah lewat
        },
        approvalInstances: {
          some: {
            status: ApprovalStatus.IN_PROGRESS,
          },
        },
      },
      include: {
        approvalInstances: {
          include: {
            assignments: {
              include: {
                user: {
                  select: { name: true, email: true },
                },
                step: true,
              },
            },
            workflow: {
              include: {
                team: {
                  select: { name: true },
                },
              },
            },
          },
        },
        user: {
          select: { name: true, email: true },
        },
      },
    });

    const results = [];

    for (const post of expiredPosts) {
      const hoursOverdue = Math.floor(
        (now.getTime() - post.scheduledAt.getTime()) / (1000 * 60 * 60)
      );

      // Strategi penanganan berdasarkan seberapa lama terlambat:
      let action = "";

      if (hoursOverdue <= 2) {
        // 0-2 jam: Kirim reminder urgent ke approver
        action = "urgent_reminder_sent";
        await this.sendUrgentReminderToApprovers(post);
      } else if (hoursOverdue <= 24) {
        // 2-24 jam: Update scheduled time dan kirim notifikasi
        action = "auto_rescheduled";
        await this.autoReschedulePost(post);
      } else {
        // >24 jam: Tandai sebagai expired dan minta action dari author
        action = "marked_expired";
        await this.markPostAsExpired(post);
      }

      results.push({
        id: post.id,
        content: post.content.substring(0, 50) + "...",
        scheduledAt: post.scheduledAt,
        issue: `Scheduled time passed ${hoursOverdue} hours ago`,
        action,
      });
    }

    return {
      type: "expired_scheduled_posts",
      count: expiredPosts.length,
      posts: results,
    };
  }

  /**
   * Menangani approval yang terjebak/stuck tanpa activity
   */
  static async handleStuckApprovals(): Promise<EdgeCaseReport> {
    const now = new Date();
    const stuckThreshold = subHours(now, 48); // 48 jam tanpa activity

    const stuckApprovals = await prisma.approvalInstance.findMany({
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
      include: {
        post: true,
        assignments: {
          include: {
            user: {
              select: { name: true, email: true },
            },
            step: true,
          },
        },
        workflow: {
          include: {
            team: {
              select: { name: true },
            },
          },
        },
      },
    });

    const results = [];

    for (const approval of stuckApprovals) {
      if (!approval.post) continue;

      const hoursStuck = Math.floor(
        (now.getTime() - approval.createdAt.getTime()) / (1000 * 60 * 60)
      );

      // Eskalasi approval yang stuck
      await this.escalateStuckApproval(approval);

      results.push({
        id: approval.post.id,
        content: approval.post.content.substring(0, 50) + "...",
        scheduledAt: approval.post.scheduledAt,
        issue: `Approval stuck for ${hoursStuck} hours`,
        action: "escalated_to_managers",
      });
    }

    return {
      type: "stuck_approvals",
      count: stuckApprovals.length,
      posts: results,
    };
  }

  /**
   * Menangani approver yang sudah tidak aktif atau tidak ada
   */
  static async handleMissingApprovers(): Promise<EdgeCaseReport> {
    const missingApproverPosts = await prisma.approvalAssignment.findMany({
      where: {
        status: ApprovalStatus.PENDING,
        OR: [
          {
            assignedUserId: {
              not: null,
            },
            user: null, // User sudah dihapus
          },
        ],
      },
      include: {
        instance: {
          include: {
            post: true,
            workflow: {
              include: {
                team: true,
              },
            },
          },
        },
        step: true,
        user: true,
      },
    });

    const results = [];

    for (const assignment of missingApproverPosts) {
      if (!assignment.instance.post) continue;

      // Reassign ke manager atau owner team
      await this.reassignToTeamManager(assignment);

      results.push({
        id: assignment.instance.post.id,
        content: assignment.instance.post.content.substring(0, 50) + "...",
        scheduledAt: assignment.instance.post.scheduledAt,
        issue: "Assigned approver no longer exists",
        action: "reassigned_to_team_manager",
      });
    }

    return {
      type: "missing_approvers",
      count: missingApproverPosts.length,
      posts: results,
    };
  }

  /**
   * Menangani posts yang approved tapi scheduled time sudah lewat
   */
  static async handleApprovedButExpiredPosts(): Promise<EdgeCaseReport> {
    const now = new Date();

    const approvedExpiredPosts = await prisma.post.findMany({
      where: {
        status: PostStatus.DRAFT, // Status masih draft karena belum di-publish
        scheduledAt: {
          lt: now,
        },
        approvalInstances: {
          some: {
            status: ApprovalStatus.APPROVED,
          },
        },
      },
      include: {
        user: {
          select: { name: true, email: true },
        },
        approvalInstances: {
          where: {
            status: ApprovalStatus.APPROVED,
          },
        },
      },
    });

    const results = [];

    for (const post of approvedExpiredPosts) {
      const hoursOverdue = Math.floor(
        (now.getTime() - post.scheduledAt.getTime()) / (1000 * 60 * 60)
      );

      if (hoursOverdue <= 6) {
        // Masih dalam 6 jam, auto-publish
        await this.autoPublishApprovedPost(post);
        results.push({
          id: post.id,
          content: post.content.substring(0, 50) + "...",
          scheduledAt: post.scheduledAt,
          issue: `Approved but ${hoursOverdue} hours overdue`,
          action: "auto_published",
        });
      } else {
        // Lebih dari 6 jam, minta konfirmasi ulang dari author
        await this.requestReconfirmation(post);
        results.push({
          id: post.id,
          content: post.content.substring(0, 50) + "...",
          scheduledAt: post.scheduledAt,
          issue: `Approved but ${hoursOverdue} hours overdue`,
          action: "reconfirmation_requested",
        });
      }
    }

    return {
      type: "approved_but_expired_posts",
      count: approvedExpiredPosts.length,
      posts: results,
    };
  }

  /**
   * Deteksi posts dengan social accounts yang tidak valid
   */
  static async handleInvalidSocialAccounts(): Promise<EdgeCaseReport> {
    const postsWithInvalidAccounts = await prisma.post.findMany({
      where: {
        OR: [
          {
            status: {
              in: [PostStatus.SCHEDULED, PostStatus.DRAFT],
            },
          },
        ],
        postSocialAccounts: {
          some: {
            socialAccount: {
              expiresAt: { lt: new Date() }, // Token expired
            },
          },
        },
      },
      include: {
        postSocialAccounts: {
          include: {
            socialAccount: true,
          },
        },
        user: {
          select: { name: true, email: true },
        },
      },
    });

    const results = [];

    for (const post of postsWithInvalidAccounts) {
      const invalidAccounts = post.postSocialAccounts.filter(
        (psa: any) =>
          psa.socialAccount && psa.socialAccount.expiresAt < new Date()
      );

      if (invalidAccounts.length > 0) {
        await this.notifyInvalidSocialAccounts(post, invalidAccounts);

        results.push({
          id: post.id,
          content: post.content.substring(0, 50) + "...",
          scheduledAt: post.scheduledAt,
          issue: `${invalidAccounts.length} invalid social accounts`,
          action: "author_notified",
        });
      }
    }

    return {
      type: "invalid_social_accounts",
      count: postsWithInvalidAccounts.length,
      posts: results,
    };
  }

  /**
   * Helper methods untuk actions
   */
  private static async sendUrgentReminderToApprovers(post: any) {
    const pendingAssignments = post.approvalInstances[0]?.assignments?.filter(
      (a: any) => a.status === ApprovalStatus.PENDING
    );

    for (const assignment of pendingAssignments || []) {
      if (assignment.user) {
        await sendApprovalRequestEmail({
          approverEmail: assignment.user.email,
          approverName: assignment.user.name || assignment.user.email,
          postContent: post.content,
          teamName: post.approvalInstances[0].workflow.team.name,
          authorName: post.user.name || post.user.email,
          assignmentId: assignment.id,
        });
      }
    }
  }

  private static async autoReschedulePost(post: any) {
    const newScheduledTime = addHours(new Date(), 2); // Reschedule 2 jam ke depan

    await prisma.post.update({
      where: { id: post.id },
      data: {
        scheduledAt: newScheduledTime,
      },
    });

    // Kirim notifikasi ke author menggunakan feedback yang lebih generic
    await sendApprovalStatusEmail({
      authorEmail: post.user.email,
      authorName: post.user.name || post.user.email,
      postContent: post.content,
      teamName: post.approvalInstances[0].workflow.team.name,
      approverName: "System",
      status: "approved", // Use approved status but with feedback explaining the reschedule
      feedback: `Post automatically rescheduled to ${newScheduledTime.toLocaleString()} due to approval delay.`,
    });
  }

  private static async markPostAsExpired(post: any) {
    await prisma.post.update({
      where: { id: post.id },
      data: {
        status: PostStatus.FAILED,
      },
    });

    // Update approval instance
    await prisma.approvalInstance.update({
      where: { id: post.approvalInstances[0].id },
      data: {
        status: ApprovalStatus.REJECTED,
      },
    });
  }

  private static async escalateStuckApproval(approval: any) {
    // Cari manager atau owner dari team
    const managers = await prisma.membership.findMany({
      where: {
        teamId: approval.workflow.team.id,
        role: {
          in: ["OWNER", "MANAGER"],
        },
        status: "ACTIVE",
      },
      include: {
        user: {
          select: { name: true, email: true },
        },
      },
    });

    // Buat assignment baru untuk manager
    if (managers.length > 0) {
      const manager = managers[0];
      await prisma.approvalAssignment.create({
        data: {
          stepId: approval.assignments[0].stepId,
          instanceId: approval.id,
          assignedUserId: manager.userId,
          status: ApprovalStatus.PENDING,
        },
      });

      // Kirim notifikasi eskalasi
      await sendApprovalRequestEmail({
        approverEmail: manager.user.email,
        approverName: manager.user.name || manager.user.email,
        postContent: approval.post.content,
        teamName: approval.workflow.team.name,
        authorName: approval.post.user?.name || approval.post.user?.email,
        assignmentId: approval.assignments[0].id,
      });
    }
  }

  private static async reassignToTeamManager(assignment: any) {
    const managers = await prisma.membership.findMany({
      where: {
        teamId: assignment.instance.workflow.team.id,
        role: {
          in: ["OWNER", "MANAGER"],
        },
        status: "ACTIVE",
      },
      take: 1,
    });

    if (managers.length > 0) {
      await prisma.approvalAssignment.update({
        where: { id: assignment.id },
        data: {
          assignedUserId: managers[0].userId,
        },
      });
    }
  }

  private static async autoPublishApprovedPost(post: any) {
    // Import PostPublisherService di sini untuk menghindari circular dependency
    const { PostPublisherService } = await import("./post-publisher");

    await PostPublisherService.publishToAllPlatforms(post.id);
  }

  private static async requestReconfirmation(post: any) {
    await sendApprovalStatusEmail({
      authorEmail: post.user.email,
      authorName: post.user.name || post.user.email,
      postContent: post.content,
      teamName: "Your Team",
      approverName: "System",
      status: "rejected", // Use rejected status to indicate action needed
      feedback:
        "Your approved post missed its scheduled time. Please confirm if you want to publish it now or reschedule.",
    });
  }

  private static async notifyInvalidSocialAccounts(
    post: any,
    invalidAccounts: any[]
  ) {
    const accountNames = invalidAccounts
      .map(
        (psa: any) =>
          `${psa.socialAccount.platform} - ${psa.socialAccount.name}`
      )
      .join(", ");

    await sendApprovalStatusEmail({
      authorEmail: post.user.email,
      authorName: post.user.name || post.user.email,
      postContent: post.content,
      teamName: "Your Team",
      approverName: "System",
      status: "rejected", // Use rejected status to indicate action needed
      feedback: `The following social accounts need to be reconnected: ${accountNames}`,
    });
  }

  /**
   * Jalankan semua edge case checks
   */
  static async runAllEdgeCaseChecks(): Promise<EdgeCaseReport[]> {
    const results = await Promise.allSettled([
      this.handleExpiredScheduledPosts(),
      this.handleStuckApprovals(),
      this.handleMissingApprovers(),
      this.handleApprovedButExpiredPosts(),
      this.handleInvalidSocialAccounts(),
    ]);

    return results
      .filter((result) => result.status === "fulfilled")
      .map(
        (result) => (result as PromiseFulfilledResult<EdgeCaseReport>).value
      );
  }
}
