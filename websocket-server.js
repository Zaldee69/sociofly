#!/usr/bin/env node

// Standalone WebSocket server for development
const { createServer } = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const PORT = process.env.WEBSOCKET_PORT || 3004;
const CORS_ORIGINS = [
  process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  'http://localhost:3001', // Support port 3001
  'http://localhost:3002', // Support port 3002
  'http://localhost:3000'
];

// Create HTTP server with API endpoints
const httpServer = createServer((req, res) => {
  // Set CORS headers
  const origin = req.headers.origin;
  if (CORS_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    res.setHeader('Access-Control-Allow-Origin', CORS_ORIGINS[0]);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  if (req.method === 'POST' && req.url === '/api/notify') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        const { type, userId, teamId, notification } = data;
        
        if (type === 'user' && userId && notification) {
          sendNotificationToUser(userId, notification);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, message: 'Notification sent to user' }));
        } else if (type === 'team' && teamId && notification) {
          sendNotificationToTeam(teamId, notification);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, message: 'Notification sent to team' }));
        } else if (type === 'system' && notification) {
          broadcastSystemNotification(notification);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, message: 'System notification broadcasted' }));
        } else {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid request data' }));
        }
      } catch (error) {
        console.error('API error:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Internal server error' }));
      }
    });
  } else if (req.method === 'GET' && req.url === '/api/status') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      status: 'active',
      connectedUsers: connectedUsers.size,
      totalConnections: io.engine.clientsCount
    }));
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  }
});

// Create Socket.IO server
const io = new Server(httpServer, {
  cors: {
    origin: CORS_ORIGINS,
    methods: ['GET', 'POST'],
    credentials: true
  },
  transports: ['websocket', 'polling']
});

// Store connected users
const connectedUsers = new Map();

// Connection handling
io.on('connection', (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);
  
  socket.on('disconnect', (reason) => {
    console.log(`🔌 Client disconnected: ${socket.id}, reason: ${reason}`);
    // Remove user from connected users
    for (const [userId, socketId] of connectedUsers.entries()) {
      if (socketId === socket.id) {
        connectedUsers.delete(userId);
        console.log(`👤 User ${userId} removed from connected users`);
        break;
      }
    }
  });
  
  // Handle ping/pong for connection health
  socket.on('ping', () => {
    socket.emit('pong');
  });
  
  // Handle authentication (client sends this event)
  socket.on('authenticate', (data) => {
    console.log(`🔐 Authentication request:`, data);
    if (data.userId) {
      socket.join(`user-${data.userId}`);
      connectedUsers.set(data.userId, socket.id);
      console.log(`👤 User ${data.userId} authenticated and joined room`);
      
      // Send authentication success
      socket.emit('authenticated', { userId: data.userId, status: 'success' });
    }
    if (data.teamId) {
      socket.join(`team-${data.teamId}`);
      console.log(`👥 User joined team room ${data.teamId}`);
    }
  });
  
  // Handle team join (client sends this event)
  socket.on('join_team', (teamId) => {
    socket.join(`team-${teamId}`);
    console.log(`👥 User joined team room ${teamId}`);
  });
  
  // Handle team leave (client sends this event)
  socket.on('leave_team', (teamId) => {
    socket.leave(`team-${teamId}`);
    console.log(`👥 User left team room ${teamId}`);
  });
  
  // Handle notification read acknowledgment
  socket.on('notification_read', (notificationId) => {
    console.log(`📖 Notification marked as read: ${notificationId}`);
    socket.emit('notification_read_ack', { notificationId });
  });
  
  // Handle heartbeat
  socket.on('heartbeat', () => {
    socket.emit('heartbeat');
  });
});

// Function to send notification to specific user
function sendNotificationToUser(userId, notification) {
  console.log(`📨 Sending notification to user ${userId}:`, notification);
  io.to(`user-${userId}`).emit('notification', notification);
}

// Function to send notification to team
function sendNotificationToTeam(teamId, notification) {
  console.log(`📨 Sending notification to team ${teamId}:`, notification);
  io.to(`team-${teamId}`).emit('notification', notification);
}

// Function to broadcast system notification
function broadcastSystemNotification(notification) {
  console.log(`📢 Broadcasting system notification:`, notification);
  io.emit('system_notification', notification);
}

// Export functions for external use (if needed)
module.exports = {
  sendNotificationToUser,
  sendNotificationToTeam,
  broadcastSystemNotification
};

// Start server
httpServer.listen(PORT, () => {
  console.log(`🚀 WebSocket server listening on port ${PORT}`);
  console.log(`🌐 CORS origins: ${CORS_ORIGINS.join(', ')}`);
  console.log(`🔗 WebSocket URL: ws://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Received SIGTERM, shutting down gracefully');
  httpServer.close(() => {
    console.log('✅ WebSocket server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🛑 Received SIGINT, shutting down gracefully');
  httpServer.close(() => {
    console.log('✅ WebSocket server closed');
    process.exit(0);
  });
});