#!/usr/bin/env tsx

/**
 * Script to test analytics data retrieval for frontend
 * Usage: npm run test:analytics
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function testAnalytics() {
  try {
    console.log("🧪 Testing analytics data for frontend...\n");

    // Get a published post with analytics
    const postWithAnalytics = await prisma.post.findFirst({
      where: {
        status: "PUBLISHED",
        postSocialAccounts: {
          some: {
            analytics: {
              some: {},
            },
          },
        },
      },
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

    if (!postWithAnalytics) {
      console.log("❌ No published posts with analytics found");
      return;
    }

    console.log(`✅ Found post: ${postWithAnalytics.id}`);
    console.log(`📝 Content: ${postWithAnalytics.content.substring(0, 50)}...`);
    console.log(
      `📅 Created: ${postWithAnalytics.createdAt.toLocaleDateString()}`
    );
    console.log(`🎯 Status: ${postWithAnalytics.status}\n`);

    // Process analytics data like the frontend endpoint
    const analyticsData = postWithAnalytics.postSocialAccounts.map((psa) => {
      const latestAnalytics = psa.analytics[0];

      // Create 7-day chart data
      const chartData = [];
      const today = new Date();

      for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split("T")[0];

        const dayAnalytics = psa.analytics.find(
          (analytics) =>
            analytics.recordedAt.toISOString().split("T")[0] === dateStr
        );

        chartData.push({
          date: new Date(date).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          }),
          views: dayAnalytics?.views || 0,
          likes: dayAnalytics?.likes || 0,
          comments: dayAnalytics?.comments || 0,
          shares: dayAnalytics?.shares || 0,
          engagement: dayAnalytics?.engagement || 0,
        });
      }

      return {
        platform: psa.socialAccount.platform,
        accountName: psa.socialAccount.name,
        overview: latestAnalytics
          ? {
              views: latestAnalytics.views,
              likes: latestAnalytics.likes,
              comments: latestAnalytics.comments,
              shares: latestAnalytics.shares,
              clicks: latestAnalytics.clicks,
              reach: latestAnalytics.reach,
              impressions: latestAnalytics.impressions,
              engagement: latestAnalytics.engagement,
            }
          : null,
        historical: chartData,
        totalAnalyticsRecords: psa.analytics.length,
      };
    });

    // Display results
    console.log("📊 Analytics Summary by Platform:");
    console.log("═".repeat(50));

    analyticsData.forEach((platform) => {
      console.log(`\n🎯 ${platform.platform} (${platform.accountName})`);
      console.log(`   Analytics Records: ${platform.totalAnalyticsRecords}`);

      if (platform.overview) {
        console.log(`   Latest Metrics:`);
        console.log(`     Views: ${platform.overview.views.toLocaleString()}`);
        console.log(`     Likes: ${platform.overview.likes.toLocaleString()}`);
        console.log(`     Comments: ${platform.overview.comments}`);
        console.log(`     Engagement: ${platform.overview.engagement}%`);
        console.log(`     Reach: ${platform.overview.reach.toLocaleString()}`);
      } else {
        console.log(`   ❌ No analytics data available`);
      }

      console.log(`   Historical Data (7 days):`);
      platform.historical.forEach((day) => {
        console.log(
          `     ${day.date}: ${day.views} views, ${day.likes} likes, ${day.engagement}% eng`
        );
      });
    });

    // Simulate frontend response
    const frontendResponse = {
      postId: postWithAnalytics.id,
      postStatus: postWithAnalytics.status,
      platforms: analyticsData,
    };

    console.log(`\n🖥️ Frontend Response Structure:`);
    console.log("═".repeat(50));
    console.log(JSON.stringify(frontendResponse, null, 2));

    console.log(`\n✅ Analytics test completed successfully!`);
    console.log(
      `📝 You can test this post in frontend: /posts/${postWithAnalytics.id}`
    );
  } catch (error: any) {
    console.error("❌ Error testing analytics:", error.message);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testAnalytics().catch(console.error);
