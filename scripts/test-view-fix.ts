import { PrismaClient } from "@prisma/client";
import { SocialSyncService } from "../src/lib/services/analytics/core/social-sync-service";

const prisma = new PrismaClient();

async function testViewFix() {
  console.log("🔍 Testing View Count Fix...");

  try {
    // Get Instagram social account
    const socialAccount = await prisma.socialAccount.findFirst({
      where: {
        platform: "INSTAGRAM",
      },
    });

    if (!socialAccount) {
      console.log("❌ No Instagram social account found");
      return;
    }

    console.log(`📊 Testing with account: ${socialAccount.id}`);

    // Get analytics before sync
    const analyticsBefore = await prisma.postAnalytics.findMany({
      where: {
        postSocialAccount: {
          socialAccountId: socialAccount.id,
        },
      },
      orderBy: {
        recordedAt: "desc",
      },
      take: 3,
      select: {
        id: true,
        views: true,
        reach: true,
        impressions: true,
        rawInsights: true,
        recordedAt: true,
      },
    });

    console.log(
      `\n📊 ANALYTICS BEFORE SYNC (${analyticsBefore.length} records):`
    );
    analyticsBefore.forEach((analytics, index) => {
      console.log(
        `${index + 1}. Views: ${analytics.views}, Reach: ${analytics.reach}, Impressions: ${analytics.impressions}`
      );

      // Try to parse raw insights
      if (analytics.rawInsights) {
        try {
          const rawData = JSON.parse(analytics.rawInsights as string);
          console.log(
            `   Raw data type: ${Array.isArray(rawData) ? "Instagram metrics array" : "Post metadata object"}`
          );

          if (Array.isArray(rawData)) {
            const metrics = rawData.reduce((acc: any, item: any) => {
              if (item.name && item.values && item.values[0]) {
                acc[item.name] = item.values[0].value;
              }
              return acc;
            }, {});
            console.log(
              `   Available metrics: ${Object.keys(metrics).join(", ")}`
            );
            if (metrics.views)
              console.log(`   Instagram views: ${metrics.views}`);
            if (metrics.reach)
              console.log(`   Instagram reach: ${metrics.reach}`);
          } else {
            console.log(
              `   Post metadata keys: ${Object.keys(rawData).join(", ")}`
            );
          }
        } catch (e) {
          console.log(`   Raw data parsing failed`);
        }
      }
    });

    // Run incremental sync
    console.log(`\n🔄 Running incremental sync...`);
    const syncService = new SocialSyncService();

    const syncResult = await syncService.performIncrementalSync({
      accountId: socialAccount.id,
      teamId: socialAccount.teamId,
      platform: socialAccount.platform as any,
      limit: 25,
      priority: "normal",
    });

    console.log(`\n📊 SYNC RESULT:`);
    console.log(`   Success: ${syncResult.success}`);
    console.log(`   Posts processed: ${syncResult.postsProcessed}`);
    console.log(`   Analytics updated: ${syncResult.analyticsUpdated}`);
    console.log(
      `   Errors: ${syncResult.errors.length > 0 ? syncResult.errors.join(", ") : "None"}`
    );
    console.log(`   Execution time: ${syncResult.executionTimeMs}ms`);

    // Get analytics after sync
    const analyticsAfter = await prisma.postAnalytics.findMany({
      where: {
        postSocialAccount: {
          socialAccountId: socialAccount.id,
        },
      },
      orderBy: {
        recordedAt: "desc",
      },
      take: 3,
      select: {
        id: true,
        views: true,
        reach: true,
        impressions: true,
        rawInsights: true,
        recordedAt: true,
      },
    });

    console.log(
      `\n📊 ANALYTICS AFTER SYNC (${analyticsAfter.length} records):`
    );
    analyticsAfter.forEach((analytics, index) => {
      console.log(
        `${index + 1}. Views: ${analytics.views}, Reach: ${analytics.reach}, Impressions: ${analytics.impressions}`
      );

      // Try to parse raw insights
      if (analytics.rawInsights) {
        try {
          const rawData = JSON.parse(analytics.rawInsights as string);

          if (Array.isArray(rawData)) {
            const metrics = rawData.reduce((acc: any, item: any) => {
              if (item.name && item.values && item.values[0]) {
                acc[item.name] = item.values[0].value;
              }
              return acc;
            }, {});

            console.log(`   📋 Instagram API metrics:`);
            if (metrics.views !== undefined)
              console.log(`     - views: ${metrics.views}`);
            if (metrics.reach !== undefined)
              console.log(`     - reach: ${metrics.reach}`);
            if (metrics.impressions !== undefined)
              console.log(`     - impressions: ${metrics.impressions}`);

            // Check for discrepancies
            if (
              metrics.views !== undefined &&
              analytics.views !== metrics.views
            ) {
              console.log(
                `   ⚠️ DISCREPANCY: Our views (${analytics.views}) ≠ Instagram views (${metrics.views})`
              );
            }

            if (
              metrics.reach !== undefined &&
              analytics.reach !== metrics.reach
            ) {
              console.log(
                `   ⚠️ DISCREPANCY: Our reach (${analytics.reach}) ≠ Instagram reach (${metrics.reach})`
              );
            }
          } else if (typeof rawData === "object" && rawData.id) {
            console.log(`   📋 Post metadata (not metrics): ${rawData.id}`);
          }
        } catch (e) {
          console.log(`   Raw data parsing failed`);
        }
      }
    });

    // Summary
    console.log(`\n💡 ANALYSIS SUMMARY:`);
    if (syncResult.analyticsUpdated > 0) {
      console.log(`✅ New analytics data collected`);
      console.log(`🔍 Check the latest analytics above for accuracy`);
      console.log(`📊 Compare "Our views" vs "Instagram views" in raw metrics`);
    } else {
      console.log(`ℹ️ No new analytics collected (may already be up to date)`);
    }

    console.log(`\n🎯 NEXT STEPS:`);
    console.log(`1. Check Instagram dashboard for actual view count`);
    console.log(`2. Compare with "Our views" value above`);
    console.log(`3. If still different, check raw Instagram API metrics`);
    console.log(`4. Verify our mapping logic in UnifiedMetaClient`);
  } catch (error) {
    console.error("❌ Test failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

testViewFix();
