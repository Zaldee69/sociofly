#!/usr/bin/env node

/**
 * High-Performance Standalone WebSocket Server
 * Optimized for production with clustering, connection pooling, and monitoring
 */

const cluster = require('cluster');
const os = require('os');
const { createServer } = require('http');
const { Server } = require('socket.io');
const { createAdapter } = require('@socket.io/redis-adapter');
const Redis = require('ioredis');

// Configuration
const CONFIG = {
  port: process.env.WEBSOCKET_PORT || 3004,
  host: process.env.WEBSOCKET_HOST || '0.0.0.0',
  environment: process.env.NODE_ENV || 'development',
  
  // Clustering
  enableClustering: process.env.ENABLE_CLUSTERING !== 'false',
  maxWorkers: process.env.MAX_WORKERS || os.cpus().length,
  
  // Redis configuration
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB) || 0,
    retryDelayOnFailover: 100,
    maxRetriesPerRequest: 3,
    lazyConnect: true,
    keepAlive: 30000,
    connectTimeout: 10000,
    commandTimeout: 5000,
  },
  
  // Performance tuning
  performance: {
    maxConnections: parseInt(process.env.MAX_CONNECTIONS) || 10000,
    pingTimeout: parseInt(process.env.PING_TIMEOUT) || 20000,
    pingInterval: parseInt(process.env.PING_INTERVAL) || 10000,
    upgradeTimeout: parseInt(process.env.UPGRADE_TIMEOUT) || 10000,
    maxHttpBufferSize: parseInt(process.env.MAX_HTTP_BUFFER_SIZE) || 1e6,
    connectionTimeout: parseInt(process.env.CONNECTION_TIMEOUT) || 20000,
    heartbeatInterval: parseInt(process.env.HEARTBEAT_INTERVAL) || 30000,
  },
  
  // Rate limiting
  rateLimit: {
    maxConnectionsPerIP: parseInt(process.env.MAX_CONNECTIONS_PER_IP) || 100,
    maxEventsPerSecond: parseInt(process.env.MAX_EVENTS_PER_SECOND) || 50,
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 1000,
    banDuration: parseInt(process.env.BAN_DURATION_MS) || 60000,
  }
};

// CORS origins
const CORS_ORIGINS = buildCorsOrigins();

function buildCorsOrigins() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const origins = [
    appUrl,
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3002',
    'http://127.0.0.1:3000',
    'http://0.0.0.0:3000'
  ];

  // Add Docker/production IP origins
  if (appUrl.includes('://') && !appUrl.includes('localhost') && !appUrl.includes('127.0.0.1')) {
    const url = new URL(appUrl);
    origins.push(
      `${url.protocol}//${url.hostname}`,
      `${url.protocol}//${url.hostname}:3000`,
      `${url.protocol}//${url.hostname}:3001`,
      `${url.protocol}//${url.hostname}:3004`
    );
  }

  return origins;
}

// Master process - cluster management
if (cluster.isMaster && CONFIG.enableClustering) {
  console.log(`🚀 Master process ${process.pid} starting...`);
  console.log(`📊 Environment: ${CONFIG.environment}`);
  console.log(`🔧 Max workers: ${CONFIG.maxWorkers}`);
  console.log(`🌐 CORS origins: ${CORS_ORIGINS.length} configured`);

  // Fork workers
  for (let i = 0; i < CONFIG.maxWorkers; i++) {
    cluster.fork();
  }

  // Handle worker crashes
  cluster.on('exit', (worker, code, signal) => {
    console.log(`⚠️  Worker ${worker.process.pid} died (${signal || code}). Restarting...`);
    cluster.fork();
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('🛑 Master received SIGTERM, shutting down workers...');
    for (const id in cluster.workers) {
      cluster.workers[id].kill();
    }
    process.exit(0);
  });

  return;
}

// Worker process - WebSocket server
class HighPerformanceWebSocketServer {
  constructor() {
    this.httpServer = null;
    this.io = null;
    this.redisClient = null;
    this.redisAdapter = null;
    
    // Performance metrics
    this.metrics = {
      connections: 0,
      totalConnections: 0,
      messagesProcessed: 0,
      errors: 0,
      startTime: Date.now(),
    };
    
    // Connection pools
    this.connectedUsers = new Map();
    this.userSockets = new Map();
    this.teamMembers = new Map();
    
    // Rate limiting
    this.rateLimiter = new Map();
    this.bannedIPs = new Set();
    
    // Health monitoring
    this.healthStatus = {
      status: 'starting',
      redis: 'disconnected',
      lastHealthCheck: Date.now(),
    };
    
    this.init();
  }

  async init() {
    try {
      await this.setupRedis();
      this.createHttpServer();
      this.createSocketServer();
      this.setupEventHandlers();
      this.startHealthMonitoring();
      this.startMetricsReporting();
      this.startServer();
    } catch (error) {
      console.error('❌ Failed to initialize WebSocket server:', error);
      process.exit(1);
    }
  }

  async setupRedis() {
    console.log('🔄 Setting up Redis connection...');
    
    this.redisClient = new Redis({
      host: CONFIG.redis.host,
      port: CONFIG.redis.port,
      password: CONFIG.redis.password,
      db: CONFIG.redis.db,
      retryDelayOnFailover: CONFIG.redis.retryDelayOnFailover,
      maxRetriesPerRequest: CONFIG.redis.maxRetriesPerRequest,
      lazyConnect: CONFIG.redis.lazyConnect,
      keepAlive: CONFIG.redis.keepAlive,
      connectTimeout: CONFIG.redis.connectTimeout,
      commandTimeout: CONFIG.redis.commandTimeout,
    });
    
    this.redisClient.on('error', (error) => {
      console.error('❌ Redis error:', error);
      this.healthStatus.redis = 'error';
      this.metrics.errors++;
    });
    
    this.redisClient.on('connect', () => {
      console.log('✅ Redis connected');
      this.healthStatus.redis = 'connected';
    });
    
    this.redisClient.on('close', () => {
      console.log('⚠️  Redis disconnected');
      this.healthStatus.redis = 'disconnected';
    });
    
    this.redisClient.on('ready', () => {
      console.log('✅ Redis ready');
      this.healthStatus.redis = 'connected';
    });
    
    // ioredis will auto-connect when commands are issued
  }

  createHttpServer() {
    this.httpServer = createServer((req, res) => {
      this.handleHttpRequest(req, res);
    });
    
    // Connection limiting
    this.httpServer.on('connection', (socket) => {
      if (this.metrics.connections >= CONFIG.performance.maxConnections) {
        socket.destroy();
        return;
      }
      
      socket.setTimeout(CONFIG.performance.connectionTimeout);
      socket.on('timeout', () => socket.destroy());
    });
  }

  createSocketServer() {
    this.io = new Server(this.httpServer, {
      cors: {
        origin: this.corsOriginHandler.bind(this),
        methods: ['GET', 'POST'],
        credentials: true,
        allowEIO3: true
      },
      
      // Performance optimizations
      transports: ['polling', 'websocket'],
      pingTimeout: CONFIG.performance.pingTimeout,
      pingInterval: CONFIG.performance.pingInterval,
      upgradeTimeout: CONFIG.performance.upgradeTimeout,
      maxHttpBufferSize: CONFIG.performance.maxHttpBufferSize,
      connectTimeout: CONFIG.performance.connectionTimeout,
      allowUpgrades: true,
      perMessageDeflate: {
        threshold: 1024,
        concurrencyLimit: 10,
        memLevel: 7,
        windowBits: 13,
      },
      
      // Connection state recovery
      connectionStateRecovery: {
        maxDisconnectionDuration: 2 * 60 * 1000, // 2 minutes
        skipMiddlewares: true,
      }
    });

    // Setup Redis adapter for scaling
    if (this.redisClient) {
      const pubClient = this.redisClient.duplicate();
      const subClient = this.redisClient.duplicate();
      
      this.io.adapter(createAdapter(pubClient, subClient));
      console.log('✅ Redis adapter configured for scaling');
    }
  }

  setupEventHandlers() {
    this.io.on('connection', (socket) => {
      this.handleConnection(socket);
    });

    this.io.engine.on('connection_error', (err) => {
      console.error('❌ Connection error:', err);
      this.metrics.errors++;
    });
  }

  handleConnection(socket) {
    const clientIP = socket.handshake.address;
    
    // Rate limiting check
    if (this.bannedIPs.has(clientIP) || !this.checkRateLimit(clientIP)) {
      socket.disconnect(true);
      return;
    }

    // Update metrics
    this.metrics.connections++;
    this.metrics.totalConnections++;
    
    console.log(`🔌 Client connected: ${socket.id} (${clientIP}) [${this.metrics.connections} active]`);
    
    // Setup socket event handlers
    this.setupSocketHandlers(socket);
    
    // Connection cleanup
    socket.on('disconnect', (reason) => {
      this.handleDisconnection(socket, reason);
    });
  }

  setupSocketHandlers(socket) {
    // Rate limiting wrapper
    const rateLimitedHandler = (eventName, handler) => {
      return (...args) => {
        const clientIP = socket.handshake.address;
        if (!this.checkEventRateLimit(clientIP)) {
          socket.emit('rate_limit_exceeded', { message: 'Too many events' });
          return;
        }
        
        try {
          handler(...args);
          this.metrics.messagesProcessed++;
        } catch (error) {
          console.error(`❌ Error handling ${eventName}:`, error);
          this.metrics.errors++;
          socket.emit('error', { message: 'Internal server error' });
        }
      };
    };

    // Authentication
    socket.on('authenticate', rateLimitedHandler('authenticate', (data) => {
      this.handleAuthentication(socket, data);
    }));

    // User operations
    socket.on('join_user_room', rateLimitedHandler('join_user_room', (userId) => {
      this.handleJoinUserRoom(socket, userId);
    }));

    socket.on('leave_user_room', rateLimitedHandler('leave_user_room', (userId) => {
      this.handleLeaveUserRoom(socket, userId);
    }));

    // Team operations
    socket.on('join_team', rateLimitedHandler('join_team', (teamId) => {
      this.handleJoinTeam(socket, teamId);
    }));

    socket.on('leave_team', rateLimitedHandler('leave_team', (teamId) => {
      this.handleLeaveTeam(socket, teamId);
    }));

    // Notification operations
    socket.on('notification_read', rateLimitedHandler('notification_read', (notificationId) => {
      this.handleNotificationRead(socket, notificationId);
    }));

    socket.on('mark_all_read', rateLimitedHandler('mark_all_read', (userId) => {
      this.handleMarkAllRead(socket, userId);
    }));

    // Heartbeat
    socket.on('heartbeat', rateLimitedHandler('heartbeat', () => {
      socket.emit('heartbeat_ack', { timestamp: Date.now() });
    }));

    // Connection status
    socket.on('ping', rateLimitedHandler('ping', () => {
      socket.emit('pong', { timestamp: Date.now() });
    }));
  }

  handleAuthentication(socket, data) {
    const { userId, teamId, token } = data;
    
    if (!userId) {
      socket.emit('auth_error', { message: 'User ID required' });
      return;
    }

    // Store user association
    socket.userId = userId;
    socket.teamId = teamId;
    
    // Join user room
    socket.join(`user-${userId}`);
    this.connectedUsers.set(userId, socket.id);
    this.userSockets.set(socket.id, userId);
    
    // Join team room if provided
    if (teamId) {
      socket.join(`team-${teamId}`);
      
      if (!this.teamMembers.has(teamId)) {
        this.teamMembers.set(teamId, new Set());
      }
      this.teamMembers.get(teamId).add(userId);
    }
    
    console.log(`🔐 User ${userId} authenticated${teamId ? ` (team: ${teamId})` : ''}`);
    
    socket.emit('authenticated', {
      userId,
      teamId,
      status: 'success',
      timestamp: Date.now()
    });
  }

  handleJoinUserRoom(socket, userId) {
    socket.join(`user-${userId}`);
    console.log(`👤 Socket ${socket.id} joined user room ${userId}`);
    socket.emit('joined_user_room', { userId, timestamp: Date.now() });
  }

  handleLeaveUserRoom(socket, userId) {
    socket.leave(`user-${userId}`);
    console.log(`👤 Socket ${socket.id} left user room ${userId}`);
    socket.emit('left_user_room', { userId, timestamp: Date.now() });
  }

  handleJoinTeam(socket, teamId) {
    socket.join(`team-${teamId}`);
    
    if (socket.userId) {
      if (!this.teamMembers.has(teamId)) {
        this.teamMembers.set(teamId, new Set());
      }
      this.teamMembers.get(teamId).add(socket.userId);
    }
    
    console.log(`👥 Socket ${socket.id} joined team ${teamId}`);
    socket.emit('joined_team', { teamId, timestamp: Date.now() });
  }

  handleLeaveTeam(socket, teamId) {
    socket.leave(`team-${teamId}`);
    
    if (socket.userId && this.teamMembers.has(teamId)) {
      this.teamMembers.get(teamId).delete(socket.userId);
      if (this.teamMembers.get(teamId).size === 0) {
        this.teamMembers.delete(teamId);
      }
    }
    
    console.log(`👥 Socket ${socket.id} left team ${teamId}`);
    socket.emit('left_team', { teamId, timestamp: Date.now() });
  }

  handleNotificationRead(socket, notificationId) {
    console.log(`📖 Notification ${notificationId} marked as read by ${socket.userId}`);
    
    // Broadcast to user's other devices
    if (socket.userId) {
      socket.to(`user-${socket.userId}`).emit('notification_read', {
        notificationId,
        readBy: socket.userId,
        timestamp: Date.now()
      });
    }
    
    socket.emit('notification_read_ack', { notificationId, timestamp: Date.now() });
  }

  handleMarkAllRead(socket, userId) {
    console.log(`📚 All notifications marked as read by ${userId}`);
    
    // Broadcast to user's other devices
    socket.to(`user-${userId}`).emit('all_notifications_read', {
      userId,
      timestamp: Date.now()
    });
    
    socket.emit('all_notifications_read_ack', { userId, timestamp: Date.now() });
  }

  handleDisconnection(socket, reason) {
    this.metrics.connections--;
    
    // Cleanup user associations
    if (socket.userId) {
      this.connectedUsers.delete(socket.userId);
      this.userSockets.delete(socket.id);
      
      // Cleanup team associations
      if (socket.teamId && this.teamMembers.has(socket.teamId)) {
        this.teamMembers.get(socket.teamId).delete(socket.userId);
        if (this.teamMembers.get(socket.teamId).size === 0) {
          this.teamMembers.delete(socket.teamId);
        }
      }
    }
    
    console.log(`🔌 Client disconnected: ${socket.id}, reason: ${reason} [${this.metrics.connections} active]`);
  }

  handleHttpRequest(req, res) {
    // CORS headers
    const origin = req.headers.origin;
    if (CORS_ORIGINS.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    } else {
      res.setHeader('Access-Control-Allow-Origin', CORS_ORIGINS[0]);
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }
    
    // Route handlers
    if (req.method === 'GET' && req.url === '/health') {
      this.handleHealthCheck(res);
    } else if (req.method === 'GET' && req.url === '/metrics') {
      this.handleMetrics(res);
    } else if (req.method === 'POST' && req.url === '/api/notify') {
      this.handleNotifyAPI(req, res);
    } else if (req.method === 'GET' && req.url === '/api/status') {
      this.handleStatusAPI(res);
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not found' }));
    }
  }

  handleHealthCheck(res) {
    const uptime = Date.now() - this.metrics.startTime;
    const health = {
      status: this.healthStatus.status,
      uptime,
      redis: this.healthStatus.redis,
      connections: this.metrics.connections,
      totalConnections: this.metrics.totalConnections,
      messagesProcessed: this.metrics.messagesProcessed,
      errors: this.metrics.errors,
      memoryUsage: process.memoryUsage(),
      timestamp: Date.now()
    };
    
    this.healthStatus.lastHealthCheck = Date.now();
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(health));
  }

  handleMetrics(res) {
    const metrics = {
      ...this.metrics,
      connectedUsers: this.connectedUsers.size,
      teamMembers: this.teamMembers.size,
      bannedIPs: this.bannedIPs.size,
      rateLimiter: this.rateLimiter.size,
      memoryUsage: process.memoryUsage(),
      timestamp: Date.now()
    };
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(metrics));
  }

  handleNotifyAPI(req, res) {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        const { type, userId, teamId, notification } = data;
        
        if (type === 'user' && userId && notification) {
          this.sendNotificationToUser(userId, notification);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, message: 'Notification sent to user' }));
        } else if (type === 'team' && teamId && notification) {
          this.sendNotificationToTeam(teamId, notification);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, message: 'Notification sent to team' }));
        } else if (type === 'system' && notification) {
          this.broadcastSystemNotification(notification);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, message: 'System notification broadcasted' }));
        } else {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid request data' }));
        }
      } catch (error) {
        console.error('❌ API error:', error);
        this.metrics.errors++;
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Internal server error' }));
      }
    });
  }

  handleStatusAPI(res) {
    const status = {
      status: 'active',
      connections: this.metrics.connections,
      connectedUsers: this.connectedUsers.size,
      totalConnections: this.metrics.totalConnections,
      messagesProcessed: this.metrics.messagesProcessed,
      uptime: Date.now() - this.metrics.startTime,
      redis: this.healthStatus.redis,
      timestamp: Date.now()
    };
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(status));
  }

  corsOriginHandler(origin, callback) {
    if (!origin) return callback(null, true);
    
    if (CORS_ORIGINS.includes(origin)) {
      return callback(null, true);
    }
    
    // Allow IP-based origins for Docker/production
    if (origin.match(/^https?:\/\/\d+\.\d+\.\d+\.\d+(:\d+)?$/)) {
      return callback(null, true);
    }
    
    console.warn(`🚫 CORS blocked origin: ${origin}`);
    return callback(new Error('Not allowed by CORS'), false);
  }

  checkRateLimit(clientIP) {
    const now = Date.now();
    const connections = this.rateLimiter.get(clientIP) || { count: 0, lastReset: now };
    
    if (now - connections.lastReset > CONFIG.rateLimit.windowMs) {
      connections.count = 0;
      connections.lastReset = now;
    }
    
    if (connections.count >= CONFIG.rateLimit.maxConnectionsPerIP) {
      this.bannedIPs.add(clientIP);
      setTimeout(() => this.bannedIPs.delete(clientIP), CONFIG.rateLimit.banDuration);
      return false;
    }
    
    connections.count++;
    this.rateLimiter.set(clientIP, connections);
    return true;
  }

  checkEventRateLimit(clientIP) {
    const now = Date.now();
    const key = `events_${clientIP}`;
    const events = this.rateLimiter.get(key) || { count: 0, lastReset: now };
    
    if (now - events.lastReset > CONFIG.rateLimit.windowMs) {
      events.count = 0;
      events.lastReset = now;
    }
    
    if (events.count >= CONFIG.rateLimit.maxEventsPerSecond) {
      return false;
    }
    
    events.count++;
    this.rateLimiter.set(key, events);
    return true;
  }

  sendNotificationToUser(userId, notification) {
    const enhancedNotification = {
      ...notification,
      timestamp: Date.now(),
      serverId: process.pid
    };
    
    console.log(`📨 Sending notification to user ${userId}:`, enhancedNotification.type || 'notification');
    this.io.to(`user-${userId}`).emit('notification', enhancedNotification);
  }

  sendNotificationToTeam(teamId, notification) {
    const enhancedNotification = {
      ...notification,
      timestamp: Date.now(),
      serverId: process.pid
    };
    
    console.log(`📨 Sending notification to team ${teamId}:`, enhancedNotification.type || 'notification');
    this.io.to(`team-${teamId}`).emit('notification', enhancedNotification);
  }

  broadcastSystemNotification(notification) {
    const enhancedNotification = {
      ...notification,
      timestamp: Date.now(),
      serverId: process.pid
    };
    
    console.log(`📢 Broadcasting system notification:`, enhancedNotification.type || 'system');
    this.io.emit('system_notification', enhancedNotification);
  }

  startHealthMonitoring() {
    setInterval(() => {
      this.performHealthCheck();
    }, CONFIG.performance.heartbeatInterval);
  }

  performHealthCheck() {
    // Check Redis connection
    if (this.redisClient && this.redisClient.status === 'ready') {
      this.redisClient.ping()
        .then(() => {
          this.healthStatus.redis = 'connected';
        })
        .catch(() => {
          this.healthStatus.redis = 'error';
        });
    }
    
    // Update overall health status
    this.healthStatus.status = this.healthStatus.redis === 'connected' ? 'healthy' : 'degraded';
    this.healthStatus.lastHealthCheck = Date.now();
    
    // Cleanup old rate limit entries
    this.cleanupRateLimiter();
  }

  cleanupRateLimiter() {
    const now = Date.now();
    for (const [key, data] of this.rateLimiter.entries()) {
      if (now - data.lastReset > CONFIG.rateLimit.windowMs * 2) {
        this.rateLimiter.delete(key);
      }
    }
  }

  startMetricsReporting() {
    setInterval(() => {
      const uptime = Date.now() - this.metrics.startTime;
      const memUsage = process.memoryUsage();
      
      console.log(`📊 Metrics [Worker ${process.pid}]:`, {
        connections: this.metrics.connections,
        users: this.connectedUsers.size,
        teams: this.teamMembers.size,
        processed: this.metrics.messagesProcessed,
        errors: this.metrics.errors,
        uptime: Math.round(uptime / 1000) + 's',
        memory: Math.round(memUsage.rss / 1024 / 1024) + 'MB'
      });
    }, 60000); // Every minute
  }

  startServer() {
    this.httpServer.listen(CONFIG.port, CONFIG.host, () => {
      this.healthStatus.status = 'healthy';
      
      console.log(`🚀 WebSocket server (Worker ${process.pid}) listening on ${CONFIG.host}:${CONFIG.port}`);
      console.log(`🌐 CORS origins: ${CORS_ORIGINS.length} configured`);
      console.log(`🔗 WebSocket URL: ws://${CONFIG.host}:${CONFIG.port}`);
      console.log(`📱 App URL: ${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}`);
      console.log(`🔧 Max connections: ${CONFIG.performance.maxConnections}`);
      console.log(`⚡ Rate limit: ${CONFIG.rateLimit.maxEventsPerSecond} events/sec per IP`);
      console.log(`📊 Health check: http://${CONFIG.host}:${CONFIG.port}/health`);
      console.log(`📈 Metrics: http://${CONFIG.host}:${CONFIG.port}/metrics`);
    });

    // Graceful shutdown
    const gracefulShutdown = () => {
      console.log(`🛑 Worker ${process.pid} shutting down gracefully...`);
      
      this.healthStatus.status = 'shutting_down';
      
      // Stop accepting new connections
      this.httpServer.close(() => {
        console.log(`✅ HTTP server closed (Worker ${process.pid})`);
        
        // Close Socket.IO server
        this.io.close(() => {
          console.log(`✅ Socket.IO server closed (Worker ${process.pid})`);
          
          // Close Redis connection
          if (this.redisClient) {
            this.redisClient.disconnect();
            console.log(`✅ Redis connection closed (Worker ${process.pid})`);
            process.exit(0);
          } else {
            process.exit(0);
          }
        });
      });
      
      // Force shutdown after timeout
      setTimeout(() => {
        console.log(`⚠️  Force shutdown (Worker ${process.pid})`);
        process.exit(1);
      }, 30000);
    };
    
    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);
  }
}

// Start the server
new HighPerformanceWebSocketServer();

// Export for testing
module.exports = HighPerformanceWebSocketServer;