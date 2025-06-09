import { NextResponse } from "next/server";
import { SchedulerService } from "@/lib/services/scheduler.service";
import { prisma } from "@/lib/prisma/client";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, apiKey } = body;

    // Very basic auth check - in a real app, use a proper API key verification
    const validApiKey = process.env.CRON_API_KEY || "test-scheduler-key";

    if (apiKey !== validApiKey) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Log the cron job request
    await prisma.cronLog.create({
      data: {
        name: `cron_${action}`,
        status: "STARTED",
        message: `Cron job ${action} started`,
      },
    });

    let result;

    // Execute the requested action
    switch (action) {
      case "publish_due_posts":
        result = await SchedulerService.processDuePublications();
        break;

      case "check_expired_tokens":
        result = await SchedulerService.checkExpiredTokens();
        break;

      case "process_approval_edge_cases":
        result = await SchedulerService.processApprovalEdgeCases();
        break;

      case "get_system_health":
        result = await SchedulerService.getApprovalSystemHealth();
        break;

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    // Log completion
    await prisma.cronLog.create({
      data: {
        name: `cron_${action}`,
        status: "COMPLETED",
        message: `Cron job ${action} completed: ${JSON.stringify(result)}`,
      },
    });

    return NextResponse.json({ success: true, result });
  } catch (error) {
    console.error("Error in cron API route:", error);

    // Log error
    await prisma.cronLog.create({
      data: {
        name: "cron_api_error",
        status: "ERROR",
        message: `Error in cron API: ${
          error instanceof Error ? error.message : String(error)
        }`,
      },
    });

    return NextResponse.json(
      {
        error: "Server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
