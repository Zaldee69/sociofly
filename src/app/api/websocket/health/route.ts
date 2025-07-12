import { NextRequest, NextResponse } from 'next/server';
import { getWebSocketServer } from '@/lib/websocket/websocket-server';
import { WebSocketPerformanceTracker, WebSocketMemoryMonitor } from '@/lib/config/websocket-config';

interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime?: number;
  checks: {
    websocketServer: HealthCheck;
    memoryUsage: HealthCheck;
    performance: HealthCheck;
    connections: HealthCheck;
    notifications: HealthCheck;
  };
  summary: {
    totalChecks: number;
    passedChecks: number;
    failedChecks: number;
    warningChecks: number;
  };
  recommendations?: string[];
}

interface HealthCheck {
  status: 'pass' | 'warn' | 'fail';
  message: string;
  details?: any;
  threshold?: any;
  actual?: any;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const includeDetails = searchParams.get('details') === 'true';
    
    const healthResult = await performHealthCheck(includeDetails);
    
    // Set appropriate HTTP status based on health
    let httpStatus = 200;
    if (healthResult.status === 'degraded') {
      httpStatus = 200; // Still OK, but with warnings
    } else if (healthResult.status === 'unhealthy') {
      httpStatus = 503; // Service unavailable
    }
    
    return NextResponse.json(healthResult, { status: httpStatus });
    
  } catch (error) {
    console.error('Error performing health check:', error);
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'Health check failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

async function performHealthCheck(includeDetails: boolean): Promise<HealthCheckResult> {
  const timestamp = new Date().toISOString();
  const checks: HealthCheckResult['checks'] = {
    websocketServer: checkWebSocketServer(),
    memoryUsage: checkMemoryUsage(),
    performance: checkPerformance(),
    connections: checkConnections(),
    notifications: checkNotifications(),
  };
  
  // Calculate summary
  const checkValues = Object.values(checks);
  const summary = {
    totalChecks: checkValues.length,
    passedChecks: checkValues.filter(c => c.status === 'pass').length,
    failedChecks: checkValues.filter(c => c.status === 'fail').length,
    warningChecks: checkValues.filter(c => c.status === 'warn').length,
  };
  
  // Determine overall status
  let overallStatus: 'healthy' | 'degraded' | 'unhealthy';
  if (summary.failedChecks > 0) {
    overallStatus = 'unhealthy';
  } else if (summary.warningChecks > 0) {
    overallStatus = 'degraded';
  } else {
    overallStatus = 'healthy';
  }
  
  const result: HealthCheckResult = {
    status: overallStatus,
    timestamp,
    checks,
    summary,
  };
  
  // Add recommendations if there are issues
  if (overallStatus !== 'healthy') {
    result.recommendations = generateHealthRecommendations(checks);
  }
  
  return result;
}

function checkWebSocketServer(): HealthCheck {
  const webSocketServerInstance = getWebSocketServer();
  if (!webSocketServerInstance) {
    return {
      status: 'fail',
      message: 'WebSocket server is not initialized',
    };
  }
  
  try {
    // Try to get stats to verify server is responsive
    const stats = webSocketServerInstance.getInMemoryStats();
    
    return {
      status: 'pass',
      message: 'WebSocket server is running and responsive',
      details: {
        activeConnections: stats.activeConnections,
        totalUsers: stats.totalUsers,
      },
    };
  } catch (error) {
    return {
      status: 'fail',
      message: 'WebSocket server is not responsive',
      details: { error: error instanceof Error ? error.message : 'Unknown error' },
    };
  }
}

function checkMemoryUsage(): HealthCheck {
  try {
    const memoryMonitor = WebSocketMemoryMonitor.getInstance();
    const memoryStats = memoryMonitor.getMemoryStats();
    
    const utilizationPercentage = memoryStats.utilizationPercentage;
    const threshold = {
      warning: 80,
      critical: 90,
    };
    
    if (utilizationPercentage >= threshold.critical) {
      return {
        status: 'fail',
        message: 'Memory usage is critically high',
        threshold,
        actual: { utilizationPercentage },
        details: memoryStats,
      };
    } else if (utilizationPercentage >= threshold.warning) {
      return {
        status: 'warn',
        message: 'Memory usage is high',
        threshold,
        actual: { utilizationPercentage },
        details: memoryStats,
      };
    } else {
      return {
        status: 'pass',
        message: 'Memory usage is within acceptable limits',
        threshold,
        actual: { utilizationPercentage },
        details: memoryStats,
      };
    }
  } catch (error) {
    return {
      status: 'fail',
      message: 'Failed to check memory usage',
      details: { error: error instanceof Error ? error.message : 'Unknown error' },
    };
  }
}

function checkPerformance(): HealthCheck {
  try {
    const performanceTracker = WebSocketPerformanceTracker.getInstance();
    const metrics = performanceTracker.getMetrics();
    const efficiency = performanceTracker.getEfficiencyStats();
    
    const thresholds = {
      webSocketSuccessRate: { warning: 90, critical: 70 },
      averageDeliveryTime: { warning: 100, critical: 500 }, // milliseconds
    };
    
    const issues: string[] = [];
    let worstStatus: 'pass' | 'warn' | 'fail' = 'pass';
    
    // Check WebSocket success rate
    if (efficiency.webSocketSuccessRate < thresholds.webSocketSuccessRate.critical) {
      issues.push(`WebSocket success rate is critically low: ${efficiency.webSocketSuccessRate.toFixed(1)}%`);
      worstStatus = 'fail';
    } else if (efficiency.webSocketSuccessRate < thresholds.webSocketSuccessRate.warning) {
      issues.push(`WebSocket success rate is low: ${efficiency.webSocketSuccessRate.toFixed(1)}%`);
      if (worstStatus === 'pass') worstStatus = 'warn';
    }
    
    // Check average delivery time
    if (metrics.averageDeliveryTimeMs > thresholds.averageDeliveryTime.critical) {
      issues.push(`Average delivery time is critically high: ${metrics.averageDeliveryTimeMs.toFixed(2)}ms`);
      worstStatus = 'fail';
    } else if (metrics.averageDeliveryTimeMs > thresholds.averageDeliveryTime.warning) {
      issues.push(`Average delivery time is high: ${metrics.averageDeliveryTimeMs.toFixed(2)}ms`);
      if (worstStatus === 'pass') worstStatus = 'warn';
    }
    
    const message = issues.length > 0 
      ? issues.join('; ')
      : 'Performance metrics are within acceptable ranges';
    
    return {
      status: worstStatus,
      message,
      threshold: thresholds,
      actual: {
        webSocketSuccessRate: efficiency.webSocketSuccessRate,
        averageDeliveryTimeMs: metrics.averageDeliveryTimeMs,
      },
      details: { metrics, efficiency },
    };
  } catch (error) {
    return {
      status: 'fail',
      message: 'Failed to check performance metrics',
      details: { error: error instanceof Error ? error.message : 'Unknown error' },
    };
  }
}

function checkConnections(): HealthCheck {
  const webSocketServerInstance = getWebSocketServer();
  if (!webSocketServerInstance) {
    return {
      status: 'fail',
      message: 'Cannot check connections - WebSocket server not available',
    };
  }
  
  try {
    const stats = webSocketServerInstance.getInMemoryStats();
    const activeConnections = stats.activeConnections;
    
    // This is more of an informational check
    // In a real application, you might have minimum connection requirements
    
    if (activeConnections === 0) {
      return {
        status: 'warn',
        message: 'No active WebSocket connections',
        actual: { activeConnections },
        details: stats,
      };
    } else {
      return {
        status: 'pass',
        message: `${activeConnections} active WebSocket connections`,
        actual: { activeConnections },
        details: stats,
      };
    }
  } catch (error) {
    return {
      status: 'fail',
      message: 'Failed to check WebSocket connections',
      details: { error: error instanceof Error ? error.message : 'Unknown error' },
    };
  }
}

function checkNotifications(): HealthCheck {
  const webSocketServerInstance = getWebSocketServer();
  if (!webSocketServerInstance) {
    return {
      status: 'fail',
      message: 'Cannot check notifications - WebSocket server not available',
    };
  }
  
  try {
    const stats = webSocketServerInstance.getInMemoryStats();
    const { totalNotifications, totalUsers, configSettings } = stats;
    
    const averageNotificationsPerUser = totalUsers > 0 ? totalNotifications / totalUsers : 0;
    const threshold = {
      warning: configSettings.maxNotificationsPerUser * 0.8,
      critical: configSettings.maxNotificationsPerUser * 0.95,
    };
    
    if (averageNotificationsPerUser >= threshold.critical) {
      return {
        status: 'fail',
        message: 'Average notifications per user is critically high',
        threshold,
        actual: { averageNotificationsPerUser },
        details: stats,
      };
    } else if (averageNotificationsPerUser >= threshold.warning) {
      return {
        status: 'warn',
        message: 'Average notifications per user is high',
        threshold,
        actual: { averageNotificationsPerUser },
        details: stats,
      };
    } else {
      return {
        status: 'pass',
        message: 'Notification levels are within acceptable limits',
        threshold,
        actual: { averageNotificationsPerUser },
        details: stats,
      };
    }
  } catch (error) {
    return {
      status: 'fail',
      message: 'Failed to check notification levels',
      details: { error: error instanceof Error ? error.message : 'Unknown error' },
    };
  }
}

function generateHealthRecommendations(checks: HealthCheckResult['checks']): string[] {
  const recommendations: string[] = [];
  
  if (checks.websocketServer.status === 'fail') {
    recommendations.push('Restart the WebSocket server');
    recommendations.push('Check server logs for initialization errors');
  }
  
  if (checks.memoryUsage.status === 'fail') {
    recommendations.push('Immediately trigger aggressive cleanup');
    recommendations.push('Consider reducing maxNotificationsPerUser');
    recommendations.push('Increase cleanup frequency');
  } else if (checks.memoryUsage.status === 'warn') {
    recommendations.push('Monitor memory usage closely');
    recommendations.push('Consider triggering manual cleanup');
  }
  
  if (checks.performance.status === 'fail') {
    recommendations.push('Check server resources (CPU, memory)');
    recommendations.push('Investigate network connectivity issues');
    recommendations.push('Review WebSocket server configuration');
  } else if (checks.performance.status === 'warn') {
    recommendations.push('Monitor performance metrics');
    recommendations.push('Consider optimizing notification delivery');
  }
  
  if (checks.connections.status === 'warn') {
    recommendations.push('Check if this is expected (e.g., off-peak hours)');
    recommendations.push('Verify WebSocket client connectivity');
  }
  
  if (checks.notifications.status === 'fail') {
    recommendations.push('Trigger immediate notification cleanup');
    recommendations.push('Review notification retention policies');
  } else if (checks.notifications.status === 'warn') {
    recommendations.push('Schedule notification cleanup');
    recommendations.push('Monitor notification growth rate');
  }
  
  return recommendations;
}