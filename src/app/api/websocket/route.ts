import { NextRequest } from 'next/server';
import { getWebSocketServer } from '@/lib/websocket/websocket-server';
import { sendNotificationToUser } from '@/lib/sse/sse-utils';
import { WebSocketClientService } from '@/lib/services/websocket-client.service';

/**
 * WebSocket API route for handling WebSocket connections
 * This endpoint provides WebSocket server information and status
 */
export async function GET(request: NextRequest) {
  try {
    // Try standalone WebSocket server first
    const standaloneStatus = await WebSocketClientService.getServerStatus();
    if (standaloneStatus) {
      return Response.json({
        status: standaloneStatus.status,
        totalConnections: standaloneStatus.totalConnections,
        connectedUsers: standaloneStatus.connectedUsers,
        message: 'Standalone WebSocket server is running',
        serverType: 'standalone'
      });
    }
    
    // Fallback to internal WebSocket server
    const webSocketServer = getWebSocketServer();
    if (webSocketServer) {
      const stats = webSocketServer.getConnectionStats();
      return Response.json({
        status: 'active',
        totalConnections: stats.totalConnections,
        uniqueUsers: stats.uniqueUsers,
        userConnections: stats.userConnections,
        message: 'Internal WebSocket server is running',
        serverType: 'internal'
      });
    }
    
    return Response.json(
      { error: 'No WebSocket server available' },
      { status: 503 }
    );
  } catch (error) {
    console.error('WebSocket API error:', error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST endpoint for sending notifications via WebSocket
 * This can be used by other parts of the application to send notifications
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, teamId, type, title, message, data } = body;

    if (!userId || !type || !title || !message) {
      return Response.json(
        { error: 'Missing required fields: userId, type, title, message' },
        { status: 400 }
      );
    }

    // Create notification payload
    const notification = {
      id: `ws_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      type,
      title,
      message,
      data: data || {},
      timestamp: new Date(),
      read: false
    };
    
    let wsSuccess = false;
    let deliveryMethod = 'websocket';
    
    // Try standalone WebSocket server first
    if (teamId) {
      wsSuccess = await WebSocketClientService.sendNotificationToTeam(teamId, notification);
      deliveryMethod = wsSuccess ? 'standalone-websocket-team' : 'failed';
    } else {
      wsSuccess = await WebSocketClientService.sendNotificationToUser(userId, notification);
      deliveryMethod = wsSuccess ? 'standalone-websocket-user' : 'failed';
    }
    
    // Fallback to internal WebSocket server if standalone failed
    if (!wsSuccess) {
      const webSocketServer = getWebSocketServer();
      if (webSocketServer) {
        if (teamId) {
          await webSocketServer.sendNotificationToTeam(teamId, notification);
          wsSuccess = true;
          deliveryMethod = 'internal-websocket-team';
        } else {
          const isUserOnline = await webSocketServer.sendNotificationToUser(userId, notification, {
            persistIfOffline: true
          });
          wsSuccess = true;
          deliveryMethod = isUserOnline ? 'internal-websocket-realtime' : 'internal-websocket-stored';
        }
      }
    }

    if (wsSuccess) {
      console.log(`✅ WebSocket notification delivered successfully to user ${userId} via ${deliveryMethod}`);
      return Response.json({ 
        success: true, 
        message: `Notification sent successfully via ${deliveryMethod}`,
        method: deliveryMethod,
        notificationId: notification.id
      });
    }
    
    // Fallback to SSE if WebSocket failed
    const sseSuccess = sendNotificationToUser(userId, {
      type,
      title,
      message,
      data,
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      read: false
    });
    
    if (sseSuccess) {
      return Response.json({ 
        success: true, 
        message: 'Notification sent successfully via SSE',
        method: 'sse'
      });
    }
    
    return Response.json({ 
      success: false, 
      message: 'Failed to send notification via both WebSocket and SSE' 
    }, { status: 500 });
  } catch (error) {
    console.error('WebSocket notification error:', error);
    return Response.json(
      { error: 'Failed to send notification' },
      { status: 500 }
    );
  }
}