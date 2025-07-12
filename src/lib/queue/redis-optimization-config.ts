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
  retryProcessDelay: number; // NEW: Interval antara polling job
  lockDuration: number; // NEW: Waktu eksekusi maksimal job
  
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
 * Implementasi saran optimasi EVALSHA untuk mengurangi dominasi Lua script
 */
export const REDIS_OPTIMIZATION_CONFIG: RedisOptimizationConfig = {
  // EMERGENCY: Drastically reduced workers to minimize Redis load
  maxWorkers: 3, // Emergency reduction from 6 to 3 workers
  workerConcurrency: 1, // Keep at 1 per queue
  stalledInterval: 600000, // Increased to 10 minutes (600s) untuk minimal EVALSHA
  maxStalledCount: 1, // Keep at 1
  retryProcessDelay: 60000, // Increased to 60 seconds untuk minimal polling
  lockDuration: 300000, // Increased to 5 minutes untuk longer job execution
  
  // EMERGENCY: Minimal job processing to reduce Redis load
  maxJobsPerQueue: 50, // Further reduced queue size
  jobRetryAttempts: 1, // Emergency: Only 1 retry attempt
  jobRetryDelay: 30000, // Increased to 30s untuk minimal retry frequency
  
  // EMERGENCY: Ultra-aggressive cleanup
  removeOnComplete: 3, // Keep only 3 completed jobs
  removeOnFail: 2, // Keep only 2 failed jobs
  autoCleanupInterval: 120000, // Clean every 2 minutes
  
  // EMERGENCY: Extreme rate limiting
  rateLimitMax: 2, // Emergency: Only 2 jobs per duration
  rateLimitDuration: 300000, // Increased to 5 minutes untuk maximum spacing
  
  // Monitoring optimization (further optimized for reduced Redis load)
  metricsPollingInterval: 30000, // Poll metrics every 30s (increased from 15s)
  batchSize: 15, // Batch size for processing (increased from 10)
  logBatchSize: 30, // Batch logs before writing (increased from 20)
  logFlushInterval: 120000, // Flush logs every 120s (increased from 60s)
};

/**
 * Queue-specific configurations - OPTIMIZED untuk kurangi EVALSHA dominance
 */
export const QUEUE_SPECIFIC_CONFIG = {
  ["high-priority"]: {
    concurrency: 1, // EMERGENCY: Reduced to 1
    rateLimitMax: 3, // EMERGENCY: Drastically reduced
    rateLimitDuration: 300000, // 5 minutes spacing
    removeOnComplete: 2, // Ultra-aggressive cleanup
  },
  ["notifications"]: {
    concurrency: 1, // EMERGENCY: Reduced to 1
    rateLimitMax: 2, // EMERGENCY: Minimal processing
    rateLimitDuration: 300000, // 5 minutes spacing
    removeOnComplete: 1,
  },
  ["scheduler"]: {
    concurrency: 1, // Keep at 1
    rateLimitMax: 1, // EMERGENCY: Only 1 job per duration
    rateLimitDuration: 600000, // 10 minutes spacing
    removeOnComplete: 3,
  },
  ["webhooks"]: {
    concurrency: 1, // EMERGENCY: Reduced to 1
    rateLimitMax: 2, // EMERGENCY: Minimal processing
    rateLimitDuration: 300000, // 5 minutes spacing
    removeOnComplete: 2,
  },
  ["reports"]: {
    concurrency: 1,
    rateLimitMax: 1, // EMERGENCY: Only 1 job per duration
    rateLimitDuration: 600000, // 10 minutes spacing
    removeOnComplete: 5,
  },
  ["social-sync"]: {
    concurrency: 1, // Keep at 1
    rateLimitMax: 1, // EMERGENCY: Only 1 job per duration
    rateLimitDuration: 600000, // 10 minutes spacing
    removeOnComplete: 3,
  },
  ["maintenance"]: {
    concurrency: 1,
    rateLimitMax: 1, // Keep at 1
    rateLimitDuration: 1200000, // 20 minutes spacing untuk maintenance
    removeOnComplete: 10,
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
  
  // Command rate thresholds (commands per second) - Updated after polling optimization
  commandRate: {
    warning: 20, // Warn if > 20 cmd/sec (adjusted after polling optimization)
    critical: 35, // Critical if > 35 cmd/sec (adjusted after polling optimization)
    emergency: 50, // Emergency if > 50 cmd/sec (adjusted after polling optimization)
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