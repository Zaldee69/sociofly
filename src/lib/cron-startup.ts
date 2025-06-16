import { JobSchedulerManager } from "./services/cron-manager";
import { checkRedisConnection } from "./queue/redis-connection";

/**
 * Initialize job scheduler with BullMQ integration
 * This should be called once when the server starts
 */
export async function initializeJobScheduler(): Promise<void> {
  // Only initialize scheduled jobs in production or when explicitly enabled
  const shouldRunScheduler =
    process.env.NODE_ENV === "production" ||
    process.env.ENABLE_SCHEDULED_JOBS === "true";

  if (!shouldRunScheduler) {
    console.log("🕒 Scheduled jobs disabled for development mode");
    console.log(
      "   Set ENABLE_SCHEDULED_JOBS=true to enable scheduled jobs in development"
    );
    return;
  }

  try {
    console.log("🚀 Starting job scheduler initialization...");

    // Check Redis connection first
    const redisAvailable = await checkRedisConnection();

    if (redisAvailable) {
      console.log("✅ Redis available - Full BullMQ job scheduling");
    } else {
      console.log("⚠️  Redis not available - Job scheduling requires Redis");
      return;
    }

    await JobSchedulerManager.initialize();
    console.log("✅ Job scheduler initialized successfully");

    // Log system configuration
    const status = await JobSchedulerManager.getStatus();
    console.log(`📊 System Status:
      - Total Jobs: ${status.scheduledJobs?.length || 0}
      - Running Jobs: ${status.scheduledJobs?.filter((job: any) => job.running).length || 0}
      - Using Queues: ${status.queueManagerReady ? "Yes" : "No"}
      - Queue System: ${status.queueManagerReady ? "BullMQ + Redis" : "Unavailable"}
    `);
  } catch (error) {
    console.error("❌ Failed to initialize job scheduler:", error);
    // Don't throw error to prevent app startup failure
  }
}

/**
 * Graceful shutdown for job scheduler
 */
export async function shutdownJobScheduler(): Promise<void> {
  try {
    console.log("🛑 Shutting down job scheduler...");
    await JobSchedulerManager.shutdown();
    console.log("✅ Job scheduler shutdown complete");
  } catch (error) {
    console.error("❌ Error during job scheduler shutdown:", error);
  }
}

// Legacy function names for backward compatibility
export const initializeEnhancedCronJobs = initializeJobScheduler;
export const shutdownEnhancedCronJobs = shutdownJobScheduler;
