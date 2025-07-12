import { prisma } from "@/lib/prisma/client";
import { NotificationType } from "@prisma/client";
import { getWebSocketServer } from "../websocket/websocket-server";
import type { NotificationPayload } from "../websocket/websocket-server";

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
   * Send notification with WebSocket-first approach
   */
  static async send(data: NotificationJobData) {
    try {
      // Generate unique ID for the notification
      const notificationId = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Try WebSocket delivery first (primary method)
      const webSocketPayload = {
        id: notificationId,
        userId: data.userId,
        type: this.mapNotificationType(data.type),
        title: data.title,
        message: data.body,
        data: {
          link: data.link,
          metadata: data.metadata,
          teamId: data.teamId,
        },
        timestamp: new Date(),
        read: false,
      };

      // Send via WebSocket (this will handle in-memory storage)
      const webSocketDelivered = await this.sendRealTimeNotification(webSocketPayload);

      // Only save to database if WebSocket delivery failed or user is offline
      if (!webSocketDelivered) {
        console.log(`📝 WebSocket delivery failed, saving to database for user ${data.userId}`);
        
        const notification = await prisma.notification.create({
          data: {
            id: notificationId,
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

        // Note: Queue fallback removed as part of WebSocket optimization
        // Database save above is the final fallback method

        return notification;
      }

      console.log(`✅ WebSocket notification delivered successfully to user ${data.userId}`);
      return webSocketPayload;
    } catch (error) {
      console.error("Failed to send notification:", error);
      throw error;
    }
  }

  /**
   * Send notification via WebSocket only (for real-time updates)
   * Returns true if successfully delivered, false otherwise
   */
  static async sendRealTimeNotification(payload: NotificationPayload): Promise<boolean> {
    try {
      const webSocketServer = getWebSocketServer();
      if (webSocketServer) {
        await webSocketServer.sendNotificationToUser(payload.userId, payload);
        console.log(`📨 Real-time notification sent to user ${payload.userId}`);
        return true;
      } else {
        console.warn("⚠️ WebSocket server not available");
        return false;
      }
    } catch (error) {
      console.error("Failed to send real-time notification:", error);
      return false;
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
   * Send bulk notifications via WebSocket
   */
  static async sendBulk(notifications: NotificationJobData[]) {
    try {
      // Process notifications directly via WebSocket (no queue)
      for (let i = 0; i < notifications.length; i++) {
        const data = notifications[i];
        
        // Stagger notifications to avoid overwhelming
        if (i > 0) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        await this.send(data);
      }
    } catch (error) {
      console.error("Failed to send bulk notifications:", error);
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
  public static mapNotificationType(type: NotificationType): NotificationPayload['type'] {
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

// Note: Workers and scheduled cleanup jobs have been removed
// The WebSocket system now handles notifications in-memory
// Database cleanup can be done manually if needed

// Note: Worker has been removed as part of WebSocket optimization
// All notifications are now handled in-memory via WebSocket
// Database fallback is handled directly in the send() method without queue

// Removed: notificationWorker
// The WebSocket system now handles all notifications in real-time
// No Redis queue processing needed

// Cleanup worker and scheduled jobs have been removed
// WebSocket system handles in-memory cleanup automatically
// Database cleanup can be done manually via API endpoint if needed
