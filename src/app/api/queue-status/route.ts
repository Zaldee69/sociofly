import { NextRequest, NextResponse } from "next/server";
import { QueueManager } from "@/lib/queue/queue-manager";
import { prisma } from "@/lib/prisma/client";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");
    const apiKey = searchParams.get("apiKey");

    // Simple API key validation
    const expectedApiKey =
      process.env.NEXT_PUBLIC_CRON_API_KEY || "test-scheduler-key";
    if (apiKey !== expectedApiKey) {
      return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
    }

    // Ensure we're on server side before initializing QueueManager
    if (typeof window !== 'undefined') {
      return NextResponse.json({ error: "Queue operations not available on client side" }, { status: 400 });
    }

    const queueManager = QueueManager.getInstance();

    switch (action) {
      case "status":
        const isReady = queueManager.isReady();
        let redisAvailable = false;
        let queueMetrics = {};
        let redisInfo = null;

        // Check Redis availability
        try {
          const { RedisManager } = await import("@/lib/services/redis-manager");
          const redisManager = RedisManager.getInstance();
          redisAvailable = redisManager.isAvailable();

          if (redisAvailable) {
            // Get Redis info if available
            try {
              const connection = redisManager.getConnection();
              if (connection) {
                // Get basic Redis info
                if (redisManager.isCluster()) {
                  // For cluster, get info from first available node
                  const cluster = connection as any;
                  const nodes = cluster.nodes ? cluster.nodes() : [];
                  const masterNode = nodes.find(
                    (node: any) => node.status === "ready"
                  );
                  if (masterNode) {
                    redisInfo = await masterNode.info();
                  }
                } else {
                  redisInfo = await (connection as any).info();
                }
              }
            } catch (error) {
              console.warn("Failed to get Redis info:", error);
            }
          }
        } catch (error) {
          console.error("Failed to check Redis status:", error);
          redisAvailable = false;
        }

        // Get queue metrics only if both Redis and Queue Manager are ready
        if (isReady && redisAvailable) {
          try {
            queueMetrics = await queueManager.getAllQueueMetrics();
          } catch (error) {
            console.error("Failed to get queue metrics:", error);
            queueMetrics = {};
          }
        }

        return NextResponse.json({
          success: true,
          result: {
            initialized: isReady,
            useQueues: true,
            redisAvailable,
            queueManagerReady: isReady && redisAvailable,
            queueMetrics,
            redisInfo,
            scheduledJobs: [
              { name: "publish_due_posts", running: isReady && redisAvailable },
              { name: "incremental_sync", running: isReady && redisAvailable },
              { name: "daily_sync", running: isReady && redisAvailable },
              {
                name: "system_health_check",
                running: isReady && redisAvailable,
              },
              { name: "cleanup_old_logs", running: isReady && redisAvailable },
            ],
            systemHealth: {
              totalJobs: 0,
              completedJobs: 0,
              failedJobs: 0,
              activeJobs: 0,
              waitingJobs: 0,
              successRate: 0,
              lastUpdated: new Date().toISOString(),
            },
          },
        });

      case "logs":
        const hours = parseInt(searchParams.get("hours") || "24");
        const since = new Date(Date.now() - hours * 60 * 60 * 1000);

        const logs = await prisma.taskLog.findMany({
          where: {
            executedAt: {
              gte: since,
            },
          },
          orderBy: {
            executedAt: "desc",
          },
          take: 100,
        });

        return NextResponse.json({
          success: true,
          result: {
            totalLogs: logs.length,
            recentLogs: logs,
          },
        });

      case "job_details":
        const jobId = searchParams.get("jobId");
        const queueName = searchParams.get("queueName");

        if (!jobId || !queueName) {
          return NextResponse.json(
            { error: "Job ID and queue name are required" },
            { status: 400 }
          );
        }

        try {
          const queueManager = QueueManager.getInstance();
          if (!queueManager.isReady()) {
            return NextResponse.json(
              { error: "Queue manager not ready" },
              { status: 503 }
            );
          }

          const jobDetails = await queueManager.getJobDetails(queueName, jobId);

          return NextResponse.json({
            success: true,
            result: jobDetails || { error: "Job not found" },
          });
        } catch (error) {
          return NextResponse.json({
            success: true,
            result: { error: "Job details not available" },
          });
        }

      case "queue_metrics":
        try {
          const queueManager = QueueManager.getInstance();
          if (!queueManager.isReady()) {
            return NextResponse.json({
              success: true,
              result: {},
            });
          }

          const metrics = await queueManager.getAllQueueMetrics();

          return NextResponse.json({
            success: true,
            result: metrics,
          });
        } catch (error) {
          return NextResponse.json({
            success: true,
            result: {},
          });
        }

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Queue status API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Ensure we're on server side before processing queue operations
    if (typeof window !== 'undefined') {
      return NextResponse.json({ error: "Queue operations not available on client side" }, { status: 400 });
    }

    const body = await request.json();
    const { action, apiKey } = body;

    // Simple API key validation
    const expectedApiKey =
      process.env.NEXT_PUBLIC_CRON_API_KEY || "test-scheduler-key";
    if (apiKey !== expectedApiKey) {
      return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
    }

    const queueManager = QueueManager.getInstance();

    switch (action) {
      case "initialize":
        try {
          // First, ensure Redis is available
          const { RedisManager } = await import("@/lib/services/redis-manager");
          const redisManager = RedisManager.getInstance();

          if (!redisManager.isAvailable()) {
            console.log("🔗 Initializing Redis connection...");
            await redisManager.initialize();
          }

          // Then initialize Queue Manager
          if (!queueManager.isReady()) {
            console.log("🚀 Initializing Queue Manager...");
            await queueManager.initialize();
          }

          // Verify both are ready
          const redisReady = redisManager.isAvailable();
          const queueReady = queueManager.isReady();

          return NextResponse.json({
            success: true,
            message: "System initialized successfully",
            result: {
              redisAvailable: redisReady,
              queueManagerReady: queueReady,
              systemReady: redisReady && queueReady,
            },
          });
        } catch (error) {
          console.error("Failed to initialize system:", error);
          return NextResponse.json(
            {
              success: false,
              error:
                error instanceof Error
                  ? error.message
                  : "Initialization failed",
            },
            { status: 500 }
          );
        }

      case "trigger":
        const { jobName } = body;
        if (!jobName) {
          return NextResponse.json(
            { error: "Job name is required" },
            { status: 400 }
          );
        }

        // Map job names to queue operations
        const jobMapping: Record<string, { queue: string; type: string }> = {
          publish_due_posts: {
            queue: QueueManager.QUEUES.HIGH_PRIORITY,
            type: "publish_post",
          },
          incremental_sync: {
            queue: QueueManager.QUEUES.SOCIAL_SYNC,
            type: "incremental_sync",
          },
          daily_sync: {
            queue: QueueManager.QUEUES.SOCIAL_SYNC,
            type: "daily_sync",
          },
          system_health_check: {
            queue: QueueManager.QUEUES.MAINTENANCE,
            type: "system_health_check",
          },
          cleanup_old_logs: {
            queue: QueueManager.QUEUES.MAINTENANCE,
            type: "cleanup_old_logs",
          },
        };

        const jobConfig = jobMapping[jobName];
        if (!jobConfig) {
          return NextResponse.json(
            { error: "Unknown job name" },
            { status: 400 }
          );
        }

        // Create appropriate job data based on job type
        let jobData: any;
        switch (jobConfig.type) {
          case "publish_post":
            jobData = {
              postId: "manual-trigger",
              userId: "system",
              platform: "system",
              scheduledAt: new Date(),
              content: { text: "Manual trigger" },
            };
            break;
          case "incremental_sync":
            jobData = {
              accountId: "system",
              teamId: "system",
              platform: "INSTAGRAM" as const,
              priority: "high" as const,
            };
            break;
          case "daily_sync":
            jobData = {
              accountId: "system",
              teamId: "system",
              platform: "INSTAGRAM" as const,
              priority: "high" as const,
            };
            break;
          case "system_health_check":
            jobData = {
              checkType: "quick" as const,
            };
            break;
          case "cleanup_old_logs":
            jobData = {
              olderThanDays: 30,
            };
            break;
          default:
            jobData = { userId: "system" };
        }

        const job = await queueManager.addJob(
          jobConfig.queue,
          jobConfig.type as any,
          jobData,
          { priority: 10 }
        );

        return NextResponse.json({
          success: true,
          result: {
            jobId: job.id,
            queueName: jobConfig.queue,
            message: `Job ${jobName} queued successfully`,
          },
        });

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Queue status API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
