import * as Sentry from "@sentry/nextjs";
import { initializeWebSocket } from "./lib/websocket/websocket-middleware";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("../sentry.server.config");

    // WebSocket server is now running as a standalone process
    // Skip initialization to avoid port conflicts
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("../sentry.edge.config");
  }
}

export const onRequestError = Sentry.captureRequestError;
