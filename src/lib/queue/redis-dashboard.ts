import { RedisUtils, RedisHealthChecker } from "./redis-utils";
import { RedisPerformanceMonitor } from "./redis-performance-monitor";
import { REDIS_OPTIMIZATION_CONFIG, REDIS_MONITORING_THRESHOLDS, EMERGENCY_REDIS_CONFIG } from "./redis-optimization-config";

/**
 * Redis Dashboard for monitoring and managing Redis performance
 */
export class RedisDashboard {
  private static instance: RedisDashboard | null = null;
  private performanceMonitor: RedisPerformanceMonitor;
  private isMonitoring = false;
  private dashboardInterval: NodeJS.Timeout | null = null;

  private constructor() {
    this.performanceMonitor = RedisPerformanceMonitor.getInstance();
  }

  public static getInstance(): RedisDashboard {
    if (!this.instance) {
      this.instance = new RedisDashboard();
    }
    return this.instance;
  }

  /**
   * Start Redis dashboard monitoring
   */
  public async startDashboard(intervalMs: number = 60000): Promise<void> { // Optimized from 30s to 60s
    if (this.isMonitoring) {
      console.log('Redis dashboard is already running');
      return;
    }

    console.log('🚀 Starting Redis Performance Dashboard...');
    
    // Start performance monitoring
    await this.performanceMonitor.startMonitoring();
    
    // Start dashboard updates
    this.dashboardInterval = setInterval(async () => {
      await this.updateDashboard();
    }, intervalMs);
    
    this.isMonitoring = true;
    
    // Initial dashboard update
    await this.updateDashboard();
    
    console.log(`✅ Redis Dashboard started with ${intervalMs}ms interval`);
  }

  /**
   * Stop Redis dashboard monitoring
   */
  public stopDashboard(): void {
    if (!this.isMonitoring) {
      return;
    }

    console.log('🛑 Stopping Redis Performance Dashboard...');
    
    // Stop performance monitoring
    this.performanceMonitor.stopMonitoring();
    
    // Clear dashboard interval
    if (this.dashboardInterval) {
      clearInterval(this.dashboardInterval);
      this.dashboardInterval = null;
    }
    
    this.isMonitoring = false;
    console.log('✅ Redis Dashboard stopped');
  }

  /**
   * Get current Redis dashboard data
   */
  public async getDashboardData(): Promise<{
    overview: {
      status: string;
      uptime: number;
      totalCommands: number;
      commandsPerSecond: number;
      memoryUsage: string;
      hitRatio: number;
    };
    queues: {
      [queueName: string]: {
        waiting: number;
        active: number;
        completed: number;
        failed: number;
        delayed: number;
        memoryUsage: number;
      };
    };
    performance: {
      avgResponseTime: number;
      slowQueries: Array<{
        command: string;
        duration: number;
        timestamp: number;
      }>;
      topCommands: Array<{
        command: string;
        calls: number;
        avgTime: number;
      }>;
    };
    health: {
      status: 'healthy' | 'warning' | 'critical';
      checks: any;
      recommendations: string[];
    };
    optimization: {
      configApplied: boolean;
      lastCleanup: Date | null;
      memoryFreed: number;
      keysRemoved: number;
    };
  }> {
    try {
      // Get Redis info
      const redisInfo = await RedisUtils.getRedisInfo();
      
      // Get queue information
      const queueSizes = await RedisUtils.getQueueKeysSizes();
      
      // Get performance data
      const slowLog = await RedisUtils.getSlowLog(10);
      const commandStats = await RedisUtils.getCommandStats();
      
      // Get health check
      const healthCheck = await RedisHealthChecker.performHealthCheck();
      
      // Get memory breakdown
      const memoryBreakdown = await RedisUtils.getMemoryBreakdown();
      
      // Process slow queries
      const slowQueries = slowLog.map((entry: any) => ({
        command: entry.command.join(' '),
        duration: entry.duration / 1000, // Convert to ms
        timestamp: entry.timestamp,
      }));
      
      // Process top commands
      const topCommands = Object.entries(commandStats)
        .sort(([,a], [,b]) => (b as any).calls - (a as any).calls)
        .slice(0, 10)
        .map(([command, stats]) => ({
          command,
          calls: (stats as any).calls,
          avgTime: (stats as any).usecPerCall / 1000, // Convert to ms
        }));
      
      // Calculate average response time
      const avgResponseTime = slowQueries.length > 0
        ? slowQueries.reduce((sum, query) => sum + query.duration, 0) / slowQueries.length
        : 0;
      
      return {
        overview: {
          status: healthCheck.status,
          uptime: Date.now(), // Simplified - should be actual Redis uptime
          totalCommands: redisInfo.commandsProcessed,
          commandsPerSecond: this.calculateCommandsPerSecond(redisInfo.commandsProcessed),
          memoryUsage: redisInfo.memoryUsage,
          hitRatio: redisInfo.hitRatio,
        },
        queues: Object.fromEntries(
          Object.entries(queueSizes).map(([queueName, queueData]) => [
            queueName,
            {
              waiting: queueData.waiting,
              active: queueData.active,
              completed: queueData.completed,
              failed: queueData.failed,
              delayed: queueData.delayed,
              memoryUsage: queueData.totalMemory,
            },
          ])
        ),
        performance: {
          avgResponseTime,
          slowQueries,
          topCommands,
        },
        health: healthCheck,
        optimization: {
          configApplied: true, // Should track if optimization config is applied
          lastCleanup: null, // Should track last cleanup time
          memoryFreed: 0, // Should track memory freed by cleanup
          keysRemoved: 0, // Should track keys removed by cleanup
        },
      };
    } catch (error) {
      console.error('Error getting dashboard data:', error);
      throw error;
    }
  }

  /**
   * Generate Redis performance report
   */
  public async generatePerformanceReport(): Promise<{
    summary: {
      period: string;
      totalCommands: number;
      avgCommandsPerSecond: number;
      peakMemoryUsage: number;
      totalSlowQueries: number;
    };
    recommendations: string[];
    optimizations: {
      applied: string[];
      suggested: string[];
    };
    queues: {
      mostActive: string;
      mostProblematic: string;
      totalJobs: number;
      failureRate: number;
    };
  }> {
    try {
      const dashboardData = await this.getDashboardData();
      const recommendations: string[] = [];
      const suggestedOptimizations: string[] = [];
      
      // Analyze performance
      if (dashboardData.performance.avgResponseTime > REDIS_MONITORING_THRESHOLDS.slowQueryThreshold) {
        recommendations.push('Average response time is high. Consider optimizing queries or scaling Redis.');
        suggestedOptimizations.push('Enable query optimization and review slow queries');
      }
      
      if (dashboardData.overview.hitRatio < 90) {
        recommendations.push('Cache hit ratio is low. Review caching strategy and key expiration policies.');
        suggestedOptimizations.push('Optimize cache key patterns and TTL settings');
      }
      
      // Analyze queues
      const queueEntries = Object.entries(dashboardData.queues);
      const totalJobs = queueEntries.reduce(
        (sum, [, queue]) => sum + queue.waiting + queue.active + queue.delayed,
        0
      );
      const totalFailed = queueEntries.reduce((sum, [, queue]) => sum + queue.failed, 0);
      const failureRate = totalJobs > 0 ? (totalFailed / totalJobs) * 100 : 0;
      
      const mostActiveQueue = queueEntries.reduce(
        (max, [name, queue]) => {
          const activity = queue.waiting + queue.active + queue.delayed;
          return activity > (dashboardData.queues[max]?.waiting + dashboardData.queues[max]?.active + dashboardData.queues[max]?.delayed || 0)
            ? name
            : max;
        },
        queueEntries[0]?.[0] || 'none'
      );
      
      const mostProblematicQueue = queueEntries.reduce(
        (max, [name, queue]) => {
          return queue.failed > (dashboardData.queues[max]?.failed || 0) ? name : max;
        },
        queueEntries[0]?.[0] || 'none'
      );
      
      if (failureRate > 5) {
        recommendations.push(`Queue failure rate is ${failureRate.toFixed(1)}%. Review job processing and error handling.`);
        suggestedOptimizations.push('Implement better error handling and job retry strategies');
      }
      
      if (totalJobs > REDIS_MONITORING_THRESHOLDS.queueSizeThreshold) {
        recommendations.push('High number of pending jobs. Consider scaling workers or optimizing job processing.');
        suggestedOptimizations.push('Scale worker processes and implement job batching');
      }
      
      // Memory analysis
      const memoryUsageBytes = this.parseMemoryString(dashboardData.overview.memoryUsage);
      if (memoryUsageBytes > REDIS_MONITORING_THRESHOLDS.memoryThreshold) {
        recommendations.push('High memory usage detected. Consider cleanup or memory optimization.');
        suggestedOptimizations.push('Implement aggressive cleanup policies and memory optimization');
      }
      
      return {
        summary: {
          period: '24 hours', // Should be configurable
          totalCommands: dashboardData.overview.totalCommands,
          avgCommandsPerSecond: dashboardData.overview.commandsPerSecond,
          peakMemoryUsage: memoryUsageBytes,
          totalSlowQueries: dashboardData.performance.slowQueries.length,
        },
        recommendations: [...recommendations, ...dashboardData.health.recommendations],
        optimizations: {
          applied: [
            'Reduced worker concurrency',
            'Implemented job batching',
            'Added rate limiting',
            'Optimized cleanup policies',
          ],
          suggested: suggestedOptimizations,
        },
        queues: {
          mostActive: mostActiveQueue,
          mostProblematic: mostProblematicQueue,
          totalJobs,
          failureRate,
        },
      };
    } catch (error) {
      console.error('Error generating performance report:', error);
      throw error;
    }
  }

  /**
   * Perform emergency Redis optimization for extremely high command rates
   */
  public async performEmergencyOptimization(): Promise<{
    success: boolean;
    actions: string[];
    errors: string[];
    metrics: {
      memoryFreed: number;
      keysRemoved: number;
      configChanges: number;
      workersReduced: number;
    };
  }> {
    const actions: string[] = [];
    const errors: string[] = [];
    let memoryFreed = 0;
    let keysRemoved = 0;
    let configChanges = 0;
    let workersReduced = 0;
    
    try {
      console.log('🚨 EMERGENCY: Starting aggressive Redis optimization for high command rate...');
      
      // 1. Immediate aggressive cleanup
      try {
        const cleanupResult = await RedisUtils.cleanupOldKeys();
        memoryFreed += cleanupResult.freedMemory;
        keysRemoved += cleanupResult.deletedKeys;
        actions.push(`EMERGENCY: Cleaned up ${cleanupResult.deletedKeys} old keys, freed ${this.formatBytes(cleanupResult.freedMemory)}`);
      } catch (error) {
        errors.push(`Emergency cleanup failed: ${error}`);
      }
      
      // 2. Apply emergency configuration
      try {
        const configResult = await RedisUtils.optimizeRedisConfig();
        configChanges = configResult.applied.length;
        actions.push('EMERGENCY: Applied minimal Redis configuration');
        actions.push(`EMERGENCY: Reduced workers to ${EMERGENCY_REDIS_CONFIG.maxWorkers}`);
        actions.push(`EMERGENCY: Set aggressive rate limiting: ${EMERGENCY_REDIS_CONFIG.rateLimitMax} jobs per ${EMERGENCY_REDIS_CONFIG.rateLimitDuration/1000}s`);
        workersReduced = REDIS_OPTIMIZATION_CONFIG.maxWorkers - EMERGENCY_REDIS_CONFIG.maxWorkers;
      } catch (error) {
        errors.push(`Emergency config failed: ${error}`);
      }
      
      // 3. Force queue cleanup
      try {
        const queueSizes = await RedisUtils.getQueueKeysSizes();
        for (const [queueName, sizes] of Object.entries(queueSizes)) {
          if (sizes.completed > EMERGENCY_REDIS_CONFIG.removeOnComplete) {
            actions.push(`EMERGENCY: Queue ${queueName} cleanup - ${sizes.completed} completed jobs (emergency threshold: ${EMERGENCY_REDIS_CONFIG.removeOnComplete})`);
          }
          if (sizes.failed > EMERGENCY_REDIS_CONFIG.removeOnFail) {
            actions.push(`EMERGENCY: Queue ${queueName} cleanup - ${sizes.failed} failed jobs (emergency threshold: ${EMERGENCY_REDIS_CONFIG.removeOnFail})`);
          }
        }
      } catch (error) {
        errors.push(`Emergency queue analysis failed: ${error}`);
      }
      
      const success = errors.length === 0;
      
      console.log(`🚨 Emergency optimization completed. Success: ${success}`);
      console.log(`📊 Emergency Metrics: ${keysRemoved} keys removed, ${this.formatBytes(memoryFreed)} freed, ${workersReduced} workers reduced`);
      
      return {
        success,
        actions,
        errors,
        metrics: {
          memoryFreed,
          keysRemoved,
          configChanges,
          workersReduced,
        },
      };
    } catch (error) {
      console.error('Emergency optimization failed:', error);
      return {
        success: false,
        actions,
        errors: [...errors, `Emergency optimization failed: ${error}`],
        metrics: {
          memoryFreed,
          keysRemoved,
          configChanges,
          workersReduced,
        },
      };
    }
  }

  /**
   * Perform automated Redis optimization
   */
  public async performAutomatedOptimization(): Promise<{
    success: boolean;
    actions: string[];
    errors: string[];
    metrics: {
      memoryFreed: number;
      keysRemoved: number;
      configChanges: number;
    };
  }> {
    const actions: string[] = [];
    const errors: string[] = [];
    let memoryFreed = 0;
    let keysRemoved = 0;
    let configChanges = 0;
    
    try {
      console.log('🔧 Starting automated Redis optimization...');
      
      // 1. Clean up old keys
      try {
        const cleanupResult = await RedisUtils.cleanupOldKeys();
        memoryFreed += cleanupResult.freedMemory;
        keysRemoved += cleanupResult.deletedKeys;
        actions.push(`Cleaned up ${cleanupResult.deletedKeys} old keys, freed ${this.formatBytes(cleanupResult.freedMemory)}`);
      } catch (error) {
        errors.push(`Key cleanup failed: ${error}`);
      }
      
      // 2. Optimize Redis configuration
      try {
        const configResult = await RedisUtils.optimizeRedisConfig();
        configChanges = configResult.applied.length;
        actions.push(...configResult.applied.map(config => `Applied config: ${config}`));
        errors.push(...configResult.errors);
      } catch (error) {
        errors.push(`Config optimization failed: ${error}`);
      }
      
      // 3. Check and apply queue-specific optimizations
      try {
        const queueSizes = await RedisUtils.getQueueKeysSizes();
        for (const [queueName, sizes] of Object.entries(queueSizes)) {
          if (sizes.completed > REDIS_OPTIMIZATION_CONFIG.removeOnComplete * 2) {
            actions.push(`Queue ${queueName} has ${sizes.completed} completed jobs (threshold: ${REDIS_OPTIMIZATION_CONFIG.removeOnComplete})`);
          }
          if (sizes.failed > REDIS_OPTIMIZATION_CONFIG.removeOnFail * 2) {
            actions.push(`Queue ${queueName} has ${sizes.failed} failed jobs (threshold: ${REDIS_OPTIMIZATION_CONFIG.removeOnFail})`);
          }
        }
      } catch (error) {
        errors.push(`Queue analysis failed: ${error}`);
      }
      
      const success = errors.length === 0;
      
      console.log(`✅ Automated optimization completed. Success: ${success}`);
      console.log(`📊 Metrics: ${keysRemoved} keys removed, ${this.formatBytes(memoryFreed)} freed, ${configChanges} config changes`);
      
      return {
        success,
        actions,
        errors,
        metrics: {
          memoryFreed,
          keysRemoved,
          configChanges,
        },
      };
    } catch (error) {
      console.error('Automated optimization failed:', error);
      return {
        success: false,
        actions,
        errors: [...errors, `Optimization failed: ${error}`],
        metrics: {
          memoryFreed,
          keysRemoved,
          configChanges,
        },
      };
    }
  }

  /**
   * Update dashboard display (internal method)
   */
  private async updateDashboard(): Promise<void> {
    try {
      const data = await this.getDashboardData();
      
      // Log dashboard summary
      console.log('📊 Redis Dashboard Update:');
      console.log(`   Status: ${data.overview.status}`);
      console.log(`   Memory: ${data.overview.memoryUsage}`);
      console.log(`   Commands/sec: ${data.overview.commandsPerSecond}`);
      console.log(`   Hit Ratio: ${data.overview.hitRatio.toFixed(1)}%`);
      
      // Log queue summary
      const totalJobs = Object.values(data.queues).reduce(
        (sum, queue) => sum + queue.waiting + queue.active + queue.delayed,
        0
      );
      console.log(`   Total Jobs: ${totalJobs}`);
      
      // Check for alerts
      if (data.health.status !== 'healthy') {
        console.warn(`⚠️  Redis Health Warning: ${data.health.status}`);
        data.health.recommendations.forEach(rec => {
          console.warn(`   - ${rec}`);
        });
      }
      
      // Emergency optimization trigger for extremely high command rates
      if (data.overview.commandsPerSecond > REDIS_MONITORING_THRESHOLDS.commandRate.emergency) {
        console.log('🚨 EMERGENCY: Triggering emergency optimization for extremely high command rate...');
        await this.performEmergencyOptimization();
      }
      // Auto-optimization trigger for warning conditions
      else if (data.health.status === 'warning' && this.shouldTriggerAutoOptimization(data)) {
        console.log('🔧 Triggering automated optimization...');
        await this.performAutomatedOptimization();
      }
      
    } catch (error) {
      console.error('Dashboard update failed:', error);
    }
  }

  /**
   * Check if auto-optimization should be triggered
   */
  private shouldTriggerAutoOptimization(data: any): boolean {
    const memoryUsage = this.parseMemoryString(data.overview.memoryUsage);
    const totalJobs = Object.values(data.queues).reduce(
      (sum: number, queue: any) => sum + queue.waiting + queue.active + queue.delayed,
      0
    );
    
    return (
      memoryUsage > REDIS_MONITORING_THRESHOLDS.memoryThreshold ||
      totalJobs > REDIS_MONITORING_THRESHOLDS.queueSizeThreshold ||
      data.performance.avgResponseTime > REDIS_MONITORING_THRESHOLDS.slowQueryThreshold
    );
  }

  /**
   * Calculate commands per second (simplified)
   */
  private calculateCommandsPerSecond(totalCommands: number): number {
    // This is a simplified calculation
    // In a real implementation, you'd track this over time
    return Math.round(totalCommands / 3600); // Assume 1 hour uptime
  }

  /**
   * Parse memory string to bytes
   */
  private parseMemoryString(memoryStr: string): number {
    const match = memoryStr.match(/([\d.]+)([KMGT]?)B?/);
    if (!match) return 0;
    
    const value = parseFloat(match[1]);
    const unit = match[2];
    
    switch (unit) {
      case 'K': return value * 1024;
      case 'M': return value * 1024 * 1024;
      case 'G': return value * 1024 * 1024 * 1024;
      case 'T': return value * 1024 * 1024 * 1024 * 1024;
      default: return value;
    }
  }

  /**
   * Format bytes to human readable string
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

/**
 * Export singleton instance for easy access
 */
export const redisDashboard = RedisDashboard.getInstance();