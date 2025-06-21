#!/usr/bin/env tsx

import { PrismaClient } from "@prisma/client";
import { AnalyticsMasterService } from "../src/lib/services/analytics/core/analytics-master.service";

const prisma = new PrismaClient();

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const targetId = args[1];

  if (!command) {
    console.log("🚀 Complete Analytics Collection Tool");
    console.log("");
    console.log("Usage:");
    console.log(
      "  npm run analytics:complete all                    # Run for all accounts"
    );
    console.log(
      "  npm run analytics:complete account <accountId>    # Run for specific account"
    );
    console.log(
      "  npm run analytics:complete team <teamId>          # Run for specific team"
    );
    console.log(
      "  npm run analytics:complete quick [accountId]      # Quick run (insights + hotspots only)"
    );
    console.log(
      "  npm run analytics:complete full [accountId]       # Full run (all components)"
    );
    console.log(
      "  npm run analytics:complete scheduled              # Scheduled run (rate limited)"
    );
    console.log(
      "  npm run analytics:complete status                 # Show recent run history"
    );
    console.log("");
    process.exit(1);
  }

  try {
    let result;

    switch (command) {
      case "all":
        console.log("🚀 Running complete analytics for all accounts...");
        result = await AnalyticsMasterService.runCompleteAnalytics();
        break;

      case "account":
        if (!targetId) {
          console.log("❌ Account ID is required");
          process.exit(1);
        }
        console.log(`🚀 Running complete analytics for account ${targetId}...`);
        result = await AnalyticsMasterService.runAnalyticsForAccount(targetId);
        break;

      case "team":
        if (!targetId) {
          console.log("❌ Team ID is required");
          process.exit(1);
        }
        console.log(`🚀 Running complete analytics for team ${targetId}...`);
        result = await AnalyticsMasterService.runAnalyticsForTeam(targetId);
        break;

      case "quick":
        console.log(
          `🚀 Running quick analytics${targetId ? ` for account ${targetId}` : " for all accounts"}...`
        );
        result = await AnalyticsMasterService.runQuickAnalytics(targetId);
        break;

      case "full":
        console.log(
          `🚀 Running full analytics${targetId ? ` for account ${targetId}` : " for all accounts"}...`
        );
        result = await AnalyticsMasterService.runFullAnalytics(targetId);
        break;

      case "scheduled":
        console.log("🚀 Running scheduled analytics (rate limited)...");
        result = await AnalyticsMasterService.runScheduledAnalytics();
        break;

      case "status":
        console.log("📊 Recent analytics run history:");
        const history = await AnalyticsMasterService.getAnalyticsRunHistory(24);

        if (history.length === 0) {
          console.log("  No recent runs found");
        } else {
          history.forEach((run, index) => {
            const statusIcon =
              run.status === "SUCCESS"
                ? "✅"
                : run.status === "ERROR"
                  ? "❌"
                  : "⚠️";
            console.log(
              `  ${statusIcon} ${run.executedAt.toISOString()} - ${run.status}`
            );
            if (run.message?.result) {
              const r = run.message.result;
              console.log(
                `     📊 Success: ${r.success}, Failed: ${r.failed}, Total: ${r.total}`
              );
              console.log(`     ⏱️  Execution time: ${r.executionTimeMs}ms`);
            }
            if (index < 5) console.log(""); // Add spacing for first 5 entries
          });
        }

        await prisma.$disconnect();
        process.exit(0);

      default:
        console.log(`❌ Unknown command: ${command}`);
        console.log(
          "Use 'npm run analytics:complete' to see available commands"
        );
        process.exit(1);
    }

    // Display results
    if (result) {
      console.log("");
      console.log("🎉 Analytics Collection Results:");
      console.log(
        `📊 Overall: ${result.success} successful, ${result.failed} failed out of ${result.total} total`
      );
      console.log(`⏱️  Execution time: ${result.executionTimeMs}ms`);
      console.log("");
      console.log("📋 Details:");
      console.log(
        `  📈 Insights: ${result.details.insights.success}/${result.details.insights.total} successful`
      );
      console.log(
        `  🔥 Hotspots: ${result.details.hotspots.success}/${result.details.hotspots.total} successful`
      );
      console.log(
        `  📊 Analytics: ${result.details.analytics.success}/${result.details.analytics.total} successful`
      );

      if (result.errors.length > 0) {
        console.log("");
        console.log("❌ Errors:");
        result.errors.forEach((error) => console.log(`  • ${error}`));
      }
    }

    await prisma.$disconnect();
    process.exit(0);
  } catch (error) {
    console.error("💥 Failed to run analytics:", error);
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
