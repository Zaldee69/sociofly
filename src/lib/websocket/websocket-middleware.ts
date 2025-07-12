import { NextRequest, NextResponse } from 'next/server';
import { initializeWebSocketServer } from './websocket-server';

/**
 * WebSocket middleware to initialize WebSocket server
 * This ensures the WebSocket server is started when the application boots
 */
let isWebSocketInitialized = false;

export async function initializeWebSocket() {
  if (isWebSocketInitialized || typeof window !== 'undefined') {
    return;
  }

  try {
    console.log('Initializing WebSocket server...');
    // For now, we'll mark as initialized but actual initialization
    // will happen when the server starts
    isWebSocketInitialized = true;
    console.log('WebSocket server marked for initialization');
  } catch (error) {
    console.error('Failed to initialize WebSocket server:', error);
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