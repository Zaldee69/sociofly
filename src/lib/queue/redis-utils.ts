import { RedisManager } from "@/lib/services/redis-manager";
import { REDIS_OPTIMIZATION_CONFIG } from "./redis-optimization-config";

/**
 * Redis utility functions for optimization and monitoring
 */
export class RedisUtils {
  private static redisManager: RedisManager | null = null;

  /**
   * Initialize Redis manager instance
   */
  public static async initialize(): Promise<void> {
    if (!this.redisManager) {
      this.redisManager = RedisManager.getInstance();
      // RedisManager handles connection internally
    }
  }

  /**
   * Get Redis connection info and stats
   */
  public static async getRedisInfo(): Promise<{
    connected: boolean;
    commandsProcessed: number;
    memoryUsage: string;
    connectedClients: number;
    keyspaceHits: number;
    keyspaceMisses: number;
    hitRatio: number;
  }> {
    await this.initialize();
    
    try {
      const redis = this.redisManager!.getConnection();
      if (!redis) {
        throw new Error('Redis connection not available');
      }
      const info = await redis.info();
      
      // Parse Redis INFO output
      const stats = this.parseRedisInfo(info);
      
      return {
        connected: redis.status === 'ready',
        commandsProcessed: parseInt(stats.total_commands_processed || '0'),
        memoryUsage: stats.used_memory_human || '0B',
        connectedClients: parseInt(stats.connected_clients || '0'),
        keyspaceHits: parseInt(stats.keyspace_hits || '0'),
        keyspaceMisses: parseInt(stats.keyspace_misses || '0'),
        hitRatio: this.calculateHitRatio(
          parseInt(stats.keyspace_hits || '0'),
          parseInt(stats.keyspace_misses || '0')
        ),
      };
    } catch (error) {
      console.error('Error getting Redis info:', error);
      return {
        connected: false,
        commandsProcessed: 0,
        memoryUsage: '0B',
        connectedClients: 0,
        keyspaceHits: 0,
        keyspaceMisses: 0,
        hitRatio: 0,
      };
    }
  }

  /**
   * Get queue-specific Redis keys and their sizes
   */
  public static async getQueueKeysSizes(): Promise<{
    [queueName: string]: {
      waiting: number;
      active: number;
      completed: number;
      failed: number;
      delayed: number;
      totalMemory: number;
    };
  }> {
    await this.initialize();
    
    try {
      const redis = this.redisManager!.getConnection();
      if (!redis) {
        throw new Error('Redis connection not available');
      }
      const queueKeys: { [key: string]: any } = {};
      
      // Get all BullMQ queue keys
      const keys = await redis.keys('bull:*');
      
      for (const key of keys) {
        const queueName = this.extractQueueName(key);
        if (!queueName) continue;
        
        if (!queueKeys[queueName]) {
          queueKeys[queueName] = {
            waiting: 0,
            active: 0,
            completed: 0,
            failed: 0,
            delayed: 0,
            totalMemory: 0,
          };
        }
        
        // Get key type and size
        const keyType = await redis.type(key);
        let size = 0;
        
        switch (keyType) {
          case 'list':
            size = await redis.llen(key);
            break;
          case 'zset':
            size = await redis.zcard(key);
            break;
          case 'hash':
            size = await redis.hlen(key);
            break;
          case 'set':
            size = await redis.scard(key);
            break;
        }
        
        // Categorize by key suffix
        if (key.includes(':waiting')) {
          queueKeys[queueName].waiting = size;
        } else if (key.includes(':active')) {
          queueKeys[queueName].active = size;
        } else if (key.includes(':completed')) {
          queueKeys[queueName].completed = size;
        } else if (key.includes(':failed')) {
          queueKeys[queueName].failed = size;
        } else if (key.includes(':delayed')) {
          queueKeys[queueName].delayed = size;
        }
        
        // Estimate memory usage (rough calculation)
        const memoryUsage = await redis.memory('USAGE', key).catch(() => 0);
        queueKeys[queueName].totalMemory += memoryUsage;
      }
      
      return queueKeys;
    } catch (error) {
      console.error('Error getting queue keys sizes:', error);
      return {};
    }
  }

  /**
   * Clean up old Redis keys based on optimization config
   */
  public static async cleanupOldKeys(): Promise<{
    deletedKeys: number;
    freedMemory: number;
  }> {
    await this.initialize();
    
    try {
      const redis = this.redisManager!.getConnection();
      if (!redis) {
        throw new Error('Redis connection not available');
      }
      let deletedKeys = 0;
      let freedMemory = 0;
      
      // Get all BullMQ completed and failed job keys
      const completedKeys = await redis.keys('bull:*:completed');
      const failedKeys = await redis.keys('bull:*:failed');
      
      // Clean up old completed jobs
      for (const key of completedKeys) {
        const keyMemory = await redis.memory('USAGE', key).catch(() => 0);
        const keySize = await redis.zcard(key);
        
        if (keySize > REDIS_OPTIMIZATION_CONFIG.removeOnComplete) {
          const toRemove = keySize - REDIS_OPTIMIZATION_CONFIG.removeOnComplete;
          await redis.zremrangebyrank(key, 0, toRemove - 1);
          deletedKeys += toRemove;
          freedMemory += (keyMemory as number) * (toRemove / keySize);
        }
      }
      
      // Clean up old failed jobs
      for (const key of failedKeys) {
        const keyMemory = await redis.memory('USAGE', key).catch(() => 0);
        const keySize = await redis.zcard(key);
        
        if (keySize > REDIS_OPTIMIZATION_CONFIG.removeOnFail) {
          const toRemove = keySize - REDIS_OPTIMIZATION_CONFIG.removeOnFail;
          await redis.zremrangebyrank(key, 0, toRemove - 1);
          deletedKeys += toRemove;
          freedMemory += (keyMemory as number) * (toRemove / keySize);
        }
      }
      
      return { deletedKeys, freedMemory };
    } catch (error) {
      console.error('Error cleaning up old keys:', error);
      return { deletedKeys: 0, freedMemory: 0 };
    }
  }

  /**
   * Get Redis slow log entries
   */
  public static async getSlowLog(count: number = 10): Promise<Array<{
    id: number;
    timestamp: number;
    duration: number;
    command: string[];
  }>> {
    await this.initialize();
    
    try {
      const redis = this.redisManager!.getConnection();
      if (!redis) {
        throw new Error('Redis connection not available');
      }
      const slowLog = await redis.slowlog('GET', count) as any[];
      
      return (slowLog || []).map((entry: any) => ({
        id: entry[0],
        timestamp: entry[1],
        duration: entry[2], // microseconds
        command: entry[3],
      }));
    } catch (error) {
      console.error('Error getting slow log:', error);
      return [];
    }
  }

  /**
   * Optimize Redis configuration
   */
  public static async optimizeRedisConfig(): Promise<{
    applied: string[];
    errors: string[];
  }> {
    await this.initialize();
    
    const applied: string[] = [];
    const errors: string[] = [];
    
    try {
      const redis = this.redisManager!.getConnection();
      if (!redis) {
        throw new Error('Redis connection not available');
      }
      
      // Apply optimization configurations
      const optimizations = [
        ['maxmemory-policy', 'allkeys-lru'],
        ['timeout', '300'],
        ['tcp-keepalive', '60'],
        ['slowlog-log-slower-than', '10000'], // 10ms
        ['slowlog-max-len', '128'],
      ];
      
      for (const [key, value] of optimizations) {
        try {
          await redis.config('SET', key, value);
          applied.push(`${key}: ${value}`);
        } catch (error) {
          errors.push(`Failed to set ${key}: ${error}`);
        }
      }
      
    } catch (error) {
      errors.push(`Redis optimization failed: ${error}`);
    }
    
    return { applied, errors };
  }

  /**
   * Parse Redis INFO command output
   */
  private static parseRedisInfo(info: string): { [key: string]: string } {
    const result: { [key: string]: string } = {};
    
    info.split('\r\n').forEach(line => {
      if (line.includes(':')) {
        const [key, value] = line.split(':');
        result[key] = value;
      }
    });
    
    return result;
  }

  /**
   * Extract queue name from Redis key
   */
  private static extractQueueName(key: string): string | null {
    const match = key.match(/^bull:([^:]+)/);
    return match ? match[1] : null;
  }

  /**
   * Calculate cache hit ratio
   */
  private static calculateHitRatio(hits: number, misses: number): number {
    const total = hits + misses;
    return total > 0 ? (hits / total) * 100 : 0;
  }

  /**
   * Get Redis memory usage breakdown
   */
  public static async getMemoryBreakdown(): Promise<{
    used: number;
    peak: number;
    rss: number;
    overhead: number;
    datasetPercentage: number;
  }> {
    await this.initialize();
    
    try {
      const redis = this.redisManager!.getConnection();
      if (!redis) {
        throw new Error('Redis connection not available');
      }
      const info = await redis.info('memory');
      const stats = this.parseRedisInfo(info);
      
      const used = parseInt(stats.used_memory || '0');
      const peak = parseInt(stats.used_memory_peak || '0');
      const rss = parseInt(stats.used_memory_rss || '0');
      const overhead = parseInt(stats.used_memory_overhead || '0');
      
      return {
        used,
        peak,
        rss,
        overhead,
        datasetPercentage: used > 0 ? ((used - overhead) / used) * 100 : 0,
      };
    } catch (error) {
      console.error('Error getting memory breakdown:', error);
      return {
        used: 0,
        peak: 0,
        rss: 0,
        overhead: 0,
        datasetPercentage: 0,
      };
    }
  }

  /**
   * Monitor Redis command frequency
   */
  public static async getCommandStats(): Promise<{
    [command: string]: {
      calls: number;
      usec: number;
      usecPerCall: number;
    };
  }> {
    await this.initialize();
    
    try {
      const redis = this.redisManager!.getConnection();
      if (!redis) {
        throw new Error('Redis connection not available');
      }
      const info = await redis.info('commandstats');
      const stats = this.parseRedisInfo(info);
      
      const commandStats: { [key: string]: any } = {};
      
      Object.keys(stats).forEach(key => {
        if (key.startsWith('cmdstat_')) {
          const command = key.replace('cmdstat_', '');
          const match = stats[key].match(/calls=(\d+),usec=(\d+),usec_per_call=([\d.]+)/);
          
          if (match) {
            commandStats[command] = {
              calls: parseInt(match[1]),
              usec: parseInt(match[2]),
              usecPerCall: parseFloat(match[3]),
            };
          }
        }
      });
      
      return commandStats;
    } catch (error) {
      console.error('Error getting command stats:', error);
      return {};
    }
  }
}

/**
 * Redis health check utility
 */
export class RedisHealthChecker {
  /**
   * Perform comprehensive Redis health check
   */
  public static async performHealthCheck(): Promise<{
    status: 'healthy' | 'warning' | 'critical';
    checks: {
      connection: boolean;
      memory: { status: string; usage: number; limit: number };
      performance: { status: string; avgResponseTime: number };
      queues: { status: string; totalJobs: number; stalledJobs: number };
    };
    recommendations: string[];
  }> {
    const recommendations: string[] = [];
    
    try {
      // Check connection
      const redisInfo = await RedisUtils.getRedisInfo();
      const connectionOk = redisInfo.connected;
      
      // Check memory usage
      const memoryBreakdown = await RedisUtils.getMemoryBreakdown();
      const memoryUsagePercent = (memoryBreakdown.used / (1024 * 1024 * 1024)) * 100; // Convert to GB percentage
      const memoryOk = memoryUsagePercent < 80;
      
      if (!memoryOk) {
        recommendations.push('Redis memory usage is high. Consider increasing memory or cleaning up old data.');
      }
      
      // Check performance
      const slowLog = await RedisUtils.getSlowLog(5);
      const performanceOk = slowLog.length === 0;
      const avgResponseTime = slowLog.length > 0 
        ? slowLog.reduce((sum, entry) => sum + entry.duration, 0) / slowLog.length / 1000 // Convert to ms
        : 0;
      
      if (!performanceOk) {
        recommendations.push('Slow Redis commands detected. Review query patterns and consider optimization.');
      }
      
      // Check queue health
      const queueSizes = await RedisUtils.getQueueKeysSizes();
      const totalJobs = Object.values(queueSizes).reduce(
        (sum, queue) => sum + queue.waiting + queue.active + queue.delayed,
        0
      );
      const stalledJobs = Object.values(queueSizes).reduce(
        (sum, queue) => sum + queue.failed,
        0
      );
      const queuesOk = stalledJobs < 100 && totalJobs < 10000;
      
      if (!queuesOk) {
        if (stalledJobs >= 100) {
          recommendations.push('High number of failed jobs detected. Review error handling and job processing.');
        }
        if (totalJobs >= 10000) {
          recommendations.push('High number of pending jobs. Consider scaling workers or optimizing job processing.');
        }
      }
      
      // Determine overall status
      let status: 'healthy' | 'warning' | 'critical';
      if (!connectionOk) {
        status = 'critical';
      } else if (!memoryOk || !performanceOk || !queuesOk) {
        status = 'warning';
      } else {
        status = 'healthy';
      }
      
      return {
        status,
        checks: {
          connection: connectionOk,
          memory: {
            status: memoryOk ? 'ok' : 'warning',
            usage: memoryBreakdown.used,
            limit: memoryBreakdown.peak,
          },
          performance: {
            status: performanceOk ? 'ok' : 'warning',
            avgResponseTime,
          },
          queues: {
            status: queuesOk ? 'ok' : 'warning',
            totalJobs,
            stalledJobs,
          },
        },
        recommendations,
      };
    } catch (error) {
      console.error('Redis health check failed:', error);
      return {
        status: 'critical',
        checks: {
          connection: false,
          memory: { status: 'error', usage: 0, limit: 0 },
          performance: { status: 'error', avgResponseTime: 0 },
          queues: { status: 'error', totalJobs: 0, stalledJobs: 0 },
        },
        recommendations: ['Redis health check failed. Check Redis connection and configuration.'],
      };
    }
  }
}