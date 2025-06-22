import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { SyncScheduler } from "@/lib/services/analytics/core/sync-scheduler";
import { QueueManager } from "@/lib/queue/queue-manager";
import { JobType } from "@/lib/queue/job-types";

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");

    const syncScheduler = new SyncScheduler();

    switch (action) {
      case "status":
        // Get sync statistics
        const timeRange =
          (searchParams.get("timeRange") as "hour" | "day" | "week") || "day";
        const stats = await syncScheduler.getSyncStatistics(timeRange);

        return NextResponse.json({
          success: true,
          data: {
            statistics: stats,
            timestamp: new Date().toISOString(),
            timeRange,
          },
        });

      case "queue-status":
        // Get queue metrics
        const queueManager = QueueManager.getInstance();
        const queueMetrics = await queueManager.getAllQueueMetrics();

        return NextResponse.json({
          success: true,
          data: {
            queues: queueMetrics,
            timestamp: new Date().toISOString(),
          },
        });

      default:
        return NextResponse.json(
          { error: "Invalid action. Use 'status' or 'queue-status'" },
          { status: 400 }
        );
    }
  } catch (error: any) {
    console.error("Sync status API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to get sync status",
        details: error.message,
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { action, accountId, teamId, platform, options = {} } = body;

    if (!action) {
      return NextResponse.json(
        { error: "Action is required" },
        { status: 400 }
      );
    }

    const syncScheduler = new SyncScheduler(options.config);

    switch (action) {
      case "schedule-initial":
        if (!accountId || !teamId || !platform) {
          return NextResponse.json(
            {
              error:
                "accountId, teamId, and platform are required for initial sync",
            },
            { status: 400 }
          );
        }

        await syncScheduler.scheduleInitialSync(accountId, {
          teamId,
          platform,
          daysBack: options.daysBack,
          priority: options.priority,
          delay: options.delay,
        });

        return NextResponse.json({
          success: true,
          message: `Initial sync scheduled for account ${accountId}`,
          data: {
            accountId,
            syncType: "initial",
            scheduledAt: new Date().toISOString(),
          },
        });

      case "schedule-incremental-all":
        const incrementalResult =
          await syncScheduler.scheduleIncrementalSyncForAllAccounts();

        return NextResponse.json({
          success: true,
          message: `Incremental sync scheduled for ${incrementalResult.scheduled} accounts`,
          data: {
            syncType: "incremental",
            ...incrementalResult,
            scheduledAt: new Date().toISOString(),
          },
        });

      case "schedule-daily-all":
        const dailyResult =
          await syncScheduler.scheduleDailySyncForAllAccounts();

        return NextResponse.json({
          success: true,
          message: `Daily sync scheduled for ${dailyResult.scheduled} accounts`,
          data: {
            syncType: "daily",
            ...dailyResult,
            scheduledAt: new Date().toISOString(),
          },
        });

      case "manual-sync":
        if (!accountId || !teamId || !platform) {
          return NextResponse.json(
            {
              error:
                "accountId, teamId, and platform are required for manual sync",
            },
            { status: 400 }
          );
        }

        const syncType = options.syncType || "incremental";
        let jobType: JobType;
        let jobData: any;

        switch (syncType) {
          case "initial":
            jobType = JobType.INITIAL_SYNC;
            jobData = {
              accountId,
              teamId,
              platform,
              daysBack: options.daysBack || 30,
              priority: "high",
            };
            break;

          case "incremental":
            jobType = JobType.INCREMENTAL_SYNC;
            jobData = {
              accountId,
              teamId,
              platform,
              limit: options.limit || 25,
              priority: "normal",
            };
            break;

          case "daily":
            jobType = JobType.DAILY_SYNC;
            jobData = {
              accountId,
              teamId,
              platform,
              includeAudience: options.includeAudience !== false,
              includeHashtags: options.includeHashtags !== false,
              includeLinks: options.includeLinks !== false,
              priority: "normal",
            };
            break;

          default:
            return NextResponse.json(
              {
                error:
                  "Invalid syncType. Use 'initial', 'incremental', or 'daily'",
              },
              { status: 400 }
            );
        }

        const queueManager = QueueManager.getInstance();
        await queueManager.addJob(
          QueueManager.QUEUES.SOCIAL_SYNC,
          jobType,
          jobData,
          {
            attempts: 3,
            backoff: {
              type: "exponential",
              delay: 10000,
            },
          }
        );

        return NextResponse.json({
          success: true,
          message: `Manual ${syncType} sync initiated for account ${accountId}`,
          data: {
            accountId,
            syncType,
            jobType,
            initiatedAt: new Date().toISOString(),
          },
        });

      default:
        return NextResponse.json(
          {
            error:
              "Invalid action. Use 'schedule-initial', 'schedule-incremental-all', 'schedule-daily-all', or 'manual-sync'",
          },
          { status: 400 }
        );
    }
  } catch (error: any) {
    console.error("Sync API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to process sync request",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
