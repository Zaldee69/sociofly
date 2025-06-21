#!/usr/bin/env tsx

import { PrismaClient } from "@prisma/client";
import { AnalyticsMasterService } from "../src/lib/services/analytics/core/analytics-master.service";

const prisma = new PrismaClient();

async function main() {
  console.log("🚀 Starting Complete Analytics Collection...");

  try {
    console.log("🔄 Running unified analytics collection...");

    // Use the new master service to run all analytics components
    const result = await AnalyticsMasterService.runCompleteAnalytics({
      includeInsights: true,
      includeHotspots: true,
      includeAnalytics: true,
      forceRun: true, // Force run for manual execution
    });

    console.log("");
    console.log("🎉 Complete Analytics Collection Results:");
    console.log(
      `📊 Overall: ${result.success} successful, ${result.failed} failed out of ${result.total} total`
    );
    console.log(`⏱️  Execution time: ${result.executionTimeMs}ms`);
    console.log("");
    console.log("📋 Component Details:");
    console.log(
      `  📈 Account Insights: ${result.details.insights.success}/${result.details.insights.total} successful`
    );
    console.log(
      `  🔥 Engagement Hotspots: ${result.details.hotspots.success}/${result.details.hotspots.total} successful`
    );
    console.log(
      `  📊 Analytics Data: ${result.details.analytics.success}/${result.details.analytics.total} successful`
    );

    if (result.errors.length > 0) {
      console.log("");
      console.log("❌ Errors encountered:");
      result.errors.forEach((error) => console.log(`  • ${error}`));
    }

    console.log("");
    console.log("✅ Complete analytics collection finished successfully!");

    await prisma.$disconnect();
    process.exit(0);
  } catch (error) {
    console.error("💥 Failed to run complete analytics collection:", error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

// Handle uncaught exceptions
process.on("uncaughtException", async (error) => {
  console.error("💥 Uncaught Exception:", error);
  await prisma.$disconnect();
  process.exit(1);
});

process.on("unhandledRejection", async (reason, promise) => {
  console.error("💥 Unhandled Rejection at:", promise, "reason:", reason);
  await prisma.$disconnect();
  process.exit(1);
});

main().catch(console.error);
