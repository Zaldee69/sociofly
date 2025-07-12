#!/usr/bin/env tsx

/**
 * Emergency Redis Optimization Script
 * Untuk menangani command rate Redis yang sangat tinggi (>40 cmd/sec)
 * 
 * Usage: npx tsx scripts/emergency-redis-optimization.ts
 */

import { RedisDashboard } from '../src/lib/queue/redis-dashboard';
import { RedisPerformanceMonitor } from '../src/lib/queue/redis-performance-monitor';
import { REDIS_MONITORING_THRESHOLDS, EMERGENCY_REDIS_CONFIG } from '../src/lib/queue/redis-optimization-config';

async function runEmergencyOptimization() {
  console.log('🚨 EMERGENCY REDIS OPTIMIZATION SCRIPT');
  console.log('=====================================');
  console.log('');
  
  try {
    // Initialize components
    const dashboard = RedisDashboard.getInstance();
    const monitor = RedisPerformanceMonitor.getInstance();
    
    // Get current metrics
    console.log('📊 Checking current Redis performance...');
    const currentMetrics = monitor.getCurrentMetrics();
    
    if (currentMetrics) {
      console.log(`Current command rate: ${currentMetrics.commandsPerSecond} cmd/sec`);
      console.log(`Memory usage: ${currentMetrics.memoryUsage}`);
      console.log(`Active queues: ${Object.keys(currentMetrics.queueSizes).length}`);
      console.log('');
      
      // Check if emergency optimization is needed
      if (currentMetrics.commandsPerSecond > REDIS_MONITORING_THRESHOLDS.commandRate.emergency) {
        console.log('🚨 EMERGENCY THRESHOLD EXCEEDED!');
        console.log(`Command rate ${currentMetrics.commandsPerSecond}/sec > ${REDIS_MONITORING_THRESHOLDS.commandRate.emergency}/sec`);
        console.log('');
        
        // Perform emergency optimization
        console.log('🔧 Performing emergency optimization...');
        const result = await dashboard.performEmergencyOptimization();
        
        console.log('');
        console.log('📋 EMERGENCY OPTIMIZATION RESULTS:');
        console.log('==================================');
        console.log(`Success: ${result.success ? '✅' : '❌'}`);
        console.log('');
        
        if (result.actions.length > 0) {
          console.log('🔧 Actions Performed:');
          result.actions.forEach(action => {
            console.log(`   - ${action}`);
          });
          console.log('');
        }
        
        if (result.errors.length > 0) {
          console.log('❌ Errors:');
          result.errors.forEach(error => {
            console.log(`   - ${error}`);
          });
          console.log('');
        }
        
        console.log('📊 Metrics:');
        console.log(`   - Keys removed: ${result.metrics.keysRemoved}`);
        console.log(`   - Memory freed: ${formatBytes(result.metrics.memoryFreed)}`);
        console.log(`   - Config changes: ${result.metrics.configChanges}`);
        console.log(`   - Workers reduced: ${result.metrics.workersReduced}`);
        console.log('');
        
        // Show emergency configuration applied
        console.log('⚙️  EMERGENCY CONFIGURATION APPLIED:');
        console.log('===================================');
        console.log(`Max workers: ${EMERGENCY_REDIS_CONFIG.maxWorkers}`);
        console.log(`Worker concurrency: ${EMERGENCY_REDIS_CONFIG.workerConcurrency}`);
        console.log(`Rate limit: ${EMERGENCY_REDIS_CONFIG.rateLimitMax} jobs per ${EMERGENCY_REDIS_CONFIG.rateLimitDuration/1000}s`);
        console.log(`Stalled interval: ${EMERGENCY_REDIS_CONFIG.stalledInterval/1000}s`);
        console.log(`Monitoring interval: ${EMERGENCY_REDIS_CONFIG.metricsPollingInterval/1000}s`);
        console.log('');
        
        // Wait and check results
        console.log('⏳ Waiting 30 seconds to check optimization results...');
        await new Promise(resolve => setTimeout(resolve, 30000));
        
        const newMetrics = monitor.getCurrentMetrics();
        if (newMetrics) {
          console.log('📊 POST-OPTIMIZATION METRICS:');
          console.log('=============================');
          console.log(`Command rate: ${newMetrics.commandsPerSecond} cmd/sec (was ${currentMetrics.commandsPerSecond})`);
          console.log(`Memory usage: ${newMetrics.memoryUsage} (was ${currentMetrics.memoryUsage})`);
          
          const improvement = currentMetrics.commandsPerSecond - newMetrics.commandsPerSecond;
          const improvementPercent = (improvement / currentMetrics.commandsPerSecond * 100).toFixed(1);
          
          if (improvement > 0) {
            console.log(`✅ Improvement: -${improvement.toFixed(2)} cmd/sec (-${improvementPercent}%)`);
          } else {
            console.log(`⚠️  No immediate improvement detected`);
          }
          
          if (newMetrics.commandsPerSecond <= REDIS_MONITORING_THRESHOLDS.commandRate.critical) {
            console.log('✅ Command rate now within acceptable limits');
          } else {
            console.log('⚠️  Command rate still elevated - may need additional measures');
          }
        }
        
      } else if (currentMetrics.commandsPerSecond > REDIS_MONITORING_THRESHOLDS.commandRate.critical) {
        console.log('⚠️  CRITICAL THRESHOLD EXCEEDED');
        console.log(`Command rate ${currentMetrics.commandsPerSecond}/sec > ${REDIS_MONITORING_THRESHOLDS.commandRate.critical}/sec`);
        console.log('Consider running regular optimization first');
        
      } else {
        console.log('✅ Redis performance is within acceptable limits');
        console.log('No emergency optimization needed');
      }
      
    } else {
      console.log('❌ Unable to get current Redis metrics');
      console.log('Make sure Redis monitoring is running');
    }
    
  } catch (error) {
    console.error('❌ Emergency optimization script failed:', error);
    process.exit(1);
  }
  
  console.log('');
  console.log('🏁 Emergency optimization script completed');
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Run the script
if (require.main === module) {
  runEmergencyOptimization().catch(console.error);
}

export { runEmergencyOptimization };