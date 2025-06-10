import { CronManager } from "./services/cron-manager";
import { checkRedisConnection } from "./queue/redis-connection";

/**
 * Initialize enhanced cron jobs with BullMQ integration
 * This should be called once when the server starts
 */
export async function initializeEnhancedCronJobs(): Promise<void> {
  // Only initialize cron jobs in production or when explicitly enabled
  const shouldRunCron =
    process.env.NODE_ENV === "production" ||
    process.env.ENABLE_CRON_JOBS === "true";

  if (!shouldRunCron) {
    console.log("🕒 Enhanced cron jobs disabled for development mode");
    console.log(
      "   Set ENABLE_CRON_JOBS=true to enable cron jobs in development"
    );
    return;
  }

  try {
    console.log("🚀 Starting enhanced cron job initialization...");

    // Check Redis connection first
    const redisAvailable = await checkRedisConnection();

    if (redisAvailable) {
      console.log("✅ Redis available - Full BullMQ + node-cron integration");
    } else {
      console.log("⚠️  Redis not available - Using node-cron fallback only");
    }

    await CronManager.initialize();
    console.log("✅ Enhanced cron jobs initialized successfully");

    // Log system configuration
    const status = await CronManager.getStatus();
    console.log(`📊 System Status:
      - Total Jobs: ${status.totalJobs}
      - Running Jobs: ${status.runningJobs}
      - Using Queues: ${status.useQueues ? "Yes" : "No"}
      - Queue System: ${status.useQueues ? "BullMQ + Redis" : "node-cron only"}
    `);
  } catch (error) {
    console.error("❌ Failed to initialize enhanced cron jobs:", error);
    // Don't throw error to prevent app startup failure
  }
}

/**
 * Graceful shutdown for enhanced cron system
 */
export async function shutdownEnhancedCronJobs(): Promise<void> {
  try {
    console.log("🛑 Shutting down enhanced cron system...");
    await CronManager.stopAll();
    console.log("✅ Enhanced cron system shutdown complete");
  } catch (error) {
    console.error("❌ Error during enhanced cron shutdown:", error);
  }
}
