#!/usr/bin/env tsx

/**
 * Test script to verify date range filtering improvements
 * Tests the updated analytics database queries with different date ranges
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function testDateRangeFiltering() {
  console.log("🧪 Testing Date Range Filtering for Analytics\n");

  try {
    // Get a social account to test with
    const socialAccount = await prisma.socialAccount.findFirst({
      include: {
        team: true,
      },
    });

    if (!socialAccount) {
      console.log("❌ No social accounts found. Please create one first.");
      return;
    }

    console.log(
      `📱 Testing with account: ${socialAccount.name} (${socialAccount.platform})`
    );
    console.log(`👥 Team: ${socialAccount.team.name}\n`);

    // Test different date ranges
    const testRanges = [
      { days: 1, label: "Last 1 day" },
      { days: 7, label: "Last 7 days" },
      { days: 30, label: "Last 30 days" },
      { days: 90, label: "Last 90 days" },
    ];

    for (const range of testRanges) {
      console.log(`📊 Testing ${range.label} (${range.days} days):`);

      // Test Account Analytics
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - range.days);

      const accountAnalytics = await prisma.accountAnalytics.findMany({
        where: {
          socialAccountId: socialAccount.id,
          recordedAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        orderBy: { recordedAt: "desc" },
      });

      console.log(`  📈 Account Analytics: ${accountAnalytics.length} records`);

      // Test Post Analytics
      const postAnalytics = await prisma.postAnalytics.findMany({
        where: {
          postSocialAccount: {
            socialAccountId: socialAccount.id,
            post: {
              publishedAt: {
                gte: startDate,
                lte: endDate,
              },
              status: "PUBLISHED",
            },
          },
          recordedAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        include: {
          postSocialAccount: {
            include: {
              post: {
                select: {
                  content: true,
                  publishedAt: true,
                },
              },
            },
          },
        },
      });

      console.log(`  📝 Post Analytics: ${postAnalytics.length} records`);

      // Show sample data if available
      if (accountAnalytics.length > 0) {
        const latest = accountAnalytics[0];
        console.log(
          `    Latest: ${latest.followersCount} followers, ${latest.engagementRate.toFixed(1)}% engagement`
        );
      }

      if (postAnalytics.length > 0) {
        const totalEngagement = postAnalytics.reduce(
          (sum, p) => sum + (p.likes + p.comments + p.shares),
          0
        );
        const avgEngagement = totalEngagement / postAnalytics.length;
        console.log(
          `    Posts: Avg ${avgEngagement.toFixed(1)} engagement per post`
        );
      }

      console.log();
    }

    // Test aggregated metrics calculation
    console.log("🔢 Testing Aggregated Metrics Calculation:");

    const days = 7;
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const analyticsInRange = await prisma.accountAnalytics.findMany({
      where: {
        socialAccountId: socialAccount.id,
        recordedAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { recordedAt: "desc" },
    });

    if (analyticsInRange.length > 1) {
      // Calculate averages like the updated query does
      const totalRecords = analyticsInRange.length;
      const totals = analyticsInRange.reduce(
        (acc, record) => ({
          followers: acc.followers + record.followersCount,
          engagement: acc.engagement + record.engagementRate,
          reach: acc.reach + (record.avgReachPerPost || 0),
        }),
        { followers: 0, engagement: 0, reach: 0 }
      );

      const avgEngagement = totals.engagement / totalRecords;
      const avgReach = totals.reach / totalRecords;

      console.log(`  📊 ${totalRecords} records found in last ${days} days`);
      console.log(`  📈 Average engagement: ${avgEngagement.toFixed(2)}%`);
      console.log(
        `  📍 Average reach: ${Math.round(avgReach).toLocaleString()}`
      );
    } else {
      console.log(
        `  📊 Only ${analyticsInRange.length} record(s) found in last ${days} days`
      );
    }

    // Test growth comparison
    console.log("\n📈 Testing Growth Comparison:");

    const currentPeriodEnd = new Date();
    const currentPeriodStart = new Date();
    currentPeriodStart.setDate(currentPeriodStart.getDate() - 7);

    const previousPeriodStart = new Date();
    previousPeriodStart.setDate(previousPeriodStart.getDate() - 14);
    const previousPeriodEnd = new Date();
    previousPeriodEnd.setDate(previousPeriodEnd.getDate() - 7);

    const [currentData, previousData] = await Promise.all([
      prisma.accountAnalytics.findFirst({
        where: {
          socialAccountId: socialAccount.id,
          recordedAt: {
            gte: currentPeriodStart,
            lte: currentPeriodEnd,
          },
        },
        orderBy: { recordedAt: "desc" },
      }),
      prisma.accountAnalytics.findFirst({
        where: {
          socialAccountId: socialAccount.id,
          recordedAt: {
            gte: previousPeriodStart,
            lte: previousPeriodEnd,
          },
        },
        orderBy: { recordedAt: "desc" },
      }),
    ]);

    if (currentData && previousData) {
      const followerGrowth =
        currentData.followersCount - previousData.followersCount;
      const followerGrowthPercent =
        (followerGrowth / previousData.followersCount) * 100;

      console.log(
        `  👥 Current followers: ${currentData.followersCount.toLocaleString()}`
      );
      console.log(
        `  👥 Previous followers: ${previousData.followersCount.toLocaleString()}`
      );
      console.log(
        `  📊 Growth: ${followerGrowth > 0 ? "+" : ""}${followerGrowth} (${followerGrowthPercent > 0 ? "+" : ""}${followerGrowthPercent.toFixed(1)}%)`
      );
    } else {
      console.log("  ❌ Insufficient data for growth comparison");
    }

    console.log("\n✅ Date Range Filtering Test Complete!");
  } catch (error) {
    console.error("❌ Test failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testDateRangeFiltering().catch(console.error);
