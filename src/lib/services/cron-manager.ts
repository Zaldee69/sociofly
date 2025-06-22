// job-scheduler.ts - Redis Queue Job Scheduler Manager
import { QueueManager } from "@/lib/queue/queue-manager";
import { JobType } from "@/lib/queue/job-types";
import { JOB_CONSTANTS } from "@/lib/queue/job-constants";
import { prisma } from "@/lib/prisma/client";
import { UnifiedRedisManager } from "./unified-redis-manager";

interface ScheduledJobConfig {
  name: string;
  schedule: string;
  description: string;
  enabled: boolean;
  queueName: string;
  jobType: JobType;
  jobData: any;
  priority?: number;
}

export class JobSchedulerManager {
  private static instance: JobSchedulerManager;
  private static isInitialized = false;
  private static queueManager: QueueManager | null = null;
  private static redisManager: UnifiedRedisManager | null = null;
  private static useQueues = false;

  private constructor() {}

  public static getInstance(): JobSchedulerManager {
    if (!JobSchedulerManager.instance) {
      JobSchedulerManager.instance = new JobSchedulerManager();
    }
    return JobSchedulerManager.instance;
  }

  /**
   * Initialize job scheduler manager
   */
  public static async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log("⚠️  Job Scheduler Manager already initialized");
      return;
    }

    console.log("🚀 Initializing Job Scheduler Manager (Redis Queue Only)...");

    try {
      // Initialize Redis connection
      this.redisManager = UnifiedRedisManager.getInstance();
      await this.redisManager.initialize();

      // Ensure Redis is available - no fallback mode
      if (!this.redisManager.isAvailable()) {
        throw new Error(
          "Redis is required for job scheduling. Please ensure Redis is running."
        );
      }

      console.log("✅ Redis available - Initializing QueueManager...");
      this.queueManager = QueueManager.getInstance();
      await this.queueManager.initialize();
      this.useQueues = true;

      // Setup job configurations (Queue-only)
      await this.setupJobs();

      this.isInitialized = true;
      console.log(
        "✅ Job Scheduler Manager initialized successfully (Redis Queue Only)"
      );

      await this.logActivity(
        "job_scheduler_manager_started",
        "SUCCESS",
        `Job Scheduler Manager initialized with Redis BullMQ only`
      );
    } catch (error) {
      console.error("❌ Failed to initialize Job Scheduler Manager:", error);
      throw error;
    }
  }

  /**
   * Setup all job configurations - CLEANED UP VERSION
   */
  private static async setupJobs(): Promise<void> {
    const jobConfigs: ScheduledJobConfig[] = [
      // Core system jobs
      {
        name: "publish_due_posts",
        schedule: "*/10 * * * *", // Every 10 minutes
        description: "Publish posts that are due for publishing",
        enabled: process.env.CRON_PUBLISH_ENABLED !== "false",
        queueName: QueueManager.QUEUES.HIGH_PRIORITY,
        jobType: JobType.PUBLISH_POST,
        jobData: {
          batchSize: parseInt(process.env.PUBLISH_BATCH_SIZE || "10"),
          processDue: true,
        },
      },
      {
        name: "check_expired_tokens",
        schedule: "0 */6 * * *", // Every 6 hours
        description: "Check and refresh expired social media tokens",
        enabled: process.env.CRON_TOKEN_CHECK_ENABLED !== "false",
        queueName: QueueManager.QUEUES.MAINTENANCE,
        jobType: JobType.CHECK_EXPIRED_TOKENS,
        jobData: {
          renewalThresholdHours: 24,
          autoRenew: process.env.AUTO_RENEW_TOKENS === "true",
        },
      },
      {
        name: "system_health_check",
        schedule: "*/15 * * * *", // Every 15 minutes
        description: "Perform system health checks",
        enabled: process.env.CRON_HEALTH_CHECK_ENABLED !== "false",
        queueName: QueueManager.QUEUES.MAINTENANCE,
        jobType: JobType.SYSTEM_HEALTH_CHECK,
        jobData: {
          checkRedis: true,
          checkDatabase: true,
          checkQueues: true,
          alertThresholds: {
            queueSize: 1000,
            failureRate: 0.1,
          },
        },
      },
      {
        name: "cleanup_old_logs",
        schedule: "0 2 * * *", // Daily at 2 AM
        description: "Clean up old logs and temporary data",
        enabled: process.env.CRON_CLEANUP_ENABLED !== "false",
        queueName: QueueManager.QUEUES.MAINTENANCE,
        jobType: JobType.CLEANUP_OLD_LOGS,
        jobData: {
          retentionDays: parseInt(process.env.LOG_RETENTION_DAYS || "30"),
          cleanupTypes: ["logs", "temp_data", "failed_jobs"],
        },
      },

      // NEW: Consolidated Webhook-Free Sync Strategy (REMOVED DUPLICATES)
      {
        name: "incremental_sync",
        schedule: "0 */2 * * *", // Every 2 hours
        description:
          "Incremental sync - new posts and recent engagement updates",
        enabled: process.env.CRON_INCREMENTAL_SYNC_ENABLED !== "false",
        queueName: QueueManager.QUEUES.SOCIAL_SYNC,
        jobType: JobType.INCREMENTAL_SYNC,
        jobData: {
          accountId: "system", // Process all accounts
          teamId: "system",
          platform: "all",
          limit: 25,
          priority: "normal",
        },
        priority: 2,
      },
      {
        name: "daily_sync",
        schedule: "0 1 * * *", // Daily at 1:00 AM
        description:
          "Daily comprehensive sync - follower growth, demographics, hashtags",
        enabled: process.env.CRON_DAILY_SYNC_ENABLED !== "false",
        queueName: QueueManager.QUEUES.SOCIAL_SYNC,
        jobType: JobType.DAILY_SYNC,
        jobData: {
          accountId: "system", // Process all accounts
          teamId: "system",
          platform: "all",
          includeAudience: true,
          includeHashtags: true,
          includeLinks: true,
          priority: "normal",
        },
        priority: 1,
      },

      // Historical data collection (weekly)
      {
        name: "collect_historical_data",
        schedule: "0 3 * * 1", // Weekly on Monday at 3 AM
        description: "Collect historical data for new accounts",
        enabled: process.env.CRON_HISTORICAL_DATA_ENABLED !== "false",
        queueName: QueueManager.QUEUES.SOCIAL_SYNC,
        jobType: JobType.COLLECT_HISTORICAL_DATA,
        jobData: {
          userId: "system",
          daysBack: 90,
          priority: "normal",
          collectTypes: ["posts", "audience", "hashtags", "links"],
          immediate: false,
        },
      },
    ];

    // Register enabled jobs
    for (const config of jobConfigs) {
      if (config.enabled) {
        await this.registerJob(config);
      } else {
        console.log(`⏸️  Skipping disabled job: ${config.name}`);
      }
    }
  }

  /**
   * Register a job (queue-only, no fallback)
   */
  private static async registerJob(config: ScheduledJobConfig): Promise<void> {
    try {
      if (!this.queueManager) {
        throw new Error("Queue Manager not available. Redis is required.");
      }

      // ✅ Use BullMQ for job scheduling only
      await this.scheduleQueueJob(config);
      console.log(
        `📋 Registered queue job: ${config.name} (${config.schedule})`
      );
    } catch (error) {
      console.error(`❌ Failed to register job ${config.name}:`, error);
      throw error; // Don't fallback, throw error instead
    }
  }

  /**
   * Schedule job using QueueManager (BullMQ)
   */
  private static async scheduleQueueJob(
    config: ScheduledJobConfig
  ): Promise<void> {
    if (!this.queueManager) {
      throw new Error("QueueManager not available");
    }

    await this.queueManager.scheduleRecurringJob(
      config.queueName,
      config.jobType,
      config.jobData,
      config.schedule,
      {
        attempts: JOB_CONSTANTS.RETRY_CONFIG.DEFAULT_ATTEMPTS,
        backoff: {
          type: "exponential",
          delay: JOB_CONSTANTS.RETRY_CONFIG.EXPONENTIAL_DELAY,
        },
        removeOnComplete: JOB_CONSTANTS.CLEANUP_CONFIG.KEEP_COMPLETED,
        removeOnFail: JOB_CONSTANTS.CLEANUP_CONFIG.KEEP_FAILED,
        priority: config.priority || 1,
      }
    );
  }

  /**
   * Get comprehensive status (queue only) with enhanced metrics
   */
  public static async getStatus(): Promise<any> {
    const status = {
      initialized: this.isInitialized,
      useQueues: this.useQueues,
      redisAvailable: this.redisManager?.isAvailable() || false,
      queueManagerReady: this.queueManager?.isReady() || false,
      queueMetrics: {},
      redisInfo: this.redisManager?.getConnectionInfo() || null,
      scheduledJobs: [] as Array<{ name: string; running: boolean }>,
      // Enhanced metrics for better tracking
      systemHealth: {
        totalJobs: 0,
        completedJobs: 0,
        failedJobs: 0,
        activeJobs: 0,
        waitingJobs: 0,
        successRate: 0,
        lastUpdated: new Date().toISOString(),
      },
    };

    if (this.queueManager) {
      try {
        const queueMetrics = await this.queueManager.getAllQueueMetrics();
        status.queueMetrics = queueMetrics;

        // Calculate enhanced system health metrics
        let totalCompleted = 0;
        let totalFailed = 0;
        let totalActive = 0;
        let totalWaiting = 0;

        Object.values(queueMetrics).forEach((metrics: any) => {
          totalCompleted += metrics.completed || 0;
          totalFailed += metrics.failed || 0;
          totalActive += metrics.active || 0;
          totalWaiting += metrics.waiting || 0;
        });

        const totalJobs = totalCompleted + totalFailed;
        status.systemHealth = {
          totalJobs,
          completedJobs: totalCompleted,
          failedJobs: totalFailed,
          activeJobs: totalActive,
          waitingJobs: totalWaiting,
          successRate:
            totalJobs > 0 ? Math.round((totalCompleted / totalJobs) * 100) : 0,
          lastUpdated: new Date().toISOString(),
        };
      } catch (error) {
        console.error("Failed to get queue metrics:", error);
      }
    }

    // Add job status information for frontend (queue-based only)
    const availableJobs = this.getAvailableJobs();
    const jobStatusArray = availableJobs.map((jobName) => ({
      name: jobName,
      running: (this.isInitialized && this.queueManager?.isReady()) || false,
    }));

    status.scheduledJobs = jobStatusArray;

    return status;
  }

  /**
   * Get detailed job execution history with better persistence
   */
  public static async getJobHistory(hours: number = 24): Promise<any> {
    try {
      // Get both queue metrics and database logs for comprehensive history
      const queueMetrics = this.queueManager
        ? await this.queueManager.getAllQueueMetrics()
        : {};
      const databaseLogs = await this.getJobLogs(hours);

      // Combine queue metrics with database logs for complete picture
      const combinedHistory = {
        period: `Last ${hours} hours`,
        queueMetrics,
        databaseLogs,
        summary: {
          totalQueueJobs: Object.values(queueMetrics).reduce(
            (sum: number, queue: any) =>
              sum + (queue.completed || 0) + (queue.failed || 0),
            0
          ),
          totalDatabaseLogs: databaseLogs.totalLogs,
          lastUpdated: new Date().toISOString(),
        },
      };

      return combinedHistory;
    } catch (error) {
      console.error("Error fetching job history:", error);
      return {
        period: `Last ${hours} hours`,
        queueMetrics: {},
        databaseLogs: { totalLogs: 0, jobs: {}, recentLogs: [] },
        summary: {
          totalQueueJobs: 0,
          totalDatabaseLogs: 0,
          lastUpdated: new Date().toISOString(),
        },
      };
    }
  }

  /**
   * Manually trigger a job
   */
  public static async triggerJob(jobName: string, jobData?: any): Promise<any> {
    console.log(`🔥 Manually triggering job: ${jobName}`);

    if (!this.queueManager) {
      throw new Error(
        "Queue Manager not available. Redis is required for job execution."
      );
    }

    // Use queue for immediate execution
    const queueName = this.getQueueNameForJob(jobName);
    const jobType = this.getJobTypeForJob(jobName);

    if (!queueName || !jobType) {
      throw new Error(`Unknown job configuration for: ${jobName}`);
    }

    const job = await this.queueManager.addJob(
      queueName,
      jobType,
      jobData || this.getDefaultJobData(jobType),
      { priority: 10 } // High priority for manual triggers
    );

    return {
      message: `Job ${jobName} queued successfully`,
      jobId: job.id,
      queueName,
      jobType,
    };
  }

  /**
   * Get job logs and statistics
   */
  public static async getJobLogs(hours: number = 24): Promise<any> {
    try {
      const timeAgo = new Date();
      timeAgo.setHours(timeAgo.getHours() - hours);

      const logs = await prisma.taskLog.findMany({
        where: {
          executedAt: {
            gte: timeAgo,
          },
        },
        orderBy: {
          executedAt: "desc",
        },
      });

      // Group logs by job name and calculate stats
      const jobStats: Record<string, any> = {};

      logs.forEach((log: any) => {
        // Remove 'enhanced_' or 'queue_' prefix from the name
        const jobName = log.name.replace(/^(enhanced_|queue_)/, "");

        if (!jobStats[jobName]) {
          jobStats[jobName] = {
            total: 0,
            success: 0,
            error: 0,
            started: 0,
            lastRun: null,
            lastStatus: null,
          };
        }

        jobStats[jobName].total++;

        switch (log.status) {
          case "SUCCESS":
            jobStats[jobName].success++;
            if (
              !jobStats[jobName].lastRun ||
              log.executedAt > jobStats[jobName].lastRun
            ) {
              jobStats[jobName].lastRun = log.executedAt;
              jobStats[jobName].lastStatus = "SUCCESS";
            }
            break;
          case "ERROR":
            jobStats[jobName].error++;
            jobStats[jobName].lastStatus = "ERROR";
            break;
          case "STARTED":
            jobStats[jobName].started++;
            break;
        }
      });

      return {
        period: `Last ${hours} hours`,
        totalLogs: logs.length,
        jobs: jobStats,
        recentLogs: logs.slice(0, 10), // Last 10 logs
      };
    } catch (error) {
      console.error("Error fetching job logs:", error);
      return {
        period: `Last ${hours} hours`,
        totalLogs: 0,
        jobs: {},
        recentLogs: [],
      };
    }
  }

  /**
   * Pause a specific job (queue only)
   */
  public static async pauseJob(jobName: string): Promise<any> {
    if (!this.queueManager) {
      throw new Error("Queue Manager not available. Redis is required.");
    }

    const queueName = this.getQueueNameForJob(jobName);
    if (!queueName) {
      throw new Error(`Queue configuration not found for job: ${jobName}`);
    }

    await this.queueManager.pauseQueue(queueName);
    return { message: `Queue ${queueName} paused` };
  }

  /**
   * Resume a specific job (queue only)
   */
  public static async resumeJob(jobName: string): Promise<any> {
    if (!this.queueManager) {
      throw new Error("Queue Manager not available. Redis is required.");
    }

    const queueName = this.getQueueNameForJob(jobName);
    if (!queueName) {
      throw new Error(`Queue configuration not found for job: ${jobName}`);
    }

    await this.queueManager.resumeQueue(queueName);
    return { message: `Queue ${queueName} resumed` };
  }

  /**
   * Get Redis performance metrics
   */
  public static async getRedisMetrics(): Promise<any> {
    if (!this.redisManager) {
      return { error: "Redis manager not available" };
    }

    try {
      const metrics = await this.redisManager.getPerformanceMetrics();
      const connectionInfo = this.redisManager.getConnectionInfo();

      return {
        connectionInfo,
        performance: metrics,
        isAvailable: this.redisManager.isAvailable(),
        healthCheck: await this.redisManager.healthCheck(),
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : "Unknown error",
        isAvailable: false,
        healthCheck: false,
      };
    }
  }

  /**
   * Clean up old queue jobs
   */
  public static async cleanupQueues(
    olderThanMs: number = JOB_CONSTANTS.CLEANUP_CONFIG.DEFAULT_CLEANUP_AGE_MS
  ): Promise<any> {
    if (!this.useQueues || !this.queueManager) {
      return { error: "Queue system not available" };
    }

    const results = [];
    const queueNames = Object.values(QueueManager.QUEUES);

    for (const queueName of queueNames) {
      try {
        await this.queueManager.cleanQueue(queueName, "completed", olderThanMs);
        await this.queueManager.cleanQueue(queueName, "failed", olderThanMs);
        results.push({ queue: queueName, status: "cleaned" });
      } catch (error) {
        results.push({
          queue: queueName,
          status: "error",
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return { results, cleanedAge: olderThanMs };
  }

  /**
   * Graceful shutdown (queue only)
   */
  public static async shutdown(): Promise<void> {
    console.log("🛑 Shutting down Job Scheduler Manager (Queue Only)...");

    // Shutdown queue manager
    if (this.queueManager) {
      await this.queueManager.shutdown();
      this.queueManager = null;
    }

    // Shutdown Redis manager
    if (this.redisManager) {
      await this.redisManager.shutdown();
      this.redisManager = null;
    }

    this.isInitialized = false;
    this.useQueues = false;
    console.log("✅ Job Scheduler Manager shutdown complete");
  }

  /**
   * UPDATED Helper methods - Now includes ALL jobs
   */
  private static getQueueNameForJob(jobName: string): string | null {
    const mapping: { [key: string]: string } = {
      publish_due_posts: QueueManager.QUEUES.HIGH_PRIORITY,
      check_expired_tokens: QueueManager.QUEUES.MAINTENANCE,
      system_health_check: QueueManager.QUEUES.MAINTENANCE,
      cleanup_old_logs: QueueManager.QUEUES.MAINTENANCE,
      incremental_sync: QueueManager.QUEUES.SOCIAL_SYNC,
      daily_sync: QueueManager.QUEUES.SOCIAL_SYNC,
      collect_historical_data: QueueManager.QUEUES.SOCIAL_SYNC,
    };
    return mapping[jobName] || null;
  }

  private static getJobTypeForJob(jobName: string): JobType | null {
    const mapping: { [key: string]: JobType } = {
      publish_due_posts: JobType.PUBLISH_POST,
      check_expired_tokens: JobType.CHECK_EXPIRED_TOKENS,
      system_health_check: JobType.SYSTEM_HEALTH_CHECK,
      cleanup_old_logs: JobType.CLEANUP_OLD_LOGS,
      incremental_sync: JobType.INCREMENTAL_SYNC,
      daily_sync: JobType.DAILY_SYNC,
      collect_historical_data: JobType.COLLECT_HISTORICAL_DATA,
    };
    return mapping[jobName] || null;
  }

  private static getDefaultJobData(jobType: JobType): any {
    // Return appropriate default job data based on job type
    switch (jobType) {
      case JobType.PUBLISH_POST:
        return {
          postId: JOB_CONSTANTS.SPECIAL_POST_IDS.BATCH_DUE_POSTS,
          userId: "system",
          platform: "all",
          scheduledAt: new Date(),
          content: { text: "Manual trigger batch processing" },
        };
      case JobType.CHECK_EXPIRED_TOKENS:
        return { userId: "system", platform: "all" };
      case JobType.SYSTEM_HEALTH_CHECK:
        return {
          checkType: JOB_CONSTANTS.HEALTH_CHECK_TYPES.QUICK,
          alertThreshold: 70,
        };
      case JobType.CLEANUP_OLD_LOGS:
        return {
          olderThanDays: JOB_CONSTANTS.CLEANUP_CONFIG.LOG_CLEANUP_DAYS,
          logType: JOB_CONSTANTS.LOG_TYPES.ALL,
        };
      case JobType.INCREMENTAL_SYNC:
        return {
          accountId: "system",
          teamId: "system",
          platform: "all",
          limit: 25,
          priority: "normal",
        };
      case JobType.DAILY_SYNC:
        return {
          accountId: "system",
          teamId: "system",
          platform: "all",
          includeAudience: true,
          includeHashtags: true,
          includeLinks: true,
          priority: "normal",
        };
      case JobType.COLLECT_HISTORICAL_DATA:
        return {
          userId: "system",
          daysBack: 90,
          priority: "normal",
          collectTypes: ["posts", "audience", "hashtags", "links"],
          immediate: false,
        };
      default:
        return { userId: "system" };
    }
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
      await prisma.taskLog.create({
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
   * Get Redis manager instance
   */
  public static getRedisManager(): UnifiedRedisManager | null {
    return this.redisManager;
  }

  /**
   * Get queue manager instance
   */
  public static getQueueManager(): QueueManager | null {
    return this.queueManager;
  }

  /**
   * Check if system is using queues (always true now)
   */
  public static isUsingQueues(): boolean {
    return this.useQueues;
  }

  /**
   * Queue a job directly (used by API)
   */
  public static async queueJob(
    queueName: string,
    jobType: JobType,
    jobData: any,
    options?: any
  ): Promise<any> {
    if (!this.useQueues || !this.queueManager) {
      throw new Error("Queue system not available");
    }

    return await this.queueManager.addJob(queueName, jobType, jobData, options);
  }

  /**
   * Stop all jobs (queue only)
   */
  public static async stopAll(): Promise<void> {
    console.log("⏹️ Stopping all jobs (queue only)...");

    if (!this.queueManager) {
      throw new Error("Queue Manager not available. Redis is required.");
    }

    // Pause all queues
    const queueNames = Object.values(QueueManager.QUEUES);
    for (const queueName of queueNames) {
      try {
        await this.queueManager.pauseQueue(queueName);
        console.log(`⏸️ Paused queue: ${queueName}`);
      } catch (error) {
        console.error(`Failed to pause queue ${queueName}:`, error);
      }
    }

    console.log("✅ All jobs stopped");
  }

  /**
   * Start a specific job
   */
  public static async startJob(jobName: string): Promise<any> {
    return await this.resumeJob(jobName);
  }

  /**
   * Stop a specific job
   */
  public static async stopJob(jobName: string): Promise<any> {
    return await this.pauseJob(jobName);
  }

  /**
   * Get available job names - UPDATED
   */
  public static getAvailableJobs(): string[] {
    return [
      "publish_due_posts",
      "check_expired_tokens",
      "system_health_check",
      "cleanup_old_logs",
      "incremental_sync",
      "daily_sync",
      "collect_historical_data",
    ];
  }

  /**
   * Validate job name
   */
  public static isValidJobName(jobName: string): boolean {
    return this.getAvailableJobs().includes(jobName);
  }
}

// Legacy export for backward compatibility
export const EnhancedCronManager = JobSchedulerManager;
