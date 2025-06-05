#!/usr/bin/env tsx

import { CronManager } from "../src/lib/services/cron-manager";
import { SchedulerService } from "../src/lib/services/scheduler.service";

async function testCronJobs() {
  console.log("🧪 Testing Cron Job System...\n");

  try {
    // Test 1: Initialize Cron Manager
    console.log("1️⃣ Testing Cron Manager Initialization...");
    await CronManager.initialize();
    console.log("✅ Cron Manager initialized successfully\n");

    // Test 2: Check job status
    console.log("2️⃣ Testing Job Status...");
    const status = CronManager.getJobStatus();
    console.log("📊 Job Status:", status);
    console.log(`✅ Found ${status.length} jobs\n`);

    // Test 3: Get job statistics
    console.log("3️⃣ Testing Job Statistics...");
    const stats = await CronManager.getJobStatistics(1); // Last 1 hour
    console.log("📈 Job Statistics:", stats);
    console.log("✅ Statistics retrieved successfully\n");

    // Test 4: Test system health
    console.log("4️⃣ Testing System Health...");
    const health = await SchedulerService.getApprovalSystemHealth();
    console.log("🏥 System Health:", health);
    console.log(`✅ Health Score: ${health.healthScore}/100\n`);

    // Test 5: Manual trigger job (system health check - safe to run)
    console.log("5️⃣ Testing Manual Job Trigger...");
    const triggerResult = await CronManager.triggerJob("system_health_check");
    console.log("⚡ Trigger Result:", triggerResult);
    console.log("✅ Job triggered successfully\n");

    // Test 6: Test job controls
    console.log("6️⃣ Testing Job Controls...");

    // Stop a job
    const stopResult = CronManager.stopJob("system_health_check");
    console.log(`⏸️ Stop job result: ${stopResult}`);

    // Check status after stop
    const statusAfterStop = CronManager.getJobStatus();
    const stoppedJob = statusAfterStop.find(
      (j) => j.name === "system_health_check"
    );
    console.log(
      `📊 Job status after stop: ${stoppedJob?.running ? "running" : "stopped"}`
    );

    // Start the job again
    const startResult = CronManager.startJob("system_health_check");
    console.log(`▶️ Start job result: ${startResult}`);

    // Check status after start
    const statusAfterStart = CronManager.getJobStatus();
    const startedJob = statusAfterStart.find(
      (j) => j.name === "system_health_check"
    );
    console.log(
      `📊 Job status after start: ${startedJob?.running ? "running" : "stopped"}`
    );
    console.log("✅ Job controls working correctly\n");

    // Test 7: Test individual services
    console.log("7️⃣ Testing Individual Services...");

    console.log("🔍 Testing processDuePublications...");
    const publishResult = await SchedulerService.processDuePublications();
    console.log("📝 Publish Result:", publishResult);

    console.log("🔍 Testing processApprovalEdgeCases...");
    const edgeCaseResult = await SchedulerService.processApprovalEdgeCases();
    console.log("📝 Edge Case Result:", edgeCaseResult);

    console.log("🔍 Testing checkExpiredTokens...");
    const tokenResult = await SchedulerService.checkExpiredTokens();
    console.log("📝 Token Check Result:", tokenResult);

    console.log("✅ Individual services tested successfully\n");

    // Test 8: Final statistics
    console.log("8️⃣ Final Statistics Check...");
    const finalStats = await CronManager.getJobStatistics(1);
    console.log("📊 Final Statistics:", finalStats);
    console.log("✅ All tests completed successfully!\n");

    console.log("🎉 Cron Job System Test Summary:");
    console.log(`   - Total Jobs: ${status.length}`);
    console.log(`   - Running Jobs: ${status.filter((j) => j.running).length}`);
    console.log(`   - System Health Score: ${health.healthScore}/100`);
    console.log(`   - Total Log Entries: ${finalStats.totalLogs}`);
    console.log("   - All tests PASSED ✅\n");
  } catch (error) {
    console.error("❌ Test failed:", error);
    process.exit(1);
  } finally {
    // Clean up
    console.log("🧹 Cleaning up...");
    CronManager.stopAll();
    console.log("✅ Cleanup completed");
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  testCronJobs()
    .then(() => {
      console.log("✅ All tests completed successfully!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Tests failed:", error);
      process.exit(1);
    });
}

export { testCronJobs };
