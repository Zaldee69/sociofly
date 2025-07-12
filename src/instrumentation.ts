import * as Sentry from '@sentry/nextjs';
import { initializeWebSocket } from './lib/websocket/websocket-middleware';

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('../sentry.server.config');
    
    // WebSocket server is now running as a standalone process
    // Skip initialization to avoid port conflicts
    console.log('WebSocket server running as standalone process on port', process.env.WEBSOCKET_PORT || '3005');
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('../sentry.edge.config');
  }
}

export const onRequestError = Sentry.captureRequestError;
