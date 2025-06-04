import { NextResponse } from "next/server";
import { CronManager } from "@/lib/services/cron-manager";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, jobName, apiKey } = body;

    // Basic auth check
    const validApiKey = process.env.CRON_API_KEY || "test-scheduler-key";
    if (apiKey !== validApiKey) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let result;

    switch (action) {
      case "status":
        result = CronManager.getJobStatus();
        break;

      case "stats":
        const hours = body.hours || 24;
        result = await CronManager.getJobStatistics(hours);
        break;

      case "trigger":
        if (!jobName) {
          return NextResponse.json(
            { error: "Job name required for trigger action" },
            { status: 400 }
          );
        }
        result = await CronManager.triggerJob(jobName);
        break;

      case "stop":
        if (jobName) {
          result = CronManager.stopJob(jobName);
        } else {
          CronManager.stopAll();
          result = { message: "All jobs stopped" };
        }
        break;

      case "start":
        if (!jobName) {
          return NextResponse.json(
            { error: "Job name required for start action" },
            { status: 400 }
          );
        }
        result = CronManager.startJob(jobName);
        break;

      case "initialize":
        await CronManager.initialize();
        result = { message: "Cron manager initialized" };
        break;

      case "restart":
        await CronManager.forceRestart();
        result = { message: "Cron manager restarted successfully" };
        break;

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    return NextResponse.json({ success: true, result });
  } catch (error) {
    console.error("Error in cron manager API route:", error);
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
        result = CronManager.getJobStatus();
        break;

      case "stats":
        const hours = parseInt(searchParams.get("hours") || "24");
        result = await CronManager.getJobStatistics(hours);
        break;

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    return NextResponse.json({ success: true, result });
  } catch (error) {
    console.error("Error in cron manager API route:", error);
    return NextResponse.json(
      {
        error: "Server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
