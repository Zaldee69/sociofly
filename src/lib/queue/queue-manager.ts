import { Queue, Worker, Job } from "bullmq";
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

export class QueueManager {
  private static instance: QueueManager;
  private queues: Map<string, Queue> = new Map();
  private workers: Map<string, Worker> = new Map();
  private isInitialized = false;
  private redisManager: RedisManager | null = null;

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

      this.isInitialized = true;
      console.log("✅ Queue Manager initialized successfully");

      // Log startup
      await this.logQueueActivity(
        "queue_manager_started",
        "SUCCESS",
        "Queue Manager initialized"
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
   * Create all queues
   */
  private async createQueues(): Promise<void> {
    const queueConfigs = [
      { name: QueueManager.QUEUES.HIGH_PRIORITY, concurrency: 5 },
      { name: QueueManager.QUEUES.SCHEDULER, concurrency: 3 },
      { name: QueueManager.QUEUES.NOTIFICATIONS, concurrency: 10 },
      { name: QueueManager.QUEUES.WEBHOOKS, concurrency: 5 },
      { name: QueueManager.QUEUES.REPORTS, concurrency: 2 },
      { name: QueueManager.QUEUES.SOCIAL_SYNC, concurrency: 3 },
      { name: QueueManager.QUEUES.MAINTENANCE, concurrency: 1 },
    ];

    for (const config of queueConfigs) {
      const queue = new Queue(config.name, {
        connection: this.getRedisConnectionOptions(),
        defaultJobOptions: {
          removeOnComplete: 100,
          removeOnFail: 50,
          attempts: 3,
          backoff: {
            type: "exponential",
            delay: 2000,
          },
          delay: 0,
        },
      });

      this.queues.set(config.name, queue);
      console.log(`📋 Created queue: ${config.name}`);
    }
  }

  /**
   * Create all workers
   */
  private async createWorkers(): Promise<void> {
    const workerConfigs = [
      { name: QueueManager.QUEUES.HIGH_PRIORITY, concurrency: 5 },
      { name: QueueManager.QUEUES.SCHEDULER, concurrency: 3 },
      { name: QueueManager.QUEUES.NOTIFICATIONS, concurrency: 10 },
      { name: QueueManager.QUEUES.WEBHOOKS, concurrency: 5 },
      { name: QueueManager.QUEUES.REPORTS, concurrency: 2 },
      { name: QueueManager.QUEUES.SOCIAL_SYNC, concurrency: 3 },
      { name: QueueManager.QUEUES.MAINTENANCE, concurrency: 1 },
    ];

    for (const config of workerConfigs) {
      const worker = new Worker(
        config.name,
        async (job: Job) => {
          return await this.processJob(job);
        },
        {
          connection: this.getRedisConnectionOptions(),
          concurrency: config.concurrency,
          maxStalledCount: 3,
          stalledInterval: 30000,
        }
      );

      // Add event listeners
      this.addWorkerEventListeners(worker, config.name);

      this.workers.set(config.name, worker);
      console.log(
        `👷 Created worker: ${config.name} (concurrency: ${config.concurrency})`
      );
    }
  }

  /**
   * Add event listeners to worker
   */
  private addWorkerEventListeners(worker: Worker, queueName: string): void {
    worker.on("completed", (job) => {
      console.log(`✅ Job completed: ${job.name} in queue ${queueName}`);
    });

    worker.on("failed", (job, err) => {
      console.error(`❌ Job failed: ${job?.name} in queue ${queueName}:`, err);
    });

    worker.on("progress", (job, progress) => {
      console.log(`⏳ Job progress: ${job.name} - ${progress}%`);
    });

    worker.on("stalled", (jobId) => {
      console.warn(`⚠️  Job stalled: ${jobId} in queue ${queueName}`);
    });
  }

  /**
   * Process job based on type
   */
  private async processJob(job: Job): Promise<JobResult> {
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
   * Add job to queue
   */
  public async addJob(
    queueName: string,
    jobType: JobType,
    data: JobData,
    options?: JobOptions
  ): Promise<Job> {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue not found: ${queueName}`);
    }

    const jobOptions: any = {
      ...options,
      ...(options?.delay && { delay: options.delay }),
      ...(options?.repeat && { repeat: options.repeat }),
      ...(options?.attempts && { attempts: options.attempts }),
      ...(options?.backoff && { backoff: options.backoff }),
      ...(options?.priority && { priority: options.priority }),
    };

    const job = await queue.add(jobType, data, jobOptions);

    console.log(
      `📤 Added job: ${jobType} to queue ${queueName} (ID: ${job.id})`
    );

    return job;
  }

  /**
   * Schedule recurring job
   */
  public async scheduleRecurringJob(
    queueName: string,
    jobType: JobType,
    data: JobData,
    cronPattern: string,
    options?: Omit<JobOptions, "repeat">
  ): Promise<Job> {
    return this.addJob(queueName, jobType, data, {
      ...options,
      repeat: { pattern: cronPattern },
    });
  }

  /**
   * Get queue metrics
   */
  public async getQueueMetrics(queueName: string): Promise<QueueMetrics> {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue not found: ${queueName}`);
    }

    const waiting = await queue.getWaiting();
    const active = await queue.getActive();
    const completed = await queue.getCompleted();
    const failed = await queue.getFailed();
    const delayed = await queue.getDelayed();

    return {
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length,
      delayed: delayed.length,
      paused: (await queue.isPaused()) ? 1 : 0,
    };
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
   * Shutdown all queues and workers
   */
  public async shutdown(): Promise<void> {
    console.log("🛑 Shutting down Queue Manager...");

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

    this.isInitialized = false;
    console.log("✅ Queue Manager shutdown complete");
  }

  /**
   * Log queue activity
   */
  private async logQueueActivity(
    jobName: string,
    status: string,
    message: string,
    data?: any
  ): Promise<void> {
    try {
      await prisma.taskLog.create({
        data: {
          name: `queue_${jobName}`,
          status,
          message: data
            ? `${message} - Data: ${JSON.stringify(data)}`
            : message,
        },
      });
    } catch (error) {
      console.error("Failed to log queue activity:", error);
    }
  }

  /**
   * Get queue instance
   */
  public getQueue(queueName: string): Queue | undefined {
    return this.queues.get(queueName);
  }

  /**
   * Get worker instance
   */
  public getWorker(queueName: string): Worker | undefined {
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
   * Check if initialized
   */
  public isReady(): boolean {
    return this.isInitialized;
  }
}
