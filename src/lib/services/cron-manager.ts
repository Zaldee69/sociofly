import * as cron from "node-cron";
import { SchedulerService } from "./scheduler.service";
import { prisma } from "@/lib/prisma/client";

interface CronJobConfig {
  name: string;
  schedule: string;
  description: string;
  enabled: boolean;
  handler: () => Promise<any>;
}

export class CronManager {
  private static jobs: Map<string, cron.ScheduledTask> = new Map();
  private static jobStatuses: Map<string, boolean> = new Map();
  private static isInitialized = false;

  /**
   * Initialize and start all cron jobs
   */
  static async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log("⚠️  Cron Manager already initialized");
      return;
    }

    console.log("🕒 Initializing Cron Manager...");

    const jobConfigs: CronJobConfig[] = [
      {
        name: "publish_due_posts",
        schedule: "*/1 * * * *", // Every 1 minute
        description: "Publish posts that are due for publication",
        enabled: process.env.CRON_PUBLISH_ENABLED !== "false",
        handler: this.handlePublishDuePosts,
      },
      {
        name: "process_edge_cases",
        schedule: "0 */1 * * *", // Every hour at minute 0
        description: "Process approval system edge cases",
        enabled: process.env.CRON_EDGE_CASES_ENABLED !== "false",
        handler: this.handleProcessEdgeCases,
      },
      {
        name: "check_expired_tokens",
        schedule: "0 2 * * *", // Daily at 2 AM
        description: "Check for expired social account tokens",
        enabled: process.env.CRON_TOKEN_CHECK_ENABLED !== "false",
        handler: this.handleCheckExpiredTokens,
      },
      {
        name: "system_health_check",
        schedule: "*/15 * * * *", // Every 15 minutes
        description: "Monitor system health and log metrics",
        enabled: process.env.CRON_HEALTH_CHECK_ENABLED !== "false",
        handler: this.handleSystemHealthCheck,
      },
      {
        name: "cleanup_old_logs",
        schedule: "0 3 * * 0", // Weekly on Sunday at 3 AM
        description: "Clean up old cron logs (keep last 30 days)",
        enabled: process.env.CRON_CLEANUP_ENABLED !== "false",
        handler: this.handleCleanupOldLogs,
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
    await this.logCronActivity(
      "cron_manager_started",
      "SUCCESS",
      "Cron Manager initialized and all jobs started"
    );
  }

  /**
   * Register and start a cron job
   */
  private static registerJob(config: CronJobConfig): void {
    const task = cron.schedule(
      config.schedule,
      async () => {
        await this.executeJob(config);
      },
      {
        timezone: process.env.TZ || "Asia/Jakarta",
      }
    );

    this.jobs.set(config.name, task);
    this.jobStatuses.set(config.name, true); // Mark as running
    console.log(
      `🕒 Registered cron job: ${config.name} (${config.schedule}) - ${config.description}`
    );
  }

  /**
   * Execute a cron job with error handling and logging
   */
  private static async executeJob(config: CronJobConfig): Promise<void> {
    const startTime = Date.now();
    console.log(`🚀 Executing cron job: ${config.name}`);

    try {
      // Log job start
      await this.logCronActivity(
        config.name,
        "STARTED",
        `Cron job ${config.name} started`
      );

      // Execute the job handler
      const result = await config.handler();

      const executionTime = Date.now() - startTime;
      console.log(`✅ Completed cron job: ${config.name} (${executionTime}ms)`);

      // Log successful completion
      await this.logCronActivity(
        config.name,
        "SUCCESS",
        `Cron job ${config.name} completed successfully in ${executionTime}ms`,
        result
      );
    } catch (error) {
      const executionTime = Date.now() - startTime;
      console.error(`❌ Error in cron job ${config.name}:`, error);

      // Log error
      await this.logCronActivity(
        config.name,
        "ERROR",
        `Cron job ${config.name} failed: ${error instanceof Error ? error.message : String(error)}`,
        { executionTime, error: String(error) }
      );
    }
  }

  /**
   * Job Handlers
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
    const health = await SchedulerService.getApprovalSystemHealth();

    // Log health status if there are issues
    if (health.healthScore < 80) {
      await this.logCronActivity(
        "system_health_alert",
        "WARNING",
        `System health score is ${health.healthScore}/100. Issues detected: ${health.overduePosts} overdue posts, ${health.stuckApprovals} stuck approvals, ${health.expiredTokens} expired tokens`,
        health
      );
    }

    return health;
  }

  private static async handleCleanupOldLogs(): Promise<any> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const deletedCount = await prisma.cronLog.deleteMany({
      where: {
        executedAt: {
          lt: thirtyDaysAgo,
        },
      },
    });

    return { deletedCount: deletedCount.count };
  }

  /**
   * Log cron job activity
   */
  private static async logCronActivity(
    name: string,
    status: "STARTED" | "SUCCESS" | "ERROR" | "WARNING",
    message: string,
    data?: any
  ): Promise<void> {
    try {
      await prisma.cronLog.create({
        data: {
          name,
          status,
          message: data
            ? `${message} - Data: ${JSON.stringify(data)}`
            : message,
        },
      });
    } catch (error) {
      console.error("Failed to log cron activity:", error);
    }
  }

  /**
   * Stop all cron jobs
   */
  static stopAll(): void {
    console.log("🛑 Stopping all cron jobs...");

    for (const [name, task] of this.jobs) {
      task.stop();
      this.jobStatuses.set(name, false); // Mark as stopped
      console.log(`⏹️  Stopped cron job: ${name}`);
    }

    this.jobs.clear();
    this.jobStatuses.clear(); // Clear all statuses
    this.isInitialized = false;
    console.log("✅ All cron jobs stopped");
  }

  /**
   * Stop a specific cron job
   */
  static stopJob(jobName: string): boolean {
    const task = this.jobs.get(jobName);
    if (task) {
      task.stop();
      this.jobStatuses.set(jobName, false); // Mark as stopped
      console.log(`⏹️  Stopped cron job: ${jobName}`);
      return true;
    }
    return false;
  }

  /**
   * Start a specific cron job
   */
  static startJob(jobName: string): boolean {
    const task = this.jobs.get(jobName);
    if (task) {
      task.start();
      this.jobStatuses.set(jobName, true); // Mark as running
      console.log(`▶️  Started cron job: ${jobName}`);
      return true;
    }
    return false;
  }

  /**
   * Get status of all cron jobs
   */
  static getJobStatus(): Array<{ name: string; running: boolean }> {
    const status = [];
    for (const [name] of this.jobs) {
      status.push({
        name,
        running: this.jobStatuses.get(name) || false,
      });
    }
    return status;
  }

  /**
   * Get cron job statistics
   */
  static async getJobStatistics(hours: number = 24): Promise<any> {
    const since = new Date();
    since.setHours(since.getHours() - hours);

    const logs = await prisma.cronLog.findMany({
      where: {
        executedAt: {
          gte: since,
        },
      },
      orderBy: {
        executedAt: "desc",
      },
    });

    // Group by job name and status
    const stats = logs.reduce((acc: any, log) => {
      if (!acc[log.name]) {
        acc[log.name] = {
          total: 0,
          success: 0,
          error: 0,
          warning: 0,
          started: 0,
          lastRun: null,
        };
      }

      acc[log.name].total++;

      // Count both "SUCCESS" and "COMPLETED" as successful executions
      if (log.status === "SUCCESS" || log.status === "COMPLETED") {
        acc[log.name].success++;
      } else {
        acc[log.name][log.status.toLowerCase()]++;
      }

      if (!acc[log.name].lastRun || log.executedAt > acc[log.name].lastRun) {
        acc[log.name].lastRun = log.executedAt;
      }

      return acc;
    }, {});

    return {
      period: `Last ${hours} hours`,
      totalLogs: logs.length,
      jobs: stats,
    };
  }

  /**
   * Manually trigger a specific job (useful for testing)
   */
  static async triggerJob(jobName: string): Promise<any> {
    const jobConfigs = {
      publish_due_posts: this.handlePublishDuePosts,
      process_edge_cases: this.handleProcessEdgeCases,
      check_expired_tokens: this.handleCheckExpiredTokens,
      system_health_check: this.handleSystemHealthCheck,
      cleanup_old_logs: this.handleCleanupOldLogs,
    };

    const handler = jobConfigs[jobName as keyof typeof jobConfigs];
    if (!handler) {
      throw new Error(`Unknown job: ${jobName}`);
    }

    console.log(`🔧 Manually triggering job: ${jobName}`);

    await this.logCronActivity(
      jobName,
      "STARTED",
      `Manually triggered job: ${jobName}`
    );

    try {
      const result = await handler();
      await this.logCronActivity(
        jobName,
        "SUCCESS",
        `Manually triggered job ${jobName} completed successfully`,
        result
      );
      return result;
    } catch (error) {
      await this.logCronActivity(
        jobName,
        "ERROR",
        `Manually triggered job ${jobName} failed: ${error instanceof Error ? error.message : String(error)}`
      );
      throw error;
    }
  }
}
