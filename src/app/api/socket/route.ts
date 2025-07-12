import { NextRequest, NextResponse } from "next/server";
import {
  getWebSocketServer,
  initializeWebSocketServer,
} from "@/lib/websocket/websocket-server";

export async function GET(req: NextRequest) {
  try {
    console.log("🔄 Initializing Socket.IO server via App Router...");

    // Get or initialize WebSocket server
    let webSocketServer = getWebSocketServer();

    if (!webSocketServer) {
      console.log("🔄 WebSocket server not found, initializing...");
      // For App Router, we can't access the HTTP server directly
      // So we'll rely on the middleware initialization
      console.log("⚠️ WebSocket server should be initialized via middleware");
      return NextResponse.json(
        {
          error:
            "WebSocket server not available. Please ensure middleware is properly configured.",
        },
        { status: 503 }
      );
    }

    if (webSocketServer) {
      console.log("✅ Socket.IO server initialized successfully");
      return NextResponse.json({ status: "Socket.IO server running" });
    } else {
      console.error("❌ Failed to initialize WebSocket server");
      return NextResponse.json(
        { error: "Failed to initialize WebSocket server" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("❌ Error in socket route:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
