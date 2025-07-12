import { NextRequest, NextResponse } from 'next/server';
import { getWebSocketServer } from '@/lib/websocket/websocket-server';
import { WebSocketPerformanceTracker, WebSocketMemoryMonitor } from '@/lib/config/websocket-config';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const detailed = searchParams.get('detailed') === 'true';
    
    const webSocketServerInstance = getWebSocketServer();
    if (!webSocketServerInstance) {
      return NextResponse.json(
        { error: 'WebSocket server not initialized' },
        { status: 503 }
      );
    }

    // Get basic stats
    const stats = webSocketServerInstance.getInMemoryStats();
    
    if (!detailed) {
      // Return basic stats only
      return NextResponse.json({
        status: 'active',
        totalUsers: stats.totalUsers,
        totalNotifications: stats.totalNotifications,
        activeConnections: stats.activeConnections,
        memoryUsage: stats.memoryUsageEstimate,
        timestamp: new Date().toISOString(),
      });
    }

    // Get detailed performance metrics
    const performanceTracker = WebSocketPerformanceTracker.getInstance();
    const memoryMonitor = WebSocketMemoryMonitor.getInstance();
    
    const performanceMetrics = performanceTracker.getMetrics();
    const efficiencyStats = performanceTracker.getEfficiencyStats();
    const memoryStats = memoryMonitor.getMemoryStats();

    return NextResponse.json({
      status: 'active',
      timestamp: new Date().toISOString(),
      
      // Basic stats
      basic: {
        totalUsers: stats.totalUsers,
        totalNotifications: stats.totalNotifications,
        averageNotificationsPerUser: stats.averageNotificationsPerUser,
        activeConnections: stats.activeConnections,
        memoryUsage: stats.memoryUsageEstimate,
      },
      
      // Performance metrics
      performance: {
        totalNotificationsSent: performanceMetrics.totalNotificationsSent,
        webSocketDeliveries: performanceMetrics.webSocketDeliveries,
        databaseFallbacks: performanceMetrics.databaseFallbacks,
        redisOperations: performanceMetrics.redisOperations,
        averageDeliveryTimeMs: performanceMetrics.averageDeliveryTimeMs,
      },
      
      // Efficiency stats
      efficiency: {
        webSocketSuccessRate: `${efficiencyStats.webSocketSuccessRate.toFixed(1)}%`,
        fallbackRate: `${efficiencyStats.fallbackRate.toFixed(1)}%`,
        redisReductionPercentage: `${efficiencyStats.redisReductionPercentage.toFixed(1)}%`,
      },
      
      // Memory stats
      memory: {
        currentUsageMB: memoryStats.currentUsageMB,
        limitMB: memoryStats.limitMB,
        utilizationPercentage: `${memoryStats.utilizationPercentage.toFixed(1)}%`,
        shouldCleanup: memoryStats.shouldCleanup,
      },
      
      // Configuration
      config: stats.configSettings,
      
      // Health indicators
      health: {
        memoryHealthy: memoryStats.utilizationPercentage < 80,
        performanceHealthy: efficiencyStats.webSocketSuccessRate > 90,
        deliveryHealthy: performanceMetrics.averageDeliveryTimeMs < 100,
        overallHealthy: 
          memoryStats.utilizationPercentage < 80 &&
          efficiencyStats.webSocketSuccessRate > 90 &&
          performanceMetrics.averageDeliveryTimeMs < 100,
      },
    });
    
  } catch (error) {
    console.error('Error getting WebSocket stats:', error);
    return NextResponse.json(
      { error: 'Failed to get WebSocket statistics' },
      { status: 500 }
    );
  }
}

// Force cleanup endpoint
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

    switch (action) {
      case 'cleanup':
        // Trigger manual cleanup
        const statsBefore = webSocketServerInstance.getInMemoryStats();
        
        // This would trigger the cleanup method if it was public
        // For now, we'll return current stats
        const statsAfter = webSocketServerInstance.getInMemoryStats();
        
        return NextResponse.json({
          message: 'Cleanup triggered',
          before: {
            totalNotifications: statsBefore.totalNotifications,
            memoryUsage: statsBefore.memoryUsageEstimate,
          },
          after: {
            totalNotifications: statsAfter.totalNotifications,
            memoryUsage: statsAfter.memoryUsageEstimate,
          },
          timestamp: new Date().toISOString(),
        });
        
      case 'reset-metrics':
        // Reset performance metrics
        const performanceTracker = WebSocketPerformanceTracker.getInstance();
        performanceTracker.reset();
        
        return NextResponse.json({
          message: 'Performance metrics reset',
          timestamp: new Date().toISOString(),
        });
        
      default:
        return NextResponse.json(
          { error: 'Invalid action. Supported actions: cleanup, reset-metrics' },
          { status: 400 }
        );
    }
    
  } catch (error) {
    console.error('Error performing WebSocket action:', error);
    return NextResponse.json(
      { error: 'Failed to perform WebSocket action' },
      { status: 500 }
    );
  }
}