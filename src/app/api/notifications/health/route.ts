import { NextResponse } from "next/server";
import { getConnectedUsers, getConnectionCount } from "@/lib/sse/sse-utils";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Health check endpoint for SSE
 * Returns information about SSE connections
 */
export async function GET() {
  try {
    const connectedUsers = getConnectedUsers();
    const connectionCount = getConnectionCount();

    return NextResponse.json({
      status: "healthy",
      connections: {
        count: connectionCount,
        users: connectedUsers.length,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("SSE health check error:", error);
    return NextResponse.json(
      {
        status: "error",
        message: "Failed to get SSE health status",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
