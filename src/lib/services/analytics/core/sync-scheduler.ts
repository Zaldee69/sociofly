import { prisma } from "@/lib/prisma/client";
import { QueueManager } from "@/lib/queue/queue-manager";
import { JobType } from "@/lib/queue/job-types";

export interface SyncScheduleConfig {
  // Rate limiting
  maxConcurrentSyncs: number;
  delayBetweenAccounts: number; // milliseconds
  respectRateLimits: boolean;

  // Sync preferences
  defaultDaysBack: number;
  batchSize: number;
  enableDuplicatePrevention: boolean;
}

export class SyncScheduler {
  private config: SyncScheduleConfig;
  private queueManager: QueueManager;

  constructor(config: Partial<SyncScheduleConfig> = {}) {
    this.config = {
      maxConcurrentSyncs: 2, // Reduced from 3 to lower Redis load
      delayBetweenAccounts: 2000, // 2 seconds (increased from 1s)
      respectRateLimits: true,
      defaultDaysBack: 30,
      batchSize: 5, // Reduced from 25 to lower Redis load
      enableDuplicatePrevention: true,
      ...config,
    };
    this.queueManager = QueueManager.getInstance();
  }

  /**
   * Schedule initial sync for a newly connected account
   */
  async scheduleInitialSync(
    accountId: string,
    options: {
      teamId: string;
      platform: string;
      daysBack?: number;
      priority?: "low" | "normal" | "high";
      delay?: number; // milliseconds
    }
  ): Promise<void> {
    console.log(`📅 Scheduling initial sync for account ${accountId}`);

    const jobData = {
      accountId,
      teamId: options.teamId,
      platform: options.platform,
      daysBack: options.daysBack || this.config.defaultDaysBack,
      priority: options.priority || "normal",
    };

    const jobOptions = {
      delay: options.delay || 5000, // 5 second delay by default
      attempts: 3,
      backoff: {
        type: "exponential" as const,
        delay: 10000,
      },
    };

    await this.queueManager.addJob(
      QueueManager.QUEUES.SOCIAL_SYNC,
      JobType.INITIAL_SYNC,
      jobData,
      jobOptions
    );

    console.log(`✅ Initial sync scheduled for account ${accountId}`);
  }

  /**
   * Schedule incremental sync for all active accounts
   */
  async scheduleIncrementalSyncForAllAccounts(): Promise<{
    scheduled: number;
    skipped: number;
    errors: string[];
  }> {
    console.log(`🔄 Scheduling incremental sync for all active accounts`);

    const result = {
      scheduled: 0,
      skipped: 0,
      errors: [] as string[],
    };

    try {
      // Get all active social accounts with valid tokens
      const accounts = await this.getActiveSocialAccounts();
      console.log(`📊 Found ${accounts.length} active accounts`);

      // Schedule jobs with concurrency control
      await this.scheduleJobsWithConcurrencyControl(
        accounts,
        JobType.INCREMENTAL_SYNC,
        (account) => ({
          accountId: account.id,
          teamId: account.teamId,
          platform: account.platform,
          limit: this.config.batchSize,
          priority: "normal",
        }),
        result
      );

      console.log(
        `✅ Incremental sync scheduling completed: ${result.scheduled} scheduled, ${result.skipped} skipped`
      );
    } catch (error: any) {
      console.error(`❌ Failed to schedule incremental sync:`, error);
      result.errors.push(error.message);
    }

    return result;
  }

  /**
   * Schedule daily sync for all active accounts
   */
  async scheduleDailySyncForAllAccounts(): Promise<{
    scheduled: number;
    skipped: number;
    errors: string[];
  }> {
    console.log(`📊 Scheduling daily sync for all active accounts`);

    const result = {
      scheduled: 0,
      skipped: 0,
      errors: [] as string[],
    };

    try {
      // Get all active social accounts
      const accounts = await this.getActiveSocialAccounts();
      console.log(`📊 Found ${accounts.length} active accounts for daily sync`);

      // Schedule jobs with concurrency control
      await this.scheduleJobsWithConcurrencyControl(
        accounts,
        JobType.DAILY_SYNC,
        (account) => ({
          accountId: account.id,
          teamId: account.teamId,
          platform: account.platform,
          includeAudience: true,
          includeHashtags: account.platform === "INSTAGRAM",
          includeLinks: true,
          priority: "normal",
        }),
        result
      );

      console.log(
        `✅ Daily sync scheduling completed: ${result.scheduled} scheduled, ${result.skipped} skipped`
      );
    } catch (error: any) {
      console.error(`❌ Failed to schedule daily sync:`, error);
      result.errors.push(error.message);
    }

    return result;
  }

  /**
   * Get all active social accounts that need syncing
   */
  private async getActiveSocialAccounts(): Promise<
    Array<{
      id: string;
      teamId: string;
      platform: string;
      name: string;
      expiresAt?: Date;
    }>
  > {
    // Get accounts with valid tokens (not expired)
    const accountsRaw = await prisma.socialAccount.findMany({
      where: {
        OR: [
          { expiresAt: null }, // Token doesn't expire
          { expiresAt: { gte: new Date() } }, // Token not yet expired
        ],
      },
      select: {
        id: true,
        teamId: true,
        platform: true,
        name: true,
        expiresAt: true,
      },
    });

    // Map to handle nullable name field
    const accounts = accountsRaw.map((account) => ({
      id: account.id,
      teamId: account.teamId,
      platform: account.platform as string,
      name: account.name || `${account.platform} Account`,
      expiresAt: account.expiresAt || undefined,
    }));

    return accounts;
  }

  /**
   * Schedule jobs with concurrency control and rate limiting
   */
  private async scheduleJobsWithConcurrencyControl(
    accounts: Array<{
      id: string;
      teamId: string;
      platform: string;
      name: string;
    }>,
    jobType: JobType,
    jobDataFactory: (account: any) => any,
    result: { scheduled: number; skipped: number; errors: string[] }
  ): Promise<void> {
    const semaphore = new Array(this.config.maxConcurrentSyncs).fill(0);
    let currentIndex = 0;

    const processNextAccount = async (semaphoreIndex: number) => {
      while (currentIndex < accounts.length) {
        const accountIndex = currentIndex++;
        const account = accounts[accountIndex];

        try {
          // Check for duplicate prevention
          if (this.config.enableDuplicatePrevention) {
            const isDuplicate = await this.checkForRecentJob(
              account.id,
              jobType
            );
            if (isDuplicate) {
              console.log(
                `⚠️ Skipping duplicate job for account ${account.name}`
              );
              result.skipped++;
              continue;
            }
          }

          // Create job data
          const jobData = jobDataFactory(account);

          // Add delay between accounts to respect rate limits
          if (accountIndex > 0 && this.config.respectRateLimits) {
            await new Promise((resolve) =>
              setTimeout(resolve, this.config.delayBetweenAccounts)
            );
          }

          // Schedule the job
          await this.queueManager.addJob(
            QueueManager.QUEUES.SOCIAL_SYNC,
            jobType,
            jobData,
            {
              attempts: 3,
              backoff: {
                type: "exponential" as const,
                delay: 30000, // 30 seconds
              },
            }
          );

          result.scheduled++;
          console.log(
            `✅ Scheduled ${jobType} for ${account.name} (${account.platform})`
          );
        } catch (error: any) {
          console.error(
            `❌ Failed to schedule ${jobType} for ${account.name}:`,
            error
          );
          result.errors.push(`${account.name}: ${error.message}`);
        }
      }
    };

    // Process accounts in parallel with concurrency limit
    const workers = semaphore.map((_, index) => processNextAccount(index));
    await Promise.all(workers);
  }

  /**
   * Check if there's a recent job for this account to prevent duplicates
   */
  private async checkForRecentJob(
    accountId: string,
    jobType: JobType
  ): Promise<boolean> {
    const recentThreshold = new Date(Date.now() - 30 * 60 * 1000); // 30 minutes ago

    const recentJob = await prisma.taskLog.findFirst({
      where: {
        name: {
          startsWith: `${jobType}_${accountId}`,
        },
        executedAt: {
          gte: recentThreshold,
        },
        status: {
          in: ["pending", "processing", "completed"],
        },
      },
    });

    return !!recentJob;
  }

  /**
   * Get sync statistics for monitoring
   */
  async getSyncStatistics(timeRange: "hour" | "day" | "week" = "day"): Promise<{
    totalAccounts: number;
    activeAccounts: number;
    recentSyncs: {
      initial: number;
      incremental: number;
      daily: number;
    };
    averageExecutionTime: number;
    errorRate: number;
  }> {
    const timeThreshold = new Date();
    switch (timeRange) {
      case "hour":
        timeThreshold.setHours(timeThreshold.getHours() - 1);
        break;
      case "day":
        timeThreshold.setDate(timeThreshold.getDate() - 1);
        break;
      case "week":
        timeThreshold.setDate(timeThreshold.getDate() - 7);
        break;
    }

    const [totalAccounts, activeAccounts, recentLogs] = await Promise.all([
      // Total accounts
      prisma.socialAccount.count(),

      // Active accounts (with valid tokens)
      prisma.socialAccount.count({
        where: {
          OR: [{ expiresAt: null }, { expiresAt: { gte: new Date() } }],
        },
      }),

      // Recent sync logs
      prisma.taskLog.findMany({
        where: {
          name: {
            contains: "sync_",
          },
          executedAt: {
            gte: timeThreshold,
          },
        },
      }),
    ]);

    // Calculate statistics
    const syncCounts = {
      initial: recentLogs.filter((log) => log.name.includes("initial_sync"))
        .length,
      incremental: recentLogs.filter((log) =>
        log.name.includes("incremental_sync")
      ).length,
      daily: recentLogs.filter((log) => log.name.includes("daily_sync")).length,
    };

    const completedJobs = recentLogs.filter(
      (log) => log.status === "completed"
    );
    const averageExecutionTime =
      completedJobs.length > 0
        ? completedJobs.reduce((sum, log) => {
            try {
              const data = JSON.parse(log.message || "{}");
              return sum + (data.executionTimeMs || 0);
            } catch {
              return sum;
            }
          }, 0) / completedJobs.length
        : 0;

    const errorRate =
      recentLogs.length > 0
        ? recentLogs.filter((log) => log.status === "failed").length /
          recentLogs.length
        : 0;

    return {
      totalAccounts,
      activeAccounts,
      recentSyncs: syncCounts,
      averageExecutionTime,
      errorRate,
    };
  }
}
