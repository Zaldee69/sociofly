#!/usr/bin/env node

const { exec } = require('child_process');

const API_KEY = process.env.CRON_API_KEY || 'test-scheduler-key';
const PORT = process.env.PORT || 3000;

function execPromise(command) {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(stdout);
    });
  });
}

async function checkStatus() {
  try {
    console.log('\n🔍 Checking Queue Status...');
    const status = await execPromise(`curl -s "http://localhost:${PORT}/api/queue-manager?action=status&apiKey=${API_KEY}"`);
    console.log(status)
    const statusData = JSON.parse(status);
    
    if (statusData.success) {
      const result = statusData.result;
      console.log(`📊 System Status:`);
      console.log(`   - Initialized: ${result.initialized}`);
      console.log(`   - Using Queues: ${result.useQueues}`);
      console.log(`   - Total Cron Jobs: ${result.totalJobs}`);
      console.log(`   - Running Cron Jobs: ${result.runningJobs}`);
      
      if (result.useQueues && result.queueMetrics) {
        console.log('\n📈 Queue Metrics:');
        Object.entries(result.queueMetrics).forEach(([queueName, metrics]) => {
          console.log(`   ${queueName}:`);
          console.log(`     - Waiting: ${metrics.waiting}`);
          console.log(`     - Active: ${metrics.active}`);
          console.log(`     - Completed: ${metrics.completed}`);
          console.log(`     - Failed: ${metrics.failed}`);
          console.log(`     - Delayed: ${metrics.delayed}`);
        });
      }
    } else {
      console.log('❌ Failed to get status:', statusData.error);
    }
  } catch (error) {
    console.log('❌ Error checking status:', error.message);
  }
}

async function monitor() {
  console.log('🚀 Starting Queue Monitor...');
  console.log('Press Ctrl+C to stop');
  
  // Initial check
  await checkStatus();
  
  // Set up periodic checks
  setInterval(async () => {
    console.log('\n' + '='.repeat(50));
    console.log(`📅 ${new Date().toISOString()}`);
    await checkStatus();
  }, 10000); // Every 10 seconds
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Stopping monitor...');
  process.exit(0);
});

monitor().catch(console.error); 