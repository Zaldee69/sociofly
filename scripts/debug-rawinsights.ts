#!/usr/bin/env tsx

/**
 * Script to debug rawInsights data
 * Usage: npm run debug:rawinsights
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function debugRawInsights() {
  try {
    console.log("🔍 Debugging rawInsights data...\n");

    const postId = "cmbke6am401fsvx8iulwhw0pz";

    // Get ALL analytics for this post
    const analytics = await prisma.postAnalytics.findMany({
      where: {
        postSocialAccount: {
          postId: postId,
        },
      },
      include: {
        postSocialAccount: {
          include: {
            socialAccount: true,
          },
        },
      },
      orderBy: { recordedAt: "desc" },
    });

    console.log(`📊 Found ${analytics.length} analytics records\n`);

    // Group by platform and analyze
    const platforms = analytics.reduce(
      (acc, record) => {
        const platform = record.postSocialAccount.socialAccount.platform;
        const accountName = record.postSocialAccount.socialAccount.name;
        const key = `${platform}-${accountName}`;

        if (!acc[key]) {
          acc[key] = {
            platform,
            accountName,
            records: [],
          };
        }

        acc[key].records.push({
          id: record.id,
          recordedAt: record.recordedAt,
          hasRawInsights: !!record.rawInsights,
          rawInsightsCount: record.rawInsights
            ? (record.rawInsights as any[]).length
            : 0,
          basicMetrics: {
            views: record.views,
            likes: record.likes,
            comments: record.comments,
            reach: record.reach,
            impressions: record.impressions,
          },
        });

        return acc;
      },
      {} as Record<string, any>
    );

    // Display analysis
    Object.values(platforms).forEach((platform: any) => {
      console.log(`🎯 ${platform.platform} (${platform.accountName})`);
      console.log(`   Total records: ${platform.records.length}`);

      const withRawInsights = platform.records.filter(
        (r: any) => r.hasRawInsights
      );
      const withoutRawInsights = platform.records.filter(
        (r: any) => !r.hasRawInsights
      );

      console.log(`   With rawInsights: ${withRawInsights.length}`);
      console.log(`   Without rawInsights: ${withoutRawInsights.length}`);

      if (withRawInsights.length > 0) {
        console.log(`   Latest with rawInsights:`);
        const latest = withRawInsights[0]; // Already sorted desc
        console.log(`     Date: ${latest.recordedAt.toLocaleString()}`);
        console.log(`     rawInsights count: ${latest.rawInsightsCount}`);
        console.log(
          `     Basic metrics: ${JSON.stringify(latest.basicMetrics)}`
        );
      }

      if (withoutRawInsights.length > 0) {
        console.log(`   Latest without rawInsights:`);
        const latest = withoutRawInsights[0];
        console.log(`     Date: ${latest.recordedAt.toLocaleString()}`);
        console.log(
          `     Basic metrics: ${JSON.stringify(latest.basicMetrics)}`
        );
      }

      console.log(`   All records (newest first):`);
      platform.records.forEach((record: any, index: number) => {
        console.log(
          `     ${index + 1}. ${record.recordedAt.toLocaleString()} - rawInsights: ${record.hasRawInsights ? `✅ (${record.rawInsightsCount})` : "❌"}`
        );
      });

      console.log(""); // Empty line between platforms
    });

    // Check what happens if we use the record WITH rawInsights
    console.log(`🔬 Testing with records that HAVE rawInsights:\n`);

    for (const [key, platform] of Object.entries(platforms) as [
      string,
      any,
    ][]) {
      const recordsWithRawInsights = platform.records.filter(
        (r: any) => r.hasRawInsights
      );

      if (recordsWithRawInsights.length > 0) {
        const latestWithRawInsights = recordsWithRawInsights[0];

        // Get the full record
        const fullRecord = await prisma.postAnalytics.findUnique({
          where: { id: latestWithRawInsights.id },
        });

        if (fullRecord?.rawInsights) {
          console.log(
            `✅ ${platform.platform} (${platform.accountName}) - Testing extraction:`
          );

          const rawInsights = fullRecord.rawInsights as any[];
          const insights: Record<string, any> = {};

          rawInsights.forEach((insight) => {
            const value = insight.values?.[0]?.value || 0;
            insights[insight.name] = value;
          });

          const extracted = {
            impressions: insights.post_impressions || 0,
            impressionsUnique: insights.post_impressions_unique || 0,
            totalReactions:
              (insights.post_reactions_like_total || 0) +
              (insights.post_reactions_love_total || 0) +
              (insights.post_reactions_wow_total || 0) +
              (insights.post_reactions_haha_total || 0) +
              (insights.post_reactions_sorry_total || 0) +
              (insights.post_reactions_anger_total || 0),
          };

          console.log(`   Extracted data:`, extracted);
          console.log("");
        }
      }
    }

    console.log(
      `\n💡 SOLUTION: The API endpoint should use records WITH rawInsights, not just the latest record!`
    );
  } catch (error: any) {
    console.error("❌ Error debugging rawInsights:", error.message);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the debug
debugRawInsights().catch(console.error);
