// WebSocket Configuration for Optimized Notification System

export interface WebSocketConfig {
  // In-memory storage settings
  maxNotificationsPerUser: number;
  notificationExpiryHours: number;
  cleanupIntervalMinutes: number;

  // Performance settings
  maxConcurrentConnections: number;
  heartbeatIntervalSeconds: number;
  connectionTimeoutSeconds: number;

  // Server settings
  serverPort: number;
  serverHost: string;

  // Fallback settings
  enableDatabaseFallback: boolean;
  enableRedisFallback: boolean;
  fallbackDelayMs: number;

  // Memory management
  enableMemoryOptimization: boolean;
  maxMemoryUsageMB: number;
  enableGracefulShutdown: boolean;
}

export const defaultWebSocketConfig: WebSocketConfig = {
  // In-memory storage settings
  maxNotificationsPerUser: 50, // Reduced from 100 to save memory
  notificationExpiryHours: 24,
  cleanupIntervalMinutes: 5,

  // Performance settings
  maxConcurrentConnections: 1000,
  heartbeatIntervalSeconds: 30,
  connectionTimeoutSeconds: 10,

  // Server settings
  serverPort: parseInt(process.env.WEBSOCKET_PORT || '9003'),
  serverHost: process.env.WEBSOCKET_HOST || 'localhost',

  // Fallback settings
  enableDatabaseFallback: true, // Only for offline users
  enableRedisFallback: false, // Disabled to reduce Redis load
  fallbackDelayMs: 2000,

  // Memory management
  enableMemoryOptimization: true,
  maxMemoryUsageMB: 100, // Limit memory usage
  enableGracefulShutdown: true,
};

// Environment-based configuration
export const getWebSocketConfig = (): WebSocketConfig => {
  const config = { ...defaultWebSocketConfig };

  // Production optimizations
  if (process.env.NODE_ENV === "production") {
    config.maxNotificationsPerUser = 30; // Further reduced for production
    config.cleanupIntervalMinutes = 3; // More frequent cleanup
    config.enableRedisFallback = false; // Completely disable Redis fallback
    config.maxMemoryUsageMB = 50; // Stricter memory limit
  }

  // Development settings
  if (process.env.NODE_ENV === "development") {
    config.maxNotificationsPerUser = 100; // More for testing
    config.cleanupIntervalMinutes = 10; // Less frequent cleanup
    config.enableRedisFallback = true; // Enable for testing
  }

  // Override with environment variables if provided
  if (process.env.WS_MAX_NOTIFICATIONS_PER_USER) {
    config.maxNotificationsPerUser = parseInt(
      process.env.WS_MAX_NOTIFICATIONS_PER_USER
    );
  }

  if (process.env.WS_CLEANUP_INTERVAL_MINUTES) {
    config.cleanupIntervalMinutes = parseInt(
      process.env.WS_CLEANUP_INTERVAL_MINUTES
    );
  }

  if (process.env.WS_ENABLE_REDIS_FALLBACK) {
    config.enableRedisFallback =
      process.env.WS_ENABLE_REDIS_FALLBACK === "true";
  }

  if (process.env.WEBSOCKET_PORT) {
    config.serverPort = parseInt(process.env.WEBSOCKET_PORT);
  }

  if (process.env.WEBSOCKET_HOST) {
    config.serverHost = process.env.WEBSOCKET_HOST;
  }

  return config;
};

// Memory monitoring utilities
export class WebSocketMemoryMonitor {
  private static instance: WebSocketMemoryMonitor;
  private memoryUsage: number = 0;
  private config: WebSocketConfig;

  private constructor() {
    this.config = getWebSocketConfig();
  }

  public static getInstance(): WebSocketMemoryMonitor {
    if (!WebSocketMemoryMonitor.instance) {
      WebSocketMemoryMonitor.instance = new WebSocketMemoryMonitor();
    }
    return WebSocketMemoryMonitor.instance;
  }

  public updateMemoryUsage(notificationCount: number, userCount: number): void {
    // Rough estimation: each notification ~1KB, each user connection ~2KB
    this.memoryUsage = notificationCount * 1 + userCount * 2; // in KB
  }

  public getMemoryUsageMB(): number {
    return this.memoryUsage / 1024;
  }

  public isMemoryLimitExceeded(): boolean {
    return this.getMemoryUsageMB() > this.config.maxMemoryUsageMB;
  }

  public shouldTriggerCleanup(): boolean {
    return this.getMemoryUsageMB() > this.config.maxMemoryUsageMB * 0.8; // 80% threshold
  }

  public getMemoryStats(): {
    currentUsageMB: number;
    limitMB: number;
    utilizationPercentage: number;
    shouldCleanup: boolean;
  } {
    const currentUsageMB = this.getMemoryUsageMB();
    const limitMB = this.config.maxMemoryUsageMB;

    return {
      currentUsageMB,
      limitMB,
      utilizationPercentage: (currentUsageMB / limitMB) * 100,
      shouldCleanup: this.shouldTriggerCleanup(),
    };
  }
}

// Performance metrics
export interface WebSocketMetrics {
  totalNotificationsSent: number;
  webSocketDeliveries: number;
  databaseFallbacks: number;
  redisOperations: number;
  averageDeliveryTimeMs: number;
  memoryUsageMB: number;
  activeConnections: number;
}

export class WebSocketPerformanceTracker {
  private static instance: WebSocketPerformanceTracker;
  private metrics: WebSocketMetrics;
  private deliveryTimes: number[] = [];

  private constructor() {
    this.metrics = {
      totalNotificationsSent: 0,
      webSocketDeliveries: 0,
      databaseFallbacks: 0,
      redisOperations: 0,
      averageDeliveryTimeMs: 0,
      memoryUsageMB: 0,
      activeConnections: 0,
    };
  }

  public static getInstance(): WebSocketPerformanceTracker {
    if (!WebSocketPerformanceTracker.instance) {
      WebSocketPerformanceTracker.instance = new WebSocketPerformanceTracker();
    }
    return WebSocketPerformanceTracker.instance;
  }

  public recordNotificationSent(
    deliveryMethod: "websocket" | "database" | "redis",
    deliveryTimeMs: number
  ): void {
    this.metrics.totalNotificationsSent++;

    switch (deliveryMethod) {
      case "websocket":
        this.metrics.webSocketDeliveries++;
        break;
      case "database":
        this.metrics.databaseFallbacks++;
        break;
      case "redis":
        this.metrics.redisOperations++;
        break;
    }

    this.deliveryTimes.push(deliveryTimeMs);
    if (this.deliveryTimes.length > 100) {
      this.deliveryTimes.shift(); // Keep only last 100 measurements
    }

    this.metrics.averageDeliveryTimeMs =
      this.deliveryTimes.reduce((sum, time) => sum + time, 0) /
      this.deliveryTimes.length;
  }

  public updateConnectionCount(count: number): void {
    this.metrics.activeConnections = count;
  }

  public updateMemoryUsage(usageMB: number): void {
    this.metrics.memoryUsageMB = usageMB;
  }

  public getMetrics(): WebSocketMetrics {
    return { ...this.metrics };
  }

  public getEfficiencyStats(): {
    webSocketSuccessRate: number;
    fallbackRate: number;
    redisReductionPercentage: number;
  } {
    const total = this.metrics.totalNotificationsSent;
    if (total === 0) {
      return {
        webSocketSuccessRate: 0,
        fallbackRate: 0,
        redisReductionPercentage: 100,
      };
    }

    return {
      webSocketSuccessRate: (this.metrics.webSocketDeliveries / total) * 100,
      fallbackRate: (this.metrics.databaseFallbacks / total) * 100,
      redisReductionPercentage:
        100 - (this.metrics.redisOperations / total) * 100,
    };
  }

  public reset(): void {
    this.metrics = {
      totalNotificationsSent: 0,
      webSocketDeliveries: 0,
      databaseFallbacks: 0,
      redisOperations: 0,
      averageDeliveryTimeMs: 0,
      memoryUsageMB: 0,
      activeConnections: 0,
    };
    this.deliveryTimes = [];
  }
}
