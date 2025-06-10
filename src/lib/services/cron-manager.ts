import * as cron from "node-cron";
import { QueueManager } from "@/lib/queue/queue-manager";
import { JobType } from "@/lib/queue/job-types";
import { SchedulerService } from "./scheduler.service";
import { prisma } from "@/lib/prisma/client";
import { checkRedisConnection } from "@/lib/queue/redis-connection";

interface CronJobConfig {
  name: string;
  schedule: string;
  description: string;
  enabled: boolean;
  useQueue: boolean; // Whether to use BullMQ for this job
  queueName?: string;
  jobType?: JobType;
  handler: () => Promise<any>;
}

export class CronManager {
  private static cronJobs: Map<string, cron.ScheduledTask> = new Map();
  private static jobStatuses: Map<string, boolean> = new Map();
  private static queueManager: QueueManager | null = null;
  private static isInitialized = false;
  private static useQueues = false;

  /**
   * Initialize cron manager with both node-cron and BullMQ
   */
  static async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log("⚠️  Cron Manager already initialized");
      return;
    }

    console.log("🚀 Initializing Cron Manager...");

    try {
      // Check if Redis is available for BullMQ
      const redisAvailable = await checkRedisConnection();

      if (redisAvailable) {
        console.log("✅ Redis available - Initializing BullMQ...");
        this.queueManager = QueueManager.getInstance();
        await this.queueManager.initialize();
        this.useQueues = true;
      } else {
        console.log("⚠️  Redis not available - Using node-cron only");
        this.useQueues = false;
      }

      // Initialize job configurations
      const jobConfigs: CronJobConfig[] = [
        {
          name: "publish_due_posts",
          schedule: "*/5 * * * *", // Every 5 minutes
          description: "Publish posts that are due for publication",
          enabled: process.env.CRON_PUBLISH_ENABLED !== "false",
          useQueue: this.useQueues,
          queueName: QueueManager.QUEUES.SCHEDULER,
          jobType: JobType.PUBLISH_POST,
          handler: this.handlePublishDuePosts,
        },
        {
          name: "process_edge_cases",
          schedule: "0 */1 * * *", // Every hour
          description: "Process approval system edge cases",
          enabled: process.env.CRON_EDGE_CASES_ENABLED !== "false",
          useQueue: this.useQueues,
          queueName: QueueManager.QUEUES.HIGH_PRIORITY,
          jobType: JobType.PROCESS_APPROVAL,
          handler: this.handleProcessEdgeCases,
        },
        {
          name: "check_expired_tokens",
          schedule: "0 2 * * *", // Daily at 2 AM
          description: "Check for expired social account tokens",
          enabled: process.env.CRON_TOKEN_CHECK_ENABLED !== "false",
          useQueue: this.useQueues,
          queueName: QueueManager.QUEUES.MAINTENANCE,
          jobType: JobType.CHECK_EXPIRED_TOKENS,
          handler: this.handleCheckExpiredTokens,
        },
        {
          name: "system_health_check",
          schedule: "*/15 * * * *", // Every 15 minutes
          description: "Monitor system health and log metrics",
          enabled: process.env.CRON_HEALTH_CHECK_ENABLED !== "false",
          useQueue: this.useQueues,
          queueName: QueueManager.QUEUES.MAINTENANCE,
          jobType: JobType.SYSTEM_HEALTH_CHECK,
          handler: this.handleSystemHealthCheck,
        },
        {
          name: "cleanup_old_logs",
          schedule: "0 3 * * 0", // Weekly on Sunday at 3 AM
          description: "Clean up old cron logs (keep last 30 days)",
          enabled: process.env.CRON_CLEANUP_ENABLED !== "false",
          useQueue: this.useQueues,
          queueName: QueueManager.QUEUES.MAINTENANCE,
          jobType: JobType.CLEANUP_OLD_LOGS,
          handler: this.handleCleanupOldLogs,
        },
        {
          name: "analyze_engagement_hotspots",
          schedule: "0 4 * * *", // Daily at 4 AM
          description: "Analyze social media engagement hotspots",
          enabled: process.env.CRON_HOTSPOT_ANALYSIS_ENABLED !== "false",
          useQueue: this.useQueues,
          queueName: QueueManager.QUEUES.MAINTENANCE,
          jobType: JobType.ANALYZE_HOTSPOTS,
          handler: this.handleAnalyzeHotspots,
        },
        {
          name: "fetch_account_insights",
          schedule: "0 5 * * *", // Daily at 5 AM
          description: "Fetch account-level insights for all social accounts",
          enabled: process.env.CRON_ACCOUNT_INSIGHTS_ENABLED !== "false",
          useQueue: this.useQueues,
          queueName: QueueManager.QUEUES.MAINTENANCE,
          jobType: JobType.ANALYZE_ACCOUNT_INSIGHTS,
          handler: this.handleAccountInsights,
        },
      ];

      // Register and start jobs
      for (const config of jobConfigs) {
        if (config.enabled) {
          this.registerJob(config);
        } else {
          console.log(`⏸️  Skipping disabled job: ${config.name}`);
        }
      }

      this.isInitialized = true;
      console.log("✅ Cron Manager initialized successfully");

      // Log startup
      await this.logActivity(
        "enhanced_cron_manager_started",
        "SUCCESS",
        `Cron Manager initialized with ${this.useQueues ? "BullMQ" : "node-cron only"}`
      );
    } catch (error) {
      console.error("❌ Failed to initialize Cron Manager:", error);
      throw error;
    }
  }

  /**
   * Register and start a cron job
   */
  private static registerJob(config: CronJobConfig): void {
    if (
      config.useQueue &&
      this.queueManager &&
      config.queueName &&
      config.jobType
    ) {
      // Use BullMQ for job scheduling
      this.scheduleQueueJob(config);
    } else {
      // Fall back to node-cron
      this.scheduleNodeCronJob(config);
    }

    this.jobStatuses.set(config.name, true);
    console.log(
      `🕒 Registered ${config.useQueue ? "queue" : "cron"} job: ${config.name} (${config.schedule}) - ${config.description}`
    );
  }

  /**
   * Schedule job using BullMQ
   */
  private static async scheduleQueueJob(config: CronJobConfig): Promise<void> {
    if (!this.queueManager || !config.queueName || !config.jobType) {
      return;
    }

    try {
      await this.queueManager.scheduleRecurringJob(
        config.queueName,
        config.jobType,
        {
          checkType: "quick" as any, // For health checks
          olderThanDays: 30, // For cleanup jobs
        } as any, // Temporary fix for type compatibility
        config.schedule,
        {
          attempts: 3,
          backoff: { type: "exponential", delay: 2000 },
          removeOnComplete: 10,
          removeOnFail: 5,
        }
      );

      console.log(
        `📋 Scheduled queue job: ${config.name} in queue ${config.queueName}`
      );
    } catch (error) {
      console.error(`❌ Failed to schedule queue job ${config.name}:`, error);
      // Fall back to node-cron
      this.scheduleNodeCronJob(config);
    }
  }

  /**
   * Schedule job using node-cron
   */
  private static scheduleNodeCronJob(config: CronJobConfig): void {
    const task = cron.schedule(
      config.schedule,
      async () => {
        await this.executeJob(config);
      },
      {
        timezone: process.env.TZ || "Asia/Jakarta",
      }
    );

    this.cronJobs.set(config.name, task);
    console.log(`⏰ Scheduled cron job: ${config.name}`);
  }

  /**
   * Execute a job with error handling and logging
   */
  private static async executeJob(config: CronJobConfig): Promise<void> {
    const startTime = Date.now();
    console.log(`🚀 Executing job: ${config.name}`);

    try {
      await this.logActivity(
        config.name,
        "STARTED",
        `Job ${config.name} started`
      );

      const executionTime = Date.now() - startTime;

      console.log(`✅ Completed job: ${config.name} (${executionTime}ms)`);

      await this.logActivity(
        config.name,
        "SUCCESS",
        `Job ${config.name} completed successfully in ${executionTime}ms`
      );
    } catch (error) {
      console.error(`❌ Error in job ${config.name}:`, error);

      await this.logActivity(
        config.name,
        "ERROR",
        `Job ${config.name} failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Job Handlers (same as original CronManager)
   */
  private static async handlePublishDuePosts(): Promise<any> {
    return await SchedulerService.processDuePublications();
  }

  private static async handleProcessEdgeCases(): Promise<any> {
    return await SchedulerService.processApprovalEdgeCases();
  }

  private static async handleCheckExpiredTokens(): Promise<any> {
    return await SchedulerService.checkExpiredTokens();
  }

  private static async handleSystemHealthCheck(): Promise<any> {
    return await SchedulerService.getApprovalSystemHealth();
  }

  private static async handleCleanupOldLogs(): Promise<any> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 30);

    const result = await prisma.cronLog.deleteMany({
      where: {
        executedAt: {
          lt: cutoffDate,
        },
      },
    });

    return { deletedCount: result.count, cutoffDate };
  }

  private static async handleAnalyzeHotspots(): Promise<any> {
    return await SchedulerService.runHotspotAnalysisForAllAccounts();
  }

  private static async handleAccountInsights(): Promise<any> {
    return await SchedulerService.runAccountInsightsForAllAccounts();
  }

  /**
   * Queue a one-time job
   */
  static async queueJob(
    queueName: string,
    jobType: JobType,
    data: any,
    options?: any
  ): Promise<void> {
    if (!this.useQueues || !this.queueManager) {
      throw new Error("Queue system not available. Redis connection required.");
    }

    try {
      const job = await this.queueManager.addJob(
        queueName,
        jobType,
        data,
        options
      );
      console.log(`📤 Queued job: ${jobType} (ID: ${job.id})`);
    } catch (error) {
      console.error(`❌ Failed to queue job ${jobType}:`, error);
      throw error;
    }
  }

  /**
   * Get enhanced status including both cron jobs and queues
   */
  static async getStatus(): Promise<any> {
    const cronStatus = Array.from(this.jobStatuses.entries()).map(
      ([name, running]) => ({
        name,
        running,
        type: "cron",
      })
    );

    let queueMetrics = {};
    if (this.useQueues && this.queueManager) {
      try {
        queueMetrics = await this.queueManager.getAllQueueMetrics();
      } catch (error) {
        console.error("Failed to get queue metrics:", error);
      }
    }

    return {
      initialized: this.isInitialized,
      useQueues: this.useQueues,
      cronJobs: cronStatus,
      queueMetrics,
      totalJobs: cronStatus.length,
      runningJobs: cronStatus.filter((job) => job.running).length,
    };
  }

  /**
   * Stop all jobs and cleanup
   */
  static async stopAll(): Promise<void> {
    console.log("🛑 Stopping all jobs...");

    // Stop cron jobs
    for (const [name, task] of this.cronJobs) {
      task.stop();
      this.jobStatuses.set(name, false);
    }

    // Shutdown queue manager
    if (this.queueManager) {
      await this.queueManager.shutdown();
    }

    this.isInitialized = false;
    console.log("✅ All jobs stopped");
  }

  /**
   * Log activity
   */
  private static async logActivity(
    name: string,
    status: string,
    message: string
  ): Promise<void> {
    try {
      await prisma.cronLog.create({
        data: {
          name: `enhanced_${name}`,
          status,
          message,
        },
      });
    } catch (error) {
      console.error("Failed to log activity:", error);
    }
  }

  /**
   * Get queue manager instance
   */
  static getQueueManager(): QueueManager | null {
    return this.queueManager;
  }

  /**
   * Check if using queues
   */
  static isUsingQueues(): boolean {
    return this.useQueues;
  }

  /**
   * Get job execution logs for stats
   */
  static async getJobLogs(): Promise<any> {
    try {
      // Get logs from the last 24 hours
      const oneDayAgo = new Date();
      oneDayAgo.setHours(oneDayAgo.getHours() - 24);

      const logs = await prisma.cronLog.findMany({
        where: {
          executedAt: {
            gte: oneDayAgo,
          },
        },
        orderBy: {
          executedAt: "desc",
        },
      });

      // Group logs by job name and calculate stats
      const jobStats: Record<string, any> = {};

      logs.forEach((log) => {
        // Remove 'enhanced_' prefix from the name
        const jobName = log.name.replace(/^enhanced_/, "");

        if (!jobStats[jobName]) {
          jobStats[jobName] = {
            total: 0,
            success: 0,
            error: 0,
            warning: 0,
            started: 0,
            lastRun: null,
          };
        }

        jobStats[jobName].total++;

        switch (log.status) {
          case "SUCCESS":
            jobStats[jobName].success++;
            // Update last successful run
            if (
              !jobStats[jobName].lastRun ||
              log.executedAt > jobStats[jobName].lastRun
            ) {
              jobStats[jobName].lastRun = log.executedAt;
            }
            break;
          case "ERROR":
            jobStats[jobName].error++;
            break;
          case "WARNING":
            jobStats[jobName].warning++;
            break;
          case "STARTED":
            jobStats[jobName].started++;
            break;
        }
      });

      return {
        period: "Last 24 hours",
        totalLogs: logs.length,
        jobs: jobStats,
      };
    } catch (error) {
      console.error("Error fetching job logs:", error);
      return {
        period: "Last 24 hours",
        totalLogs: 0,
        jobs: {},
      };
    }
  }

  /**
   * Manually trigger a specific job
   */
  static async triggerJob(jobName: string): Promise<any> {
    console.log(`🔥 Manually triggering job: ${jobName}`);

    // Job configurations mapping
    const jobHandlers: { [key: string]: () => Promise<any> } = {
      publish_due_posts: this.handlePublishDuePosts,
      process_edge_cases: this.handleProcessEdgeCases,
      check_expired_tokens: this.handleCheckExpiredTokens,
      system_health_check: this.handleSystemHealthCheck,
      cleanup_old_logs: this.handleCleanupOldLogs,
      analyze_engagement_hotspots: this.handleAnalyzeHotspots,
      fetch_account_insights: this.handleAccountInsights,
    };

    const handler = jobHandlers[jobName];
    if (!handler) {
      throw new Error(`Unknown job: ${jobName}`);
    }

    const startTime = Date.now();
    try {
      await this.logActivity(
        jobName,
        "STARTED",
        `Job ${jobName} manually triggered`
      );

      const result = await handler.call(this);
      const executionTime = Date.now() - startTime;

      await this.logActivity(
        jobName,
        "SUCCESS",
        `Job ${jobName} completed successfully in ${executionTime}ms (manual trigger)`
      );

      return {
        message: `Job ${jobName} executed successfully`,
        executionTime,
        result,
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      await this.logActivity(
        jobName,
        "ERROR",
        `Job ${jobName} failed: ${error instanceof Error ? error.message : String(error)} (manual trigger)`
      );

      throw new Error(
        `Job ${jobName} failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Start a specific cron job
   */
  static async startJob(jobName: string): Promise<any> {
    const task = this.cronJobs.get(jobName);
    if (!task) {
      throw new Error(`Job ${jobName} not found`);
    }

    task.start();
    this.jobStatuses.set(jobName, true);

    await this.logActivity(
      jobName,
      "STARTED",
      `Job ${jobName} started manually`
    );

    return { message: `Job ${jobName} started` };
  }

  /**
   * Stop a specific cron job
   */
  static async stopJob(jobName: string): Promise<any> {
    const task = this.cronJobs.get(jobName);
    if (!task) {
      throw new Error(`Job ${jobName} not found`);
    }

    task.stop();
    this.jobStatuses.set(jobName, false);

    await this.logActivity(
      jobName,
      "STOPPED",
      `Job ${jobName} stopped manually`
    );

    return { message: `Job ${jobName} stopped` };
  }
}
