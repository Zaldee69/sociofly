import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { addSSEConnection, removeSSEConnection } from "@/lib/sse/sse-utils";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const { userId } = await auth();

  if (!userId) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Create a readable stream for Server-Sent Events
  const stream = new ReadableStream({
    start(controller) {
      try {
        // Store the connection
        addSSEConnection(userId, controller);

        // Send initial connection message
        const data = `data: ${JSON.stringify({
          type: "connected",
          message: "SSE connection established",
          timestamp: new Date().toISOString(),
        })}\n\n`;

        controller.enqueue(new TextEncoder().encode(data));

        // Keep connection alive with periodic heartbeat
        const heartbeat = setInterval(() => {
          try {
            const heartbeatData = `data: ${JSON.stringify({
              type: "heartbeat",
              timestamp: new Date().toISOString(),
            })}\n\n`;
            controller.enqueue(new TextEncoder().encode(heartbeatData));
          } catch (error) {
            console.log("Heartbeat failed, cleaning up connection");
            clearInterval(heartbeat);
            removeSSEConnection(userId);
            try {
              controller.close();
            } catch (closeError) {
              // Connection already closed
            }
          }
        }, 15000); // Every 15 seconds (reduced from 30s for more reliable connection)

        // Cleanup on close
        request.signal.addEventListener("abort", () => {
          clearInterval(heartbeat);
          removeSSEConnection(userId);
          try {
            controller.close();
          } catch (error) {
            // Connection already closed
          }
        });

        // Handle connection timeout
        const connectionTimeout = setTimeout(
          () => {
            clearInterval(heartbeat);
            removeSSEConnection(userId);
            try {
              // Send end message before closing
              const endData = `data: ${JSON.stringify({
                type: "timeout",
                message: "Connection timed out after 2 hours",
                timestamp: new Date().toISOString(),
              })}\n\n`;
              controller.enqueue(new TextEncoder().encode(endData));
              controller.close();
            } catch (error) {
              // Connection already closed
            }
          },
          2 * 60 * 60 * 1000
        ); // 2 hours max connection time

        // Add timeout cleanup to abort listener
        request.signal.addEventListener("abort", () => {
          clearTimeout(connectionTimeout);
        });
      } catch (error) {
        console.error("Error in SSE stream start:", error);
        removeSSEConnection(userId);
        try {
          controller.close();
        } catch (closeError) {
          // Connection already closed
        }
      }
    },

    cancel() {
      removeSSEConnection(userId);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no", // Disable buffering in Nginx
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Cache-Control",
    },
  });
}
