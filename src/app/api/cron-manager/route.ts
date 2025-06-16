import { NextResponse } from "next/server";
import { JobSchedulerManager } from "@/lib/services/cron-manager";
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
        await JobSchedulerManager.queueJob(
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
        const queueManager = JobSchedulerManager.getQueueManager();
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
        const resumeQueueManager = JobSchedulerManager.getQueueManager();
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
        const cleanQueueManager = JobSchedulerManager.getQueueManager();
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
        const restartQueueManager = JobSchedulerManager.getQueueManager();
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
        const forceQueueManager = JobSchedulerManager.getQueueManager();
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
        // Force initialize the job scheduler system
        try {
          await JobSchedulerManager.initialize();
          result = { message: "Job scheduler initialized successfully" };
        } catch (error) {
          return NextResponse.json(
            {
              error: "Failed to initialize job scheduler",
              details: error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 }
          );
        }
        break;

      case "system_recovery":
        // Comprehensive system recovery
        try {
          // Step 1: Shutdown existing connections
          await JobSchedulerManager.shutdown();

          // Step 2: Wait a moment for cleanup
          await new Promise((resolve) => setTimeout(resolve, 2000));

          // Step 3: Re-initialize everything
          await JobSchedulerManager.initialize();

          result = {
            message: "System recovery completed successfully",
            steps: [
              "Shutdown existing connections",
              "Cleanup completed",
              "Re-initialized job scheduler",
              "System ready for operations",
            ],
          };
        } catch (error) {
          return NextResponse.json(
            {
              error: "System recovery failed",
              details: error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 }
          );
        }
        break;

      case "stop_all":
        await JobSchedulerManager.shutdown();
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
        await JobSchedulerManager.queueJob(
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
        await JobSchedulerManager.queueJob(
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
        await JobSchedulerManager.queueJob(
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
        result = await JobSchedulerManager.triggerJob(body.jobName);
        break;

      case "start":
        if (!body.jobName) {
          return NextResponse.json(
            { error: "Job name required" },
            { status: 400 }
          );
        }
        result = await JobSchedulerManager.startJob(body.jobName);
        break;

      case "stop":
        if (!body.jobName) {
          return NextResponse.json(
            { error: "Job name required" },
            { status: 400 }
          );
        }
        result = await JobSchedulerManager.stopJob(body.jobName);
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
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");
  const apiKey = searchParams.get("apiKey");

  // Simple API key validation
  if (apiKey !== "test-scheduler-key") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let result;

  try {
    switch (action) {
      case "status":
        result = await JobSchedulerManager.getStatus();
        break;

      case "job_history":
        const hours = parseInt(searchParams.get("hours") || "24");
        result = await JobSchedulerManager.getJobHistory(hours);
        break;

      case "queue_metrics":
        const queueManager = JobSchedulerManager.getQueueManager();
        if (!queueManager) {
          return NextResponse.json(
            { error: "Queue manager not available" },
            { status: 503 }
          );
        }
        result = await queueManager.getAllQueueMetrics();
        break;

      case "job_details":
        const jobId = searchParams.get("jobId");
        const queueName = searchParams.get("queueName");

        if (!jobId || !queueName) {
          return NextResponse.json(
            { error: "Job ID and queue name required" },
            { status: 400 }
          );
        }

        const detailsQueueManager = JobSchedulerManager.getQueueManager();
        if (!detailsQueueManager) {
          return NextResponse.json(
            { error: "Queue manager not available" },
            { status: 503 }
          );
        }

        result = await detailsQueueManager.getJobDetails(queueName, jobId);
        break;

      case "logs":
        const logHours = parseInt(searchParams.get("hours") || "24");
        result = await JobSchedulerManager.getJobLogs(logHours);
        break;

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    return NextResponse.json({ success: true, result });
  } catch (error) {
    console.error(`Error in GET /api/cron-manager (${action}):`, error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
