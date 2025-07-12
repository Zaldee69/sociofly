/**
 * Redis Optimization Summary
 * Konfigurasi optimasi yang telah diterapkan untuk mengurangi beban Redis
 */

export const REDIS_OPTIMIZATION_SUMMARY = {
  // Performance Monitoring
  monitoring: {
    performanceMonitorInterval: 60000, // 60s (dari 10s)
    dashboardUpdateInterval: 60000, // 60s (dari 30s)
    description: 'Mengurangi frekuensi monitoring untuk mengurangi beban Redis'
  },

  // Queue Configuration
  queue: {
    removeOnComplete: 50, // dari 100
    removeOnFail: 25, // dari 50
    stalledInterval: 60000, // 60s (dari 30s)
    maxStalledCount: 1, // dari 3
    metricsCache: {
      enabled: true,
      ttl: 5000, // 5 detik
      description: 'Cache untuk queue metrics mengurangi panggilan Redis'
    },
    description: 'Optimasi konfigurasi BullMQ untuk mengurangi overhead Redis'
  },

  // Sync Scheduler
  syncScheduler: {
    maxConcurrentSyncs: 2, // dari 3
    delayBetweenAccounts: 2000, // 2s (dari 1s)
    batchSize: 5, // dari 25
    description: 'Mengurangi concurrency dan batch size untuk mengurangi beban Redis'
  },

  // Caching
  cache: {
    adminStats: {
      ttl: 600, // 10 menit (dari 5 menit)
      fallbackTtl: 120, // 2 menit (dari 1 menit)
      description: 'Meningkatkan TTL cache untuk mengurangi akses database dan Redis'
    }
  },

  // Smart Refresh
  smartRefresh: {
    enabled: true,
    baseInterval: 5000, // 5s
    maxInterval: 30000, // 30s
    exponentialBackoff: true,
    description: 'Implementasi exponential backoff untuk mengurangi polling berlebihan'
  },

  // Estimasi Pengurangan Beban
  estimatedImpact: {
    redisCommandReduction: '60-70%',
    memoryUsageReduction: '30-40%',
    responseTimeImprovement: '20-30%',
    description: 'Estimasi pengurangan beban Redis setelah optimasi'
  }
};

/**
 * Fungsi untuk mendapatkan konfigurasi optimasi berdasarkan environment
 */
export function getOptimizedRedisConfig(environment: 'development' | 'production' = 'production') {
  const baseConfig = REDIS_OPTIMIZATION_SUMMARY;
  
  if (environment === 'development') {
    return {
      ...baseConfig,
      monitoring: {
        ...baseConfig.monitoring,
        performanceMonitorInterval: 30000, // 30s untuk development
        dashboardUpdateInterval: 30000
      },
      cache: {
        ...baseConfig.cache,
        adminStats: {
          ...baseConfig.cache.adminStats,
          ttl: 300 // 5 menit untuk development
        }
      }
    };
  }
  
  return baseConfig;
}

/**
 * Validasi konfigurasi optimasi
 */
export function validateOptimizationConfig() {
  const config = REDIS_OPTIMIZATION_SUMMARY;
  const warnings: string[] = [];
  
  // Validasi interval monitoring
  if (config.monitoring.performanceMonitorInterval < 30000) {
    warnings.push('Performance monitor interval terlalu rendah, dapat menyebabkan beban Redis tinggi');
  }
  
  // Validasi cache TTL
  if (config.cache.adminStats.ttl < 300) {
    warnings.push('Admin stats cache TTL terlalu rendah, dapat menyebabkan akses database berlebihan');
  }
  
  // Validasi sync scheduler
  if (config.syncScheduler.maxConcurrentSyncs > 3) {
    warnings.push('Max concurrent syncs terlalu tinggi, dapat menyebabkan beban Redis berlebihan');
  }
  
  return {
    isValid: warnings.length === 0,
    warnings
  };
}