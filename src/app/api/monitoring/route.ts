import { NextRequest, NextResponse } from "next/server";
import { SystemMonitor } from "@/lib/monitoring/system-monitor";
import { WorkerAutoScaler } from "@/lib/scaling/worker-autoscaler";
import {
  getRedisClusterStatus,
  getRedisPerformanceMetrics,
  checkRedisConnection,
} from "@/lib/queue/redis-cluster-connection";
import { QueueManager } from "@/lib/queue/queue-manager";

// Validate API key
function validateApiKey(request: NextRequest): boolean {
  const apiKey =
    request.nextUrl.searchParams.get("apiKey") ||
    request.headers.get("x-api-key") ||
    request.headers.get("authorization")?.replace("Bearer ", "");

  const validApiKey = process.env.CRON_API_KEY || "test-scheduler-key";
  return apiKey === validApiKey;
}

// Handle GET requests
export async function GET(request: NextRequest) {
  if (!validateApiKey(request)) {
    return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
  }

  try {
    const action = request.nextUrl.searchParams.get("action");

    switch (action) {
      case "system_metrics":
        return await handleSystemMetrics();

      case "redis_cluster":
        return await handleRedisCluster();

      case "redis_performance":
        return await handleRedisPerformance();

      case "queue_metrics":
        return await handleQueueMetrics();

      case "scaling_status":
        return await handleScalingStatus();

      case "scaling_metrics":
        return await handleScalingMetrics();

      case "health_check":
        return await handleHealthCheck();

      case "monitoring_status":
        return await handleMonitoringStatus();

      default:
        return await handleOverallStatus();
    }
  } catch (error) {
    console.error("Monitoring API error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

// Handle POST requests
export async function POST(request: NextRequest) {
  if (!validateApiKey(request)) {
    return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
  }

  try {
    const { action, ...params } = await request.json();

    switch (action) {
      case "start_monitoring":
        return await handleStartMonitoring(params);

      case "stop_monitoring":
        return await handleStopMonitoring();

      case "start_autoscaling":
        return await handleStartAutoScaling(params);

      case "stop_autoscaling":
        return await handleStopAutoScaling();

      case "manual_scale":
        return await handleManualScale(params);

      case "update_scaling_config":
        return await handleUpdateScalingConfig(params);

      case "collect_metrics":
        return await handleCollectMetrics();

      default:
        return NextResponse.json(
          {
            error: "Unknown action",
            availableActions: [
              "start_monitoring",
              "stop_monitoring",
              "start_autoscaling",
              "stop_autoscaling",
              "manual_scale",
              "update_scaling_config",
              "collect_metrics",
            ],
          },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Monitoring API error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

// Handler functions
async function handleSystemMetrics() {
  const monitor = SystemMonitor.getInstance();
  const metrics = await monitor.collectMetrics();

  return NextResponse.json({
    success: true,
    data: metrics,
    timestamp: new Date().toISOString(),
  });
}

async function handleRedisCluster() {
  const clusterStatus = await getRedisClusterStatus();
  const connectionHealthy = await checkRedisConnection();

  return NextResponse.json({
    success: true,
    data: {
      ...clusterStatus,
      connectionHealthy,
    },
    timestamp: new Date().toISOString(),
  });
}

async function handleRedisPerformance() {
  const performance = await getRedisPerformanceMetrics();

  return NextResponse.json({
    success: true,
    data: performance,
    timestamp: new Date().toISOString(),
  });
}

async function handleQueueMetrics() {
  const queueManager = QueueManager.getInstance();

  if (!queueManager) {
    return NextResponse.json(
      {
        success: false,
        error: "Queue Manager not initialized",
      },
      { status: 503 }
    );
  }

  const metrics = await queueManager.getAllQueueMetrics();

  return NextResponse.json({
    success: true,
    data: metrics,
    timestamp: new Date().toISOString(),
  });
}

async function handleScalingStatus() {
  const scaler = WorkerAutoScaler.getInstance();
  const status = scaler.getScalingStatus();

  return NextResponse.json({
    success: true,
    data: status,
    timestamp: new Date().toISOString(),
  });
}

async function handleScalingMetrics() {
  const scaler = WorkerAutoScaler.getInstance();
  const loadMetrics = await scaler.getCurrentLoadMetrics();
  const status = scaler.getScalingStatus();

  return NextResponse.json({
    success: true,
    data: {
      loadMetrics,
      scalingStatus: status,
    },
    timestamp: new Date().toISOString(),
  });
}

async function handleHealthCheck() {
  const redisHealthy = await checkRedisConnection();
  const queueManager = QueueManager.getInstance();
  const queueHealthy = queueManager !== null;

  const monitor = SystemMonitor.getInstance();
  const metrics = await monitor.collectMetrics();

  const overallHealth =
    redisHealthy && queueHealthy && metrics.health.score >= 70;

  return NextResponse.json({
    success: true,
    data: {
      overall: overallHealth ? "healthy" : "unhealthy",
      components: {
        redis: redisHealthy,
        queues: queueHealthy,
        system: metrics.health.overall,
      },
      healthScore: metrics.health.score,
      issues: metrics.health.issues,
      recommendations: metrics.health.recommendations,
    },
    timestamp: new Date().toISOString(),
  });
}

async function handleMonitoringStatus() {
  const monitor = SystemMonitor.getInstance();
  const scaler = WorkerAutoScaler.getInstance();

  const monitoringStatus = monitor.getMonitoringStatus();
  const scalingStatus = scaler.getScalingStatus();

  return NextResponse.json({
    success: true,
    data: {
      monitoring: monitoringStatus,
      autoScaling: scalingStatus,
    },
    timestamp: new Date().toISOString(),
  });
}

async function handleOverallStatus() {
  const monitor = SystemMonitor.getInstance();
  const scaler = WorkerAutoScaler.getInstance();
  const queueManager = QueueManager.getInstance();

  // Get all status information
  const [
    systemMetrics,
    redisCluster,
    redisPerformance,
    queueMetrics,
    scalingStatus,
    monitoringStatus,
  ] = await Promise.all([
    monitor.collectMetrics(),
    getRedisClusterStatus(),
    getRedisPerformanceMetrics(),
    queueManager ? queueManager.getAllQueueMetrics() : {},
    scaler.getScalingStatus(),
    monitor.getMonitoringStatus(),
  ]);

  return NextResponse.json({
    success: true,
    data: {
      overview: {
        healthScore: systemMetrics.health.score,
        overallHealth: systemMetrics.health.overall,
        issues: systemMetrics.health.issues,
        recommendations: systemMetrics.health.recommendations,
      },
      redis: {
        cluster: redisCluster,
        performance: redisPerformance,
      },
      queues: {
        metrics: queueMetrics,
        totalQueues: Object.keys(queueMetrics).length,
      },
      scaling: scalingStatus,
      monitoring: monitoringStatus,
    },
    timestamp: new Date().toISOString(),
  });
}

// POST handlers
async function handleStartMonitoring(params: any) {
  const monitor = SystemMonitor.getInstance();
  const intervalMinutes = params.intervalMinutes || 5;

  monitor.startMonitoring(intervalMinutes);

  return NextResponse.json({
    success: true,
    message: `System monitoring started with ${intervalMinutes} minute interval`,
    data: monitor.getMonitoringStatus(),
  });
}

async function handleStopMonitoring() {
  const monitor = SystemMonitor.getInstance();
  monitor.stopMonitoring();

  return NextResponse.json({
    success: true,
    message: "System monitoring stopped",
    data: monitor.getMonitoringStatus(),
  });
}

async function handleStartAutoScaling(params: any) {
  const scaler = WorkerAutoScaler.getInstance();
  const intervalMinutes = params.intervalMinutes || 2;

  try {
    await scaler.startAutoScaling(intervalMinutes);

    return NextResponse.json({
      success: true,
      message: `Auto-scaling started with ${intervalMinutes} minute interval`,
      data: scaler.getScalingStatus(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

async function handleStopAutoScaling() {
  const scaler = WorkerAutoScaler.getInstance();
  scaler.stopAutoScaling();

  return NextResponse.json({
    success: true,
    message: "Auto-scaling stopped",
    data: scaler.getScalingStatus(),
  });
}

async function handleManualScale(params: any) {
  const { queueName, targetWorkers, reason } = params;

  if (!queueName || typeof targetWorkers !== "number") {
    return NextResponse.json(
      {
        success: false,
        error: "queueName and targetWorkers are required",
      },
      { status: 400 }
    );
  }

  const scaler = WorkerAutoScaler.getInstance();
  const success = await scaler.manualScale(queueName, targetWorkers, reason);

  if (success) {
    return NextResponse.json({
      success: true,
      message: `Successfully scaled ${queueName} to ${targetWorkers} workers`,
      data: scaler.getScalingStatus(),
    });
  } else {
    return NextResponse.json(
      {
        success: false,
        error: "Failed to scale workers - check logs for details",
      },
      { status: 400 }
    );
  }
}

async function handleUpdateScalingConfig(params: any) {
  const { queueName, ...updates } = params;

  if (!queueName) {
    return NextResponse.json(
      {
        success: false,
        error: "queueName is required",
      },
      { status: 400 }
    );
  }

  const scaler = WorkerAutoScaler.getInstance();
  const success = scaler.updateScalingConfig(queueName, updates);

  if (success) {
    return NextResponse.json({
      success: true,
      message: `Successfully updated scaling config for ${queueName}`,
      data: scaler.getScalingStatus(),
    });
  } else {
    return NextResponse.json(
      {
        success: false,
        error: `Scaling config not found for queue: ${queueName}`,
      },
      { status: 404 }
    );
  }
}

async function handleCollectMetrics() {
  const monitor = SystemMonitor.getInstance();
  const metrics = await monitor.collectMetrics();

  return NextResponse.json({
    success: true,
    message: "Metrics collected successfully",
    data: metrics,
    timestamp: new Date().toISOString(),
  });
}
