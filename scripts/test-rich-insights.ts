#!/usr/bin/env tsx

/**
 * Script to test rich insights API endpoint
 * Usage: npm run test:rich-insights
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function testRichInsights() {
  try {
    console.log("🧪 Testing rich insights API...\n");

    // Get a published post with analytics and rawInsights
    const postWithAnalytics = await prisma.post.findFirst({
      where: {
        status: "PUBLISHED",
        postSocialAccounts: {
          some: {
            analytics: {
              some: {
                rawInsights: { not: null },
              },
            },
          },
        },
      },
      include: {
        postSocialAccounts: {
          include: {
            socialAccount: true,
            analytics: {
              where: {
                rawInsights: { not: null },
              },
              orderBy: { recordedAt: "desc" },
              take: 1,
            },
          },
        },
      },
    });

    if (!postWithAnalytics || !postWithAnalytics.postSocialAccounts) {
      console.log("❌ No published posts with rawInsights found");
      return;
    }

    console.log(`✅ Found post: ${postWithAnalytics.id}`);
    console.log(`📝 Content: ${postWithAnalytics.content.substring(0, 50)}...`);

    // Helper function to extract rich insights from rawInsights
    const extractRichInsights = (rawInsights: any[]) => {
      const insights: Record<string, any> = {};

      rawInsights.forEach((insight) => {
        const value = insight.values?.[0]?.value || 0;
        insights[insight.name] = value;
      });

      return {
        // Basic metrics
        impressions: insights.post_impressions || 0,
        impressionsUnique: insights.post_impressions_unique || 0,
        impressionsPaid: insights.post_impressions_paid || 0,
        impressionsOrganic: insights.post_impressions_organic || 0,
        clicks: insights.post_clicks || 0,

        // Detailed reactions
        reactions: {
          like: insights.post_reactions_like_total || 0,
          love: insights.post_reactions_love_total || 0,
          wow: insights.post_reactions_wow_total || 0,
          haha: insights.post_reactions_haha_total || 0,
          sad: insights.post_reactions_sorry_total || 0,
          angry: insights.post_reactions_anger_total || 0,
        },

        // Engagement breakdown
        engagementMetrics: {
          totalReactions:
            (insights.post_reactions_like_total || 0) +
            (insights.post_reactions_love_total || 0) +
            (insights.post_reactions_wow_total || 0) +
            (insights.post_reactions_haha_total || 0) +
            (insights.post_reactions_sorry_total || 0) +
            (insights.post_reactions_anger_total || 0),
          impressionsPaidVsOrganic: {
            paid: insights.post_impressions_paid || 0,
            organic: insights.post_impressions_organic || 0,
            total: insights.post_impressions || 0,
          },
        },
      };
    };

    // Process each platform
    console.log("\n📊 Rich Insights Analysis:");
    console.log("═".repeat(60));

    postWithAnalytics.postSocialAccounts.forEach((psa: any) => {
      if (psa.analytics.length === 0) return;

      const latestAnalytics = psa.analytics[0];
      const rawInsights = latestAnalytics.rawInsights as any[];

      if (!rawInsights || rawInsights.length === 0) {
        console.log(
          `\n🎯 ${psa.socialAccount.platform} (${psa.socialAccount.name})`
        );
        console.log("   ❌ No rawInsights data available");
        return;
      }

      console.log(
        `\n🎯 ${psa.socialAccount.platform} (${psa.socialAccount.name})`
      );
      console.log(
        `   📅 Last Updated: ${latestAnalytics.recordedAt.toLocaleString()}`
      );
      console.log(`   📊 Raw Insights Count: ${rawInsights.length}`);

      // Extract rich insights
      const richInsights = extractRichInsights(rawInsights);

      console.log(`\n   📈 Rich Insights:`);
      console.log(
        `     Total Impressions: ${richInsights.impressions.toLocaleString()}`
      );
      console.log(
        `     Unique Impressions: ${richInsights.impressionsUnique.toLocaleString()}`
      );
      console.log(
        `     Organic Impressions: ${richInsights.impressionsOrganic.toLocaleString()}`
      );
      console.log(
        `     Paid Impressions: ${richInsights.impressionsPaid.toLocaleString()}`
      );
      console.log(`     Post Clicks: ${richInsights.clicks.toLocaleString()}`);

      console.log(`\n   💗 Detailed Reactions:`);
      console.log(`     👍 Like: ${richInsights.reactions.like}`);
      console.log(`     ❤️ Love: ${richInsights.reactions.love}`);
      console.log(`     😮 Wow: ${richInsights.reactions.wow}`);
      console.log(`     😂 Haha: ${richInsights.reactions.haha}`);
      console.log(`     😢 Sad: ${richInsights.reactions.sad}`);
      console.log(`     😠 Angry: ${richInsights.reactions.angry}`);
      console.log(
        `     📊 Total Reactions: ${richInsights.engagementMetrics.totalReactions}`
      );

      if (richInsights.impressions > 0) {
        const organicPercent = Math.round(
          (richInsights.impressionsOrganic / richInsights.impressions) * 100
        );
        const paidPercent = Math.round(
          (richInsights.impressionsPaid / richInsights.impressions) * 100
        );
        console.log(`\n   📊 Impressions Breakdown:`);
        console.log(
          `     🌱 Organic: ${organicPercent}% (${richInsights.impressionsOrganic.toLocaleString()})`
        );
        console.log(
          `     💰 Paid: ${paidPercent}% (${richInsights.impressionsPaid.toLocaleString()})`
        );

        if (richInsights.impressionsUnique > 0) {
          const frequency = (
            richInsights.impressions / richInsights.impressionsUnique
          ).toFixed(1);
          console.log(
            `     🔄 Frequency: ${frequency}x (avg views per person)`
          );
        }
      }

      // Show available raw insights metrics
      console.log(`\n   🔍 Available Raw Metrics:`);
      rawInsights.forEach((insight, index) => {
        const value = insight.values?.[0]?.value || 0;
        console.log(
          `     ${index + 1}. ${insight.name}: ${value.toLocaleString()}`
        );
      });
    });

    console.log(`\n✅ Rich insights test completed!`);
    console.log(
      `🌐 Test in frontend: http://localhost:3000/posts/${postWithAnalytics.id}`
    );
  } catch (error: any) {
    console.error("❌ Error testing rich insights:", error.message);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testRichInsights().catch(console.error);
