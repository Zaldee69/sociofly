#!/usr/bin/env tsx

/**
 * Redis Command Rate Monitor
 * Memantau command rate Redis secara real-time dan memberikan alert
 * 
 * Usage: npx tsx scripts/monitor-redis-command-rate.ts
 */

import { RedisPerformanceMonitor } from '../src/lib/queue/redis-performance-monitor';
import { RedisDashboard } from '../src/lib/queue/redis-dashboard';
import { REDIS_MONITORING_THRESHOLDS } from '../src/lib/queue/redis-optimization-config';

class RedisCommandRateMonitor {
  private monitor: RedisPerformanceMonitor;
  private dashboard: RedisDashboard;
  private isRunning = false;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private alertHistory: Array<{ timestamp: Date; rate: number; level: string }> = [];
  
  constructor() {
    this.monitor = RedisPerformanceMonitor.getInstance();
    this.dashboard = RedisDashboard.getInstance();
  }
  
  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('⚠️  Monitor already running');
      return;
    }
    
    console.log('🔍 Starting Redis Command Rate Monitor');
    console.log('=====================================');
    console.log('');
    console.log('Thresholds:');
    console.log(`  Warning:   ${REDIS_MONITORING_THRESHOLDS.commandRate.warning} cmd/sec`);
    console.log(`  Critical:  ${REDIS_MONITORING_THRESHOLDS.commandRate.critical} cmd/sec`);
    console.log(`  Emergency: ${REDIS_MONITORING_THRESHOLDS.commandRate.emergency} cmd/sec`);
    console.log('');
    
    this.isRunning = true;
    
    // Start performance monitoring if not already running
    if (!this.monitor.isActive()) {
      await this.monitor.startMonitoring();
    }
    
    // Monitor every 5 seconds
    this.monitoringInterval = setInterval(async () => {
      await this.checkCommandRate();
    }, 5000);
    
    // Handle graceful shutdown
    process.on('SIGINT', () => {
      console.log('\n🛑 Shutting down monitor...');
      this.stop();
      process.exit(0);
    });
    
    console.log('📊 Monitoring started. Press Ctrl+C to stop.');
    console.log('');
  }
  
  stop(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    this.isRunning = false;
    console.log('🛑 Monitor stopped');
  }
  
  private async checkCommandRate(): Promise<void> {
    try {
      const metrics = this.monitor.getCurrentMetrics();
      
      if (!metrics) {
        console.log('⚠️  No metrics available');
        return;
      }
      
      const rate = metrics.commandsPerSecond;
      const timestamp = new Date();
      const timeStr = timestamp.toLocaleTimeString();
      
      // Determine alert level
      let level = 'normal';
      let emoji = '✅';
      let action = '';
      
      if (rate > REDIS_MONITORING_THRESHOLDS.commandRate.emergency) {
        level = 'emergency';
        emoji = '🚨';
        action = ' - EMERGENCY OPTIMIZATION TRIGGERED';
        
        // Trigger emergency optimization
        console.log(`${emoji} [${timeStr}] EMERGENCY: ${rate.toFixed(2)} cmd/sec${action}`);
        await this.triggerEmergencyOptimization(rate);
        
      } else if (rate > REDIS_MONITORING_THRESHOLDS.commandRate.critical) {
        level = 'critical';
        emoji = '🔴';
        action = ' - Consider emergency optimization';
        
      } else if (rate > REDIS_MONITORING_THRESHOLDS.commandRate.warning) {
        level = 'warning';
        emoji = '🟡';
        action = ' - Monitor closely';
        
      } else {
        emoji = '🟢';
      }
      
      // Log current status
      console.log(`${emoji} [${timeStr}] ${rate.toFixed(2)} cmd/sec | Memory: ${metrics.memoryUsage} | Queues: ${Object.keys(metrics.queueSizes).length}${action}`);
      
      // Add to alert history if above warning
      if (level !== 'normal') {
        this.alertHistory.push({ timestamp, rate, level });
        
        // Keep only last 50 alerts
        if (this.alertHistory.length > 50) {
          this.alertHistory.shift();
        }
      }
      
      // Show queue details if critical
      if (level === 'critical' || level === 'emergency') {
        this.showQueueDetails(metrics.queueSizes);
      }
      
      // Show recommendations every 30 seconds for elevated rates
      if (level !== 'normal' && timestamp.getSeconds() % 30 === 0) {
        this.showRecommendations(rate, level);
      }
      
    } catch (error) {
      console.error('❌ Error checking command rate:', error);
    }
  }
  
  private async triggerEmergencyOptimization(rate: number): Promise<void> {
    try {
      console.log(`🚨 Triggering emergency optimization for rate: ${rate.toFixed(2)} cmd/sec`);
      const result = await this.dashboard.performEmergencyOptimization();
      
      if (result.success) {
        console.log(`✅ Emergency optimization completed: ${result.actions.length} actions, ${result.metrics.keysRemoved} keys removed`);
      } else {
        console.log(`❌ Emergency optimization failed: ${result.errors.join(', ')}`);
      }
    } catch (error) {
      console.error('❌ Emergency optimization error:', error);
    }
  }
  
  private showQueueDetails(queueSizes: Record<string, number>): void {
    const totalJobs = Object.values(queueSizes).reduce((sum, size) => sum + size, 0);
    if (totalJobs > 0) {
      console.log(`   📋 Queue details: Total ${totalJobs} jobs`);
      Object.entries(queueSizes)
        .filter(([_, size]) => size > 0)
        .sort(([_, a], [__, b]) => b - a)
        .slice(0, 5) // Show top 5 queues
        .forEach(([name, size]) => {
          console.log(`      - ${name}: ${size} jobs`);
        });
    }
  }
  
  private showRecommendations(rate: number, level: string): void {
    console.log('');
    console.log('💡 RECOMMENDATIONS:');
    
    if (level === 'emergency') {
      console.log('   🚨 IMMEDIATE ACTIONS:');
      console.log('   - Emergency optimization has been triggered automatically');
      console.log('   - Consider stopping non-critical queues manually');
      console.log('   - Check for infinite loops or stuck jobs');
      console.log('   - Monitor memory usage closely');
      
    } else if (level === 'critical') {
      console.log('   🔴 URGENT ACTIONS:');
      console.log('   - Run: npx tsx scripts/emergency-redis-optimization.ts');
      console.log('   - Check queue sizes and clean up old jobs');
      console.log('   - Reduce worker concurrency temporarily');
      console.log('   - Investigate high-frequency operations');
      
    } else if (level === 'warning') {
      console.log('   🟡 PREVENTIVE ACTIONS:');
      console.log('   - Monitor trend - is rate increasing?');
      console.log('   - Check for job accumulation in queues');
      console.log('   - Consider reducing polling frequency');
      console.log('   - Review recent code changes');
    }
    
    // Show recent trend
    if (this.alertHistory.length >= 3) {
      const recent = this.alertHistory.slice(-3);
      const trend = recent[2].rate - recent[0].rate;
      const trendEmoji = trend > 0 ? '📈' : trend < 0 ? '📉' : '➡️';
      console.log(`   ${trendEmoji} Trend: ${trend > 0 ? '+' : ''}${trend.toFixed(2)} cmd/sec over last 3 alerts`);
    }
    
    console.log('');
  }
  
  showSummary(): void {
    console.log('');
    console.log('📊 MONITORING SUMMARY:');
    console.log('=====================');
    
    if (this.alertHistory.length === 0) {
      console.log('✅ No alerts during monitoring period');
      return;
    }
    
    const emergencyAlerts = this.alertHistory.filter(a => a.level === 'emergency').length;
    const criticalAlerts = this.alertHistory.filter(a => a.level === 'critical').length;
    const warningAlerts = this.alertHistory.filter(a => a.level === 'warning').length;
    
    console.log(`Total alerts: ${this.alertHistory.length}`);
    console.log(`  🚨 Emergency: ${emergencyAlerts}`);
    console.log(`  🔴 Critical: ${criticalAlerts}`);
    console.log(`  🟡 Warning: ${warningAlerts}`);
    
    const rates = this.alertHistory.map(a => a.rate);
    const maxRate = Math.max(...rates);
    const avgRate = rates.reduce((sum, rate) => sum + rate, 0) / rates.length;
    
    console.log(`Peak rate: ${maxRate.toFixed(2)} cmd/sec`);
    console.log(`Average elevated rate: ${avgRate.toFixed(2)} cmd/sec`);
    
    if (emergencyAlerts > 0) {
      console.log('');
      console.log('⚠️  Emergency optimizations were triggered during monitoring');
      console.log('   Review logs and consider permanent configuration changes');
    }
  }
}

// Main execution
async function main() {
  const monitor = new RedisCommandRateMonitor();
  
  try {
    await monitor.start();
    
    // Keep the process running
    await new Promise(() => {});
    
  } catch (error) {
    console.error('❌ Monitor failed:', error);
    process.exit(1);
  } finally {
    monitor.showSummary();
  }
}

if (require.main === module) {
  main().catch(console.error);
}

export { RedisCommandRateMonitor };