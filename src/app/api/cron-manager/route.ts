import { NextResponse } from "next/server";
import { EnhancedCronManager } from "@/lib/services/cron-manager";
import { QueueManager } from "@/lib/queue/queue-manager";
import { JobType } from "@/lib/queue/job-types";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, apiKey, queueName, jobType, data, options } = body;

    // Basic auth check
    const validApiKey = process.env.CRON_API_KEY || "test-scheduler-key";
    if (apiKey !== validApiKey) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let result;

    switch (action) {
      case "queue_job":
        if (!queueName || !jobType) {
          return NextResponse.json(
            { error: "Queue name and job type required" },
            { status: 400 }
          );
        }
        await EnhancedCronManager.queueJob(
          queueName,
          jobType,
          data || {},
          options
        );
        result = { message: `Job ${jobType} queued successfully` };
        break;

      case "pause_queue":
        if (!queueName) {
          return NextResponse.json(
            { error: "Queue name required" },
            { status: 400 }
          );
        }
        const queueManager = EnhancedCronManager.getQueueManager();
        if (!queueManager) {
          return NextResponse.json(
            { error: "Queue manager not available" },
            { status: 503 }
          );
        }
        await queueManager.pauseQueue(queueName);
        result = { message: `Queue ${queueName} paused` };
        break;

      case "resume_queue":
        if (!queueName) {
          return NextResponse.json(
            { error: "Queue name required" },
            { status: 400 }
          );
        }
        const resumeQueueManager = EnhancedCronManager.getQueueManager();
        if (!resumeQueueManager) {
          return NextResponse.json(
            { error: "Queue manager not available" },
            { status: 503 }
          );
        }
        await resumeQueueManager.resumeQueue(queueName);
        result = { message: `Queue ${queueName} resumed` };
        break;

      case "clean_queue":
        if (!queueName) {
          return NextResponse.json(
            { error: "Queue name required" },
            { status: 400 }
          );
        }
        const cleanQueueManager = EnhancedCronManager.getQueueManager();
        if (!cleanQueueManager) {
          return NextResponse.json(
            { error: "Queue manager not available" },
            { status: 503 }
          );
        }
        const cleanType = body.cleanType || "completed";
        const age = body.age || 3600000; // 1 hour
        await cleanQueueManager.cleanQueue(queueName, cleanType, age);
        result = { message: `Queue ${queueName} cleaned` };
        break;

      case "restart_workers":
        const restartQueueManager = EnhancedCronManager.getQueueManager();
        if (!restartQueueManager) {
          return NextResponse.json(
            { error: "Queue manager not available" },
            { status: 503 }
          );
        }

        // Restart all workers
        await restartQueueManager.shutdown();
        await restartQueueManager.initialize();
        result = { message: "All workers restarted successfully" };
        break;

      case "force_process_job":
        if (!body.jobId || !queueName) {
          return NextResponse.json(
            { error: "Job ID and queue name required" },
            { status: 400 }
          );
        }
        const forceQueueManager = EnhancedCronManager.getQueueManager();
        if (!forceQueueManager) {
          return NextResponse.json(
            { error: "Queue manager not available" },
            { status: 503 }
          );
        }

        // Force process a specific job
        const queue = forceQueueManager.getQueue(queueName);
        if (!queue) {
          return NextResponse.json(
            { error: `Queue ${queueName} not found` },
            { status: 404 }
          );
        }

        const job = await queue.getJob(body.jobId);
        if (!job) {
          return NextResponse.json(
            { error: `Job ${body.jobId} not found` },
            { status: 404 }
          );
        }

        // Retry the job
        await job.retry();
        result = { message: `Job ${body.jobId} forced to retry` };
        break;

      case "initialize":
        await EnhancedCronManager.initialize();
        result = { message: "Enhanced Cron Manager initialized" };
        break;

      case "stop_all":
        await EnhancedCronManager.stopAll();
        result = { message: "All jobs stopped" };
        break;

      // Quick job scheduling examples
      case "schedule_post_publish":
        if (!body.postId || !body.platform) {
          return NextResponse.json(
            { error: "Post ID and platform required" },
            { status: 400 }
          );
        }
        await EnhancedCronManager.queueJob(
          QueueManager.QUEUES.SCHEDULER,
          JobType.PUBLISH_POST,
          {
            postId: body.postId,
            userId: body.userId || "system",
            platform: body.platform,
            scheduledAt: new Date(body.scheduledAt || Date.now()),
            content: body.content || {},
          },
          {
            delay: body.delay || 0,
            priority: body.priority || 1,
            attempts: 3,
          }
        );
        result = { message: "Post publish job scheduled" };
        break;

      case "schedule_health_check":
        await EnhancedCronManager.queueJob(
          QueueManager.QUEUES.MAINTENANCE,
          JobType.SYSTEM_HEALTH_CHECK,
          {
            checkType: body.checkType || "quick",
            alertThreshold: body.alertThreshold || 70,
          },
          {
            priority: 5,
            attempts: 2,
          }
        );
        result = { message: "Health check job scheduled" };
        break;

      case "schedule_notification":
        if (!body.userId || !body.template) {
          return NextResponse.json(
            { error: "User ID and template required" },
            { status: 400 }
          );
        }
        await EnhancedCronManager.queueJob(
          QueueManager.QUEUES.NOTIFICATIONS,
          JobType.SEND_NOTIFICATION,
          {
            userId: body.userId,
            type: body.type || "email",
            template: body.template,
            data: body.data || {},
            priority: body.priority || "normal",
          },
          {
            delay: body.delay || 0,
            priority: body.priority === "urgent" ? 10 : 1,
            attempts: 3,
          }
        );
        result = { message: "Notification job scheduled" };
        break;

      case "trigger":
        if (!body.jobName) {
          return NextResponse.json(
            { error: "Job name required" },
            { status: 400 }
          );
        }
        result = await EnhancedCronManager.triggerJob(body.jobName);
        break;

      case "start":
        if (!body.jobName) {
          return NextResponse.json(
            { error: "Job name required" },
            { status: 400 }
          );
        }
        result = await EnhancedCronManager.startJob(body.jobName);
        break;

      case "stop":
        if (!body.jobName) {
          return NextResponse.json(
            { error: "Job name required" },
            { status: 400 }
          );
        }
        result = await EnhancedCronManager.stopJob(body.jobName);
        break;

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    return NextResponse.json({ success: true, result });
  } catch (error) {
    console.error("Error in queue manager API route:", error);
    return NextResponse.json(
      {
        error: "Server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");
    const apiKey = searchParams.get("apiKey");

    // Basic auth check
    const validApiKey = process.env.CRON_API_KEY || "test-scheduler-key";
    if (apiKey !== validApiKey) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let result;

    switch (action) {
      case "status":
        result = await EnhancedCronManager.getStatus();
        break;

      case "queue_metrics":
        const queueManager = EnhancedCronManager.getQueueManager();
        if (!queueManager) {
          // Return empty metrics when queue manager is not available (Redis not connected)
          result = {};
        } else {
          const queueName = searchParams.get("queueName");
          if (queueName) {
            result = await queueManager.getQueueMetrics(queueName);
          } else {
            result = await queueManager.getAllQueueMetrics();
          }
        }
        break;

      case "worker_status":
        const workerQueueManager = EnhancedCronManager.getQueueManager();
        if (!workerQueueManager) {
          result = { error: "Queue manager not available" };
        } else {
          // Get worker status for all queues
          const workerStatus: Record<string, any> = {};
          for (const queueName of Object.values(QueueManager.QUEUES)) {
            const worker = workerQueueManager.getWorker(queueName);
            if (worker) {
              workerStatus[queueName] = {
                isRunning: worker.isRunning(),
                isPaused: worker.isPaused(),
                concurrency: worker.opts.concurrency,
                name: worker.name,
              };
            } else {
              workerStatus[queueName] = {
                isRunning: false,
                isPaused: false,
                concurrency: 0,
                name: queueName,
                error: "Worker not found",
              };
            }
          }
          result = workerStatus;
        }
        break;

      case "job_details":
        const jobId = searchParams.get("jobId");
        const queueNameParam = searchParams.get("queueName");
        if (!jobId || !queueNameParam) {
          return NextResponse.json(
            { error: "Job ID and queue name required" },
            { status: 400 }
          );
        }

        const detailQueueManager = EnhancedCronManager.getQueueManager();
        if (!detailQueueManager) {
          result = { error: "Queue manager not available" };
        } else {
          const queue = detailQueueManager.getQueue(queueNameParam);
          if (!queue) {
            result = { error: `Queue ${queueNameParam} not found` };
          } else {
            const job = await queue.getJob(jobId);
            if (!job) {
              result = { error: `Job ${jobId} not found` };
            } else {
              result = {
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
          }
        }
        break;

      case "available_queues":
        result = {
          queues: Object.values(QueueManager.QUEUES),
          jobTypes: Object.values(JobType),
          isUsingQueues: EnhancedCronManager.isUsingQueues(),
        };
        break;

      case "job_logs":
        result = await EnhancedCronManager.getJobLogs();
        break;

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    return NextResponse.json({ success: true, result });
  } catch (error) {
    console.error("Error in queue manager API route:", error);
    return NextResponse.json(
      {
        error: "Server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
