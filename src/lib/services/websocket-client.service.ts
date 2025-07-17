/**
 * WebSocket Client Service
 * Communicates with the standalone WebSocket server via HTTP API
 */

export interface NotificationPayload {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  data?: any;
  timestamp: Date;
  read: boolean;
}

export class WebSocketClientService {
  private static getBaseUrl(): string {
    // In Docker environment, use the container name 'app' for internal communication
    // In development, use localhost
    if (process.env.NODE_ENV === 'production' && process.env.DOCKER_ENV) {
      return `http://app:${process.env.WEBSOCKET_PORT || '3004'}`;
    }
    
    // Use NEXT_PUBLIC_WEBSOCKET_URL if available, otherwise fallback to localhost
    const wsUrl = process.env.NEXT_PUBLIC_WEBSOCKET_URL;
    if (wsUrl) {
      // Ensure we use HTTP for WebSocket API calls, not HTTPS
      return wsUrl.replace('https://', 'http://');
    }
    
    return `http://localhost:${process.env.WEBSOCKET_PORT || '3004'}`;
  }
  
  private static get baseUrl(): string {
    return this.getBaseUrl();
  }

  /**
   * Get WebSocket connection URL for client-side Socket.IO
   */
  static getWebSocketUrl(): string {
    if (typeof window === 'undefined') {
      return this.baseUrl;
    }
    
    // Client-side: use current host with WebSocket port
    const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
    const hostname = window.location.hostname;
    const port = process.env.NEXT_PUBLIC_WEBSOCKET_PORT || '3004';
    
    return `${protocol}//${hostname}:${port}`;
  }

  /**
   * Send notification to a specific user
   */
  static async sendNotificationToUser(
    userId: string,
    notification: NotificationPayload
  ): Promise<boolean> {
    try {
      console.log(`🔍 Sending notification to user ${userId} via WebSocket API`);
      
      const response = await fetch(`${this.baseUrl}/api/notify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'user',
          userId,
          notification,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log(`✅ WebSocket notification sent successfully:`, result.message);
        return true;
      } else {
        const error = await response.json();
        console.error(`❌ WebSocket notification failed:`, error);
        return false;
      }
    } catch (error) {
      console.error(`❌ WebSocket API error:`, error);
      return false;
    }
  }

  /**
   * Send notification to a team
   */
  static async sendNotificationToTeam(
    teamId: string,
    notification: NotificationPayload
  ): Promise<boolean> {
    try {
      console.log(`🔍 Sending notification to team ${teamId} via WebSocket API`);
      
      const response = await fetch(`${this.baseUrl}/api/notify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'team',
          teamId,
          notification,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log(`✅ WebSocket team notification sent successfully:`, result.message);
        return true;
      } else {
        const error = await response.json();
        console.error(`❌ WebSocket team notification failed:`, error);
        return false;
      }
    } catch (error) {
      console.error(`❌ WebSocket API error:`, error);
      return false;
    }
  }

  /**
   * Send system-wide notification
   */
  static async sendSystemNotification(
    notification: NotificationPayload
  ): Promise<boolean> {
    try {
      console.log(`🔍 Broadcasting system notification via WebSocket API`);
      
      const response = await fetch(`${this.baseUrl}/api/notify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'system',
          notification,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log(`✅ WebSocket system notification sent successfully:`, result.message);
        return true;
      } else {
        const error = await response.json();
        console.error(`❌ WebSocket system notification failed:`, error);
        return false;
      }
    } catch (error) {
      console.error(`❌ WebSocket API error:`, error);
      return false;
    }
  }

  /**
   * Check WebSocket server status
   */
  static async getServerStatus(): Promise<{ status: string; connectedUsers: number; totalConnections: number } | null> {
    try {
      const response = await fetch(`${this.baseUrl}/api/status`);
      
      if (response.ok) {
        return await response.json();
      } else {
        console.error(`❌ WebSocket status check failed:`, response.statusText);
        return null;
      }
    } catch (error) {
      console.error(`❌ WebSocket status API error:`, error);
      return null;
    }
  }

  /**
   * Check if WebSocket server is available
   */
  static async isServerAvailable(): Promise<boolean> {
    const status = await this.getServerStatus();
    return status !== null && status.status === 'active';
  }
}