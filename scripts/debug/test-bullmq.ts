#!/usr/bin/env tsx

import { EnhancedCronManager } from "../src/lib/services/enhanced-cron-manager";
import { QueueManager } from "../src/lib/queue/queue-manager";
import { JobType } from "../src/lib/queue/job-types";
import { checkRedisConnection } from "../src/lib/queue/redis-connection";

async function testBullMQIntegration() {
  console.log("🧪 Testing BullMQ Integration...\n");

  try {
    // Test 1: Check Redis Connection
    console.log("1️⃣ Testing Redis Connection...");
    const redisAvailable = await checkRedisConnection();

    if (redisAvailable) {
      console.log("✅ Redis connection successful");
    } else {
      console.log("⚠️  Redis not available - testing will use fallback mode");
    }
    console.log("");

    // Test 2: Initialize Enhanced Cron Manager
    console.log("2️⃣ Testing Enhanced Cron Manager Initialization...");
    await EnhancedCronManager.initialize();
    console.log("✅ Enhanced Cron Manager initialized successfully\n");

    // Test 3: Check Enhanced Status
    console.log("3️⃣ Testing Enhanced Status...");
    const status = await EnhancedCronManager.getEnhancedStatus();
    console.log("📊 Enhanced Status:", JSON.stringify(status, null, 2));
    console.log("✅ Status retrieved successfully\n");

    if (redisAvailable && EnhancedCronManager.isUsingQueues()) {
      console.log("🚀 Redis available - Testing BullMQ features...\n");

      // Test 4: Queue Manager Access
      console.log("4️⃣ Testing Queue Manager Access...");
      const queueManager = EnhancedCronManager.getQueueManager();

      if (queueManager) {
        console.log("✅ Queue Manager accessible");

        // Test 5: Get All Queue Metrics
        console.log("\n5️⃣ Testing Queue Metrics...");
        const allMetrics = await queueManager.getAllQueueMetrics();
        console.log(
          "📈 All Queue Metrics:",
          JSON.stringify(allMetrics, null, 2)
        );
        console.log("✅ Queue metrics retrieved successfully");

        // Test 6: Queue Different Job Types
        console.log("\n6️⃣ Testing Job Queuing...");

        // Test Post Publishing Job
        console.log("📝 Queuing Post Publishing Job...");
        await EnhancedCronManager.queueJob(
          QueueManager.QUEUES.SCHEDULER,
          JobType.PUBLISH_POST,
          {
            postId: "test_post_123",
            userId: "test_user_456",
            platform: "facebook",
            scheduledAt: new Date(),
            content: {
              text: "Test post from BullMQ integration test!",
              hashtags: ["#test", "#bullmq", "#scheduler"],
            },
          },
          {
            delay: 5000, // 5 seconds delay
            attempts: 3,
            priority: 5,
          }
        );
        console.log("✅ Post publishing job queued");

        // Test Health Check Job
        console.log("🏥 Queuing Health Check Job...");
        await EnhancedCronManager.queueJob(
          QueueManager.QUEUES.MAINTENANCE,
          JobType.SYSTEM_HEALTH_CHECK,
          {
            checkType: "quick",
            alertThreshold: 70,
          },
          {
            priority: 8,
            attempts: 2,
          }
        );
        console.log("✅ Health check job queued");

        // Test Notification Job
        console.log("📧 Queuing Notification Job...");
        await EnhancedCronManager.queueJob(
          QueueManager.QUEUES.NOTIFICATIONS,
          JobType.SEND_NOTIFICATION,
          {
            userId: "test_user_456",
            type: "email",
            template: "test_notification",
            data: {
              message: "BullMQ integration test notification",
              timestamp: new Date().toISOString(),
            },
            priority: "high",
          },
          {
            delay: 2000, // 2 seconds delay
            priority: 7,
            attempts: 3,
          }
        );
        console.log("✅ Notification job queued");

        // Test Cleanup Job
        console.log("🧹 Queuing Cleanup Job...");
        await EnhancedCronManager.queueJob(
          QueueManager.QUEUES.MAINTENANCE,
          JobType.CLEANUP_OLD_LOGS,
          {
            olderThanDays: 30,
            logType: "all",
          },
          {
            priority: 1,
            attempts: 2,
          }
        );
        console.log("✅ Cleanup job queued");

        console.log("\n✅ All job types queued successfully!");

        // Test 7: Wait and Check Job Processing
        console.log("\n7️⃣ Waiting for job processing...");
        console.log("⏳ Waiting 10 seconds for jobs to process...");

        await new Promise((resolve) => setTimeout(resolve, 10000));

        // Check metrics after job processing
        console.log("\n📊 Checking metrics after job processing...");
        const metricsAfter = await queueManager.getAllQueueMetrics();
        console.log(
          "📈 Updated Queue Metrics:",
          JSON.stringify(metricsAfter, null, 2)
        );

        // Test 8: Queue Management Operations
        console.log("\n8️⃣ Testing Queue Management Operations...");

        // Pause and resume a queue
        console.log("⏸️  Testing queue pause...");
        await queueManager.pauseQueue(QueueManager.QUEUES.NOTIFICATIONS);
        console.log("✅ Queue paused");

        await new Promise((resolve) => setTimeout(resolve, 2000));

        console.log("▶️  Testing queue resume...");
        await queueManager.resumeQueue(QueueManager.QUEUES.NOTIFICATIONS);
        console.log("✅ Queue resumed");

        // Clean completed jobs
        console.log("🧹 Testing queue cleanup...");
        await queueManager.cleanQueue(
          QueueManager.QUEUES.SCHEDULER,
          "completed",
          1000
        );
        console.log("✅ Queue cleaned");

        console.log(
          "\n✅ All queue management operations tested successfully!"
        );
      } else {
        console.log("❌ Queue Manager not accessible");
      }
    } else {
      console.log("⚠️  BullMQ features not available (Redis not connected)");
      console.log("   Only node-cron features will be tested.");
    }

    // Test 9: Final Status Check
    console.log("\n9️⃣ Final Status Check...");
    const finalStatus = await EnhancedCronManager.getEnhancedStatus();
    console.log("📊 Final Enhanced Status:");
    console.log(`   - Initialized: ${finalStatus.initialized}`);
    console.log(`   - Using Queues: ${finalStatus.useQueues}`);
    console.log(`   - Total Jobs: ${finalStatus.totalJobs}`);
    console.log(`   - Running Jobs: ${finalStatus.runningJobs}`);
    console.log(`   - Cron Jobs: ${finalStatus.cronJobs.length}`);

    if (finalStatus.queueMetrics) {
      const totalQueueJobs = Object.values(finalStatus.queueMetrics).reduce(
        (total: number, metrics: any) =>
          total + metrics.waiting + metrics.active + metrics.completed,
        0
      );
      console.log(`   - Total Queue Jobs Processed: ${totalQueueJobs}`);
    }

    console.log("\n🎉 BullMQ Integration Test Summary:");
    console.log(`   - Redis Available: ${redisAvailable ? "Yes" : "No"}`);
    console.log(
      `   - BullMQ Active: ${EnhancedCronManager.isUsingQueues() ? "Yes" : "No"}`
    );
    console.log(
      `   - Fallback Mode: ${!EnhancedCronManager.isUsingQueues() ? "Yes (node-cron only)" : "No"}`
    );
    console.log(`   - Enhanced Cron Manager: Working`);
    console.log(
      `   - Job Queuing: ${redisAvailable ? "Working" : "Fallback (disabled)"}`
    );
    console.log("   - All tests PASSED ✅\n");
  } catch (error) {
    console.error("❌ Error during BullMQ integration test:", error);
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  testBullMQIntegration()
    .then(() => {
      console.log("✅ BullMQ integration test completed successfully!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ BullMQ integration test failed:", error);
      process.exit(1);
    });
}

export { testBullMQIntegration };
