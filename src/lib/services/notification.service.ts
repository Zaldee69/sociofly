import { Queue, Worker, Job } from "bullmq";
import { RedisManager } from "@/lib/services/redis-manager";
import { prisma } from "@/lib/prisma/client";
import { NotificationType } from "@prisma/client";
import { JobType } from "@/lib/queue/job-types";
import { getWebSocketServer } from "../websocket/websocket-server";
import type { NotificationPayload } from "../websocket/websocket-server";

// Get Redis connection options from RedisManager
const redisManager = RedisManager.getInstance();

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
   * Send notification with real-time WebSocket delivery
   */
  static async send(data: NotificationJobData) {
    try {
      // Save to database first
      const notification = await prisma.notification.create({
        data: {
          userId: data.userId,
          teamId: data.teamId,
          title: data.title,
          body: data.body,
          type: data.type,
          link: data.link,
          metadata: data.metadata,
          expiresAt: data.expiresAt,
          isRead: false,
        },
      });

      // Send via WebSocket for real-time delivery
      await this.sendRealTimeNotification({
        id: notification.id,
        userId: data.userId,
        type: this.mapNotificationType(data.type),
        title: data.title,
        message: data.body,
        data: {
          link: data.link,
          metadata: data.metadata,
          teamId: data.teamId,
        },
        timestamp: notification.createdAt,
        read: false,
      });

      // Also add to queue for backup processing (in case WebSocket fails)
      await notificationQueue.add(JobType.SEND_NOTIFICATION, data, {
        priority: this.getPriority(data.type),
        delay: 1000, // Small delay to allow WebSocket delivery first
      });

      return notification;
    } catch (error) {
      console.error("Failed to send notification:", error);
      throw error;
    }
  }

  /**
   * Send notification via WebSocket only (for real-time updates)
   */
  static async sendRealTimeNotification(payload: NotificationPayload) {
    try {
      const webSocketServer = getWebSocketServer();
      if (webSocketServer) {
        await webSocketServer.sendNotificationToUser(payload.userId, payload);
        console.log(`📨 Real-time notification sent to user ${payload.userId}`);
      } else {
        console.warn("⚠️ WebSocket server not available, falling back to queue");
      }
    } catch (error) {
      console.error("Failed to send real-time notification:", error);
      // Don't throw error here, let the queue handle it as backup
    }
  }

  /**
   * Send team notification via WebSocket
   */
  static async sendTeamNotification(teamId: string, payload: NotificationPayload) {
    try {
      const webSocketServer = getWebSocketServer();
      if (webSocketServer) {
        await webSocketServer.sendNotificationToTeam(teamId, payload);
        console.log(`📨 Real-time team notification sent to team ${teamId}`);
      }
    } catch (error) {
      console.error("Failed to send team notification:", error);
    }
  }

  /**
   * Send system-wide notification
   */
  static async sendSystemNotification(payload: NotificationPayload) {
    try {
      const webSocketServer = getWebSocketServer();
      if (webSocketServer) {
        await webSocketServer.broadcastSystemNotification(payload);
        console.log(`📢 System notification broadcasted`);
      }
    } catch (error) {
      console.error("Failed to send system notification:", error);
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
   * Mark notification as read with real-time WebSocket update
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

      // Send real-time update via WebSocket
      const webSocketServer = getWebSocketServer();
      if (webSocketServer) {
        // Send updated notification status
        await this.sendRealTimeNotification({
          id: notification.id,
          userId: notification.userId,
          type: this.mapNotificationType(notification.type),
          title: notification.title,
          message: notification.body,
          data: {
            link: notification.link,
            metadata: notification.metadata,
            teamId: notification.teamId,
          },
          timestamp: notification.createdAt,
          read: true, // Mark as read
        });
      }

      return notification;
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
      throw error;
    }
  }

  /**
   * Mark all notifications as read for a user with real-time WebSocket update
   */
  static async markAllAsRead(userId: string, teamId?: string) {
    try {
      const whereClause: any = {
        userId,
        isRead: false,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      };

      if (teamId) {
        whereClause.teamId = teamId;
      }

      // Get notifications before updating to send WebSocket updates
      const notifications = await prisma.notification.findMany({
        where: whereClause,
        select: {
          id: true,
          userId: true,
          type: true,
          title: true,
          body: true,
          link: true,
          metadata: true,
          teamId: true,
          createdAt: true,
        },
      });

      const result = await prisma.notification.updateMany({
        where: whereClause,
        data: {
          isRead: true,
          readAt: new Date(),
        },
      });

      // Send real-time updates via WebSocket for each notification
      const webSocketServer = getWebSocketServer();
      if (webSocketServer && notifications.length > 0) {
        for (const notification of notifications) {
          await this.sendRealTimeNotification({
            id: notification.id,
            userId: notification.userId,
            type: this.mapNotificationType(notification.type),
            title: notification.title,
            message: notification.body,
            data: {
              link: notification.link,
              metadata: notification.metadata,
              teamId: notification.teamId,
            },
            timestamp: notification.createdAt,
            read: true, // Mark as read
          });
        }
      }

      return result;
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
   * Map database notification type to WebSocket notification type
   */
  private static mapNotificationType(type: NotificationType): NotificationPayload['type'] {
    const typeMap: Record<NotificationType, NotificationPayload['type']> = {
      POST_SCHEDULED: 'post_scheduled',
      POST_PUBLISHED: 'post_published',
      POST_FAILED: 'post_failed',
      APPROVAL_NEEDED: 'approval_required',
      APPROVAL_REQUEST: 'approval_required',
      APPROVAL_REJECTED: 'approval_required',
      APPROVAL_APPROVED: 'approval_required',
      SYSTEM_MAINTENANCE: 'system_alert',
      TOKEN_EXPIRED: 'system_alert',
      ACCOUNT_DISCONNECTED: 'system_alert',
      TEAM_INVITATION: 'system_alert',
      WORKFLOW_ASSIGNED: 'system_alert',
      TEAM_MEMBER_JOINED: 'system_alert',
      TEAM_MEMBER_LEFT: 'system_alert',
      COMMENT_RECEIVED: 'system_alert',
      ANALYTICS_READY: 'system_alert',
    };

    return typeMap[type] || 'system_alert';
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
