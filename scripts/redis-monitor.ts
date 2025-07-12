#!/usr/bin/env tsx
/**
 * Redis Real-time Monitor Script
 * Memantau Redis command rate dan memberikan alert
 * 
 * Usage: npx tsx scripts/redis-monitor.ts
 */

import { RedisDashboard } from '../src/lib/queue/redis-dashboard';
import { RedisPerformanceMonitor } from '../src/lib/queue/redis-performance-monitor';

interface MonitoringThresholds {
  warning: number;    // Commands per second
  critical: number;   // Commands per second
  emergency: number;  // Commands per second
}

interface RedisMetrics {
  timestamp: Date;
  commandsPerSecond: number;
  memoryUsage: string;
  memoryUsageBytes: number;
  connectedClients: number;
  queueSizes: Record<string, number>;
  totalJobs: number;
}

class RedisMonitor {
  private redisDashboard: RedisDashboard;
  private performanceMonitor: RedisPerformanceMonitor;
  private isMonitoring: boolean = false;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private metricsHistory: RedisMetrics[] = [];
  private maxHistorySize: number = 100;

  private thresholds: MonitoringThresholds = {
    warning: 20,    // Optimized threshold after polling reduction
    critical: 35,   // Updated from previous 25
    emergency: 50   // Updated from previous 40
  };

  constructor() {
    this.redisDashboard = RedisDashboard.getInstance();
    this.performanceMonitor = RedisPerformanceMonitor.getInstance();
  }

  async startMonitoring(intervalSeconds: number = 10): Promise<void> {
    if (this.isMonitoring) {
      console.log('⚠️ Monitoring already running');
      return;
    }

    console.log('🚀 Starting Redis Real-time Monitor');
    console.log('===================================');
    console.log(`📊 Monitoring interval: ${intervalSeconds} seconds`);
    console.log(`⚠️ Warning threshold: ${this.thresholds.warning} commands/sec`);
    console.log(`🚨 Critical threshold: ${this.thresholds.critical} commands/sec`);
    console.log(`🆘 Emergency threshold: ${this.thresholds.emergency} commands/sec`);
    console.log('\nPress Ctrl+C to stop monitoring\n');

    this.isMonitoring = true;

    // Initial metrics collection
    await this.collectMetrics();

    // Start periodic monitoring
    this.monitoringInterval = setInterval(async () => {
      await this.collectMetrics();
    }, intervalSeconds * 1000);

    // Handle graceful shutdown
    process.on('SIGINT', () => {
      this.stopMonitoring();
    });
  }

  stopMonitoring(): void {
    if (!this.isMonitoring) {
      return;
    }

    console.log('\n🛑 Stopping Redis Monitor...');
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    this.isMonitoring = false;
    this.generateSummaryReport();
    
    console.log('✅ Redis Monitor stopped');
    process.exit(0);
  }

  private async collectMetrics(): Promise<void> {
    try {
      const dashboardData = await this.redisDashboard.getDashboardData();
      
      const metrics: RedisMetrics = {
        timestamp: new Date(),
        commandsPerSecond: dashboardData.overview.commandsPerSecond,
        memoryUsage: dashboardData.overview.memoryUsage,
        memoryUsageBytes: this.parseMemoryUsage(dashboardData.overview.memoryUsage),
        connectedClients: 0, // Note: connectedClients not available in current dashboard data
        queueSizes: Object.fromEntries(
          Object.entries(dashboardData.queues).map(([name, queue]) => [
            name,
            queue.waiting + queue.active + queue.delayed
          ])
        ),
        totalJobs: Object.values(dashboardData.queues).reduce(
          (total, queue) => total + queue.waiting + queue.active + queue.delayed,
          0
        )
      };

      // Add to history
      this.metricsHistory.push(metrics);
      if (this.metricsHistory.length > this.maxHistorySize) {
        this.metricsHistory.shift();
      }

      // Display current metrics
      this.displayMetrics(metrics);

      // Check thresholds and alert
      this.checkThresholds(metrics);

    } catch (error) {
      console.error('❌ Error collecting metrics:', error);
    }
  }

  private displayMetrics(metrics: RedisMetrics): void {
    const timestamp = metrics.timestamp.toLocaleTimeString();
    const commandsColor = this.getCommandsColor(metrics.commandsPerSecond);
    
    console.log(`[${timestamp}] ${commandsColor}${metrics.commandsPerSecond.toFixed(1)} cmd/s\x1b[0m | ` +
                `Mem: ${metrics.memoryUsage} | ` +
                `Clients: ${metrics.connectedClients} | ` +
                `Jobs: ${metrics.totalJobs}`);

    // Show queue details if any queue has significant load
    const heavyQueues = Object.entries(metrics.queueSizes)
      .filter(([_, size]) => size > 10)
      .sort(([_, a], [__, b]) => b - a);

    if (heavyQueues.length > 0) {
      console.log(`   📋 Heavy queues: ${heavyQueues.map(([name, size]) => `${name}(${size})`).join(', ')}`);
    }
  }

  private getCommandsColor(commandsPerSecond: number): string {
    if (commandsPerSecond >= this.thresholds.emergency) {
      return '\x1b[41m\x1b[37m'; // Red background, white text
    } else if (commandsPerSecond >= this.thresholds.critical) {
      return '\x1b[31m'; // Red text
    } else if (commandsPerSecond >= this.thresholds.warning) {
      return '\x1b[33m'; // Yellow text
    } else {
      return '\x1b[32m'; // Green text
    }
  }

  private checkThresholds(metrics: RedisMetrics): void {
    const { commandsPerSecond } = metrics;

    if (commandsPerSecond >= this.thresholds.emergency) {
      console.log('\n🆘 EMERGENCY ALERT: Redis command rate extremely high!');
      console.log(`   Commands/sec: ${commandsPerSecond} (threshold: ${this.thresholds.emergency})`);
      console.log('   🚨 Consider running: npx tsx scripts/emergency-redis-throttle.ts');
      console.log('   🚨 Or manually pause non-critical queues immediately\n');
    } else if (commandsPerSecond >= this.thresholds.critical) {
      console.log('\n🚨 CRITICAL ALERT: Redis command rate very high!');
      console.log(`   Commands/sec: ${commandsPerSecond} (threshold: ${this.thresholds.critical})`);
      console.log('   ⚠️ Consider reducing queue processing or pausing non-critical queues\n');
    } else if (commandsPerSecond >= this.thresholds.warning) {
      console.log('\n⚠️ WARNING: Redis command rate elevated');
      console.log(`   Commands/sec: ${commandsPerSecond} (threshold: ${this.thresholds.warning})`);
      console.log('   📊 Monitor closely for further increases\n');
    }

    // Memory usage warning
    if (metrics.memoryUsageBytes > 500 * 1024 * 1024) { // 500MB
      console.log(`\n💾 Memory Warning: Redis using ${metrics.memoryUsage}`);
    }

    // Queue size warning
    const totalJobs = metrics.totalJobs;
    if (totalJobs > 1000) {
      console.log(`\n📋 Queue Warning: ${totalJobs} total jobs in queues`);
    }
  }

  private parseMemoryUsage(memoryStr: string): number {
    // Parse memory strings like "45.2MB" or "1.2GB"
    const match = memoryStr.match(/([0-9.]+)([KMGT]?B)/i);
    if (!match) return 0;

    const value = parseFloat(match[1]);
    const unit = match[2].toUpperCase();

    switch (unit) {
      case 'KB': return value * 1024;
      case 'MB': return value * 1024 * 1024;
      case 'GB': return value * 1024 * 1024 * 1024;
      case 'TB': return value * 1024 * 1024 * 1024 * 1024;
      default: return value;
    }
  }

  private generateSummaryReport(): void {
    if (this.metricsHistory.length === 0) {
      console.log('\n📊 No metrics collected');
      return;
    }

    console.log('\n📊 MONITORING SUMMARY REPORT');
    console.log('============================');

    const commands = this.metricsHistory.map(m => m.commandsPerSecond);
    const avgCommands = commands.reduce((a, b) => a + b, 0) / commands.length;
    const maxCommands = Math.max(...commands);
    const minCommands = Math.min(...commands);

    console.log(`📈 Commands/sec - Avg: ${avgCommands.toFixed(1)}, Max: ${maxCommands.toFixed(1)}, Min: ${minCommands.toFixed(1)}`);

    // Count threshold violations
    const warningViolations = commands.filter(c => c >= this.thresholds.warning).length;
    const criticalViolations = commands.filter(c => c >= this.thresholds.critical).length;
    const emergencyViolations = commands.filter(c => c >= this.thresholds.emergency).length;

    console.log(`⚠️ Threshold violations:`);
    console.log(`   Warning (≥${this.thresholds.warning}): ${warningViolations}/${this.metricsHistory.length} samples`);
    console.log(`   Critical (≥${this.thresholds.critical}): ${criticalViolations}/${this.metricsHistory.length} samples`);
    console.log(`   Emergency (≥${this.thresholds.emergency}): ${emergencyViolations}/${this.metricsHistory.length} samples`);

    // Memory usage summary
    const memoryUsages = this.metricsHistory.map(m => m.memoryUsageBytes);
    const avgMemory = memoryUsages.reduce((a, b) => a + b, 0) / memoryUsages.length;
    const maxMemory = Math.max(...memoryUsages);
    console.log(`💾 Memory usage - Avg: ${this.formatBytes(avgMemory)}, Max: ${this.formatBytes(maxMemory)}`);

    // Queue analysis
    const totalJobsHistory = this.metricsHistory.map(m => m.totalJobs);
    const avgJobs = totalJobsHistory.reduce((a, b) => a + b, 0) / totalJobsHistory.length;
    const maxJobs = Math.max(...totalJobsHistory);
    console.log(`📋 Queue jobs - Avg: ${avgJobs.toFixed(0)}, Max: ${maxJobs}`);

    // Recommendations
    console.log('\n💡 RECOMMENDATIONS:');
    if (emergencyViolations > 0) {
      console.log('   🆘 URGENT: Emergency thresholds exceeded - immediate action required');
      console.log('   🚨 Run emergency throttle script: npx tsx scripts/emergency-redis-throttle.ts');
    } else if (criticalViolations > this.metricsHistory.length * 0.1) {
      console.log('   🚨 Critical thresholds frequently exceeded - consider further optimization');
    } else if (warningViolations > this.metricsHistory.length * 0.2) {
      console.log('   ⚠️ Warning thresholds frequently exceeded - monitor closely');
    } else {
      console.log('   ✅ Redis performance within acceptable limits');
    }

    console.log(`\n📊 Monitoring duration: ${this.getMonitoringDuration()}`);
    console.log(`📊 Total samples: ${this.metricsHistory.length}`);
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  private getMonitoringDuration(): string {
    if (this.metricsHistory.length < 2) return 'N/A';
    
    const start = this.metricsHistory[0].timestamp;
    const end = this.metricsHistory[this.metricsHistory.length - 1].timestamp;
    const durationMs = end.getTime() - start.getTime();
    const durationMin = Math.round(durationMs / 60000);
    
    return `${durationMin} minutes`;
  }

  // Method to update thresholds dynamically
  updateThresholds(warning: number, critical: number, emergency: number): void {
    this.thresholds = { warning, critical, emergency };
    console.log(`📊 Updated thresholds - Warning: ${warning}, Critical: ${critical}, Emergency: ${emergency}`);
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const intervalSeconds = parseInt(args[0]) || 10;
  
  if (intervalSeconds < 5) {
    console.log('⚠️ Minimum monitoring interval is 5 seconds');
    process.exit(1);
  }

  const monitor = new RedisMonitor();
  
  try {
    await monitor.startMonitoring(intervalSeconds);
  } catch (error) {
    console.error('❌ Redis monitor failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { RedisMonitor };