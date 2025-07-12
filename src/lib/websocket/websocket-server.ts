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

export class WebSocketServer {
  private io: any;
  private connectedUsers: Map<string, WebSocketUser[]> = new Map();
  private notificationService: NotificationService;

  constructor(server: any) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
        methods: ["GET", "POST"]
      },
      transports: ['websocket', 'polling']
    });

    this.notificationService = new NotificationService();
    this.setupEventHandlers();
    this.startHeartbeat();
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
      // Get unread notifications from Redis or database
      const redis = redisManager.getConnection();
      if (!redis) return;

      const notificationKey = `notifications:${userId}`;
      const notifications = await redis.lrange(notificationKey, 0, -1);

      for (const notificationStr of notifications) {
        try {
          const notification = JSON.parse(notificationStr);
          if (!notification.read) {
            socket.emit('notification', notification);
          }
        } catch (parseError) {
          console.error('Failed to parse notification:', parseError);
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
      const redis = redisManager.getConnection();
      if (!redis) return;

      // Update notification in Redis
      const notificationKey = `notifications:${userId}`;
      const notifications = await redis.lrange(notificationKey, 0, -1);
      
      for (let i = 0; i < notifications.length; i++) {
        const notification = JSON.parse(notifications[i]);
        if (notification.id === notificationId) {
          notification.read = true;
          await redis.lset(notificationKey, i, JSON.stringify(notification));
          break;
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

  // Public methods for sending notifications
  public async sendNotificationToUser(userId: string, notification: NotificationPayload): Promise<void> {
    try {
      // Store notification in Redis for persistence
      const redis = redisManager.getConnection();
      if (redis) {
        const notificationKey = `notifications:${userId}`;
        await redis.lpush(notificationKey, JSON.stringify(notification));
        await redis.ltrim(notificationKey, 0, 99); // Keep only last 100 notifications
      }

      // Send to connected sockets
      this.io.to(`user:${userId}`).emit('notification', notification);
      
      console.log(`📨 Notification sent to user ${userId}: ${notification.title}`);
    } catch (error) {
      console.error('Failed to send notification to user:', error);
    }
  }

  public async sendNotificationToTeam(teamId: string, notification: NotificationPayload): Promise<void> {
    try {
      this.io.to(`team:${teamId}`).emit('notification', notification);
      console.log(`📨 Notification sent to team ${teamId}: ${notification.title}`);
    } catch (error) {
      console.error('Failed to send notification to team:', error);
    }
  }

  public async broadcastSystemNotification(notification: NotificationPayload): Promise<void> {
    try {
      this.io.emit('system_notification', notification);
      console.log(`📢 System notification broadcasted: ${notification.title}`);
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