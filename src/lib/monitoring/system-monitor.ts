import { QueueManager } from "@/lib/queue/queue-manager";
import {
  getRedisClusterStatus,
  getRedisPerformanceMetrics,
  checkRedisConnection,
} from "@/lib/queue/redis-cluster-connection";
import { prisma } from "@/lib/prisma/client";
import os from "os";

export interface SystemMetrics {
  timestamp: Date;
  redis: {
    isHealthy: boolean;
    cluster: {
      isCluster: boolean;
      totalNodes: number;
      masterNodes: number;
      slaveNodes: number;
      healthyNodes: number;
      nodes: Array<{
        host: string;
        port: number;
        status: string;
        role: string;
        health: boolean;
      }>;
    };
    performance: {
      memoryUsage: {
        used: number;
        peak: number;
        rss: number;
        overhead: number;
        usedMB: number;
        peakMB: number;
      };
      keyCount: number;
      connections: {
        connected: number;
        blocked: number;
      };
      throughput: {
        commandsProcessed: number;
        keyspaceHits: number;
        keyspaceMisses: number;
        hitRate: number;
      };
    };
  };
  queues: {
    isHealthy: boolean;
    totalQueues: number;
    metrics: Record<
      string,
      {
        waiting: number;
        active: number;
        completed: number;
        failed: number;
        delayed: number;
        paused: boolean;
        workers: number;
      }
    >;
    totalJobs: {
      waiting: number;
      active: number;
      completed: number;
      failed: number;
      delayed: number;
    };
  };
  socialMedia: {
    isHealthy: boolean;
    accounts: {
      total: number;
      validTokens: number;
      invalidTokens: number;
      healthPercentage: number;
    };
    publishers: {
      supported: string[];
      operational: string[];
      issues: string[];
    };
  };
  system: {
    node: {
      version: string;
      uptime: number;
      memoryUsage: {
        rss: number;
        heapUsed: number;
        heapTotal: number;
        external: number;
        arrayBuffers: number;
      };
      cpuUsage: {
        user: number;
        system: number;
      };
    };
    os: {
      platform: string;
      release: string;
      arch: string;
      cpus: number;
      totalMemory: number;
      freeMemory: number;
      uptime: number;
      loadAverage: number[];
    };
  };
  health: {
    overall: "healthy" | "warning" | "critical";
    score: number; // 0-100
    issues: string[];
    recommendations: string[];
  };
}

export interface AlertRule {
  id: string;
  name: string;
  description: string;
  condition: (metrics: SystemMetrics) => boolean;
  severity: "low" | "medium" | "high" | "critical";
  cooldown: number; // minutes
  enabled: boolean;
}

export class SystemMonitor {
  private static instance: SystemMonitor;
  private alertRules: AlertRule[] = [];
  private lastAlerts: Map<string, Date> = new Map();
  private isMonitoring = false;
  private monitoringInterval: NodeJS.Timeout | null = null;

  private constructor() {
    this.initializeDefaultAlertRules();
  }

  public static getInstance(): SystemMonitor {
    if (!SystemMonitor.instance) {
      SystemMonitor.instance = new SystemMonitor();
    }
    return SystemMonitor.instance;
  }

  /**
   * Start continuous monitoring
   */
  public startMonitoring(intervalMinutes: number = 5): void {
    if (this.isMonitoring) {
      console.log("⚠️  System monitoring already running");
      return;
    }

    console.log(
      `🔍 Starting system monitoring (interval: ${intervalMinutes} minutes)`
    );

    this.isMonitoring = true;

    // Initial metrics collection
    this.collectAndProcessMetrics();

    // Set up periodic monitoring
    this.monitoringInterval = setInterval(
      () => this.collectAndProcessMetrics(),
      intervalMinutes * 60 * 1000
    );
  }

  /**
   * Stop monitoring
   */
  public stopMonitoring(): void {
    if (!this.isMonitoring) {
      console.log("⚠️  System monitoring not running");
      return;
    }

    console.log("🛑 Stopping system monitoring");

    this.isMonitoring = false;

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }

  /**
   * Collect comprehensive system metrics
   */
  public async collectMetrics(): Promise<SystemMetrics> {
    const timestamp = new Date();

    // Redis metrics
    const redisHealthy = await checkRedisConnection();
    const clusterStatus = await getRedisClusterStatus();
    const redisPerformance = await getRedisPerformanceMetrics();

    // Queue metrics
    const queueManager = QueueManager.getInstance();
    let queueMetrics: Record<string, any> = {};
    let queuesHealthy = false;

    try {
      if (queueManager) {
        queueMetrics = await queueManager.getAllQueueMetrics();
        queuesHealthy = true;
      }
    } catch (error) {
      console.warn("Failed to collect queue metrics:", error);
    }

    // Calculate total queue jobs
    const totalJobs = Object.values(queueMetrics).reduce(
      (totals: any, queue: any) => ({
        waiting: totals.waiting + (queue.waiting || 0),
        active: totals.active + (queue.active || 0),
        completed: totals.completed + (queue.completed || 0),
        failed: totals.failed + (queue.failed || 0),
        delayed: totals.delayed + (queue.delayed || 0),
      }),
      { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 }
    );

    // Social Media metrics
    let socialMediaMetrics = {
      isHealthy: false,
      accounts: {
        total: 0,
        validTokens: 0,
        invalidTokens: 0,
        healthPercentage: 0,
      },
      publishers: {
        supported: [] as string[],
        operational: [] as string[],
        issues: [] as string[],
      },
    };

    try {
      // Import PostPublisherService dynamically to avoid circular dependencies
      const { PostPublisherService } = await import(
        "@/lib/services/post-publisher"
      );
      const { publisherFactory } = await import(
        "@/lib/services/publishers/publisher-factory"
      );

      // Check token validation
      const tokenValidation = await PostPublisherService.validateAllTokens();

      socialMediaMetrics.accounts = {
        total: tokenValidation.total,
        validTokens: tokenValidation.valid,
        invalidTokens: tokenValidation.invalid,
        healthPercentage:
          tokenValidation.total > 0
            ? Math.round((tokenValidation.valid / tokenValidation.total) * 100)
            : 0,
      };

      // Check publisher status
      const supportedPlatforms = publisherFactory.getSupportedPlatforms();
      socialMediaMetrics.publishers.supported = supportedPlatforms.map((p) =>
        p.toString()
      );

      // Test each publisher (simplified check)
      for (const platform of supportedPlatforms) {
        try {
          const publisher = publisherFactory.getPublisher(platform);
          socialMediaMetrics.publishers.operational.push(platform.toString());
        } catch (error) {
          socialMediaMetrics.publishers.issues.push(
            `${platform}: ${error instanceof Error ? error.message : "Unknown error"}`
          );
        }
      }

      socialMediaMetrics.isHealthy =
        socialMediaMetrics.accounts.healthPercentage >= 80 &&
        socialMediaMetrics.publishers.issues.length === 0;
    } catch (error) {
      console.warn("Failed to get social media metrics:", error);
      socialMediaMetrics.publishers.issues.push(
        `Metrics collection failed: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }

    // System metrics
    const nodeMemory = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    const loadAverage = os.loadavg();

    const metrics: SystemMetrics = {
      timestamp,
      redis: {
        isHealthy: redisHealthy,
        cluster: {
          ...clusterStatus,
          healthyNodes: clusterStatus.nodes.filter((n) => n.health).length,
        },
        performance: {
          ...redisPerformance,
          memoryUsage: {
            ...redisPerformance.memoryUsage,
            usedMB: Math.round(redisPerformance.memoryUsage.used / 1024 / 1024),
            peakMB: Math.round(redisPerformance.memoryUsage.peak / 1024 / 1024),
          },
        },
      },
      queues: {
        isHealthy: queuesHealthy,
        totalQueues: Object.keys(queueMetrics).length,
        metrics: queueMetrics,
        totalJobs,
      },
      socialMedia: socialMediaMetrics,
      system: {
        node: {
          version: process.version,
          uptime: process.uptime(),
          memoryUsage: nodeMemory,
          cpuUsage: {
            user: cpuUsage.user / 1000000, // Convert to seconds
            system: cpuUsage.system / 1000000,
          },
        },
        os: {
          platform: os.platform(),
          release: os.release(),
          arch: os.arch(),
          cpus: os.cpus().length,
          totalMemory: os.totalmem(),
          freeMemory: os.freemem(),
          uptime: os.uptime(),
          loadAverage,
        },
      },
      health: {
        overall: "healthy",
        score: 100,
        issues: [],
        recommendations: [],
      },
    };

    // Calculate health score and issues
    this.assessSystemHealth(metrics);

    return metrics;
  }

  /**
   * Assess system health and provide recommendations
   */
  private assessSystemHealth(metrics: SystemMetrics): void {
    const issues: string[] = [];
    const recommendations: string[] = [];
    let healthScore = 100;

    // Redis health checks
    if (!metrics.redis.isHealthy) {
      issues.push("Redis connection is not healthy");
      healthScore -= 30;
      recommendations.push("Check Redis server status and connectivity");
    }

    if (
      metrics.redis.cluster.isCluster &&
      metrics.redis.cluster.healthyNodes < metrics.redis.cluster.totalNodes
    ) {
      const unhealthyNodes =
        metrics.redis.cluster.totalNodes - metrics.redis.cluster.healthyNodes;
      issues.push(`${unhealthyNodes} Redis cluster nodes are unhealthy`);
      healthScore -= 20;
      recommendations.push("Investigate unhealthy Redis cluster nodes");
    }

    // Memory usage checks
    const memoryUsedPercent =
      (metrics.redis.performance.memoryUsage.used / (1024 * 1024 * 1024)) * 100; // Convert to GB
    if (memoryUsedPercent > 80) {
      issues.push("Redis memory usage is high (>80%)");
      healthScore -= 15;
      recommendations.push(
        "Consider increasing Redis memory or cleaning old data"
      );
    }

    // Queue health checks
    if (!metrics.queues.isHealthy) {
      issues.push("Queue system is not responding");
      healthScore -= 25;
      recommendations.push("Check BullMQ and Redis connection");
    }

    const failedJobs = metrics.queues.totalJobs.failed;
    if (failedJobs > 50) {
      issues.push(`High number of failed jobs: ${failedJobs}`);
      healthScore -= 10;
      recommendations.push("Investigate failed jobs and fix underlying issues");
    }

    // Social Media health checks
    if (!metrics.socialMedia.isHealthy) {
      issues.push("Social media system is not healthy");
      healthScore -= 20;
      recommendations.push(
        "Check social media token validation and publisher status"
      );
    }

    if (metrics.socialMedia.accounts.healthPercentage < 50) {
      issues.push(
        `Low social media token health: ${metrics.socialMedia.accounts.healthPercentage}% valid tokens`
      );
      healthScore -= 15;
      recommendations.push("Review and refresh expired social media tokens");
    }

    if (metrics.socialMedia.publishers.issues.length > 0) {
      issues.push(
        `Publisher issues: ${metrics.socialMedia.publishers.issues.join(", ")}`
      );
      healthScore -= 10;
      recommendations.push("Fix publisher configuration issues");
    }

    // System resource checks
    const freeMemoryPercent =
      (metrics.system.os.freeMemory / metrics.system.os.totalMemory) * 100;
    if (freeMemoryPercent < 10) {
      issues.push("System memory is critically low (<10% free)");
      healthScore -= 20;
      recommendations.push("Free up system memory or add more RAM");
    }

    const avgLoad = metrics.system.os.loadAverage[0];
    if (avgLoad > metrics.system.os.cpus * 2) {
      issues.push("System load is very high");
      healthScore -= 15;
      recommendations.push("Investigate high CPU usage processes");
    }

    // Node.js process checks
    const heapUsedPercent =
      (metrics.system.node.memoryUsage.heapUsed /
        metrics.system.node.memoryUsage.heapTotal) *
      100;
    if (heapUsedPercent > 90) {
      issues.push("Node.js heap usage is critically high (>90%)");
      healthScore -= 15;
      recommendations.push("Investigate memory leaks or increase heap size");
    }

    // Determine overall health
    let overallHealth: "healthy" | "warning" | "critical";
    if (healthScore >= 80) {
      overallHealth = "healthy";
    } else if (healthScore >= 60) {
      overallHealth = "warning";
    } else {
      overallHealth = "critical";
    }

    metrics.health = {
      overall: overallHealth,
      score: Math.max(0, healthScore),
      issues,
      recommendations,
    };
  }

  /**
   * Collect metrics and process alerts
   */
  private async collectAndProcessMetrics(): Promise<void> {
    try {
      console.log("🔍 Collecting system metrics...");

      const metrics = await this.collectMetrics();

      // Store metrics in database
      await this.storeMetrics(metrics);

      // Process alerts
      await this.processAlerts(metrics);

      console.log(
        `✅ System metrics collected - Health: ${metrics.health.overall} (${metrics.health.score}/100)`
      );

      if (metrics.health.issues.length > 0) {
        console.warn("⚠️  System issues detected:", metrics.health.issues);
      }
    } catch (error) {
      console.error("❌ Failed to collect system metrics:", error);
    }
  }

  /**
   * Store metrics in database
   */
  private async storeMetrics(metrics: SystemMetrics): Promise<void> {
    try {
      // TODO: Add systemMetrics table to Prisma schema
      console.log("📊 Metrics collected:", {
        timestamp: metrics.timestamp,
        redisHealthy: metrics.redis.isHealthy,
        queueHealthy: metrics.queues.isHealthy,
        socialMediaHealthy: metrics.socialMedia.isHealthy,
        socialMediaAccounts: metrics.socialMedia.accounts,
        healthScore: metrics.health.score,
        healthStatus: metrics.health.overall,
        issues: metrics.health.issues.length,
      });

      // When database schema is ready, uncomment this:
      /*
      await prisma.systemMetrics.create({
        data: {
          timestamp: metrics.timestamp,
          redisHealthy: metrics.redis.isHealthy,
          redisNodes: metrics.redis.cluster.totalNodes,
          redisHealthyNodes: metrics.redis.cluster.healthyNodes,
          redisMemoryUsed: metrics.redis.performance.memoryUsage.usedMB,
          redisKeyCount: metrics.redis.performance.keyCount,
          redisHitRate: metrics.redis.performance.throughput.hitRate,
          queueHealthy: metrics.queues.isHealthy,
          totalQueues: metrics.queues.totalQueues,
          waitingJobs: metrics.queues.totalJobs.waiting,
          activeJobs: metrics.queues.totalJobs.active,
          completedJobs: metrics.queues.totalJobs.completed,
          failedJobs: metrics.queues.totalJobs.failed,
          socialMediaHealthy: metrics.socialMedia.isHealthy,
          socialMediaAccounts: metrics.socialMedia.accounts.total,
          socialMediaValidTokens: metrics.socialMedia.accounts.validTokens,
          systemMemoryFree: Math.round(metrics.system.os.freeMemory / 1024 / 1024),
          systemLoadAverage: metrics.system.os.loadAverage[0],
          nodeHeapUsed: Math.round(metrics.system.node.memoryUsage.heapUsed / 1024 / 1024),
          healthScore: metrics.health.score,
          healthStatus: metrics.health.overall,
          issues: metrics.health.issues.join("; ") || null,
        },
      });
      */
    } catch (error) {
      console.error("Failed to store metrics:", error);
    }
  }

  /**
   * Process alert rules
   */
  private async processAlerts(metrics: SystemMetrics): Promise<void> {
    for (const rule of this.alertRules) {
      if (!rule.enabled) continue;

      // Check cooldown
      const lastAlert = this.lastAlerts.get(rule.id);
      if (lastAlert) {
        const cooldownMs = rule.cooldown * 60 * 1000;
        if (Date.now() - lastAlert.getTime() < cooldownMs) {
          continue; // Still in cooldown
        }
      }

      // Evaluate condition
      try {
        if (rule.condition(metrics)) {
          await this.triggerAlert(rule, metrics);
          this.lastAlerts.set(rule.id, new Date());
        }
      } catch (error) {
        console.error(`Failed to evaluate alert rule ${rule.id}:`, error);
      }
    }
  }

  /**
   * Trigger an alert
   */
  private async triggerAlert(
    rule: AlertRule,
    metrics: SystemMetrics
  ): Promise<void> {
    console.warn(`🚨 ALERT [${rule.severity.toUpperCase()}]: ${rule.name}`);
    console.warn(`   Description: ${rule.description}`);
    console.warn(`   Health Score: ${metrics.health.score}/100`);

    try {
      // TODO: Add systemAlert table to Prisma schema
      console.log("🚨 Alert stored:", {
        ruleId: rule.id,
        ruleName: rule.name,
        severity: rule.severity,
        healthScore: metrics.health.score,
        triggeredAt: new Date(),
      });

      // When database schema is ready, uncomment this:
      /*
      await prisma.systemAlert.create({
        data: {
          ruleId: rule.id,
          ruleName: rule.name,
          severity: rule.severity,
          description: rule.description,
          healthScore: metrics.health.score,
          issues: metrics.health.issues.join("; ") || null,
          triggeredAt: new Date(),
        },
      });
      */

      // TODO: Add notification integrations (email, Slack, etc.)
    } catch (error) {
      console.error("Failed to store alert:", error);
    }
  }

  /**
   * Initialize default alert rules
   */
  private initializeDefaultAlertRules(): void {
    this.alertRules = [
      {
        id: "redis_connection_down",
        name: "Redis Connection Down",
        description: "Redis connection is not healthy",
        condition: (metrics) => !metrics.redis.isHealthy,
        severity: "critical",
        cooldown: 5,
        enabled: true,
      },
      {
        id: "redis_cluster_node_down",
        name: "Redis Cluster Node Down",
        description: "One or more Redis cluster nodes are unhealthy",
        condition: (metrics) =>
          metrics.redis.cluster.isCluster &&
          metrics.redis.cluster.healthyNodes < metrics.redis.cluster.totalNodes,
        severity: "high",
        cooldown: 10,
        enabled: true,
      },
      {
        id: "redis_memory_high",
        name: "Redis Memory Usage High",
        description: "Redis memory usage is above 80%",
        condition: (metrics) =>
          metrics.redis.performance.memoryUsage.usedMB > 800, // Assume 1GB limit
        severity: "medium",
        cooldown: 15,
        enabled: true,
      },
      {
        id: "queue_system_down",
        name: "Queue System Down",
        description: "Queue system is not responding",
        condition: (metrics) => !metrics.queues.isHealthy,
        severity: "critical",
        cooldown: 5,
        enabled: true,
      },
      {
        id: "high_failed_jobs",
        name: "High Number of Failed Jobs",
        description: "Too many jobs are failing",
        condition: (metrics) => metrics.queues.totalJobs.failed > 100,
        severity: "medium",
        cooldown: 30,
        enabled: true,
      },
      {
        id: "system_memory_low",
        name: "System Memory Low",
        description: "System memory is critically low",
        condition: (metrics) =>
          (metrics.system.os.freeMemory / metrics.system.os.totalMemory) * 100 <
          10,
        severity: "high",
        cooldown: 15,
        enabled: true,
      },
      {
        id: "system_load_high",
        name: "System Load High",
        description: "System load average is very high",
        condition: (metrics) =>
          metrics.system.os.loadAverage[0] > metrics.system.os.cpus * 2,
        severity: "medium",
        cooldown: 20,
        enabled: true,
      },
      {
        id: "health_score_critical",
        name: "Health Score Critical",
        description: "Overall system health score is critically low",
        condition: (metrics) => metrics.health.score < 50,
        severity: "critical",
        cooldown: 10,
        enabled: true,
      },
      {
        id: "social_media_tokens_low",
        name: "Social Media Token Health Low",
        description: "Many social media tokens are invalid or expired",
        condition: (metrics) =>
          metrics.socialMedia.accounts.healthPercentage < 50,
        severity: "medium",
        cooldown: 60,
        enabled: true,
      },
      {
        id: "social_media_system_down",
        name: "Social Media System Down",
        description: "Social media publishing system is not healthy",
        condition: (metrics) => !metrics.socialMedia.isHealthy,
        severity: "high",
        cooldown: 15,
        enabled: true,
      },
    ];
  }

  /**
   * Get monitoring status
   */
  public getMonitoringStatus(): {
    isMonitoring: boolean;
    alertRules: AlertRule[];
    recentAlerts: Array<{
      ruleId: string;
      lastTriggered: Date;
    }>;
  } {
    return {
      isMonitoring: this.isMonitoring,
      alertRules: this.alertRules,
      recentAlerts: Array.from(this.lastAlerts.entries()).map(
        ([ruleId, lastTriggered]) => ({
          ruleId,
          lastTriggered,
        })
      ),
    };
  }

  /**
   * Add custom alert rule
   */
  public addAlertRule(rule: AlertRule): void {
    this.alertRules.push(rule);
  }

  /**
   * Remove alert rule
   */
  public removeAlertRule(ruleId: string): boolean {
    const index = this.alertRules.findIndex((rule) => rule.id === ruleId);
    if (index >= 0) {
      this.alertRules.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Update alert rule
   */
  public updateAlertRule(ruleId: string, updates: Partial<AlertRule>): boolean {
    const rule = this.alertRules.find((r) => r.id === ruleId);
    if (rule) {
      Object.assign(rule, updates);
      return true;
    }
    return false;
  }
}
