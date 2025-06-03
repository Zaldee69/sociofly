import { CronManager } from "./services/cron-manager";

/**
 * Initialize cron jobs when the application starts
 * This should be called once when the server starts
 */
export async function initializeCronJobs(): Promise<void> {
  // Only initialize cron jobs in production or when explicitly enabled
  const shouldRunCron =
    process.env.NODE_ENV === "production" ||
    process.env.ENABLE_CRON_JOBS === "true";

  if (!shouldRunCron) {
    console.log("🕒 Cron jobs disabled for development mode");
    console.log(
      "   Set ENABLE_CRON_JOBS=true to enable cron jobs in development"
    );
    return;
  }

  try {
    console.log("🚀 Starting cron job initialization...");
    await CronManager.initialize();
    console.log("✅ Cron jobs initialized successfully");
  } catch (error) {
    console.error("❌ Failed to initialize cron jobs:", error);
    // Don't throw error to prevent app startup failure
  }
}

/**
 * Gracefully shutdown cron jobs
 * This should be called when the application is shutting down
 */
export function shutdownCronJobs(): void {
  console.log("🛑 Shutting down cron jobs...");
  CronManager.stopAll();
  console.log("✅ Cron jobs shut down successfully");
}

// Handle graceful shutdown
process.on("SIGINT", () => {
  console.log("🔄 Received SIGINT, shutting down gracefully...");
  shutdownCronJobs();
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("🔄 Received SIGTERM, shutting down gracefully...");
  shutdownCronJobs();
  process.exit(0);
});
