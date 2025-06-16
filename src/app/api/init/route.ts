import { NextResponse } from "next/server";
import { initializeJobScheduler } from "@/lib/cron-startup";

let isInitialized = false;

export async function GET() {
  try {
    if (!isInitialized) {
      console.log("🚀 Auto-initializing job scheduler via API route...");
      await initializeJobScheduler();
      isInitialized = true;
      console.log("✅ Job scheduler auto-initialized successfully");
    }

    // Get actual status after initialization attempt
    const { JobSchedulerManager } = await import("@/lib/services/cron-manager");
    const status = await JobSchedulerManager.getStatus();

    return NextResponse.json({
      success: true,
      message: "Job scheduler initialization attempted",
      alreadyInitialized: isInitialized,
      actualStatus: {
        initialized: status.initialized,
        redisAvailable: status.redisAvailable,
        queueManagerReady: status.queueManagerReady,
        jobCount: status.scheduledJobs?.length || 0,
      },
    });
  } catch (error) {
    console.error("❌ Failed to auto-initialize job scheduler:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Initialization failed",
      },
      { status: 500 }
    );
  }
}

export async function POST() {
  return GET(); // Same logic for both GET and POST
}
