import { NextResponse } from "next/server";
import { EnhancedCronManager } from "@/lib/services/enhanced-cron-manager";
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
        result = await EnhancedCronManager.getEnhancedStatus();
        break;

      case "queue_metrics":
        const queueManager = EnhancedCronManager.getQueueManager();
        if (!queueManager) {
          return NextResponse.json(
            { error: "Queue manager not available" },
            { status: 503 }
          );
        }
        const queueName = searchParams.get("queueName");
        if (queueName) {
          result = await queueManager.getQueueMetrics(queueName);
        } else {
          result = await queueManager.getAllQueueMetrics();
        }
        break;

      case "available_queues":
        result = {
          queues: Object.values(QueueManager.QUEUES),
          jobTypes: Object.values(JobType),
          isUsingQueues: EnhancedCronManager.isUsingQueues(),
        };
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
