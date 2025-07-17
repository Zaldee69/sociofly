import { NextResponse } from "next/server";

export async function GET() {
  try {
    // Simple health check endpoint for deployment verification
    return NextResponse.json(
      {
        status: "healthy",
        timestamp: new Date().toISOString(),
        message: "Application is running",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Health check failed:", error);
    return NextResponse.json(
      {
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        message: "Application health check failed",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 503 }
    );
  }
}
