#!/usr/bin/env node

/**
 * Test Manual Job Trigger with Real-time Monitoring
 * 
 * This script helps debug manual job triggering by:
 * 1. Getting baseline queue metrics
 * 2. Triggering a job manually
 * 3. Monitoring queue changes in real-time
 * 4. Showing detailed execution feedback
 */

const API_KEY = process.env.CRON_API_KEY || 'test-scheduler-key';
const BASE_URL = 'http://localhost:3000';

// Job-specific timeout configurations
const JOB_TIMEOUTS = {
  'system_health_check': 30,
  'publish_due_posts': 60,
  'check_expired_tokens': 45,
  'cleanup_old_logs': 30,
  'analyze_engagement_hotspots': 120, // 2 minutes for complex analysis
  'fetch_account_insights': 180,      // 3 minutes for API calls
  'collect_posts_analytics': 90,      // 1.5 minutes
};

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

async function triggerJob(jobName) {
  try {
    console.log(`🚀 Triggering job: ${jobName}`);
    
    const response = await fetchWithTimeout(`${BASE_URL}/api/cron-manager`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'trigger',
        jobName,
        apiKey: API_KEY,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Job trigger response:', JSON.stringify(data, null, 2));
      return data.result;
    } else {
      const errorText = await response.text();
      console.error(`❌ Failed to trigger job: ${response.status} - ${errorText}`);
      return null;
    }
  } catch (error) {
    console.error('❌ Error triggering job:', error.message);
    return null;
  }
}

async function monitorQueueChanges(initialMetrics, jobName, maxAttempts = 30) {
  // Use job-specific timeout or default
  const jobTimeout = JOB_TIMEOUTS[jobName] || 30;
  const actualMaxAttempts = Math.max(maxAttempts, jobTimeout);
  
  console.log(`👀 Monitoring queue changes for ${actualMaxAttempts} seconds (job-specific timeout)...`);
  
  let attempts = 0;
  let lastMetrics = initialMetrics;
  let hasDetectedActivity = false;
  
  const monitor = async () => {
    attempts++;
    
    try {
      const currentMetrics = await getQueueMetrics();
      
      if (!currentMetrics) {
        console.log(`⚠️  Attempt ${attempts}: Could not fetch metrics`);
        return false;
      }
      
      // Compare metrics to detect changes
      let hasChanges = false;
      const changes = {};
      
      for (const [queueName, metrics] of Object.entries(currentMetrics)) {
        const prevMetrics = lastMetrics[queueName] || {};
        const currentQueueMetrics = metrics;
        
        for (const [key, value] of Object.entries(currentQueueMetrics)) {
          if (prevMetrics[key] !== value) {
            hasChanges = true;
            if (!changes[queueName]) changes[queueName] = {};
            changes[queueName][key] = {
              from: prevMetrics[key] || 0,
              to: value
            };
          }
        }
      }
      
      if (hasChanges) {
        hasDetectedActivity = true;
        console.log(`📊 Attempt ${attempts}: Queue changes detected!`);
        console.log(JSON.stringify(changes, null, 2));
        
        // Check if our job likely completed
        const relevantQueues = ['scheduler', 'maintenance', 'social-sync', 'high-priority'];
        let jobLikelyCompleted = false;
        let jobLikelyFailed = false;
        
        for (const queueName of relevantQueues) {
          if (changes[queueName]?.completed?.to > changes[queueName]?.completed?.from) {
            console.log(`✅ Job likely completed in queue: ${queueName}`);
            jobLikelyCompleted = true;
            break;
          }
          if (changes[queueName]?.failed?.to > changes[queueName]?.failed?.from) {
            console.log(`❌ Job likely failed in queue: ${queueName}`);
            jobLikelyFailed = true;
            break;
          }
        }
        
        if (jobLikelyCompleted || jobLikelyFailed) {
          return true; // Job completed or failed
        }
      } else {
        const statusMsg = hasDetectedActivity 
          ? `⏳ Attempt ${attempts}: Job still processing...`
          : `⏳ Attempt ${attempts}: No changes detected yet...`;
        console.log(statusMsg);
      }
      
      lastMetrics = currentMetrics;
      
      if (attempts < actualMaxAttempts) {
        setTimeout(monitor, 1000); // Check again in 1 second
      } else {
        console.log(`⏰ Monitoring timeout after ${actualMaxAttempts} attempts`);
        if (hasDetectedActivity) {
          console.log('📊 Job was processing but may still be running...');
        } else {
          console.log('📊 No job activity detected - job may have failed to start');
        }
        console.log('📊 Final queue state:');
        console.log(JSON.stringify(currentMetrics, null, 2));
        return false;
      }
    } catch (error) {
      console.error(`❌ Monitoring error on attempt ${attempts}:`, error.message);
      return false;
    }
  };
  
  // Start monitoring
  setTimeout(monitor, 2000); // Wait 2 seconds before first check
}

async function testManualTrigger() {
  console.log('🧪 Testing Manual Job Trigger with Real-time Monitoring\n');
  
  // Test job - use system_health_check as it's safe and fast
  const testJobName = process.argv[2] || 'system_health_check';
  const expectedTimeout = JOB_TIMEOUTS[testJobName] || 30;
  
  console.log(`📋 Test Configuration:`);
  console.log(`   Job Name: ${testJobName}`);
  console.log(`   Expected Duration: ~${expectedTimeout}s`);
  console.log(`   API Key: ${API_KEY}`);
  console.log(`   Base URL: ${BASE_URL}`);
  console.log('');
  
  try {
    // Step 1: Get baseline metrics
    console.log('1️⃣ Getting baseline queue metrics...');
    const initialMetrics = await getQueueMetrics();
    
    if (!initialMetrics) {
      console.error('❌ Could not get initial metrics. Is the server running?');
      process.exit(1);
    }
    
    console.log('📊 Initial queue state:');
    for (const [queueName, metrics] of Object.entries(initialMetrics)) {
      console.log(`   ${queueName}: waiting=${metrics.waiting}, active=${metrics.active}, completed=${metrics.completed}, failed=${metrics.failed}`);
    }
    console.log('');
    
    // Step 2: Trigger the job
    console.log('2️⃣ Triggering job...');
    const triggerResult = await triggerJob(testJobName);
    
    if (!triggerResult) {
      console.error('❌ Job trigger failed');
      process.exit(1);
    }
    
    console.log(`✅ Job queued successfully!`);
    console.log(`   Job ID: ${triggerResult.jobId}`);
    console.log(`   Queue: ${triggerResult.queueName}`);
    console.log(`   Job Type: ${triggerResult.jobType}`);
    console.log('');
    
    // Step 3: Monitor execution
    console.log('3️⃣ Monitoring job execution...');
    await monitorQueueChanges(initialMetrics, testJobName);
    
    // Step 4: Final status check
    console.log('\n4️⃣ Final status check...');
    const finalMetrics = await getQueueMetrics();
    
    if (finalMetrics) {
      console.log('📊 Final queue state:');
      for (const [queueName, metrics] of Object.entries(finalMetrics)) {
        const initial = initialMetrics[queueName] || {};
        const completedDiff = metrics.completed - (initial.completed || 0);
        const failedDiff = metrics.failed - (initial.failed || 0);
        
        if (completedDiff > 0 || failedDiff > 0) {
          console.log(`   ${queueName}: completed +${completedDiff}, failed +${failedDiff}`);
        }
      }
    }
    
    console.log('\n🎉 Manual trigger test completed!');
    console.log('\n💡 Tips for troubleshooting:');
    console.log('   • Check server logs for job execution details');
    console.log('   • Verify Redis connection is working');
    console.log('   • Ensure workers are processing jobs');
    console.log('   • Check if job data validation is passing');
    
    // Job-specific tips
    if (testJobName === 'analyze_engagement_hotspots' || testJobName === 'fetch_account_insights') {
      console.log('\n🔍 Social Analytics Job Tips:');
      console.log('   • These jobs may take 1-3 minutes to complete');
      console.log('   • Check if you have social accounts configured');
      console.log('   • Verify Instagram/Facebook API credentials');
      console.log('   • Monitor server logs for API rate limiting');
    }
    
  } catch (error) {
    console.error('💥 Test failed with error:', error);
    process.exit(1);
  }
}

// Run the test
testManualTrigger().catch(console.error); 