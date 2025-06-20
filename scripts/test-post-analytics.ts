#!/usr/bin/env tsx

/**
 * Test Script for Post Analytics Collection
 *
 * This script tests the new post analytics collection system by:
 * 1. Finding published posts
 * 2. Collecting analytics for them
 * 3. Displaying the results
 */

import { PrismaClient } from "@prisma/client";
import { RealSocialAnalyticsService } from "../src/lib/services/social-analytics/real-analytics-service";

const prisma = new PrismaClient();

async function testPostAnalyticsCollection() {
  try {
    console.log("🧪 Testing Post Analytics Collection System");
    console.log("=".repeat(50));

    const analyticsService = new RealSocialAnalyticsService(prisma);

    // 1. Find published posts
    console.log("\n📋 Finding published posts...");
    const publishedPosts = await prisma.post.findMany({
      where: {
        status: "PUBLISHED",
        publishedAt: { not: null },
        postSocialAccounts: {
          some: {
            status: "PUBLISHED",
            platformPostId: { not: null },
          },
        },
      },
      include: {
        postSocialAccounts: {
          include: {
            socialAccount: true,
            analytics: {
              orderBy: { recordedAt: "desc" },
              take: 1,
            },
          },
        },
        team: true,
      },
      take: 5, // Test with first 5 posts
      orderBy: { publishedAt: "desc" },
    });

    console.log(`✅ Found ${publishedPosts.length} published posts`);

    if (publishedPosts.length === 0) {
      console.log(
        "❌ No published posts found. Please publish some posts first."
      );
      return;
    }

    // 2. Test individual post analytics collection
    console.log("\n📊 Testing individual post analytics collection...");

    for (const post of publishedPosts) {
      console.log(
        `\n🔄 Testing post: ${post.id} (${post.content.substring(0, 50)}...)`
      );
      console.log(`   Team: ${post.team.name}`);
      console.log(`   Published: ${post.publishedAt}`);
      console.log(`   Platforms: ${post.postSocialAccounts.length}`);

      // Show current analytics status
      const platformsWithAnalytics = post.postSocialAccounts.filter(
        (psa) => psa.analytics.length > 0
      ).length;
      console.log(
        `   Current analytics coverage: ${platformsWithAnalytics}/${post.postSocialAccounts.length} platforms`
      );

      try {
        const result = await analyticsService.collectPostAnalytics(post.id);

        console.log(`   📈 Collection result:`);
        console.log(`     Success: ${result.success}`);
        console.log(`     Results: ${result.results.length}`);
        console.log(`     Errors: ${result.errors.length}`);

        // Show platform-specific results
        for (const platformResult of result.results) {
          if (platformResult.success && platformResult.data) {
            console.log(
              `     ✅ ${platformResult.data.platform}: ${platformResult.data.views} views, ${platformResult.data.engagement}% engagement`
            );
          } else if (platformResult.error) {
            console.log(
              `     ❌ ${platformResult.error.platform}: ${platformResult.error.message}`
            );
          }
        }

        // Show errors
        for (const error of result.errors) {
          console.log(`     ⚠️  ${error.platform}: ${error.message}`);
        }
      } catch (error: any) {
        console.log(`   ❌ Collection failed: ${error.message}`);
      }

      // Small delay between posts
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    // 3. Test batch analytics collection
    console.log("\n📦 Testing batch analytics collection...");

    const postIds = publishedPosts.slice(0, 3).map((p) => p.id); // Test with first 3 posts
    console.log(`🔄 Testing batch collection for ${postIds.length} posts...`);

    try {
      const batchResult = await analyticsService.collectBatchAnalytics(postIds);

      console.log(`📈 Batch collection result:`);
      console.log(`  Total posts: ${batchResult.totalPosts}`);
      console.log(`  Success count: ${batchResult.successCount}`);
      console.log(`  Error count: ${batchResult.errorCount}`);
      console.log(`  Errors: ${batchResult.errors.length}`);

      // Show platform results
      Object.entries(batchResult.platformResults).forEach(
        ([platform, result]) => {
          if (result.totalRequests > 0) {
            console.log(`  ${platform}:`);
            console.log(`    Requests: ${result.totalRequests}`);
            console.log(`    Success: ${result.successCount}`);
            console.log(`    Errors: ${result.errorCount}`);
            console.log(`    Rate limited: ${result.rateLimitHit}`);
          }
        }
      );
    } catch (error: any) {
      console.log(`❌ Batch collection failed: ${error.message}`);
    }

    // 4. Test stored analytics retrieval
    console.log("\n💾 Testing stored analytics retrieval...");

    const testPost = publishedPosts[0];
    try {
      const storedResult = await analyticsService.getStoredAnalytics(
        testPost.id
      );

      if (storedResult.success && storedResult.data) {
        console.log(`✅ Retrieved stored analytics for post ${testPost.id}`);
        console.log(`   Platforms: ${storedResult.data.platforms.length}`);

        for (const platform of storedResult.data.platforms) {
          console.log(
            `   ${platform.platform}: ${platform.overview.views} views, ${platform.overview.engagement}% engagement`
          );
        }
      } else {
        console.log(
          `❌ Failed to retrieve stored analytics: ${storedResult.error}`
        );
      }
    } catch (error: any) {
      console.log(`❌ Stored analytics retrieval failed: ${error.message}`);
    }

    // 5. Show final summary
    console.log("\n📊 Final Analytics Summary");
    console.log("=".repeat(30));

    const finalPosts = await prisma.post.findMany({
      where: {
        id: { in: publishedPosts.map((p) => p.id) },
      },
      include: {
        postSocialAccounts: {
          include: {
            analytics: {
              orderBy: { recordedAt: "desc" },
              take: 1,
            },
          },
        },
      },
    });

    let totalPlatforms = 0;
    let platformsWithAnalytics = 0;

    for (const post of finalPosts) {
      totalPlatforms += post.postSocialAccounts.length;
      platformsWithAnalytics += post.postSocialAccounts.filter(
        (psa) => psa.analytics.length > 0
      ).length;
    }

    const coveragePercentage =
      totalPlatforms > 0
        ? Math.round((platformsWithAnalytics / totalPlatforms) * 100)
        : 0;

    console.log(`Posts tested: ${finalPosts.length}`);
    console.log(`Total platforms: ${totalPlatforms}`);
    console.log(`Platforms with analytics: ${platformsWithAnalytics}`);
    console.log(`Coverage: ${coveragePercentage}%`);

    console.log("\n✅ Post Analytics Collection Test Completed!");
  } catch (error) {
    console.error("❌ Test failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
if (require.main === module) {
  testPostAnalyticsCollection()
    .then(() => {
      console.log("\n🎉 Test completed successfully!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n💥 Test failed:", error);
      process.exit(1);
    });
}

export { testPostAnalyticsCollection };
