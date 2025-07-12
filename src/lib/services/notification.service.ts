import { prisma } from "@/lib/prisma/client";
import { NotificationType } from "@prisma/client";
import { getWebSocketServer } from "../websocket/websocket-server";
import type { NotificationPayload } from "../websocket/websocket-server";
import { WebSocketClientService } from "./websocket-client.service";

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

      // Get user's Clerk ID for WebSocket delivery (WebSocket uses Clerk ID, not database ID)
      const user = await prisma.user.findUnique({
        where: { id: data.userId },
        select: { clerkId: true },
      });

      if (!user?.clerkId) {
        console.warn(`⚠️ No Clerk ID found for user ${data.userId}, skipping WebSocket delivery`);
        // Fallback to database storage only
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
        
        console.log(`📝 Notification saved to database for user ${data.userId} (no Clerk ID for WebSocket delivery)`);
        return notification;
      }

      // Try WebSocket delivery first (primary method) using Clerk ID
      const webSocketPayload = {
        id: notificationId,
        userId: user.clerkId, // Use Clerk ID for WebSocket
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

      // Always save to database first to ensure persistence
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

      // Send via WebSocket for real-time delivery (this will handle in-memory storage)
      const webSocketDelivered = await this.sendRealTimeNotification(webSocketPayload);

      if (webSocketDelivered) {
        console.log(`✅ WebSocket notification delivered successfully to user ${data.userId}`);
      } else {
        console.log(`📝 WebSocket delivery failed for user ${data.userId}, but notification saved to database`);
      }

      return notification;
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
      // Try standalone WebSocket server first (preferred for development)
      const success = await WebSocketClientService.sendNotificationToUser(payload.userId, payload);
      if (success) {
        console.log(`📨 Real-time notification sent to user ${payload.userId} via standalone WebSocket`);
        return true;
      }
      
      // Only fallback to internal WebSocket server if standalone is not available
      console.log(`⚠️ Standalone WebSocket server not available, trying internal server`);
      const webSocketServer = getWebSocketServer();
      if (webSocketServer) {
        await webSocketServer.sendNotificationToUser(payload.userId, payload);
        console.log(`📨 Real-time notification sent to user ${payload.userId} via internal WebSocket`);
        return true;
      } else {
        console.warn("⚠️ No WebSocket server available");
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
      // Try standalone WebSocket server first (preferred for development)
      const success = await WebSocketClientService.sendNotificationToTeam(teamId, payload);
      if (success) {
        console.log(`📨 Real-time team notification sent to team ${teamId} via standalone WebSocket`);
        return;
      }
      
      // Only fallback to internal WebSocket server if standalone is not available
      console.log(`⚠️ Standalone WebSocket server not available for team ${teamId}, trying internal server`);
      const webSocketServer = getWebSocketServer();
      if (webSocketServer) {
        await webSocketServer.sendNotificationToTeam(teamId, payload);
        console.log(`📨 Real-time team notification sent to team ${teamId} via internal WebSocket`);
      } else {
        console.warn(`⚠️ No WebSocket server available for team ${teamId}`);
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
      // Try standalone WebSocket server first (preferred for development)
      const success = await WebSocketClientService.sendSystemNotification(payload);
      if (success) {
        console.log(`📢 System notification broadcasted via standalone WebSocket`);
        return;
      }
      
      // Only fallback to internal WebSocket server if standalone is not available
      console.log(`⚠️ Standalone WebSocket server not available for system notification, trying internal server`);
      const webSocketServer = getWebSocketServer();
      if (webSocketServer) {
        await webSocketServer.broadcastSystemNotification(payload);
        console.log(`📢 System notification broadcasted via internal WebSocket`);
      } else {
        console.warn(`⚠️ No WebSocket server available for system notification`);
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
        include: {
          user: {
            select: { clerkId: true },
          },
        },
      });

      // Send real-time update via WebSocket using Clerk ID
      const webSocketServer = getWebSocketServer();
      if (webSocketServer && notification.user?.clerkId) {
        // Send updated notification status
        await this.sendRealTimeNotification({
          id: notification.id,
          userId: notification.user.clerkId, // Use Clerk ID for WebSocket
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
          user: {
            select: { clerkId: true },
          },
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
          if (notification.user?.clerkId) {
            await this.sendRealTimeNotification({
              id: notification.id,
              userId: notification.user.clerkId, // Use Clerk ID for WebSocket
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
   * Save notification to database only (no WebSocket delivery)
   * Used by WebSocket server to persist notifications without causing loops
   */
  static async saveToDatabase(data: NotificationJobData & { id?: string }) {
    try {
      const notificationId = data.id || `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
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
      
      console.log(`📝 Notification saved to database only: ${notificationId}`);
      return notification;
    } catch (error) {
      console.error("Failed to save notification to database:", error);
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
