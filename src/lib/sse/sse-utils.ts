// SSE utility functions

// Store active connections
const connections = new Map<string, ReadableStreamDefaultController>();

// Function to add a connection
export function addSSEConnection(userId: string, controller: ReadableStreamDefaultController) {
  connections.set(userId, controller);
}

// Function to remove a connection
export function removeSSEConnection(userId: string) {
  connections.delete(userId);
}

// Function to send notification to a specific user
export function sendNotificationToUser(userId: string, notification: any) {
  const controller = connections.get(userId);
  
  if (controller) {
    try {
      const data = `data: ${JSON.stringify({
        type: 'notification',
        ...notification,
        userId: userId, // Ensure userId is always included
        timestamp: new Date().toISOString()
      })}\n\n`;
      
      controller.enqueue(new TextEncoder().encode(data));
      console.log(`📨 SSE notification sent to user ${userId}:`, notification.title);
      return true;
    } catch (error) {
      console.error('Failed to send SSE notification:', error);
      connections.delete(userId);
      return false;
    }
  }
  
  console.log(`📨 User ${userId} not connected via SSE, storing notification`);
  return false;
}

// Function to get active connections count
export function getActiveConnectionsCount(): number {
  return connections.size;
}

// Function to get connected user IDs
export function getConnectedUsers(): string[] {
  return Array.from(connections.keys());
}