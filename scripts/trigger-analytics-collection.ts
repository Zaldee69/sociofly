#!/usr/bin/env tsx

import { PrismaClient } from "@prisma/client";
import { SocialSyncService } from "../src/lib/services/analytics/core/social-sync-service";
import { HotspotAnalyzer } from "../src/lib/services/analytics/hotspots/hotspot-analyzer";

const prisma = new PrismaClient();

async function main() {
  const args = process.argv.slice(2);
  const teamId = args[0];

  if (!teamId) {
    console.log("Usage: npm run trigger-analytics <teamId>");
    console.log("   or: npm run trigger-analytics all");
    process.exit(1);
  }

  try {
    if (teamId === "all") {
      console.log("🚀 Triggering analytics collection for all accounts...");

      // Get all social accounts
      const accounts = await prisma.socialAccount.findMany({
        select: { id: true, name: true, platform: true, teamId: true },
      });

      console.log(`📊 Found ${accounts.length} accounts to process`);

      const syncService = new SocialSyncService();
      let success = 0;
      let failed = 0;

      for (const account of accounts) {
        try {
          await syncService.performIncrementalSync({
            accountId: account.id,
            teamId: account.teamId,
            platform: account.platform,
          });
          success++;
        } catch (error) {
          failed++;
        }
      }

      // Run hotspot analysis for all accounts
      const hotspotResult =
        await HotspotAnalyzer.runHotspotAnalysisForAllAccounts();
      console.log(
        `🔥 Hotspot analysis: ${hotspotResult.success}/${hotspotResult.total} successful`
      );

      console.log(
        `✅ Analytics collection completed: ${success}/${accounts.length} successful, ${failed} failed`
      );
    } else {
      console.log(`🚀 Triggering analytics collection for team: ${teamId}`);

      // Get team's social accounts
      const accounts = await prisma.socialAccount.findMany({
        where: { teamId },
        select: { id: true, name: true, platform: true },
      });

      if (accounts.length === 0) {
        console.log("❌ No social accounts found for this team");
        process.exit(1);
      }

      console.log(`📊 Found ${accounts.length} accounts to process`);

      let success = 0;
      let failed = 0;

      for (const account of accounts) {
        try {
          console.log(`Processing ${account.name} (${account.platform})...`);

          const syncService = new SocialSyncService();

          // Use incremental sync for data collection
          await syncService.performIncrementalSync({
            accountId: account.id,
            teamId: teamId,
            platform: account.platform,
          });

          // Fetch heatmap data
          await HotspotAnalyzer.fetchInitialHeatmapData(account.id);

          console.log(`✅ Completed analytics for ${account.name}`);
          success++;
        } catch (error) {
          console.error(`❌ Failed analytics for ${account.name}:`, error);
          failed++;
        }
      }

      console.log(
        `🎯 Analytics collection completed: ${success}/${accounts.length} successful, ${failed} failed`
      );
    }

    await prisma.$disconnect();
    process.exit(0);
  } catch (error) {
    console.error("💥 Failed to trigger analytics collection:", error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

main().catch(console.error);
