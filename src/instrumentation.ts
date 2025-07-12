import * as Sentry from '@sentry/nextjs';
import { initializeWebSocket } from './lib/websocket/websocket-middleware';

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('../sentry.server.config');
    
    // Initialize WebSocket server for real-time notifications
    try {
      await initializeWebSocket();
      console.log('WebSocket server initialized during app startup');
    } catch (error) {
      console.error('Failed to initialize WebSocket during startup:', error);
      // Don't throw to prevent app from crashing
    }
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('../sentry.edge.config');
  }
}

export const onRequestError = Sentry.captureRequestError;
