import { NextRequest } from 'next/server';
import { getWebSocketServer } from '@/lib/websocket/websocket-server';

/**
 * WebSocket API route for handling WebSocket connections
 * This endpoint provides WebSocket server information and status
 */
export async function GET(request: NextRequest) {
  try {
    const webSocketServer = getWebSocketServer();
    
    if (!webSocketServer) {
      return Response.json(
        { error: 'WebSocket server not initialized' },
        { status: 503 }
      );
    }

    // Return WebSocket server status
    const stats = webSocketServer.getConnectionStats();
    return Response.json({
      status: 'active',
      totalConnections: stats.totalConnections,
      uniqueUsers: stats.uniqueUsers,
      userConnections: stats.userConnections,
      message: 'WebSocket server is running',
    });
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

    const webSocketServer = getWebSocketServer();
    
    if (!webSocketServer) {
      return Response.json(
        { error: 'WebSocket server not initialized' },
        { status: 503 }
      );
    }

    // Send notification via WebSocket
    const notification = {
      id: `ws-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      userId,
      type,
      title,
      message,
      data: data || {},
      timestamp: new Date(),
      read: false,
    };

    if (teamId) {
      // Send to team
      await webSocketServer.sendNotificationToTeam(teamId, notification);
    } else {
      // Send to specific user
      await webSocketServer.sendNotificationToUser(userId, notification);
    }

    return Response.json({
      success: true,
      message: 'Notification sent successfully',
      notificationId: notification.id,
    });
  } catch (error) {
    console.error('WebSocket notification error:', error);
    return Response.json(
      { error: 'Failed to send notification' },
      { status: 500 }
    );
  }
}