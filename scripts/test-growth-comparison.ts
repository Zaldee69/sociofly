#!/usr/bin/env ts-node

/**
 * Test Growth Comparison functionality
 * This script helps test and debug the Growth Comparison feature
 */

import { PrismaClient } from "@prisma/client";
import { AnalyticsComparisonService } from "../src/lib/services/analytics-comparison.service";

const prisma = new PrismaClient();
const comparisonService = new AnalyticsComparisonService(prisma);

async function main() {
  console.log("🚀 Testing Growth Comparison functionality...\n");

  // Test account ID from your data
  const testAccountId = "cmc1rehtx0006vx3iwena0qli";

  try {
    // 1. Check current records
    console.log("📊 Current analytics records:");
    const currentRecords = await prisma.accountAnalytics.findMany({
      where: { socialAccountId: testAccountId },
      orderBy: { recordedAt: "desc" },
      take: 5,
    });

    console.log(`Found ${currentRecords.length} records`);
    currentRecords.forEach((record, index) => {
      console.log(
        `${index + 1}. ${record.recordedAt.toISOString().split("T")[0]} - ` +
          `Followers: ${record.followersCount}, ` +
          `Engagement: ${record.engagementRate}%, ` +
          `Growth: ${record.followersGrowthPercent || 0}%`
      );
    });

    // 2. Clean duplicates
    console.log("\n🧹 Cleaning duplicate records...");
    const deletedCount =
      await comparisonService.cleanDuplicateRecords(testAccountId);
    console.log(`Cleaned ${deletedCount} duplicate records`);

    // 3. Generate sample data for testing (if no variation exists)
    if (process.env.NODE_ENV !== "production") {
      console.log("\n🧪 Generating sample data for testing...");
      await comparisonService.generateSampleGrowthData(testAccountId, 7);
      console.log("Sample data generated successfully");
    }

    // 4. Test growth summary
    console.log("\n📈 Testing growth summary...");
    const growthSummary = await comparisonService.getAccountComparison(
      testAccountId,
      "week"
    );
    if (growthSummary) {
      console.log("Growth Summary:", {
        followers: `${growthSummary.growth.followersGrowth.percentage.toFixed(2)}% (${growthSummary.growth.followersGrowth.trend})`,
        engagement: `${growthSummary.growth.engagementGrowth.percentage.toFixed(2)}% (${growthSummary.growth.engagementGrowth.trend})`,
        reach: `${growthSummary.growth.reachGrowth.percentage.toFixed(2)}% (${growthSummary.growth.reachGrowth.trend})`,
        posts: `${growthSummary.growth.postsGrowth.percentage.toFixed(2)}% (${growthSummary.growth.postsGrowth.trend})`,
      });
    } else {
      console.log("❌ No growth summary available");
    }

    // 5. Test historical trends
    console.log("\n📊 Testing historical trends...");
    const trends = await comparisonService.getHistoricalTrends(
      testAccountId,
      14
    );
    console.log(`Historical trends:`, {
      followers: trends.followers.length,
      engagement: trends.engagement.length,
      reach: trends.reach.length,
    });

    // 6. Test benchmark data
    console.log("\n🎯 Testing benchmark data...");
    const benchmark = await comparisonService.getBenchmarkData("INSTAGRAM");
    console.log("Benchmark data:", {
      avgEngagementRate: benchmark.avgEngagementRate.toFixed(2) + "%",
      avgFollowerGrowth: benchmark.avgFollowerGrowth.toFixed(2) + "%",
      avgReach: benchmark.avgReach.toFixed(0),
    });

    console.log("\n✅ All tests completed successfully!");
  } catch (error) {
    console.error("❌ Error during testing:", error);
  } finally {
    await prisma.$disconnect();
  }
}

// Helper function to simulate realistic analytics data
async function createTestRecord(
  socialAccountId: string,
  daysAgo: number,
  baseData: {
    followers: number;
    engagement: number;
    posts: number;
    reach: number;
  }
) {
  const recordDate = new Date();
  recordDate.setDate(recordDate.getDate() - daysAgo);

  // Add some variation
  const variation = (Math.random() - 0.5) * 0.2; // +/- 10% variation

  const newData = {
    followersCount: Math.floor(baseData.followers * (1 + variation)),
    mediaCount: Math.floor(baseData.posts * (1 + variation * 0.5)),
    engagementRate: parseFloat(
      (baseData.engagement * (1 + variation)).toFixed(2)
    ),
    avgReachPerPost: Math.floor(baseData.reach * (1 + variation)),
    totalReach: Math.floor(baseData.reach * baseData.posts * (1 + variation)),
    followerGrowth: JSON.stringify([
      Math.floor(variation * baseData.followers),
    ]),

    // Additional fields
    totalFollowers: Math.floor(baseData.followers * (1 + variation)),
    totalPosts: Math.floor(baseData.posts * (1 + variation * 0.5)),
    totalImpressions: Math.floor(
      baseData.reach * baseData.posts * 1.5 * (1 + variation)
    ),
    totalLikes: Math.floor(
      baseData.reach * baseData.posts * 0.1 * (1 + variation)
    ),
    totalComments: Math.floor(
      baseData.reach * baseData.posts * 0.02 * (1 + variation)
    ),
    totalShares: Math.floor(
      baseData.reach * baseData.posts * 0.01 * (1 + variation)
    ),
  };

  // Update comparison fields
  await comparisonService.updateComparisonFields(socialAccountId, newData);

  // Create record
  await prisma.accountAnalytics.create({
    data: {
      socialAccountId,
      ...newData,
      recordedAt: recordDate,
    },
  });

  return newData;
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { main as testGrowthComparison };
