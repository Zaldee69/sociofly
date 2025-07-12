import { QueueManager } from "@/lib/queue/queue-manager";

interface ScalingConfig {
  queueName: string;
  minWorkers: number;
  maxWorkers: number;
  targetWaitingJobs: number; // Target number of waiting jobs before scaling
  scaleUpThreshold: number; // Percentage of waiting jobs to trigger scale up
  scaleDownThreshold: number; // Percentage of waiting jobs to trigger scale down
  cooldownPeriod: number; // Minutes to wait between scaling actions
  enabled: boolean;
}

interface ScalingAction {
  queueName: string;
  action: "scale_up" | "scale_down" | "no_change";
  previousWorkers: number;
  newWorkers: number;
  reason: string;
  timestamp: Date;
}

interface QueueLoadMetrics {
  queueName: string;
  waitingJobs: number;
  activeJobs: number;
  completedJobs: number;
  failedJobs: number;
  delayedJobs: number;
  currentWorkers: number;
  avgProcessingTime: number; // milliseconds
  throughput: number; // jobs per minute
  loadFactor: number; // 0-1 scale indicating load
}

export class WorkerAutoScaler {
  private static instance: WorkerAutoScaler;
  private scalingConfigs: Map<string, ScalingConfig> = new Map();
  private lastScalingActions: Map<string, Date> = new Map();
  private scalingHistory: ScalingAction[] = [];
  private isActive = false;
  private scalingInterval: NodeJS.Timeout | null = null;
  private queueManager: QueueManager | null = null;

  private constructor() {
    this.initializeDefaultConfigs();
  }

  public static getInstance(): WorkerAutoScaler {
    if (!WorkerAutoScaler.instance) {
      WorkerAutoScaler.instance = new WorkerAutoScaler();
    }
    return WorkerAutoScaler.instance;
  }

  /**
   * Start auto-scaling monitoring
   */
  public async startAutoScaling(intervalMinutes: number = 2): Promise<void> {
    if (this.isActive) {
      console.log("⚠️  Worker auto-scaling already active");
      return;
    }

    console.log(
      `🚀 Starting worker auto-scaling (interval: ${intervalMinutes} minutes)`
    );

    this.queueManager = QueueManager.getInstance();
    if (!this.queueManager) {
      throw new Error(
        "Queue Manager not available - cannot start auto-scaling"
      );
    }

    this.isActive = true;

    // Initial assessment
    await this.assessAndScale();

    // Set up periodic scaling
    this.scalingInterval = setInterval(
      () => this.assessAndScale(),
      intervalMinutes * 60 * 1000
    );
  }

  /**
   * Stop auto-scaling
   */
  public stopAutoScaling(): void {
    if (!this.isActive) {
      console.log("⚠️  Worker auto-scaling not active");
      return;
    }

    console.log("🛑 Stopping worker auto-scaling");

    this.isActive = false;

    if (this.scalingInterval) {
      clearInterval(this.scalingInterval);
      this.scalingInterval = null;
    }
  }

  /**
   * Assess queue loads and scale workers accordingly
   */
  private async assessAndScale(): Promise<void> {
    if (!this.queueManager) return;

    try {
      console.log("📊 Assessing queue loads for auto-scaling...");

      const queueMetrics = await this.collectQueueLoadMetrics();
      const scalingActions: ScalingAction[] = [];

      for (const [queueName, config] of this.scalingConfigs) {
        if (!config.enabled) continue;

        const metrics = queueMetrics.find((m) => m.queueName === queueName);
        if (!metrics) continue;

        // Check cooldown period
        const lastAction = this.lastScalingActions.get(queueName);
        if (lastAction) {
          const cooldownMs = config.cooldownPeriod * 60 * 1000;
          if (Date.now() - lastAction.getTime() < cooldownMs) {
            continue; // Still in cooldown
          }
        }

        const action = this.determineScalingAction(config, metrics);
        if (action.action !== "no_change") {
          scalingActions.push(action);
        }
      }

      // Execute scaling actions
      for (const action of scalingActions) {
        await this.executeScalingAction(action);
      }

      if (scalingActions.length > 0) {
        console.log(`✅ Executed ${scalingActions.length} scaling actions`);
      } else {
        console.log("✅ No scaling actions needed");
      }
    } catch (error) {
      console.error("❌ Failed to assess and scale workers:", error);
    }
  }

  /**
   * Collect load metrics for all queues
   */
  private async collectQueueLoadMetrics(): Promise<QueueLoadMetrics[]> {
    if (!this.queueManager) return [];

    const queueMetrics = await this.queueManager.getAllQueueMetrics();
    const loadMetrics: QueueLoadMetrics[] = [];

    for (const [queueName, metrics] of Object.entries(queueMetrics)) {
      const typedMetrics = metrics as any;

      // Calculate throughput (jobs completed per minute)
      const throughput = this.calculateThroughput(
        queueName,
        typedMetrics.completed
      );

      // Calculate average processing time
      const avgProcessingTime = this.calculateAvgProcessingTime(queueName);

      // Calculate load factor (0-1 scale)
      const loadFactor = this.calculateLoadFactor(typedMetrics);

      loadMetrics.push({
        queueName,
        waitingJobs: typedMetrics.waiting || 0,
        activeJobs: typedMetrics.active || 0,
        completedJobs: typedMetrics.completed || 0,
        failedJobs: typedMetrics.failed || 0,
        delayedJobs: typedMetrics.delayed || 0,
        currentWorkers: typedMetrics.workers || 1,
        avgProcessingTime,
        throughput,
        loadFactor,
      });
    }

    return loadMetrics;
  }

  /**
   * Determine what scaling action should be taken
   */
  private determineScalingAction(
    config: ScalingConfig,
    metrics: QueueLoadMetrics
  ): ScalingAction {
    const {
      queueName,
      minWorkers,
      maxWorkers,
      targetWaitingJobs,
      scaleUpThreshold,
      scaleDownThreshold,
    } = config;
    const { waitingJobs, currentWorkers, loadFactor } = metrics;

    let action: "scale_up" | "scale_down" | "no_change" = "no_change";
    let newWorkers = currentWorkers;
    let reason = "No scaling needed";

    // Calculate scaling factors
    const waitingJobsRatio =
      targetWaitingJobs > 0 ? waitingJobs / targetWaitingJobs : 0;
    const isHighLoad = loadFactor > 0.8; // High load threshold
    const isLowLoad = loadFactor < 0.2; // Low load threshold

    // Scale up conditions
    if (currentWorkers < maxWorkers) {
      if (
        waitingJobs > targetWaitingJobs &&
        waitingJobsRatio > scaleUpThreshold
      ) {
        action = "scale_up";
        newWorkers = Math.min(
          maxWorkers,
          currentWorkers + Math.ceil(currentWorkers * 0.5)
        ); // Scale up by 50%
        reason = `High waiting jobs: ${waitingJobs} (target: ${targetWaitingJobs})`;
      } else if (isHighLoad && waitingJobs > 0) {
        action = "scale_up";
        newWorkers = Math.min(maxWorkers, currentWorkers + 1);
        reason = `High load factor: ${loadFactor.toFixed(2)}`;
      }
    }

    // Scale down conditions
    if (currentWorkers > minWorkers && action === "no_change") {
      if (waitingJobs === 0 && isLowLoad) {
        action = "scale_down";
        newWorkers = Math.max(minWorkers, currentWorkers - 1);
        reason = `Low load and no waiting jobs`;
      } else if (waitingJobs < targetWaitingJobs * scaleDownThreshold) {
        action = "scale_down";
        newWorkers = Math.max(
          minWorkers,
          currentWorkers - Math.ceil(currentWorkers * 0.25)
        ); // Scale down by 25%
        reason = `Low waiting jobs: ${waitingJobs} (threshold: ${targetWaitingJobs * scaleDownThreshold})`;
      }
    }

    return {
      queueName,
      action,
      previousWorkers: currentWorkers,
      newWorkers,
      reason,
      timestamp: new Date(),
    };
  }

  /**
   * Execute a scaling action
   */
  private async executeScalingAction(action: ScalingAction): Promise<void> {
    if (!this.queueManager) return;

    try {
      console.log(
        `🔧 Scaling ${action.queueName}: ${action.previousWorkers} → ${action.newWorkers} workers (${action.reason})`
      );

      // Note: BullMQ doesn't support dynamic worker scaling directly
      // This would require implementing worker pool management
      // For now, we'll log the action and store it for monitoring

      // TODO: Implement actual worker scaling
      // This would involve:
      // 1. Creating new workers with new concurrency
      // 2. Gracefully shutting down old workers
      // 3. Updating the worker pool

      // Store scaling action
      this.scalingHistory.push(action);
      this.lastScalingActions.set(action.queueName, action.timestamp);

      // Keep only last 100 actions
      if (this.scalingHistory.length > 100) {
        this.scalingHistory = this.scalingHistory.slice(-100);
      }

      console.log(`✅ Scaling action logged for ${action.queueName}`);
    } catch (error) {
      console.error(
        `❌ Failed to execute scaling action for ${action.queueName}:`,
        error
      );
    }
  }

  /**
   * Calculate throughput (jobs per minute)
   */
  private calculateThroughput(
    queueName: string,
    completedJobs: number
  ): number {
    // This is a simplified calculation
    // In a real implementation, you'd track completed jobs over time
    const timeWindowMinutes = 5; // Look at last 5 minutes
    return completedJobs / timeWindowMinutes;
  }

  /**
   * Calculate average processing time
   */
  private calculateAvgProcessingTime(queueName: string): number {
    // This would need to be tracked from job completion events
    // For now, return a default value
    return 1000; // 1 second default
  }

  /**
   * Calculate load factor (0-1 scale)
   */
  private calculateLoadFactor(metrics: any): number {
    const totalJobs = (metrics.waiting || 0) + (metrics.active || 0);
    const workers = metrics.workers || 1;

    if (totalJobs === 0) return 0;

    // Simple load calculation: total jobs per worker
    const jobsPerWorker = totalJobs / workers;

    // Normalize to 0-1 scale (assuming 10 jobs per worker is max load)
    return Math.min(1, jobsPerWorker / 10);
  }

  /**
   * Initialize default scaling configurations
   */
  private initializeDefaultConfigs(): void {
    const defaultConfigs: ScalingConfig[] = [
      {
        queueName: QueueManager.QUEUES.HIGH_PRIORITY,
        minWorkers: 2,
        maxWorkers: 10,
        targetWaitingJobs: 5,
        scaleUpThreshold: 2, // Scale up when waiting jobs > 2x target
        scaleDownThreshold: 0.3, // Scale down when waiting jobs < 30% of target
        cooldownPeriod: 5, // 5 minutes
        enabled: true,
      },
      {
        queueName: QueueManager.QUEUES.SCHEDULER,
        minWorkers: 1,
        maxWorkers: 5,
        targetWaitingJobs: 3,
        scaleUpThreshold: 2,
        scaleDownThreshold: 0.3,
        cooldownPeriod: 10,
        enabled: true,
      },
      {
        queueName: QueueManager.QUEUES.NOTIFICATIONS,
        minWorkers: 3,
        maxWorkers: 20,
        targetWaitingJobs: 20,
        scaleUpThreshold: 1.5,
        scaleDownThreshold: 0.4,
        cooldownPeriod: 3,
        enabled: true,
      },
      {
        queueName: QueueManager.QUEUES.WEBHOOKS,
        minWorkers: 2,
        maxWorkers: 8,
        targetWaitingJobs: 10,
        scaleUpThreshold: 2,
        scaleDownThreshold: 0.3,
        cooldownPeriod: 5,
        enabled: true,
      },
      {
        queueName: QueueManager.QUEUES.REPORTS,
        minWorkers: 1,
        maxWorkers: 3,
        targetWaitingJobs: 2,
        scaleUpThreshold: 2,
        scaleDownThreshold: 0.5,
        cooldownPeriod: 15,
        enabled: true,
      },
      {
        queueName: QueueManager.QUEUES.SOCIAL_SYNC,
        minWorkers: 1,
        maxWorkers: 5,
        targetWaitingJobs: 5,
        scaleUpThreshold: 2,
        scaleDownThreshold: 0.3,
        cooldownPeriod: 10,
        enabled: true,
      },
      {
        queueName: QueueManager.QUEUES.MAINTENANCE,
        minWorkers: 1,
        maxWorkers: 2,
        targetWaitingJobs: 1,
        scaleUpThreshold: 3,
        scaleDownThreshold: 0.2,
        cooldownPeriod: 30,
        enabled: false, // Maintenance jobs don't need auto-scaling
      },
    ];

    for (const config of defaultConfigs) {
      this.scalingConfigs.set(config.queueName, config);
    }
  }

  /**
   * Get current scaling status
   */
  public getScalingStatus(): {
    isActive: boolean;
    configs: ScalingConfig[];
    recentActions: ScalingAction[];
    lastAssessment: Date | null;
  } {
    return {
      isActive: this.isActive,
      configs: Array.from(this.scalingConfigs.values()),
      recentActions: this.scalingHistory.slice(-20), // Last 20 actions
      lastAssessment:
        this.scalingHistory.length > 0
          ? this.scalingHistory[this.scalingHistory.length - 1].timestamp
          : null,
    };
  }

  /**
   * Update scaling configuration for a queue
   */
  public updateScalingConfig(
    queueName: string,
    updates: Partial<ScalingConfig>
  ): boolean {
    const config = this.scalingConfigs.get(queueName);
    if (config) {
      Object.assign(config, updates);
      console.log(`✅ Updated scaling config for ${queueName}`);
      return true;
    }
    return false;
  }

  /**
   * Add custom scaling configuration
   */
  public addScalingConfig(config: ScalingConfig): void {
    this.scalingConfigs.set(config.queueName, config);
    console.log(`✅ Added scaling config for ${config.queueName}`);
  }

  /**
   * Remove scaling configuration
   */
  public removeScalingConfig(queueName: string): boolean {
    const removed = this.scalingConfigs.delete(queueName);
    if (removed) {
      console.log(`✅ Removed scaling config for ${queueName}`);
    }
    return removed;
  }

  /**
   * Get queue load metrics for monitoring
   */
  public async getCurrentLoadMetrics(): Promise<QueueLoadMetrics[]> {
    return await this.collectQueueLoadMetrics();
  }

  /**
   * Manual scaling trigger
   */
  public async manualScale(
    queueName: string,
    targetWorkers: number,
    reason: string = "Manual scaling"
  ): Promise<boolean> {
    const config = this.scalingConfigs.get(queueName);
    if (!config) {
      console.error(`No scaling config found for queue: ${queueName}`);
      return false;
    }

    if (
      targetWorkers < config.minWorkers ||
      targetWorkers > config.maxWorkers
    ) {
      console.error(
        `Target workers (${targetWorkers}) outside allowed range: ${config.minWorkers}-${config.maxWorkers}`
      );
      return false;
    }

    const metrics = await this.collectQueueLoadMetrics();
    const queueMetrics = metrics.find((m) => m.queueName === queueName);

    if (!queueMetrics) {
      console.error(`No metrics found for queue: ${queueName}`);
      return false;
    }

    const action: ScalingAction = {
      queueName,
      action:
        targetWorkers > queueMetrics.currentWorkers ? "scale_up" : "scale_down",
      previousWorkers: queueMetrics.currentWorkers,
      newWorkers: targetWorkers,
      reason: `Manual: ${reason}`,
      timestamp: new Date(),
    };

    await this.executeScalingAction(action);
    return true;
  }
}
