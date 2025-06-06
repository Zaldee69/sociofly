#!/usr/bin/env tsx

/**
 * Script to test the actual API endpoint response
 * Usage: npm run test:api-endpoint
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function testAPIEndpoint() {
  try {
    console.log("🧪 Testing API endpoint response...\n");

    const postId = "cmbkgc0du01ukvx8illmxzhqf";

    // Get post with analytics data (mimicking the API endpoint)
    const post = await prisma.post.findUnique({
      where: { id: postId },
      include: {
        postSocialAccounts: {
          include: {
            socialAccount: true,
            analytics: {
              orderBy: { recordedAt: "desc" },
              take: 30,
            },
          },
        },
      },
    });

    if (!post) {
      console.log("❌ Post not found");
      return;
    }

    console.log(`✅ Found post: ${post.id}`);
    console.log(`📝 Content: ${post.content.substring(0, 50)}...`);
    console.log(`🎯 Status: ${post.status}\n`);

    // Helper function to extract rich insights from rawInsights (same as in API)
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

    // Process analytics data for each platform (mimicking API endpoint)
    const analyticsData = post.postSocialAccounts.map((psa) => {
      // FIXED: Prioritize records with rawInsights over just latest
      const recordWithRawInsights = psa.analytics.find(
        (analytics) =>
          analytics.rawInsights && (analytics.rawInsights as any[]).length > 0
      );

      const latestAnalytics = psa.analytics[0]; // Most recent data (for basic metrics)

      // Use record with rawInsights for rich insights, latest for basic metrics
      const analyticsForRichInsights = recordWithRawInsights || latestAnalytics;
      const analyticsForBasicMetrics = latestAnalytics;

      console.log(
        `\n🔍 Platform: ${psa.socialAccount.platform} (${psa.socialAccount.name})`
      );
      console.log(`   Analytics records: ${psa.analytics.length}`);

      if (analyticsForBasicMetrics) {
        console.log(
          `   Latest record: ${analyticsForBasicMetrics.recordedAt.toLocaleString()}`
        );
        console.log(
          `   Latest rawInsights exists: ${!!analyticsForBasicMetrics.rawInsights}`
        );
      }

      if (recordWithRawInsights) {
        console.log(
          `   Record WITH rawInsights: ${recordWithRawInsights.recordedAt.toLocaleString()}`
        );
        console.log(
          `   rawInsights count: ${(recordWithRawInsights.rawInsights as any[]).length}`
        );
      } else {
        console.log(`   No records with rawInsights found`);
      }

      // Extract rich insights from the record that has rawInsights
      const richInsights = analyticsForRichInsights?.rawInsights
        ? extractRichInsights(analyticsForRichInsights.rawInsights as any[])
        : null;

      console.log(`   Rich insights extracted:`, richInsights ? "YES" : "NO");

      if (richInsights) {
        console.log(`     Impressions: ${richInsights.impressions}`);
        console.log(
          `     Total Reactions: ${richInsights.engagementMetrics.totalReactions}`
        );
        console.log(`     Like reactions: ${richInsights.reactions.like}`);
      }

      return {
        platform: psa.socialAccount.platform,
        socialAccountId: psa.socialAccountId,
        socialAccountName: psa.socialAccount.name,
        overview: analyticsForBasicMetrics
          ? {
              views: analyticsForBasicMetrics.views,
              likes: analyticsForBasicMetrics.likes,
              comments: analyticsForBasicMetrics.comments,
              shares: analyticsForBasicMetrics.shares,
              clicks: analyticsForBasicMetrics.clicks,
              reach: analyticsForBasicMetrics.reach,
              impressions: analyticsForBasicMetrics.impressions,
              engagement: analyticsForBasicMetrics.engagement,
            }
          : {
              views: 0,
              likes: 0,
              comments: 0,
              shares: 0,
              clicks: 0,
              reach: 0,
              impressions: 0,
              engagement: 0,
            },
        richInsights: richInsights || {
          impressions: 0,
          impressionsUnique: 0,
          impressionsPaid: 0,
          impressionsOrganic: 0,
          clicks: 0,
          reactions: { like: 0, love: 0, wow: 0, haha: 0, sad: 0, angry: 0 },
          engagementMetrics: {
            totalReactions: 0,
            impressionsPaidVsOrganic: { paid: 0, organic: 0, total: 0 },
          },
        },
      };
    });

    // Simulate the final API response
    const apiResponse = {
      postId: post.id,
      postStatus: post.status,
      platforms: analyticsData,
    };

    console.log(`\n📊 API Response (like frontend receives):`);
    console.log("═".repeat(70));
    console.log(JSON.stringify(apiResponse, null, 2));

    console.log(`\n✅ API endpoint test completed!`);
  } catch (error: any) {
    console.error("❌ Error testing API endpoint:", error.message);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testAPIEndpoint().catch(console.error);
