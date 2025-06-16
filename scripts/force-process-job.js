#!/usr/bin/env node

/**
 * Force Process Job Script
 * 
 * This script helps force process stuck jobs in the queue
 */

const API_KEY = process.env.CRON_API_KEY || 'test-scheduler-key';
const BASE_URL = 'http://localhost:3000';

async function fetchWithTimeout(url, options = {}, timeout = 10000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

async function getQueueMetrics() {
  try {
    const response = await fetchWithTimeout(
      `${BASE_URL}/api/cron-manager?action=queue_metrics&apiKey=${API_KEY}`
    );
    
    if (response.ok) {
      const data = await response.json();
      return data.result;
    } else {
      console.error(`❌ Failed to get queue metrics: ${response.status}`);
      return null;
    }
  } catch (error) {
    console.error('❌ Error fetching queue metrics:', error.message);
    return null;
  }
}

async function getWorkerStatus() {
  try {
    const response = await fetchWithTimeout(
      `${BASE_URL}/api/cron-manager?action=worker_status&apiKey=${API_KEY}`
    );
    
    if (response.ok) {
      const data = await response.json();
      return data.result;
    } else {
      console.error(`❌ Failed to get worker status: ${response.status}`);
      return null;
    }
  } catch (error) {
    console.error('❌ Error fetching worker status:', error.message);
    return null;
  }
}

async function restartWorkers() {
  try {
    console.log('🔄 Restarting all workers...');
    
    const response = await fetchWithTimeout(`${BASE_URL}/api/cron-manager`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'restart_workers',
        apiKey: API_KEY,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Workers restarted successfully:', data.result.message);
      return true;
    } else {
      const errorText = await response.text();
      console.error(`❌ Failed to restart workers: ${response.status} - ${errorText}`);
      return false;
    }
  } catch (error) {
    console.error('❌ Error restarting workers:', error.message);
    return false;
  }
}

async function forceProcessJob(jobId, queueName) {
  try {
    console.log(`🚀 Force processing job ${jobId} in queue ${queueName}...`);
    
    const response = await fetchWithTimeout(`${BASE_URL}/api/cron-manager`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'force_process_job',
        jobId,
        queueName,
        apiKey: API_KEY,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Job forced to retry:', data.result.message);
      return true;
    } else {
      const errorText = await response.text();
      console.error(`❌ Failed to force process job: ${response.status} - ${errorText}`);
      return false;
    }
  } catch (error) {
    console.error('❌ Error force processing job:', error.message);
    return false;
  }
}

async function diagnoseAndFix() {
  console.log('🔍 Diagnosing Queue and Worker Issues\n');
  
  try {
    // Step 1: Check queue metrics
    console.log('1️⃣ Checking queue metrics...');
    const queueMetrics = await getQueueMetrics();
    
    if (!queueMetrics) {
      console.error('❌ Could not get queue metrics. Is the server running?');
      process.exit(1);
    }
    
    console.log('📊 Queue metrics:');
    let hasStuckJobs = false;
    let stuckQueues = [];
    
    for (const [queueName, metrics] of Object.entries(queueMetrics)) {
      console.log(`   ${queueName}: waiting=${metrics.waiting}, active=${metrics.active}, completed=${metrics.completed}, failed=${metrics.failed}, delayed=${metrics.delayed}`);
      
      // Check for stuck jobs (jobs waiting but no active processing)
      if (metrics.waiting > 0 && metrics.active === 0) {
        hasStuckJobs = true;
        stuckQueues.push(queueName);
        console.log(`   ⚠️  Queue ${queueName} has ${metrics.waiting} waiting jobs but no active processing!`);
      }
    }
    console.log('');
    
    // Step 2: Check worker status
    console.log('2️⃣ Checking worker status...');
    const workerStatus = await getWorkerStatus();
    
    if (!workerStatus || workerStatus.error) {
      console.error('❌ Could not get worker status:', workerStatus?.error || 'Unknown error');
      console.log('💡 This might indicate workers are not running properly.');
    } else {
      console.log('👷 Worker status:');
      let hasInactiveWorkers = false;
      
      for (const [queueName, status] of Object.entries(workerStatus)) {
        const statusText = status.isRunning ? '✅ Running' : '❌ Stopped';
        const pausedText = status.isPaused ? ' (Paused)' : '';
        console.log(`   ${queueName}: ${statusText}${pausedText} - Concurrency: ${status.concurrency}`);
        
        if (!status.isRunning) {
          hasInactiveWorkers = true;
        }
      }
      
      if (hasInactiveWorkers) {
        console.log('   ⚠️  Some workers are not running!');
      }
    }
    console.log('');
    
    // Step 3: Provide recommendations and fixes
    console.log('3️⃣ Diagnosis and recommendations...');
    
    if (hasStuckJobs || workerStatus?.error) {
      console.log('🚨 Issues detected! Recommended actions:');
      
      if (workerStatus?.error || hasStuckJobs) {
        console.log('   • Workers appear to be stuck or not processing jobs');
        console.log('   • Restarting workers should fix this issue');
        
        const shouldRestart = process.argv.includes('--auto-fix') || process.argv.includes('--restart');
        
        if (shouldRestart) {
          console.log('\n🔄 Auto-fixing: Restarting workers...');
          const success = await restartWorkers();
          
          if (success) {
            console.log('✅ Workers restarted. Waiting 5 seconds for them to initialize...');
            await new Promise(resolve => setTimeout(resolve, 5000));
            
            // Re-check status
            console.log('\n📊 Re-checking status after restart...');
            const newQueueMetrics = await getQueueMetrics();
            const newWorkerStatus = await getWorkerStatus();
            
            if (newQueueMetrics && newWorkerStatus && !newWorkerStatus.error) {
              console.log('✅ Workers are now running properly!');
              
              // Check if stuck jobs are now processing
              let stillStuck = false;
              for (const queueName of stuckQueues) {
                const metrics = newQueueMetrics[queueName];
                if (metrics && metrics.waiting > 0 && metrics.active === 0) {
                  stillStuck = true;
                  console.log(`⚠️  Queue ${queueName} still has stuck jobs`);
                }
              }
              
              if (!stillStuck) {
                console.log('🎉 All issues resolved! Jobs should now process normally.');
              }
            } else {
              console.log('❌ Workers still not responding properly after restart');
            }
          }
        } else {
          console.log('\n💡 To automatically fix these issues, run:');
          console.log('   npm run force-process-job -- --restart');
          console.log('   # or');
          console.log('   npm run restart-workers');
        }
      }
    } else {
      console.log('✅ No issues detected! All workers are running and processing jobs normally.');
    }
    
    console.log('\n📋 Additional troubleshooting commands:');
    console.log('   npm run check-workers     # Check worker status');
    console.log('   npm run restart-workers   # Restart all workers');
    console.log('   npm run jobs:status       # Check cron job status');
    console.log('   npm run redis:test        # Test Redis connection');
    
  } catch (error) {
    console.error('💥 Diagnosis failed with error:', error);
    process.exit(1);
  }
}

// Run the diagnosis
diagnoseAndFix().catch(console.error); 