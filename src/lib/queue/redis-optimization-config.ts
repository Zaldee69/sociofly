/**
 * Redis Optimization Configuration
 * Berdasarkan analisis Redis log yang menunjukkan:
 * - 2.222 Redis commands dalam 80 detik (~27.7 cmd/sec)
 * - 1.600 Lua script calls yang mendominasi
 * - 215 BZPOPMIN calls (polling berlebihan)
 * - Command fragmentasi tinggi
 */

export interface RedisOptimizationConfig {
  // Worker configuration
  maxWorkers: number;
  workerConcurrency: number;
  stalledInterval: number;
  maxStalledCount: number;
  
  // Job configuration
  maxJobsPerQueue: number;
  jobRetryAttempts: number;
  jobRetryDelay: number;
  
  // Cleanup configuration
  removeOnComplete: number;
  removeOnFail: number;
  autoCleanupInterval: number;
  
  // Rate limiting
  rateLimitMax: number;
  rateLimitDuration: number;
  
  // Batch processing
  batchSize: number;
  
  // Monitoring
  metricsPollingInterval: number;
  logBatchSize: number;
  logFlushInterval: number;
}

/**
 * Optimized configuration based on Redis log analysis
 */
export const REDIS_OPTIMIZATION_CONFIG: RedisOptimizationConfig = {
  // Emergency worker reduction to minimize BZPOPMIN polling
  maxWorkers: 8, // Emergency reduction from 15 to 8 workers
  workerConcurrency: 1, // Reduced from 2 to 1 per queue
  stalledInterval: 120000, // Increased from 60s to 120s to reduce polling
  maxStalledCount: 1, // Reduced retry attempts from 2 to 1
  
  // Job management
  maxJobsPerQueue: 100, // Limit queue size
  jobRetryAttempts: 2, // Reduced from 3
  jobRetryDelay: 5000, // Increased delay between retries
  
  // Aggressive cleanup to reduce Redis memory
  removeOnComplete: 10, // Keep only 10 completed jobs
  removeOnFail: 5, // Keep only 5 failed jobs
  autoCleanupInterval: 300000, // Clean every 5 minutes
  
  // Rate limiting to prevent Redis overload
  rateLimitMax: 10, // Max 10 jobs per duration
  rateLimitDuration: 60000, // Per 60 seconds
  
  // Monitoring optimization (emergency settings for high command rate)
  metricsPollingInterval: 15000, // Poll metrics every 15s (increased from 10s)
  batchSize: 10, // Batch size for processing (increased from 5)
  logBatchSize: 20, // Batch logs before writing (increased from 10)
  logFlushInterval: 60000, // Flush logs every 60s (increased from 30s)
};

/**
 * Queue-specific configurations
 */
export const QUEUE_SPECIFIC_CONFIG = {
  ["high-priority"]: {
    concurrency: 3,
    rateLimitMax: 15, // Higher limit for priority queue
    removeOnComplete: 5, // More aggressive cleanup
  },
  ["notifications"]: {
    concurrency: 5,
    rateLimitMax: 20, // Higher for notifications
    removeOnComplete: 3,
  },
  ["scheduler"]: {
    concurrency: 2,
    rateLimitMax: 5, // Lower for scheduler
    removeOnComplete: 10,
  },
  ["webhooks"]: {
    concurrency: 3,
    rateLimitMax: 8,
    removeOnComplete: 5,
  },
  ["reports"]: {
    concurrency: 1,
    rateLimitMax: 3, // Very low for reports
    removeOnComplete: 15,
  },
  ["social-sync"]: {
    concurrency: 2,
    rateLimitMax: 6,
    removeOnComplete: 8,
  },
  ["maintenance"]: {
    concurrency: 1,
    rateLimitMax: 2,
    removeOnComplete: 20,
  },
};

/**
 * Redis monitoring thresholds
 */
export const REDIS_MONITORING_THRESHOLDS = {
  commandsPerSecond: 500,
  memoryThreshold: 1024 * 1024 * 1024, // 1GB
  queueSizeThreshold: 1000,
  slowQueryThreshold: 100, // 100ms
  stalledJobThreshold: 50,
  hitRatioThreshold: 85, // 85%
  
  // Command rate thresholds (commands per second)
  commandRate: {
    warning: 15, // Warn if > 15 cmd/sec (reduced from 20)
    critical: 25, // Critical if > 25 cmd/sec (reduced from 30)
    emergency: 40, // Emergency if > 40 cmd/sec (new threshold)
  },
  
  // Memory usage thresholds
  memoryUsage: {
    warning: "100MB",
    critical: "200MB",
  },
  
  // Queue size thresholds
  queueSize: {
    warning: 50,
    critical: 100,
  },
  
  // Worker stalled job thresholds
  stalledJobs: {
    warning: 5,
    critical: 10,
  },
};

/**
 * Performance optimization strategies
 */
export const OPTIMIZATION_STRATEGIES = {
  // Batch processing
  enableBatchProcessing: true,
  batchSize: 5,
  batchTimeout: 10000, // 10 seconds
  
  // Connection pooling
  enableConnectionPooling: true,
  maxConnections: 10,
  
  // Lua script optimization
  enableLuaScriptCaching: true,
  luaScriptTimeout: 5000,
  
  // Job deduplication
  enableJobDeduplication: true,
  deduplicationWindow: 60000, // 1 minute
  
  // Metrics caching
  enableMetricsCaching: true,
  metricsCacheTTL: 30000, // 30 seconds
};

/**
 * Helper function to get optimized queue configuration
 */
export function getOptimizedQueueConfig(queueName: string) {
  const baseConfig = REDIS_OPTIMIZATION_CONFIG;
  const queueSpecific = QUEUE_SPECIFIC_CONFIG[queueName as keyof typeof QUEUE_SPECIFIC_CONFIG] || {};
  
  return {
    ...baseConfig,
    ...queueSpecific,
  };
}

/**
 * Emergency Redis optimization for extremely high command rates
 */
export const EMERGENCY_REDIS_CONFIG = {
  // Minimal worker configuration
  maxWorkers: 3,
  workerConcurrency: 1,
  stalledInterval: 300000, // 5 minutes
  maxStalledCount: 1,
  
  // Aggressive rate limiting
  rateLimitMax: 3,
  rateLimitDuration: 120000, // 2 minutes
  
  // Minimal monitoring
  metricsPollingInterval: 30000, // 30 seconds
  batchSize: 20,
  logBatchSize: 50,
  logFlushInterval: 120000, // 2 minutes
  
  // Aggressive cleanup
  removeOnComplete: 2,
  removeOnFail: 1,
  autoCleanupInterval: 60000, // 1 minute
};

/**
 * Helper function to check if Redis performance is within thresholds
 */
export function checkRedisPerformance(metrics: {
  commandsPerSecond: number;
  memoryUsage: string;
  queueSizes: Record<string, number>;
  stalledJobs: number;
}) {
  const issues: string[] = [];
  
  // Check command rate with emergency threshold
  if (metrics.commandsPerSecond > REDIS_MONITORING_THRESHOLDS.commandRate.emergency) {
    issues.push(`EMERGENCY: Command rate extremely high (${metrics.commandsPerSecond}/sec) - Immediate action required`);
  } else if (metrics.commandsPerSecond > REDIS_MONITORING_THRESHOLDS.commandRate.critical) {
    issues.push(`Critical: Command rate too high (${metrics.commandsPerSecond}/sec)`);
  } else if (metrics.commandsPerSecond > REDIS_MONITORING_THRESHOLDS.commandRate.warning) {
    issues.push(`Warning: Command rate elevated (${metrics.commandsPerSecond}/sec)`);
  }
  
  // Check queue sizes
  Object.entries(metrics.queueSizes).forEach(([queueName, size]) => {
    if (size > REDIS_MONITORING_THRESHOLDS.queueSize.critical) {
      issues.push(`Critical: Queue ${queueName} size too large (${size})`);
    } else if (size > REDIS_MONITORING_THRESHOLDS.queueSize.warning) {
      issues.push(`Warning: Queue ${queueName} size elevated (${size})`);
    }
  });
  
  // Check stalled jobs
  if (metrics.stalledJobs > REDIS_MONITORING_THRESHOLDS.stalledJobs.critical) {
    issues.push(`Critical: Too many stalled jobs (${metrics.stalledJobs})`);
  } else if (metrics.stalledJobs > REDIS_MONITORING_THRESHOLDS.stalledJobs.warning) {
    issues.push(`Warning: Elevated stalled jobs (${metrics.stalledJobs})`);
  }
  
  return {
    isHealthy: issues.length === 0,
    issues,
    severity: issues.some(i => i.startsWith('Critical')) ? 'critical' : 
              issues.length > 0 ? 'warning' : 'healthy'
  };
}