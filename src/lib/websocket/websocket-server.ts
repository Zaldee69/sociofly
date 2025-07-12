// Only import these modules on server-side
let SocketIOServer: any;
let HTTPServer: any;

// Dynamic import for server-side only
if (typeof window === 'undefined') {
  Promise.all([
    import('socket.io'),
    import('http')
  ]).then(([socketIO, http]) => {
    SocketIOServer = socketIO.Server;
    HTTPServer = http.Server;
  }).catch((error) => {
    console.warn('Socket.IO not available:', error);
  });
}

import { RedisManager } from '../services/redis-manager';
import { NotificationService } from '../services/notification.service';
import { 
  getWebSocketConfig, 
  WebSocketConfig, 
  WebSocketMemoryMonitor, 
  WebSocketPerformanceTracker 
} from '../config/websocket-config';

// Get Redis manager instance
const redisManager = RedisManager.getInstance();

export interface NotificationPayload {
  id: string;
  userId: string;
  type: 'post_scheduled' | 'post_published' | 'post_failed' | 'approval_required' | 'system_alert';
  title: string;
  message: string;
  data?: any;
  timestamp: Date;
  read: boolean;
}

export interface WebSocketUser {
  userId: string;
  socketId: string;
  teamId?: string;
  lastSeen: Date;
}

// In-memory notification storage for real-time delivery
interface InMemoryNotification extends NotificationPayload {
  expiresAt?: Date;
}

export class WebSocketServer {
  private io: any;
  private connectedUsers: Map<string, WebSocketUser[]> = new Map();
  private inMemoryNotifications: Map<string, InMemoryNotification[]> = new Map(); // userId -> notifications
  private notificationService: NotificationService;
  private cleanupInterval: NodeJS.Timeout | null = null;
  private config: WebSocketConfig;
  private memoryMonitor: WebSocketMemoryMonitor;
  private performanceTracker: WebSocketPerformanceTracker;

  constructor(server: any) {
    this.config = getWebSocketConfig();
    this.memoryMonitor = WebSocketMemoryMonitor.getInstance();
    this.performanceTracker = WebSocketPerformanceTracker.getInstance();
    
    this.io = new SocketIOServer(server, {
      cors: {
        origin: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
        methods: ["GET", "POST"]
      },
      transports: ['websocket', 'polling'],
      maxHttpBufferSize: 1e6, // 1MB limit
      pingTimeout: this.config.connectionTimeoutSeconds * 1000,
      pingInterval: this.config.heartbeatIntervalSeconds * 1000
    });

    this.notificationService = new NotificationService();
    this.setupEventHandlers();
    this.startHeartbeat();
    this.startInMemoryCleanup();
    this.startPerformanceMonitoring();
  }

  private setupEventHandlers(): void {
    this.io.on('connection', (socket: any) => {
      console.log(`🔌 WebSocket client connected: ${socket.id}`);

      // Handle user authentication
      socket.on('authenticate', async (data: { userId: string; teamId?: string }) => {
        try {
          await this.authenticateUser(socket, data);
        } catch (error) {
          console.error('Authentication failed:', error);
          socket.emit('auth_error', { message: 'Authentication failed' });
        }
      });

      // Handle notification acknowledgment
      socket.on('notification_read', async (notificationId: string) => {
        try {
          await this.markNotificationAsRead(socket, notificationId);
        } catch (error) {
          console.error('Failed to mark notification as read:', error);
        }
      });

      // Handle join team room
      socket.on('join_team', (teamId: string) => {
        socket.join(`team:${teamId}`);
        console.log(`👥 User joined team room: ${teamId}`);
      });

      // Handle leave team room
      socket.on('leave_team', (teamId: string) => {
        socket.leave(`team:${teamId}`);
        console.log(`👋 User left team room: ${teamId}`);
      });

      // Handle disconnect
      socket.on('disconnect', () => {
        this.handleDisconnect(socket);
      });

      // Handle ping for connection health
      socket.on('ping', () => {
        socket.emit('pong');
      });
    });
  }

  private async authenticateUser(
    socket: any,
    data: { userId: string; teamId?: string }
  ): Promise<void> {
    const { userId, teamId } = data;

    // Store user connection
    const userConnection: WebSocketUser = {
      userId,
      socketId: socket.id,
      teamId,
      lastSeen: new Date()
    };

    // Add to connected users
    const userConnections = this.connectedUsers.get(userId) || [];
    userConnections.push(userConnection);
    this.connectedUsers.set(userId, userConnections);

    // Join user-specific room
    socket.join(`user:${userId}`);
    
    // Join team room if provided
    if (teamId) {
      socket.join(`team:${teamId}`);
    }

    // Store user data in socket
    socket.userId = userId;
    socket.teamId = teamId;

    // Send authentication success
    socket.emit('authenticated', {
      userId,
      teamId,
      timestamp: new Date()
    });

    // Send pending notifications
    await this.sendPendingNotifications(userId, socket);

    console.log(`✅ User authenticated: ${userId} (Team: ${teamId || 'none'})`);
  }

  private async sendPendingNotifications(userId: string, socket: any): Promise<void> {
    try {
      // First, send in-memory notifications (real-time)
      const inMemoryNotifications = this.inMemoryNotifications.get(userId) || [];
      const unreadInMemory = inMemoryNotifications.filter(n => !n.read);
      
      for (const notification of unreadInMemory) {
        socket.emit('notification', notification);
      }

      console.log(`📨 Sent ${unreadInMemory.length} in-memory notifications to user ${userId}`);

      // Fallback: Get persistent notifications from database only if no WebSocket notifications
      if (unreadInMemory.length === 0) {
        try {
          const dbNotifications = await NotificationService.getNotifications({
            userId,
            limit: 20,
            unreadOnly: true
          });

          for (const dbNotification of dbNotifications.notifications) {
            const payload: NotificationPayload = {
              id: dbNotification.id,
              userId: dbNotification.userId,
              type: this.mapDbTypeToWebSocketType(dbNotification.type),
              title: dbNotification.title,
              message: dbNotification.body,
              data: {
                link: dbNotification.link,
                metadata: dbNotification.metadata,
                teamId: dbNotification.teamId
              },
              timestamp: dbNotification.createdAt,
              read: dbNotification.isRead
            };
            socket.emit('notification', payload);
          }

          console.log(`📨 Sent ${dbNotifications.notifications.length} database notifications to user ${userId}`);
        } catch (dbError) {
          console.error('Failed to get database notifications:', dbError);
        }
      }
    } catch (error) {
      console.error('Failed to send pending notifications:', error);
    }
  }

  private async markNotificationAsRead(socket: any, notificationId: string): Promise<void> {
    const userId = socket.userId;
    if (!userId) return;

    try {
      // First, try to mark in-memory notification as read
      const userNotifications = this.inMemoryNotifications.get(userId) || [];
      let foundInMemory = false;

      for (const notification of userNotifications) {
        if (notification.id === notificationId) {
          notification.read = true;
          foundInMemory = true;
          break;
        }
      }

      // If found in memory, update the map
      if (foundInMemory) {
        this.inMemoryNotifications.set(userId, userNotifications);
        console.log(`✅ Marked in-memory notification ${notificationId} as read for user ${userId}`);
      } else {
        // Fallback: mark in database
        try {
          await NotificationService.markAsRead(notificationId, userId);
          console.log(`✅ Marked database notification ${notificationId} as read for user ${userId}`);
        } catch (dbError) {
          console.error('Failed to mark database notification as read:', dbError);
        }
      }

      // Acknowledge to client
      socket.emit('notification_read_ack', { notificationId });
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  }

  private handleDisconnect(socket: any): void {
    const userId = socket.userId;
    if (!userId) return;

    // Remove from connected users
    const userConnections = this.connectedUsers.get(userId) || [];
    const updatedConnections = userConnections.filter(conn => conn.socketId !== socket.id);
    
    if (updatedConnections.length === 0) {
      this.connectedUsers.delete(userId);
    } else {
      this.connectedUsers.set(userId, updatedConnections);
    }

    console.log(`🔌 WebSocket client disconnected: ${socket.id} (User: ${userId})`);
  }

  private startHeartbeat(): void {
    setInterval(() => {
      this.io.emit('heartbeat', { timestamp: new Date() });
    }, 30000); // Send heartbeat every 30 seconds
  }

  private startInMemoryCleanup(): void {
    const intervalMs = this.config.cleanupIntervalMinutes * 60 * 1000;
    
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredNotifications();
      
      // Update memory monitoring
      const totalNotifications = Array.from(this.inMemoryNotifications.values())
        .reduce((sum, notifications) => sum + notifications.length, 0);
      
      this.memoryMonitor.updateMemoryUsage(
        totalNotifications, 
        this.io.sockets.sockets.size
      );
      
      // Check if memory cleanup is needed
      if (this.memoryMonitor.shouldTriggerCleanup()) {
        this.performAggressiveCleanup();
      }
    }, intervalMs);
  }

  private cleanupExpiredNotifications(): void {
    const now = Date.now();
    const expiryTime = this.config.notificationExpiryHours * 60 * 60 * 1000;
    let totalCleaned = 0;

    for (const [userId, notifications] of this.inMemoryNotifications.entries()) {
      const validNotifications = notifications.filter(
        notification => now - new Date(notification.timestamp).getTime() < expiryTime
      );

      const cleaned = notifications.length - validNotifications.length;
      totalCleaned += cleaned;

      if (validNotifications.length === 0) {
        this.inMemoryNotifications.delete(userId);
      } else {
        this.inMemoryNotifications.set(userId, validNotifications);
      }
    }

    if (totalCleaned > 0) {
      console.log(`[WebSocket] Cleaned up ${totalCleaned} expired notifications. Memory: ${this.memoryMonitor.getMemoryUsageMB().toFixed(2)}MB`);
    }
  }

  /**
   * Perform aggressive cleanup when memory usage is high
   */
  private performAggressiveCleanup(): void {
    console.log('[WebSocket] Performing aggressive cleanup due to high memory usage');
    
    // Reduce notification limit per user temporarily
    const reducedLimit = Math.floor(this.config.maxNotificationsPerUser * 0.5);
    
    for (const [userId, notifications] of this.inMemoryNotifications.entries()) {
      if (notifications.length > reducedLimit) {
        // Keep only the most recent notifications
        const trimmed = notifications
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
          .slice(0, reducedLimit);
        
        this.inMemoryNotifications.set(userId, trimmed);
      }
    }
    
    // Update memory stats
    const totalNotifications = Array.from(this.inMemoryNotifications.values())
      .reduce((sum, notifications) => sum + notifications.length, 0);
    
    this.memoryMonitor.updateMemoryUsage(
      totalNotifications, 
      this.io.sockets.sockets.size
    );
    
    console.log(`[WebSocket] Aggressive cleanup completed. New memory usage: ${this.memoryMonitor.getMemoryUsageMB().toFixed(2)}MB`);
  }

  /**
   * Start performance monitoring
   */
  private startPerformanceMonitoring(): void {
    // Update connection count every 30 seconds
    setInterval(() => {
      this.performanceTracker.updateConnectionCount(this.io.sockets.sockets.size);
      this.performanceTracker.updateMemoryUsage(this.memoryMonitor.getMemoryUsageMB());
    }, 30000);
    
    // Log performance stats every 5 minutes
    setInterval(() => {
      const metrics = this.performanceTracker.getMetrics();
      const efficiency = this.performanceTracker.getEfficiencyStats();
      
      console.log('[WebSocket Performance]', {
        totalNotifications: metrics.totalNotificationsSent,
        webSocketSuccessRate: `${efficiency.webSocketSuccessRate.toFixed(1)}%`,
        redisReduction: `${efficiency.redisReductionPercentage.toFixed(1)}%`,
        avgDeliveryTime: `${metrics.averageDeliveryTimeMs.toFixed(2)}ms`,
        memoryUsage: `${metrics.memoryUsageMB.toFixed(2)}MB`,
        activeConnections: metrics.activeConnections
      });
    }, 5 * 60 * 1000);
  }

  // Public methods for sending notifications
  public async sendNotificationToUser(
    userId: string, 
    notification: NotificationPayload,
    options: { persistIfOffline?: boolean } = {}
  ): Promise<boolean> {
    const startTime = Date.now();
    
    try {
      // Store notification in memory for real-time delivery
      const userNotifications = this.inMemoryNotifications.get(userId) || [];
      
      // Add expiration time using config
      const inMemoryNotification: InMemoryNotification = {
        ...notification,
        expiresAt: new Date(Date.now() + this.config.notificationExpiryHours * 60 * 60 * 1000)
      };
      
      userNotifications.unshift(inMemoryNotification); // Add to beginning
      
      // Keep only configured max notifications in memory per user
      if (userNotifications.length > this.config.maxNotificationsPerUser) {
        userNotifications.splice(this.config.maxNotificationsPerUser);
      }
      
      this.inMemoryNotifications.set(userId, userNotifications);

      // Send to connected sockets immediately
      const isUserOnline = this.isUserOnline(userId);
      if (isUserOnline) {
        this.io.to(`user:${userId}`).emit('notification', notification);
        console.log(`📨 Real-time notification sent to user ${userId}: ${notification.title}`);
        
        // Track performance
        const deliveryTime = Date.now() - startTime;
        this.performanceTracker.recordNotificationSent('websocket', deliveryTime);
        
        return true;
      } else {
        console.log(`📨 Notification stored in memory for offline user ${userId}: ${notification.title}`);

        // Optional: Store in database for long-term persistence only if user is offline
        // This reduces database writes significantly
        if (options.persistIfOffline && this.config.enableDatabaseFallback) {
          try {
            await this.persistNotificationToDatabase(notification);
            
            // Track performance
            const deliveryTime = Date.now() - startTime;
            this.performanceTracker.recordNotificationSent('database', deliveryTime);
          } catch (dbError) {
            console.error('Failed to persist notification to database:', dbError);
          }
        }
        
        return false;
      }
      
    } catch (error) {
      console.error('Failed to send notification to user:', error);
      return false;
    }
  }

  public async sendNotificationToTeam(teamId: string, notification: NotificationPayload): Promise<void> {
    try {
      // Get online users in team and store notifications in memory for each
      const onlineUsers = this.getOnlineUsersInTeam(teamId);
      
      for (const userId of onlineUsers) {
        await this.sendNotificationToUser(userId, {
          ...notification,
          userId // Override userId for each team member
        });
      }
      
      // Also emit to team room for immediate delivery
      this.io.to(`team:${teamId}`).emit('notification', notification);
      console.log(`📨 Team notification sent to ${onlineUsers.length} users in team ${teamId}: ${notification.title}`);
    } catch (error) {
      console.error('Failed to send notification to team:', error);
    }
  }

  public async broadcastSystemNotification(notification: NotificationPayload): Promise<void> {
    try {
      // Store system notifications for all connected users
      this.connectedUsers.forEach(async (connections, userId) => {
        await this.sendNotificationToUser(userId, {
          ...notification,
          userId // Override userId for each user
        });
      });
      
      // Also broadcast immediately to all connected sockets
      this.io.emit('system_notification', notification);
      console.log(`📢 System notification broadcasted to ${this.connectedUsers.size} users: ${notification.title}`);
    } catch (error) {
      console.error('Failed to broadcast system notification:', error);
    }
  }

  // Get connection statistics
  public getConnectionStats(): {
    totalConnections: number;
    uniqueUsers: number;
    userConnections: { [userId: string]: number };
  } {
    const totalConnections = this.io.engine.clientsCount;
    const uniqueUsers = this.connectedUsers.size;
    const userConnections: { [userId: string]: number } = {};

    this.connectedUsers.forEach((connections, userId) => {
      userConnections[userId] = connections.length;
    });

    return {
      totalConnections,
      uniqueUsers,
      userConnections
    };
  }

  // Check if user is online
  public isUserOnline(userId: string): boolean {
    return this.connectedUsers.has(userId);
  }

  // Get online users in team
  public getOnlineUsersInTeam(teamId: string): string[] {
    const onlineUsers: string[] = [];
    
    this.connectedUsers.forEach((connections, userId) => {
      const hasTeamConnection = connections.some(conn => conn.teamId === teamId);
      if (hasTeamConnection) {
        onlineUsers.push(userId);
      }
    });

    return onlineUsers;
  }

  // Helper method to persist notification to database
  private async persistNotificationToDatabase(notification: NotificationPayload): Promise<void> {
    try {
      // Only persist to database, don't send via WebSocket
      await NotificationService.send({
        userId: notification.userId,
        title: notification.title,
        body: notification.message,
        type: this.mapWebSocketTypeToDbType(notification.type),
        link: notification.data?.link,
        metadata: notification.data?.metadata,
        teamId: notification.data?.teamId
      });
    } catch (error) {
      console.error('Failed to persist notification to database:', error);
      throw error;
    }
  }

  // Helper method to map WebSocket notification type to database type
  private mapWebSocketTypeToDbType(type: NotificationPayload['type']): any {
    const typeMap: Record<NotificationPayload['type'], string> = {
      'post_scheduled': 'POST_SCHEDULED',
      'post_published': 'POST_PUBLISHED',
      'post_failed': 'POST_FAILED',
      'approval_required': 'APPROVAL_NEEDED',
      'system_alert': 'SYSTEM_MAINTENANCE'
    };
    return typeMap[type] || 'SYSTEM_MAINTENANCE';
  }

  // Helper method to map database notification type to WebSocket type
  private mapDbTypeToWebSocketType(type: any): NotificationPayload['type'] {
    const typeMap: Record<string, NotificationPayload['type']> = {
      'POST_SCHEDULED': 'post_scheduled',
      'POST_PUBLISHED': 'post_published',
      'POST_FAILED': 'post_failed',
      'APPROVAL_NEEDED': 'approval_required',
      'APPROVAL_REQUEST': 'approval_required',
      'APPROVAL_REJECTED': 'approval_required',
      'APPROVAL_APPROVED': 'approval_required',
      'SYSTEM_MAINTENANCE': 'system_alert',
      'TOKEN_EXPIRED': 'system_alert',
      'ACCOUNT_DISCONNECTED': 'system_alert',
      'TEAM_INVITATION': 'system_alert',
      'WORKFLOW_ASSIGNED': 'system_alert',
      'TEAM_MEMBER_JOINED': 'system_alert',
      'TEAM_MEMBER_LEFT': 'system_alert',
      'COMMENT_RECEIVED': 'system_alert',
      'ANALYTICS_READY': 'system_alert'
    };
    return typeMap[type] || 'system_alert';
  }

  // Get in-memory notification statistics
  public getInMemoryStats(): {
    totalUsers: number;
    totalNotifications: number;
    averageNotificationsPerUser: number;
    memoryUsageEstimate: string;
    activeConnections: number;
    performanceMetrics: any;
    memoryStats: any;
    configSettings: {
      maxNotificationsPerUser: number;
      notificationExpiryHours: number;
      cleanupIntervalMinutes: number;
      enableDatabaseFallback: boolean;
      enableRedisFallback: boolean;
    };
  } {
    const totalUsers = this.inMemoryNotifications.size;
    const totalNotifications = Array.from(this.inMemoryNotifications.values())
      .reduce((sum, notifications) => sum + notifications.length, 0);
    
    const averageNotificationsPerUser = totalUsers > 0 ? totalNotifications / totalUsers : 0;
    const activeConnections = this.io.sockets.sockets.size;
    
    // Update memory monitoring
    this.memoryMonitor.updateMemoryUsage(totalNotifications, activeConnections);
    
    const memoryUsageMB = this.memoryMonitor.getMemoryUsageMB();
    const memoryUsageEstimate = memoryUsageMB > 1 
      ? `${memoryUsageMB.toFixed(2)} MB`
      : `${(memoryUsageMB * 1024).toFixed(0)} KB`;
    
    return {
      totalUsers,
      totalNotifications,
      averageNotificationsPerUser: Math.round(averageNotificationsPerUser * 100) / 100,
      memoryUsageEstimate,
      activeConnections,
      performanceMetrics: this.performanceTracker.getMetrics(),
      memoryStats: this.memoryMonitor.getMemoryStats(),
      configSettings: {
        maxNotificationsPerUser: this.config.maxNotificationsPerUser,
        notificationExpiryHours: this.config.notificationExpiryHours,
        cleanupIntervalMinutes: this.config.cleanupIntervalMinutes,
        enableDatabaseFallback: this.config.enableDatabaseFallback,
        enableRedisFallback: this.config.enableRedisFallback,
      },
    };
  }

  // Clear in-memory notifications for a user (useful for testing or cleanup)
  public clearUserNotifications(userId: string): void {
    this.inMemoryNotifications.delete(userId);
    console.log(`🧹 Cleared in-memory notifications for user ${userId}`);
  }

  // Graceful shutdown
  public async shutdown(persistUnreadNotifications?: boolean): Promise<void> {
    const shouldPersist = persistUnreadNotifications ?? this.config.enableGracefulShutdown;
    
    console.log('[WebSocket] Starting graceful shutdown...');
    
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    // Log final performance stats
    const finalMetrics = this.performanceTracker.getMetrics();
    const efficiency = this.performanceTracker.getEfficiencyStats();
    
    console.log('[WebSocket] Final Performance Stats:', {
      totalNotifications: finalMetrics.totalNotificationsSent,
      webSocketSuccessRate: `${efficiency.webSocketSuccessRate.toFixed(1)}%`,
      redisReduction: `${efficiency.redisReductionPercentage.toFixed(1)}%`,
      memoryUsage: `${finalMetrics.memoryUsageMB.toFixed(2)}MB`,
      activeConnections: finalMetrics.activeConnections
    });

    // Optionally persist all in-memory notifications to database before shutdown
    if (shouldPersist && this.config.enableDatabaseFallback) {
      const stats = this.getInMemoryStats();
      if (stats.totalNotifications > 0) {
        console.log(`[WebSocket] Persisting ${stats.totalNotifications} in-memory notifications before shutdown...`);
        
        let persistedCount = 0;
        for (const [userId, notifications] of this.inMemoryNotifications.entries()) {
          for (const notification of notifications) {
            if (!notification.read) {
              try {
                await this.persistNotificationToDatabase(notification);
                persistedCount++;
              } catch (error) {
                console.error(`Failed to persist notification for user ${userId}:`, error);
              }
            }
          }
        }
        
        console.log(`[WebSocket] Persisted ${persistedCount} unread notifications`);
      }
    }

    this.inMemoryNotifications.clear();
    this.connectedUsers.clear();
    
    if (this.io) {
      this.io.close();
    }
    
    console.log('[WebSocket] Graceful shutdown completed');
  }
}

// Singleton instance
let webSocketServer: WebSocketServer | null = null;

/**
 * Get WebSocket server instance
 */
export const getWebSocketServer = (): WebSocketServer | null => {
  return webSocketServer;
};

/**
 * Initialize WebSocket server with existing HTTP server
 */
export const initializeWebSocketServer = (server: any): WebSocketServer | null => {
  if (typeof window !== 'undefined') {
    return null;
  }
  
  if (!webSocketServer && SocketIOServer) {
    try {
      webSocketServer = new WebSocketServer(server);
      console.log('🚀 WebSocket server initialized');
    } catch (error) {
      console.error('Failed to initialize WebSocket server:', error);
      return null;
    }
  }
  return webSocketServer;
};