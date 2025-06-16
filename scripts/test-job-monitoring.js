#!/usr/bin/env node

const fetch = require('node-fetch');

const API_BASE = 'http://localhost:3001/api/cron-manager';
const API_KEY = 'test-scheduler-key';

async function testJobMonitoring() {
  console.log('🧪 Testing Job Monitoring System...\n');

  try {
    // 1. Trigger a quick job
    console.log('1. Triggering system_health_check job...');
    const triggerResponse = await fetch(API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'trigger',
        jobName: 'system_health_check',
        apiKey: API_KEY,
      }),
    });

    if (!triggerResponse.ok) {
      throw new Error(`Failed to trigger job: ${triggerResponse.statusText}`);
    }

    const triggerData = await triggerResponse.json();
    console.log('✅ Job triggered:', triggerData.result);

    const jobId = triggerData.result.jobId;
    const queueName = triggerData.result.queueName;

    // 2. Monitor job status
    console.log('\n2. Monitoring job status...');
    let attempts = 0;
    const maxAttempts = 30;

    while (attempts < maxAttempts) {
      attempts++;
      
      // Check job details
      const detailsResponse = await fetch(
        `${API_BASE}?action=job_details&jobId=${jobId}&queueName=${queueName}&apiKey=${API_KEY}`
      );

      if (detailsResponse.ok) {
        const detailsData = await detailsResponse.json();
        const jobDetails = detailsData.result;

                 if (jobDetails && !jobDetails.error) {
           const hasFinished = jobDetails.finishedOn !== null && jobDetails.finishedOn !== undefined;
           const hasFailed = jobDetails.failedReason !== null && jobDetails.failedReason !== undefined;
           const hasStartedProcessing = jobDetails.processedOn !== null && jobDetails.processedOn !== undefined;
           
           const isCompleted = hasFinished && !hasFailed;
           const isFailed = hasFailed;
           const isProcessing = hasStartedProcessing && !hasFinished && !hasFailed;

           console.log(`   Attempt ${attempts}: Job status -`, {
             completed: isCompleted,
             failed: isFailed,
             processing: isProcessing,
             hasFinished,
             hasFailed,
             hasStartedProcessing,
             processedOn: jobDetails.processedOn,
             finishedOn: jobDetails.finishedOn,
             failedReason: jobDetails.failedReason,
             returnvalue: jobDetails.returnvalue,
           });

          if (isCompleted) {
            const executionTime = (jobDetails.finishedOn - jobDetails.processedOn) / 1000;
            console.log(`✅ Job completed successfully in ${executionTime.toFixed(2)}s`);
            break;
          }

          if (isFailed) {
            console.log(`❌ Job failed: ${jobDetails.failedReason}`);
            break;
          }
        } else {
          console.log(`   Attempt ${attempts}: Job details not available`);
        }
      } else {
        console.log(`   Attempt ${attempts}: Failed to get job details`);
      }

      // Check queue metrics as fallback
      const metricsResponse = await fetch(
        `${API_BASE}?action=queue_metrics&apiKey=${API_KEY}`
      );

      if (metricsResponse.ok) {
        const metricsData = await metricsResponse.json();
        const queueMetrics = metricsData.result[queueName];
        
        if (queueMetrics) {
          console.log(`   Queue ${queueName}:`, queueMetrics);
        }
      }

      // Wait before next attempt
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    if (attempts >= maxAttempts) {
      console.log('⚠️  Monitoring timeout reached');
    }

    // 3. Check final queue state
    console.log('\n3. Final queue metrics:');
    const finalMetricsResponse = await fetch(
      `${API_BASE}?action=queue_metrics&apiKey=${API_KEY}`
    );

    if (finalMetricsResponse.ok) {
      const finalMetricsData = await finalMetricsResponse.json();
      console.log('Final metrics:', JSON.stringify(finalMetricsData.result, null, 2));
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testJobMonitoring(); 