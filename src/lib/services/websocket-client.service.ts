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
  private static baseUrl = `http://localhost:${process.env.WEBSOCKET_PORT || '9003'}`;

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