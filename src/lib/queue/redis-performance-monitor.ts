/**
 * Redis Performance Monitor
 * Monitoring real-time untuk mengidentifikasi masalah performa Redis
 * berdasarkan analisis log yang menunjukkan command rate tinggi
 */

import { QueueManager } from './queue-manager';
import { 
  REDIS_MONITORING_THRESHOLDS, 
  checkRedisPerformance,
  REDIS_OPTIMIZATION_CONFIG 
} from './redis-optimization-config';
import { prisma } from '@/lib/prisma/client';

export interface RedisPerformanceMetrics {
  timestamp: Date;
  commandsPerSecond: number;
  memoryUsage: string;
  memoryUsageBytes: number;
  queueSizes: Record<string, number>;
  stalledJobs: number;
  activeConnections: number;
  totalCommandsExecuted: number;
  luaScriptCalls: number;
  bzpopminCalls: number;
}

export interface PerformanceAlert {
  id: string;
  timestamp: Date;
  severity: 'warning' | 'critical';
  message: string;
  metrics: RedisPerformanceMetrics;
  resolved: boolean;
}

export class RedisPerformanceMonitor {
  private static instance: RedisPerformanceMonitor;
  private isMonitoring = false;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private lastMetrics: RedisPerformanceMetrics | null = null;
  private alerts: PerformanceAlert[] = [];
  private metricsHistory: RedisPerformanceMetrics[] = [];
  private maxHistorySize = 100; // Keep last 100 metrics

  private constructor() {}

  public static getInstance(): RedisPerformanceMonitor {
    if (!RedisPerformanceMonitor.instance) {
      RedisPerformanceMonitor.instance = new RedisPerformanceMonitor();
    }
    return RedisPerformanceMonitor.instance;
  }

  /**
   * Start monitoring Redis performance
   */
  public async startMonitoring(): Promise<void> {
    if (this.isMonitoring) {
      console.log('⚠️ Redis monitoring already running');
      return;
    }

    console.log('🔍 Starting Redis performance monitoring...');
    this.isMonitoring = true;

    // Monitor every 60 seconds (optimized to reduce Redis command load)
    this.monitoringInterval = setInterval(async () => {
      try {
        await this.collectMetrics();
        await this.analyzePerformance();
      } catch (error) {
        console.error('❌ Redis monitoring error:', error);
      }
    }, 60000); // 60 seconds

    console.log('✅ Redis performance monitoring started');
  }

  /**
   * Stop monitoring
   */
  public stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    this.isMonitoring = false;
    console.log('🛑 Redis performance monitoring stopped');
  }

  /**
   * Collect current Redis metrics
   */
  private async collectMetrics(): Promise<RedisPerformanceMetrics> {
    const queueManager = QueueManager.getInstance();
    
    if (!queueManager.isReady()) {
      throw new Error('Queue manager not ready');
    }

    // Get Redis health info
    const redisHealth = await queueManager.getRedisHealth();
    
    if (!redisHealth.connected) {
      throw new Error('Redis not connected');
    }

    // Get queue metrics for all queues
    const allQueueMetrics = await queueManager.getAllQueueMetrics();
    
    // Calculate queue sizes
    const queueSizes: Record<string, number> = {};
    let totalStalledJobs = 0;
    
    Object.entries(allQueueMetrics).forEach(([queueName, metrics]) => {
      queueSizes[queueName] = metrics.waiting + metrics.active + metrics.delayed;
      // Note: BullMQ doesn't directly expose stalled count in metrics
      // We'll estimate based on active jobs that might be stalled
    });

    // Calculate commands per second
    const currentCommands = redisHealth.commandsExecuted || 0;
    let commandsPerSecond = 0;
    
    if (this.lastMetrics) {
      const timeDiff = (Date.now() - this.lastMetrics.timestamp.getTime()) / 1000;
      const commandsDiff = currentCommands - this.lastMetrics.totalCommandsExecuted;
      commandsPerSecond = timeDiff > 0 ? commandsDiff / timeDiff : 0;
    }

    // Parse memory usage
    const memoryUsageBytes = this.parseMemoryUsage(redisHealth.memoryUsage || '0B');

    const metrics: RedisPerformanceMetrics = {
      timestamp: new Date(),
      commandsPerSecond: Math.round(commandsPerSecond * 100) / 100,
      memoryUsage: redisHealth.memoryUsage || 'unknown',
      memoryUsageBytes,
      queueSizes,
      stalledJobs: totalStalledJobs,
      activeConnections: 1, // Simplified for now
      totalCommandsExecuted: currentCommands,
      luaScriptCalls: 0, // Would need Redis SLOWLOG or custom tracking
      bzpopminCalls: 0, // Would need Redis SLOWLOG or custom tracking
    };

    this.lastMetrics = metrics;
    
    // Add to history
    this.metricsHistory.push(metrics);
    if (this.metricsHistory.length > this.maxHistorySize) {
      this.metricsHistory.shift();
    }

    return metrics;
  }

  /**
   * Analyze performance and generate alerts
   */
  private async analyzePerformance(): Promise<void> {
    if (!this.lastMetrics) return;

    const performanceCheck = checkRedisPerformance({
      commandsPerSecond: this.lastMetrics.commandsPerSecond,
      memoryUsage: this.lastMetrics.memoryUsage,
      queueSizes: this.lastMetrics.queueSizes,
      stalledJobs: this.lastMetrics.stalledJobs,
    });

    if (!performanceCheck.isHealthy) {
      await this.createAlert(
        performanceCheck.severity as 'warning' | 'critical',
        performanceCheck.issues.join('; '),
        this.lastMetrics
      );
    }

    // Log performance summary
    if (this.lastMetrics.commandsPerSecond > 0) {
      console.log(`📊 Redis Performance: ${this.lastMetrics.commandsPerSecond} cmd/sec, Memory: ${this.lastMetrics.memoryUsage}`);
    }
  }

  /**
   * Create performance alert
   */
  private async createAlert(
    severity: 'warning' | 'critical',
    message: string,
    metrics: RedisPerformanceMetrics
  ): Promise<void> {
    const alert: PerformanceAlert = {
      id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      severity,
      message,
      metrics,
      resolved: false,
    };

    this.alerts.push(alert);
    
    // Keep only last 50 alerts
    if (this.alerts.length > 50) {
      this.alerts.shift();
    }

    // Log alert
    const emoji = severity === 'critical' ? '🚨' : '⚠️';
    console.log(`${emoji} Redis ${severity.toUpperCase()}: ${message}`);

    // Save to database for persistence
    try {
      await prisma.taskLog.create({
        data: {
          name: `redis_performance_${severity}`,
          status: severity.toUpperCase(),
          message: `${message} | Commands/sec: ${metrics.commandsPerSecond} | Memory: ${metrics.memoryUsage}`,
        },
      });
    } catch (error) {
      console.error('Failed to save performance alert:', error);
    }
  }

  /**
   * Get current performance metrics
   */
  public getCurrentMetrics(): RedisPerformanceMetrics | null {
    return this.lastMetrics;
  }

  /**
   * Get performance history
   */
  public getMetricsHistory(): RedisPerformanceMetrics[] {
    return [...this.metricsHistory];
  }

  /**
   * Get active alerts
   */
  public getActiveAlerts(): PerformanceAlert[] {
    return this.alerts.filter(alert => !alert.resolved);
  }

  /**
   * Get all alerts
   */
  public getAllAlerts(): PerformanceAlert[] {
    return [...this.alerts];
  }

  /**
   * Resolve alert
   */
  public resolveAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.resolved = true;
      return true;
    }
    return false;
  }

  /**
   * Get performance summary
   */
  public getPerformanceSummary(): {
    averageCommandsPerSecond: number;
    peakCommandsPerSecond: number;
    averageMemoryUsage: number;
    totalAlerts: number;
    criticalAlerts: number;
    isHealthy: boolean;
  } {
    if (this.metricsHistory.length === 0) {
      return {
        averageCommandsPerSecond: 0,
        peakCommandsPerSecond: 0,
        averageMemoryUsage: 0,
        totalAlerts: 0,
        criticalAlerts: 0,
        isHealthy: true,
      };
    }

    const commandRates = this.metricsHistory.map(m => m.commandsPerSecond);
    const memoryUsages = this.metricsHistory.map(m => m.memoryUsageBytes);
    
    const averageCommandsPerSecond = commandRates.reduce((a, b) => a + b, 0) / commandRates.length;
    const peakCommandsPerSecond = Math.max(...commandRates);
    const averageMemoryUsage = memoryUsages.reduce((a, b) => a + b, 0) / memoryUsages.length;
    
    const totalAlerts = this.alerts.length;
    const criticalAlerts = this.alerts.filter(a => a.severity === 'critical').length;
    
    const isHealthy = this.getActiveAlerts().length === 0 && 
                     averageCommandsPerSecond < REDIS_MONITORING_THRESHOLDS.commandRate.warning;

    return {
      averageCommandsPerSecond: Math.round(averageCommandsPerSecond * 100) / 100,
      peakCommandsPerSecond: Math.round(peakCommandsPerSecond * 100) / 100,
      averageMemoryUsage: Math.round(averageMemoryUsage / 1024 / 1024 * 100) / 100, // MB
      totalAlerts,
      criticalAlerts,
      isHealthy,
    };
  }

  /**
   * Parse memory usage string to bytes
   */
  private parseMemoryUsage(memoryStr: string): number {
    const match = memoryStr.match(/(\d+(?:\.\d+)?)([KMGT]?B?)/);
    if (!match) return 0;
    
    const value = parseFloat(match[1]);
    const unit = match[2].toUpperCase();
    
    const multipliers: Record<string, number> = {
      'B': 1,
      'KB': 1024,
      'MB': 1024 * 1024,
      'GB': 1024 * 1024 * 1024,
      'TB': 1024 * 1024 * 1024 * 1024,
    };
    
    return value * (multipliers[unit] || 1);
  }

  /**
   * Check if monitoring is active
   */
  public isActive(): boolean {
    return this.isMonitoring;
  }
}