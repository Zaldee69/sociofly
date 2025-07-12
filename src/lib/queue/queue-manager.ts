import { SafeBullMQ, isBullMQAvailable } from "@/lib/config/bullmq-fix";
import { RedisManager } from "@/lib/services/redis-manager";
import {
  JobType,
  JobData,
  JobOptions,
  JobResult,
  QueueMetrics,
} from "./job-types";
import { JobProcessor } from "./job-processor";
import { prisma } from "@/lib/prisma/client";
import { 
  REDIS_OPTIMIZATION_CONFIG, 
  QUEUE_SPECIFIC_CONFIG,
  getOptimizedQueueConfig 
} from "./redis-optimization-config";
import { RedisPerformanceMonitor } from "./redis-performance-monitor";

export class QueueManager {
  private static instance: QueueManager;
  private queues: Map<string, any> = new Map();
  private workers: Map<string, any> = new Map();
  private isInitialized = false;
  private redisManager: RedisManager | null = null;
  private performanceMonitor: RedisPerformanceMonitor | null = null;
  private autoCleanupInterval: NodeJS.Timeout | null = null;
  
  // Cache for queue metrics to reduce Redis calls
  private metricsCache = new Map<string, { data: QueueMetrics; timestamp: number }>();
  private readonly cacheExpiry = 5000; // 5 seconds

  // Queue names
  public static readonly QUEUES = {
    HIGH_PRIORITY: "high-priority",
    SCHEDULER: "scheduler",
    NOTIFICATIONS: "notifications",
    WEBHOOKS: "webhooks",
    REPORTS: "reports",
    SOCIAL_SYNC: "social-sync",
    MAINTENANCE: "maintenance",
  } as const;

  private constructor() {}

  public static getInstance(): QueueManager {
    if (!QueueManager.instance) {
      QueueManager.instance = new QueueManager();
    }
    return QueueManager.instance;
  }

  /**
   * Initialize all queues and workers
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log("⚠️  Queue Manager already initialized");
      return;
    }

    // Check if BullMQ is available and initialize safely
    if (!isBullMQAvailable()) {
      console.warn("⚠️  BullMQ not available in current environment");
      return;
    }

    const bullmqReady = await SafeBullMQ.initialize();
    if (!bullmqReady) {
      console.warn("⚠️  Failed to initialize BullMQ, skipping queue initialization");
      return;
    }

    console.log("🚀 Initializing BullMQ Queue Manager...");

    try {
      // Get Redis manager instance
      this.redisManager = RedisManager.getInstance();

      // Initialize Redis connection if not already connected
      if (!this.redisManager.isAvailable()) {
        console.log("🔗 Initializing Redis connection for Queue Manager...");
        await this.redisManager.initialize();
      }

      // Ensure Redis is available after initialization
      if (!this.redisManager.isAvailable()) {
        throw new Error("Redis is not available for Queue Manager");
      }

      // Create queues
      await this.createQueues();

      // Create workers
      await this.createWorkers();

      // Initialize performance monitoring
      this.performanceMonitor = RedisPerformanceMonitor.getInstance();
      await this.performanceMonitor.startMonitoring();

      // Start auto cleanup
      await this.startAutoCleanup();

      this.isInitialized = true;
      console.log("✅ Queue Manager initialized successfully with Redis optimization");

      // Log startup
      await this.logQueueActivity(
        "queue_manager_started",
        "SUCCESS",
        "Queue Manager initialized with Redis optimization"
      );
    } catch (error) {
      console.error("❌ Failed to initialize Queue Manager:", error);
      throw error;
    }
  }

  /**
   * Get Redis connection options for BullMQ
   */
  private getRedisConnectionOptions(): any {
    if (!this.redisManager) {
      throw new Error("Redis manager not initialized");
    }
    return this.redisManager.getConnectionOptions();
  }

  /**
   * Create all queues with optimized Redis settings
   */
  private async createQueues(): Promise<void> {
    const queueNames = Object.values(QueueManager.QUEUES);

    for (const queueName of queueNames) {
      const optimizedConfig = getOptimizedQueueConfig(queueName);
      const queueSpecific = QUEUE_SPECIFIC_CONFIG[queueName as keyof typeof QUEUE_SPECIFIC_CONFIG] || {};
      
      const queue = SafeBullMQ.createQueue(queueName, {
        connection: this.getRedisConnectionOptions(),
        defaultJobOptions: {
          removeOnComplete: queueSpecific.removeOnComplete || 50,
          removeOnFail: 25,
          attempts: optimizedConfig.jobRetryAttempts,
          backoff: {
            type: "exponential",
            delay: optimizedConfig.jobRetryDelay,
          },
          delay: 0,
        },
      });

      this.queues.set(queueName, queue);
      console.log(`📋 Created optimized queue: ${queueName} (removeOnComplete: ${queueSpecific.removeOnComplete || optimizedConfig.removeOnComplete})`);
    }
  }

  /**
   * Create all workers with optimized polling and rate limiting
   */
  private async createWorkers(): Promise<void> {
    const queueNames = Object.values(QueueManager.QUEUES);

    for (const queueName of queueNames) {
      const optimizedConfig = getOptimizedQueueConfig(queueName);
      const queueSpecific = QUEUE_SPECIFIC_CONFIG[queueName as keyof typeof QUEUE_SPECIFIC_CONFIG] || {};
      
      const worker = SafeBullMQ.createWorker(
        queueName,
        async (job: any) => {
          return await this.processJob(job);
        },
        {
          connection: this.getRedisConnectionOptions(),
          concurrency: queueSpecific.concurrency || optimizedConfig.workerConcurrency,
          // OPTIMIZED: Drastically reduce polling frequency untuk kurangi EVALSHA dominance
          maxStalledCount: optimizedConfig.maxStalledCount, // Use from config
          stalledInterval: optimizedConfig.stalledInterval, // Use optimized 5 menit interval
          // NEW: Tambahan setting untuk kurangi Redis polling
          settings: {
            retryProcessDelay: optimizedConfig.retryProcessDelay, // 30 detik interval polling
            lockDuration: optimizedConfig.lockDuration, // 2 menit lock duration
          },
          // Add rate limiting to prevent Redis overload - LEBIH AGRESIF
          limiter: {
            max: queueSpecific.rateLimitMax || optimizedConfig.rateLimitMax,
            duration: queueSpecific.rateLimitDuration || optimizedConfig.rateLimitDuration,
          },
        }
      );

      // Add event listeners
      this.addWorkerEventListeners(worker, queueName);

      this.workers.set(queueName, worker);
      console.log(
        `👷 Created EVALSHA-optimized worker: ${queueName} (concurrency: ${queueSpecific.concurrency || optimizedConfig.workerConcurrency}, rateLimit: ${queueSpecific.rateLimitMax || optimizedConfig.rateLimitMax}/${queueSpecific.rateLimitDuration || optimizedConfig.rateLimitDuration}ms, stalledInterval: ${optimizedConfig.stalledInterval}ms)`
      );
    }
  }

  /**
   * Menambahkan event listeners untuk worker
   */
  private addWorkerEventListeners(worker: any, queueName: string): void {
    worker.on("completed", (job: any) => {
      console.log(`✅ Job completed: ${job.name} in queue ${queueName}`);
    });

    worker.on("failed", (job: any, err: any) => {
      console.error(`❌ Job failed: ${job?.name} in queue ${queueName}:`, err);
    });

    worker.on("progress", (job: any, progress: any) => {
      console.log(`⏳ Job progress: ${job.name} - ${progress}%`);
    });

    worker.on("stalled", (jobId: any) => {
      console.warn(`⚠️  Job stalled: ${jobId} in queue ${queueName}`);
    });

    worker.on("error", (err: any) => {
      console.error(`🚨 Worker error in queue ${queueName}:`, err);
    });
  }

  /**
   * Process job based on type
   */
  private async processJob(job: any): Promise<JobResult> {
    const startTime = Date.now();

    try {
      console.log(`🔄 Processing job: ${job.name} (${job.id})`);

      const result = await JobProcessor.process(job.name as JobType, job.data);

      const executionTime = Date.now() - startTime;

      await this.logQueueActivity(
        job.name,
        "SUCCESS",
        `Job completed successfully in ${executionTime}ms`,
        { jobId: job.id, result }
      );

      return {
        success: true,
        message: "Job completed successfully",
        data: result,
        executionTime,
        processedAt: new Date(),
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      await this.logQueueActivity(
        job.name,
        "ERROR",
        `Job failed: ${errorMessage}`,
        { jobId: job.id, error: errorMessage }
      );

      throw error;
    }
  }

  /**
   * Add job to queue with batching support
   */
  public async addJob(
    queueName: string,
    jobName: string,
    data: JobData,
    options?: JobOptions
  ): Promise<any> {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue not found: ${queueName}`);
    }

    // Get optimized config for backoff strategy
    const optimizedConfig = getOptimizedQueueConfig(queueName);
    
    const jobOptions: any = {
      ...options,
      // Default optimized settings untuk kurangi EVALSHA frequency
      attempts: options?.attempts || optimizedConfig.jobRetryAttempts,
      backoff: options?.backoff || {
        type: 'exponential',
        delay: optimizedConfig.jobRetryDelay, // 15 detik base delay
      },
      ...(options?.delay && { delay: options.delay }),
      ...(options?.repeat && { repeat: options.repeat }),
      ...(options?.priority && { priority: options.priority }),
    };

    const job = await queue.add(jobName, data, jobOptions);

    console.log(
      `📤 Added job: ${jobName} to queue ${queueName} (ID: ${job.id})`
    );

    return job;
  }

  /**
   * Schedule recurring job
   */
  public async addRecurringJob(
    queueName: string,
    jobName: string,
    data: JobData,
    cronPattern: string,
    options?: Omit<JobOptions, "repeat">
  ): Promise<any> {
    return this.addJob(queueName, jobName, data, {
      ...options,
      repeat: { pattern: cronPattern },
    });
  }

  /**
   * Get queue metrics with caching to reduce Redis calls
   */
  public async getQueueMetrics(queueName: string): Promise<QueueMetrics> {
    // Check cache first
    const cached = this.metricsCache.get(queueName);
    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      return cached.data;
    }

    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue not found: ${queueName}`);
    }

    // Optimized: Use count methods instead of fetching full arrays to reduce Redis load
    const [waiting, active, completed, failed, delayed, paused] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(), 
      queue.getCompletedCount(),
      queue.getFailedCount(),
      queue.getDelayedCount(),
      queue.isPaused(),
    ]);

    const metrics = {
      waiting,
      active,
      completed,
      failed,
      delayed,
      paused: paused ? 1 : 0,
    };

    // Cache the result
    this.metricsCache.set(queueName, {
      data: metrics,
      timestamp: Date.now()
    });

    return metrics;
  }

  /**
   * Get all queue metrics
   */
  public async getAllQueueMetrics(): Promise<Record<string, QueueMetrics>> {
    const metrics: Record<string, QueueMetrics> = {};

    for (const queueName of this.queues.keys()) {
      metrics[queueName] = await this.getQueueMetrics(queueName);
    }

    return metrics;
  }

  /**
   * Pause queue
   */
  public async pauseQueue(queueName: string): Promise<void> {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue not found: ${queueName}`);
    }

    await queue.pause();
    console.log(`⏸️  Paused queue: ${queueName}`);
  }

  /**
   * Resume queue
   */
  public async resumeQueue(queueName: string): Promise<void> {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue not found: ${queueName}`);
    }

    await queue.resume();
    console.log(`▶️  Resumed queue: ${queueName}`);
  }

  /**
   * Clean queue
   */
  public async cleanQueue(
    queueName: string,
    type: "completed" | "failed" | "wait" | "active",
    age: number = 3600000 // 1 hour in milliseconds
  ): Promise<void> {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue not found: ${queueName}`);
    }

    await queue.clean(age, 10, type);
    console.log(`🧹 Cleaned ${type} jobs from queue: ${queueName}`);
  }

  /**
   * Shutdown all queues and workers with cleanup
   */
  public async shutdown(): Promise<void> {
    console.log("🛑 Shutting down Queue Manager...");

    // Stop performance monitoring
    if (this.performanceMonitor) {
      this.performanceMonitor.stopMonitoring();
    }

    // Stop auto cleanup
    if (this.autoCleanupInterval) {
      clearInterval(this.autoCleanupInterval);
      this.autoCleanupInterval = null;
    }

    // Flush any remaining logs
    await this.flushLogBuffer();

    // Close all workers
    for (const [name, worker] of this.workers) {
      await worker.close();
      console.log(`👷 Closed worker: ${name}`);
    }

    // Close all queues
    for (const [name, queue] of this.queues) {
      await queue.close();
      console.log(`📋 Closed queue: ${name}`);
    }

    // Clear any pending timers
    if (this.logFlushTimer) {
      clearTimeout(this.logFlushTimer);
      this.logFlushTimer = null;
    }

    this.isInitialized = false;
    console.log("✅ Queue Manager shutdown complete with cleanup");
  }

  /**
   * Log queue activity with batching to reduce database load
   */
  private logBuffer: Array<{
    name: string;
    status: string;
    message: string;
  }> = [];
  private logFlushTimer: NodeJS.Timeout | null = null;

  private async logQueueActivity(
    jobName: string,
    status: string,
    message: string,
    data?: any
  ): Promise<void> {
    try {
      // Add to buffer instead of immediate database write
      this.logBuffer.push({
        name: `queue_${jobName}`,
        status,
        message: data
          ? `${message} - Data: ${JSON.stringify(data)}`
          : message,
      });

      // Flush buffer when it reaches 10 items or after 30 seconds
      if (this.logBuffer.length >= 10) {
        await this.flushLogBuffer();
      } else if (!this.logFlushTimer) {
        this.logFlushTimer = setTimeout(() => {
          this.flushLogBuffer();
        }, 30000); // 30 seconds
      }
    } catch (error) {
      console.error("Failed to log queue activity:", error);
    }
  }

  /**
   * Flush log buffer to database
   */
  private async flushLogBuffer(): Promise<void> {
    if (this.logBuffer.length === 0) return;

    try {
      const logsToFlush = [...this.logBuffer];
      this.logBuffer = [];
      
      if (this.logFlushTimer) {
        clearTimeout(this.logFlushTimer);
        this.logFlushTimer = null;
      }

      await prisma.taskLog.createMany({
        data: logsToFlush,
        skipDuplicates: true,
      });
    } catch (error) {
      console.error("Failed to flush log buffer:", error);
    }
  }

  /**
   * Get queue instance
   */
  public getQueue(queueName: string): any | undefined {
    return this.queues.get(queueName);
  }

  /**
   * Get worker instance
   */
  public getWorker(queueName: string): any | undefined {
    return this.workers.get(queueName);
  }

  /**
   * Get job details
   */
  public async getJobDetails(queueName: string, jobId: string): Promise<any> {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue not found: ${queueName}`);
    }

    const job = await queue.getJob(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found in queue ${queueName}`);
    }

    return {
      id: job.id,
      name: job.name,
      data: job.data,
      opts: job.opts,
      progress: job.progress,
      returnvalue: job.returnvalue,
      failedReason: job.failedReason,
      processedOn: job.processedOn,
      finishedOn: job.finishedOn,
      timestamp: job.timestamp,
      attemptsMade: job.attemptsMade,
      delay: job.delay,
    };
  }

  /**
   * Add multiple jobs in batch to reduce Redis calls
   */
  public async addJobsBatch(
    queueName: string,
    jobs: Array<{
      jobType: JobType;
      data: JobData;
      options?: JobOptions;
    }>
  ): Promise<any[]> {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue not found: ${queueName}`);
    }

    // Batch add jobs to reduce Redis calls
    const jobsToAdd = jobs.map((job, index) => ({
      name: job.jobType,
      data: job.data,
      opts: {
        ...job.options,
      },
    }));

    const addedJobs = await queue.addBulk(jobsToAdd);
    
    console.log(`📤 Added ${addedJobs.length} jobs in batch to queue ${queueName}`);
    
    return addedJobs;
  }

  /**
   * Auto cleanup completed and failed jobs periodically
   */
  public async startAutoCleanup(): Promise<void> {
    // Clean up every 5 minutes
    setInterval(async () => {
      try {
        for (const [queueName] of this.queues) {
          // Clean completed jobs older than 1 hour
          await this.cleanQueue(queueName, "completed", 3600000);
          // Clean failed jobs older than 24 hours
          await this.cleanQueue(queueName, "failed", 86400000);
        }
        console.log("🧹 Auto cleanup completed");
      } catch (error) {
        console.error("❌ Auto cleanup failed:", error);
      }
    }, 300000); // 5 minutes
  }

  /**
   * Get Redis connection health
   */
  public async getRedisHealth(): Promise<{
    connected: boolean;
    commandsExecuted?: number;
    memoryUsage?: string;
  }> {
    try {
      if (!this.redisManager || !this.redisManager.isAvailable()) {
        return { connected: false };
      }

      // Get basic Redis info
      const redis = this.redisManager.getConnection();
      if (!redis) {
        return { connected: false };
      }
      const info = await redis.info('stats');
      const memory = await redis.info('memory');
      
      // Parse commands executed
      const commandsMatch = info.match(/total_commands_processed:(\d+)/);
      const commandsExecuted = commandsMatch ? parseInt(commandsMatch[1]) : 0;
      
      // Parse memory usage
      const memoryMatch = memory.match(/used_memory_human:([^\r\n]+)/);
      const memoryUsage = memoryMatch ? memoryMatch[1] : 'unknown';

      return {
        connected: true,
        commandsExecuted,
        memoryUsage,
      };
    } catch (error) {
      console.error('Failed to get Redis health:', error);
      return { connected: false };
    }
  }

  /**
   * Check if initialized
   */
  public isReady(): boolean {
    return this.isInitialized;
  }
}
