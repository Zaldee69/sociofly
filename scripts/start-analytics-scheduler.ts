#!/usr/bin/env tsx

import { PrismaClient } from "@prisma/client";
import { SchedulerService } from "../src/lib/services/scheduling/scheduler.service";
import { InsightsCollector } from "../src/lib/services/analytics/core/insights-collector";
import { HotspotAnalyzer } from "../src/lib/services/analytics/hotspots/hotspot-analyzer";

const prisma = new PrismaClient();

async function main() {
  console.log("🚀 Starting Analytics Collection...");

  try {
    console.log("🔄 Running initial analytics collection...");

    // Run account insights for all accounts
    const accountResult =
      await InsightsCollector.runAccountInsightsForAllAccounts();
    console.log(
      `📊 Account insights: ${accountResult.success}/${accountResult.total} successful`
    );

    // Run hotspot analysis for all accounts
    const hotspotResult =
      await HotspotAnalyzer.runHotspotAnalysisForAllAccounts();
    console.log(
      `🔥 Hotspot analysis: ${hotspotResult.success}/${hotspotResult.total} successful`
    );

    console.log("✅ Analytics collection completed successfully!");

    await prisma.$disconnect();
    process.exit(0);
  } catch (error) {
    console.error("💥 Failed to run analytics collection:", error);
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
