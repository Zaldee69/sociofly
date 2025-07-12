import { NextRequest, NextResponse } from "next/server";
import { initializeWebSocketServer } from "./websocket-server";

/**
 * WebSocket middleware to initialize WebSocket server
 * This ensures the WebSocket server is started when the application boots
 */
let isWebSocketInitialized = false;
let httpServer: any = null;

export async function initializeWebSocket() {
  if (isWebSocketInitialized || typeof window !== "undefined") {
    return;
  }

  // Skip WebSocket initialization in edge runtime
  if (process.env.NEXT_RUNTIME === 'edge') {
    console.log('🔍 loadSocketIO skipped - running in edge runtime');
    return;
  }

  try {
    console.log("Initializing WebSocket server...");

    // Dynamically import http module only in Node.js runtime
    const http = await import('http');
    
    // Create HTTP server for WebSocket
    httpServer = http.createServer();

    // Initialize WebSocket server with HTTP server
    const webSocketServer = await initializeWebSocketServer(httpServer);

    if (webSocketServer) {
      // Start HTTP server on a different port for WebSocket
      const wsPort = process.env.WEBSOCKET_PORT || 3001;
      httpServer.listen(wsPort, (error: any) => {
        if (error) {
          if (error.code === "EADDRINUSE") {
            console.log(
              `⚠️ Port ${wsPort} is in use, trying next available port...`
            );
            // Try next port
            httpServer.listen(0, () => {
              const actualPort = httpServer.address()?.port;
              console.log(
                `🚀 WebSocket server listening on port ${actualPort}`
              );
            });
          } else {
            console.error("❌ Failed to start WebSocket server:", error);
          }
        } else {
          console.log(`🚀 WebSocket server listening on port ${wsPort}`);
        }
      });

      isWebSocketInitialized = true;
      console.log("WebSocket server successfully initialized");
    } else {
      console.warn("Failed to initialize WebSocket server");
    }
  } catch (error) {
    console.error("Failed to initialize WebSocket server:", error);
    // Don't throw error to prevent app from crashing
    // WebSocket is optional functionality
  }
}

/**
 * Middleware function for Next.js
 */
export function websocketMiddleware(request: NextRequest) {
  // Initialize WebSocket server on first request
  if (!isWebSocketInitialized) {
    // Don't await to avoid blocking the request
    initializeWebSocket().catch(console.error);
  }

  return NextResponse.next();
}

/**
 * Check if WebSocket is initialized
 */
export function isWebSocketReady(): boolean {
  return isWebSocketInitialized;
}

/**
 * Reset WebSocket initialization status (for testing)
 */
export function resetWebSocketStatus(): void {
  isWebSocketInitialized = false;
}
