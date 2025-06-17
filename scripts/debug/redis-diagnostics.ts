#!/usr/bin/env npx tsx

import { Redis } from "ioredis";
import { Queue, Worker } from "bullmq";

// Redis configuration for testing
const redisConfig = {
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379"),
  password: process.env.REDIS_PASSWORD || undefined,
  db: parseInt(process.env.REDIS_DB || "0"),
  maxRetriesPerRequest: null, // Required for BullMQ
  retryDelayOnFailover: 100,
  connectTimeout: 10000,
  commandTimeout: 10000, // Increase timeout for lock operations
  lazyConnect: true,
  keepAlive: 30000,
  family: 4,
};

async function runRedisDiagnostics() {
  console.log("🔍 Redis Lock Renewal Diagnostics");
  console.log("=================================");

  let redis: Redis | null = null;
  let testQueue: Queue | null = null;
  let testWorker: Worker | null = null;

  try {
    // Test Redis Connection
    console.log("\n📡 Testing Redis Connection...");
    redis = new Redis(redisConfig);

    const startTime = Date.now();
    const pong = await redis.ping();
    const responseTime = Date.now() - startTime;

    console.log(`✅ Redis PING: ${pong} (${responseTime}ms)`);

    // Test Redis Memory
    console.log("\n💾 Checking Redis Memory Usage...");
    const memoryInfo = await redis.memory("USAGE", "test");
    const info = await redis.info("memory");
    console.log(
      `📊 Redis Memory Info:`,
      info.split("\n").slice(0, 5).join("\n")
    );

    // Test Redis Configuration
    console.log("\n⚙️  Checking Redis Configuration...");
    const configs = await redis.config("GET", "*timeout*");
    console.log("⏱️  Timeout Settings:", configs);

    // Test Lock Behavior
    console.log("\n🔒 Testing Lock Behavior...");

    // Create test queue with explicit lock settings
    testQueue = new Queue("test-lock-queue", {
      connection: redisConfig,
      defaultJobOptions: {
        removeOnComplete: 5,
        removeOnFail: 5,
        attempts: 1,
      },
    });

    // Create test worker with lock settings
    testWorker = new Worker(
      "test-lock-queue",
      async (job) => {
        console.log(`🔄 Processing test job ${job.id}...`);

        // Simulate work that might cause lock issues
        for (let i = 0; i < 10; i++) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
          console.log(`⏳ Job ${job.id} progress: ${(i + 1) * 10}%`);

          // Update progress to test lock renewal
          await job.updateProgress((i + 1) * 10);
        }

        return { success: true, processingTime: "10 seconds" };
      },
      {
        connection: redisConfig,
        concurrency: 1,
        maxStalledCount: 3,
        stalledInterval: 10000, // Check every 10 seconds
      }
    );

    // Add event listeners
    testWorker.on("stalled", (jobId) => {
      console.warn(`⚠️  Job stalled: ${jobId}`);
    });

    testWorker.on("failed", (job, err) => {
      console.error(`❌ Job failed: ${job?.id} - ${err.message}`);
    });

    testWorker.on("completed", (job) => {
      console.log(`✅ Job completed: ${job.id}`);
    });

    // Add a test job
    console.log("\n🚀 Adding test job to check lock renewal...");
    const testJob = await testQueue.add("test-lock-job", {
      testData: "Lock renewal test",
      timestamp: new Date().toISOString(),
    });

    console.log(`📤 Added test job: ${testJob.id}`);

    // Wait for job completion
    console.log(
      "\n⏳ Waiting for job completion (this will take ~10 seconds)..."
    );
    await new Promise((resolve) => setTimeout(resolve, 15000));

    // Check queue stats
    const waiting = await testQueue.getWaiting();
    const active = await testQueue.getActive();
    const completed = await testQueue.getCompleted();
    const failed = await testQueue.getFailed();

    console.log("\n📊 Queue Statistics:");
    console.log(`   Waiting: ${waiting.length}`);
    console.log(`   Active: ${active.length}`);
    console.log(`   Completed: ${completed.length}`);
    console.log(`   Failed: ${failed.length}`);

    // Check for any stalled jobs
    const stalled = await testQueue.getJobs(["stalled-interval"] as any);
    if (stalled.length > 0) {
      console.log(`⚠️  Stalled jobs detected: ${stalled.length}`);
      stalled.forEach((job) => {
        console.log(`   - Job ${job.id}: ${job.failedReason || "No reason"}`);
      });
    }

    // Test Redis performance
    console.log("\n🏃 Testing Redis Performance...");
    const perfStart = Date.now();
    for (let i = 0; i < 100; i++) {
      await redis.set(`perf_test_${i}`, `value_${i}`);
      await redis.get(`perf_test_${i}`);
    }
    const perfEnd = Date.now();
    console.log(`📈 100 SET/GET operations took: ${perfEnd - perfStart}ms`);

    // Cleanup test keys
    const keys = await redis.keys("perf_test_*");
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } catch (error) {
    console.error("❌ Diagnostics failed:", error);
  } finally {
    // Cleanup
    if (testWorker) {
      console.log("\n🧹 Cleaning up test worker...");
      await testWorker.close();
    }

    if (testQueue) {
      console.log("🧹 Cleaning up test queue...");
      await testQueue.obliterate({ force: true });
      await testQueue.close();
    }

    if (redis) {
      console.log("🧹 Closing Redis connection...");
      await redis.quit();
    }
  }

  console.log("\n✅ Redis Diagnostics Complete");
  console.log("\n💡 Recommendations:");
  console.log(
    "   - If you see stalled jobs, consider increasing stalledInterval"
  );
  console.log(
    "   - If you see lock renewal errors, check Redis memory and connectivity"
  );
  console.log(
    "   - Monitor Redis performance and consider using Redis cluster for high load"
  );
  console.log("   - Ensure jobs complete within reasonable time limits");
}

// Run diagnostics
runRedisDiagnostics().catch(console.error);
