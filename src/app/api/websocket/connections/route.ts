import { NextRequest, NextResponse } from 'next/server';
import { getWebSocketServer } from '@/lib/websocket/websocket-server';

export async function GET(request: NextRequest) {
  try {
    const webSocketServerInstance = getWebSocketServer();
    if (!webSocketServerInstance) {
      return NextResponse.json(
        { error: 'WebSocket server not initialized' },
        { status: 503 }
      );
    }

    const { searchParams } = new URL(request.url);
    const includeDetails = searchParams.get('details') === 'true';
    
    // Get basic connection info
    const stats = webSocketServerInstance.getInMemoryStats();
    
    const connectionInfo = {
      activeConnections: stats.activeConnections,
      usersWithNotifications: stats.totalUsers,
      totalNotifications: stats.totalNotifications,
      averageNotificationsPerUser: stats.averageNotificationsPerUser,
      timestamp: new Date().toISOString(),
    };

    if (!includeDetails) {
      return NextResponse.json(connectionInfo);
    }

    // Get detailed connection information
    const detailedInfo = {
      ...connectionInfo,
      
      // Memory and performance details
      memoryUsage: stats.memoryUsageEstimate,
      performanceMetrics: stats.performanceMetrics,
      memoryStats: stats.memoryStats,
      
      // Configuration details
      configuration: stats.configSettings,
      
      // Connection health
      connectionHealth: {
        healthy: stats.activeConnections > 0,
        memoryWithinLimits: stats.memoryStats.utilizationPercentage < 80,
        averageNotificationsReasonable: stats.averageNotificationsPerUser < stats.configSettings.maxNotificationsPerUser * 0.8,
      },
      
      // Recommendations
      recommendations: generateRecommendations(stats),
    };

    return NextResponse.json(detailedInfo);
    
  } catch (error) {
    console.error('Error getting WebSocket connections:', error);
    return NextResponse.json(
      { error: 'Failed to get WebSocket connection information' },
      { status: 500 }
    );
  }
}

// Helper function to generate recommendations based on current stats
function generateRecommendations(stats: any): string[] {
  const recommendations: string[] = [];
  
  // Memory recommendations
  if (stats.memoryStats.utilizationPercentage > 80) {
    recommendations.push('Consider reducing maxNotificationsPerUser or increasing cleanup frequency');
  }
  
  if (stats.memoryStats.utilizationPercentage > 90) {
    recommendations.push('URGENT: Memory usage is very high, consider immediate cleanup');
  }
  
  // Performance recommendations
  if (stats.performanceMetrics.averageDeliveryTimeMs > 100) {
    recommendations.push('Average delivery time is high, check server performance');
  }
  
  // Connection recommendations
  if (stats.activeConnections === 0) {
    recommendations.push('No active connections detected, check WebSocket server status');
  }
  
  if (stats.averageNotificationsPerUser > stats.configSettings.maxNotificationsPerUser * 0.8) {
    recommendations.push('Users are approaching notification limits, consider increasing cleanup frequency');
  }
  
  // Efficiency recommendations
  const efficiency = stats.performanceMetrics;
  if (efficiency.totalNotificationsSent > 0) {
    const webSocketRate = (efficiency.webSocketDeliveries / efficiency.totalNotificationsSent) * 100;
    
    if (webSocketRate < 80) {
      recommendations.push('WebSocket delivery rate is low, check connection stability');
    }
    
    if (efficiency.redisOperations > efficiency.totalNotificationsSent * 0.1) {
      recommendations.push('Redis usage is higher than expected, check fallback configuration');
    }
  }
  
  // Configuration recommendations
  if (stats.configSettings.enableRedisFallback) {
    recommendations.push('Redis fallback is enabled, consider disabling to reduce Redis load');
  }
  
  if (stats.configSettings.cleanupIntervalMinutes > 10) {
    recommendations.push('Cleanup interval is quite long, consider more frequent cleanup for better memory management');
  }
  
  if (recommendations.length === 0) {
    recommendations.push('System is running optimally');
  }
  
  return recommendations;
}

// Endpoint to manage connections
export async function POST(request: NextRequest) {
  try {
    const webSocketServerInstance = getWebSocketServer();
    if (!webSocketServerInstance) {
      return NextResponse.json(
        { error: 'WebSocket server not initialized' },
        { status: 503 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const action = body.action;
    const userId = body.userId;

    switch (action) {
      case 'clear-user-notifications':
        if (!userId) {
          return NextResponse.json(
            { error: 'userId is required for clear-user-notifications action' },
            { status: 400 }
          );
        }
        
        // Clear notifications for specific user
        webSocketServerInstance.clearUserNotifications(userId);
        
        return NextResponse.json({
          message: `Notifications cleared for user ${userId}`,
          timestamp: new Date().toISOString(),
        });
        
      case 'broadcast-test':
        // Send a test notification to all connected users
        const testNotification = {
          id: `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          userId: 'system', // System notification doesn't target specific user
          type: 'system_alert' as const,
          title: 'Test Notification',
          message: 'This is a test notification from the monitoring system',
          data: {
            timestamp: new Date().toISOString(),
            source: 'monitoring-api',
          },
          timestamp: new Date(),
          read: false,
        };
        
        await webSocketServerInstance.broadcastSystemNotification(testNotification);
        
        return NextResponse.json({
          message: 'Test notification broadcasted to all connected users',
          notification: testNotification,
          timestamp: new Date().toISOString(),
        });
        
      case 'get-user-notifications':
        if (!userId) {
          return NextResponse.json(
            { error: 'userId is required for get-user-notifications action' },
            { status: 400 }
          );
        }
        
        // This would require adding a method to get user notifications
        // For now, return a placeholder response
        return NextResponse.json({
          message: `User notifications for ${userId}`,
          userId,
          // notifications: userNotifications, // Would need to implement this
          timestamp: new Date().toISOString(),
        });
        
      default:
        return NextResponse.json(
          { 
            error: 'Invalid action', 
            supportedActions: [
              'clear-user-notifications',
              'broadcast-test',
              'get-user-notifications'
            ]
          },
          { status: 400 }
        );
    }
    
  } catch (error) {
    console.error('Error managing WebSocket connections:', error);
    return NextResponse.json(
      { error: 'Failed to manage WebSocket connections' },
      { status: 500 }
    );
  }
}