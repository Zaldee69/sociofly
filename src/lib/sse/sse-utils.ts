// SSE utility functions

// Store active connections
const connections = new Map<string, ReadableStreamDefaultController>();

// Function to add a connection
export function addSSEConnection(
  userId: string,
  controller: ReadableStreamDefaultController
) {
  connections.set(userId, controller);
  console.log(
    `SSE connection added for user ${userId}, total connections: ${connections.size}`
  );
}

// Function to remove a connection
export function removeSSEConnection(userId: string) {
  const removed = connections.delete(userId);
  if (removed) {
    console.log(
      `SSE connection removed for user ${userId}, remaining connections: ${connections.size}`
    );
  }
}

// Function to check if a user is connected
export function isUserConnected(userId: string): boolean {
  return connections.has(userId);
}

// Function to send notification to a specific user
export function sendNotificationToUser(
  userId: string,
  notification: any
): boolean {
  const controller = connections.get(userId);

  if (!controller) {
    console.log(`User ${userId} not connected via SSE, notification not sent`);
    return false;
  }

  try {
    const data = `data: ${JSON.stringify({
      type: "notification",
      ...notification,
      userId: userId, // Ensure userId is always included
      timestamp: notification.timestamp || new Date().toISOString(),
    })}\n\n`;

    controller.enqueue(new TextEncoder().encode(data));
    return true;
  } catch (error) {
    console.error(`Failed to send SSE notification to user ${userId}:`, error);
    // Remove broken connection
    connections.delete(userId);
    return false;
  }
}

// Function to get connected user IDs
export function getConnectedUsers(): string[] {
  return Array.from(connections.keys());
}

// Function to get connection count
export function getConnectionCount(): number {
  return connections.size;
}

// Function to broadcast to all connected users
export function broadcastToAll(message: any): {
  success: number;
  failed: number;
} {
  let success = 0;
  let failed = 0;

  for (const [userId, controller] of connections.entries()) {
    try {
      const data = `data: ${JSON.stringify({
        type: "broadcast",
        ...message,
        timestamp: new Date().toISOString(),
      })}\n\n`;

      controller.enqueue(new TextEncoder().encode(data));
      success++;
    } catch (error) {
      console.error(`Failed to broadcast to user ${userId}:`, error);
      connections.delete(userId);
      failed++;
    }
  }

  return { success, failed };
}
