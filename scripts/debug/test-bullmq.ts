#!/usr/bin/env ts-node

/**
 * Test BullMQ Queue System (Redis-Only)
 *
 * This script tests the BullMQ queue functionality
 * Usage: npx tsx scripts/debug/test-bullmq.ts
 */

import { QueueManager } from "../../src/lib/queue/queue-manager";
import { EnhancedCronManager } from "../../src/lib/services/cron-manager";
import { JobType } from "../../src/lib/queue/job-types";

console.log("🧪 Testing BullMQ Queue System (Redis-Only)");
console.log("=".repeat(50));

async function testRedisAvailability() {
  console.log("\n1️⃣  Testing Redis Availability...");

  try {
    const manager = EnhancedCronManager.getRedisManager();
    if (!manager) {
      throw new Error("Redis manager not initialized");
    }

    const isAvailable = manager.isAvailable();
    if (!isAvailable) {
      throw new Error(
        "Redis is not available - this system requires Redis to function"
      );
    }

    console.log("✅ Redis is available and ready");
    return true;
  } catch (error) {
    console.error("❌ Redis availability test failed:", error);
    return false;
  }
}

async function testQueueInitialization() {
  console.log("\n2️⃣  Testing Queue Initialization...");

  try {
    await EnhancedCronManager.initialize();
    console.log("✅ Enhanced Cron Manager initialized successfully");

    const queueManager = EnhancedCronManager.getQueueManager();
    if (!queueManager) {
      throw new Error("Queue manager not available");
    }

    console.log("✅ Queue manager is ready");
    return true;
  } catch (error) {
    console.error("❌ Queue initialization failed:", error);
    return false;
  }
}

async function testJobExecution() {
  console.log("\n3️⃣  Testing Job Execution...");

  try {
    const result = await EnhancedCronManager.triggerJob("system_health_check");
    console.log("✅ Job triggered successfully:", result);

    // Wait a bit and check status
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const status = await EnhancedCronManager.getStatus();
    console.log("✅ System status:", {
      initialized: status.initialized,
      usingQueues: status.useQueues,
      redisAvailable: status.redisAvailable,
      queueManagerReady: status.queueManagerReady,
    });

    return true;
  } catch (error) {
    console.error("❌ Job execution test failed:", error);
    return false;
  }
}

async function testQueueMetrics() {
  console.log("\n4️⃣  Testing Queue Metrics...");

  try {
    const queueManager = EnhancedCronManager.getQueueManager();
    if (!queueManager) {
      throw new Error("Queue manager not available");
    }

    const metrics = await queueManager.getAllQueueMetrics();
    console.log("✅ Queue metrics retrieved:", Object.keys(metrics));

    // Display queue status
    Object.entries(metrics).forEach(
      ([queueName, queueMetrics]: [string, any]) => {
        console.log(
          `   ${queueName}: ${queueMetrics.waiting} waiting, ${queueMetrics.active} active, ${queueMetrics.completed} completed`
        );
      }
    );

    return true;
  } catch (error) {
    console.error("❌ Queue metrics test failed:", error);
    return false;
  }
}

async function testJobScheduling() {
  console.log("\n5️⃣  Testing Job Scheduling...");

  try {
    const queueManager = EnhancedCronManager.getQueueManager();
    if (!queueManager) {
      throw new Error("Queue manager not available");
    }

    // Test different job types
    const testJobs = [
      { queueName: "scheduler", jobType: JobType.SYSTEM_HEALTH_CHECK },
      { queueName: "maintenance", jobType: JobType.CLEANUP_OLD_LOGS },
    ];

    for (const { queueName, jobType } of testJobs) {
      const job = await queueManager.addJob(
        queueName,
        jobType,
        { userId: "test-user", platform: "all" },
        { priority: 1 }
      );
      console.log(
        `✅ Job ${jobType} scheduled successfully with ID: ${job.id}`
      );
    }

    return true;
  } catch (error) {
    console.error("❌ Job scheduling test failed:", error);
    return false;
  }
}

async function runTests() {
  const results = {
    redisAvailable: false,
    queueInitialized: false,
    jobExecution: false,
    queueMetrics: false,
    jobScheduling: false,
  };

  console.log("🔍 Running Redis-Only BullMQ Tests...\n");

  // Test Redis availability first
  results.redisAvailable = await testRedisAvailability();
  if (!results.redisAvailable) {
    console.log(
      "\n❌ Redis is not available. This system requires Redis to function."
    );
    console.log("💡 Please start Redis server:");
    console.log("   brew services start redis");
    console.log("   # or");
    console.log("   redis-server");
    return results;
  }

  // Run other tests
  results.queueInitialized = await testQueueInitialization();
  if (results.queueInitialized) {
    results.jobExecution = await testJobExecution();
    results.queueMetrics = await testQueueMetrics();
    results.jobScheduling = await testJobScheduling();
  }

  // Print summary
  console.log("\n" + "=".repeat(50));
  console.log("📊 TEST SUMMARY");
  console.log("=".repeat(50));

  const testResults = [
    { name: "Redis Available", status: results.redisAvailable },
    { name: "Queue Initialized", status: results.queueInitialized },
    { name: "Job Execution", status: results.jobExecution },
    { name: "Queue Metrics", status: results.queueMetrics },
    { name: "Job Scheduling", status: results.jobScheduling },
  ];

  testResults.forEach(({ name, status }) => {
    console.log(`${status ? "✅" : "❌"} ${name}`);
  });

  const passedTests = testResults.filter((t) => t.status).length;
  const totalTests = testResults.length;

  console.log(`\n🎯 Results: ${passedTests}/${totalTests} tests passed`);

  if (passedTests === totalTests) {
    console.log("🎉 All tests passed! Redis-only system is working correctly.");
  } else {
    console.log(
      "⚠️  Some tests failed. Check Redis connection and configuration."
    );
  }

  // Cleanup
  try {
    await EnhancedCronManager.shutdown();
    console.log("✅ Cleanup completed");
  } catch (error) {
    console.error("⚠️  Cleanup error:", error);
  }

  return results;
}

// Run tests
if (require.main === module) {
  runTests()
    .then((results) => {
      const allPassed = Object.values(results).every(Boolean);
      process.exit(allPassed ? 0 : 1);
    })
    .catch((error) => {
      console.error("❌ Test execution failed:", error);
      process.exit(1);
    });
}
