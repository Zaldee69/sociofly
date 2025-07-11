import { NextResponse } from "next/server";

let isInitialized = false;

export async function GET() {
  try {
    if (!isInitialized) {
      console.log("🚀 Auto-initializing queue manager via API route...");
      const { QueueManager } = await import("@/lib/queue/queue-manager");
      const queueManager = QueueManager.getInstance();
      await queueManager.initialize();
      isInitialized = true;
      console.log("✅ Queue manager auto-initialized successfully");
    }

    // Get actual status after initialization attempt
    const { QueueManager } = await import("@/lib/queue/queue-manager");
    const queueManager = QueueManager.getInstance();
    const isReady = queueManager.isReady();

    return NextResponse.json({
      success: true,
      message: "Queue manager initialization attempted",
      alreadyInitialized: isInitialized,
      actualStatus: {
        initialized: isInitialized,
        queueManagerReady: isReady,
      },
    });
  } catch (error) {
    console.error("❌ Failed to auto-initialize queue manager:", error);
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
