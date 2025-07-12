import { Queue, Worker, Job } from "bullmq";
import { UnifiedRedisManager } from "@/lib/services/unified-redis-manager";
import { prisma } from "@/lib/prisma/client";
import { NotificationType } from "@prisma/client";
import { JobType } from "@/lib/queue/job-types";

// Get Redis connection options from UnifiedRedisManager
const redisManager = UnifiedRedisManager.getInstance();

// Notification queue
export const notificationQueue = new Queue("notifications", {
  connection: redisManager.getConnectionOptions(),
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 50,
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 2000,
    },
  },
});

// Notification job data interface
interface NotificationJobData {
  userId: string;
  teamId?: string;
  title: string;
  body: string;
  type: NotificationType;
  link?: string;
  metadata?: Record<string, any>;
  expiresAt?: Date;
}

// Notification service class
export class NotificationService {
  /**
   * Send notification (adds to queue for async processing)
   */
  static async send(data: NotificationJobData) {
    try {
      await notificationQueue.add(JobType.SEND_NOTIFICATION, data, {
        priority: this.getPriority(data.type),
      });
    } catch (error) {
      console.error("Failed to queue notification:", error);
      throw error;
    }
  }

  /**
   * Send bulk notifications
   */
  static async sendBulk(notifications: NotificationJobData[]) {
    try {
      const jobs = notifications.map((data, index) => ({
        name: JobType.SEND_NOTIFICATION,
        data,
        opts: {
          priority: this.getPriority(data.type),
          delay: index * 100, // Stagger notifications to avoid overwhelming
        },
      }));

      await notificationQueue.addBulk(jobs);
    } catch (error) {
      console.error("Failed to queue bulk notifications:", error);
      throw error;
    }
  }

  /**
   * Mark notification as read
   */
  static async markAsRead(notificationId: string, userId: string) {
    try {
      const notification = await prisma.notification.update({
        where: {
          id: notificationId,
          userId, // Ensure user owns the notification
        },
        data: {
          isRead: true,
          readAt: new Date(),
        },
      });

      // Note: Real-time updates can be implemented with WebSockets or Server-Sent Events
      // For now, we rely on polling from the frontend

      return notification;
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
      throw error;
    }
  }

  /**
   * Mark all notifications as read for a user
   */
  static async markAllAsRead(userId: string, teamId?: string) {
    try {
      const whereClause: any = {
        userId,
        isRead: false,
      };

      if (teamId) {
        whereClause.teamId = teamId;
      }

      await prisma.notification.updateMany({
        where: whereClause,
        data: {
          isRead: true,
          readAt: new Date(),
        },
      });

      // Note: Real-time updates can be implemented with WebSockets or Server-Sent Events
      // For now, we rely on polling from the frontend
    } catch (error) {
      console.error("Failed to mark all notifications as read:", error);
      throw error;
    }
  }

  /**
   * Get notifications for a user
   */
  static async getNotifications({
    userId,
    teamId,
    limit = 20,
    offset = 0,
    unreadOnly = false,
  }: {
    userId: string;
    teamId?: string;
    limit?: number;
    offset?: number;
    unreadOnly?: boolean;
  }) {
    try {
      const whereClause: any = {
        userId,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      };

      if (teamId) {
        whereClause.teamId = teamId;
      }

      if (unreadOnly) {
        whereClause.isRead = false;
      }

      const [notifications, total] = await Promise.all([
        prisma.notification.findMany({
          where: whereClause,
          orderBy: { createdAt: "desc" },
          take: limit,
          skip: offset,
          include: {
            team: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        }),
        prisma.notification.count({ where: whereClause }),
      ]);

      return {
        notifications,
        total,
        hasMore: offset + limit < total,
      };
    } catch (error) {
      console.error("Failed to get notifications:", error);
      throw error;
    }
  }

  /**
   * Get unread count for a user
   */
  static async getUnreadCount(userId: string, teamId?: string) {
    try {
      const whereClause: any = {
        userId,
        isRead: false,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      };

      if (teamId) {
        whereClause.teamId = teamId;
      }

      return await prisma.notification.count({ where: whereClause });
    } catch (error) {
      console.error("Failed to get unread count:", error);
      throw error;
    }
  }

  /**
   * Delete old notifications (cleanup job)
   */
  static async cleanup() {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      await prisma.notification.deleteMany({
        where: {
          OR: [
            {
              expiresAt: {
                lt: new Date(),
              },
            },
            {
              createdAt: {
                lt: thirtyDaysAgo,
              },
              isRead: true,
            },
          ],
        },
      });
    } catch (error) {
      console.error("Failed to cleanup notifications:", error);
      throw error;
    }
  }

  /**
   * Get priority based on notification type
   */
  private static getPriority(type: NotificationType): number {
    const priorityMap: Record<NotificationType, number> = {
      SYSTEM_MAINTENANCE: 1, // Highest priority
      TOKEN_EXPIRED: 2,
      ACCOUNT_DISCONNECTED: 3,
      POST_FAILED: 4,
      APPROVAL_NEEDED: 5,
      APPROVAL_REJECTED: 6,
      APPROVAL_APPROVED: 7,
      TEAM_INVITATION: 8,
      WORKFLOW_ASSIGNED: 9,
      TEAM_MEMBER_JOINED: 10,
      TEAM_MEMBER_LEFT: 11,
      POST_PUBLISHED: 12,
      POST_SCHEDULED: 13,
      COMMENT_RECEIVED: 14,
      ANALYTICS_READY: 15, // Lowest priority
      APPROVAL_REQUEST: 16,
    };

    return priorityMap[type] || 10;
  }
}

// Worker to process notification jobs
export const notificationWorker = new Worker(
  "notifications",
  async (job: Job<NotificationJobData>) => {
    const { userId, teamId, title, body, type, link, metadata, expiresAt } =
      job.data;

    try {
      // Save to database
      const notification = await prisma.notification.create({
        data: {
          userId,
          teamId,
          title,
          body,
          type,
          link,
          metadata,
          expiresAt,
        },
        include: {
          team: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
      });

      // Note: Real-time notifications can be implemented with WebSockets or Server-Sent Events
      // For now, we rely on polling from the frontend

      console.log(`Notification sent to user ${userId}:`, title);
    } catch (error) {
      console.error("Failed to process notification job:", error);
      throw error;
    }
  },
  {
    connection: redisManager.getConnectionOptions(),
    concurrency: 10,
  }
);

// Cleanup worker (runs daily)
export const cleanupWorker = new Worker(
  "notification-cleanup",
  async () => {
    await NotificationService.cleanup();
    console.log("Notification cleanup completed");
  },
  {
    connection: redisManager.getConnectionOptions(),
  }
);

// Schedule cleanup job to run daily
notificationQueue.add(
  "cleanup",
  {},
  {
    repeat: {
      pattern: "0 2 * * *", // Run at 2 AM daily
    },
    jobId: "notification-cleanup",
  }
);
