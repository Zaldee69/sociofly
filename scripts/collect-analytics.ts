#!/usr/bin/env tsx

/**
 * Script to manually collect real analytics for published posts
 * Usage: npm run analytics:collect
 */

import { PrismaClient } from "@prisma/client";
import { RealSocialAnalyticsService } from "../src/lib/services/social-analytics/real-analytics-service";

const prisma = new PrismaClient();

async function collectAnalytics() {
  try {
    console.log("🚀 Starting real analytics collection...\n");

    const realAnalyticsService = new RealSocialAnalyticsService(prisma);

    // Get all published posts from the last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const publishedPosts = await prisma.postSocialAccount.findMany({
      where: {
        status: "PUBLISHED",
        publishedAt: {
          gte: sevenDaysAgo,
        },
        platformPostId: {
          not: null,
        },
      },
      include: {
        post: {
          select: {
            id: true,
            content: true,
          },
        },
        socialAccount: {
          select: {
            name: true,
            platform: true,
          },
        },
      },
      take: 10, // Limit to prevent overwhelming APIs
    });

    if (publishedPosts.length === 0) {
      console.log("ℹ️ No published posts found to collect analytics for");
      return;
    }

    console.log(
      `📊 Found ${publishedPosts.length} published posts to process\n`
    );

    // Group posts by post ID
    const postGroups = publishedPosts.reduce(
      (acc, psa) => {
        if (!acc[psa.postId]) {
          acc[psa.postId] = {
            postId: psa.postId,
            content: psa.post.content.substring(0, 50) + "...",
            platforms: [],
          };
        }
        acc[psa.postId].platforms.push({
          platform: psa.socialAccount.platform,
          account: psa.socialAccount.name,
          platformPostId: psa.platformPostId,
        });
        return acc;
      },
      {} as Record<string, any>
    );

    const uniquePostIds = Object.keys(postGroups);

    // Process posts individually with detailed feedback
    let successCount = 0;
    let errorCount = 0;

    for (const postId of uniquePostIds) {
      const postInfo = postGroups[postId];

      console.log(`\n🔄 Processing post: ${postInfo.content}`);
      console.log(
        `   Platforms: ${postInfo.platforms.map((p: any) => `${p.platform} (${p.account})`).join(", ")}`
      );

      try {
        const result = await realAnalyticsService.collectPostAnalytics(postId);

        if (result.success) {
          successCount++;
          console.log(
            `   ✅ Success: Collected analytics for ${result.results.length} platforms`
          );

          // Show basic metrics
          result.results.forEach((res) => {
            if (res.success && res.data) {
              console.log(
                `      📈 ${res.data.platform}: ${res.data.views} views, ${res.data.likes} likes, ${res.data.engagement}% engagement`
              );
            }
          });
        } else {
          errorCount++;
          console.log(`   ❌ Failed: ${result.errors.length} errors`);
          result.errors.forEach((error) => {
            console.log(`      🚨 ${error.platform}: ${error.message}`);
          });
        }

        // Small delay between posts to respect rate limits
        await new Promise((resolve) => setTimeout(resolve, 2000));
      } catch (error: any) {
        errorCount++;
        console.error(`   💥 Exception: ${error.message}`);
      }
    }

    console.log(`\n📊 Collection Summary:`);
    console.log(`   Total posts processed: ${uniquePostIds.length}`);
    console.log(`   Successful: ${successCount}`);
    console.log(`   Failed: ${errorCount}`);
    console.log(
      `   Success rate: ${Math.round((successCount / uniquePostIds.length) * 100)}%`
    );

    if (errorCount > 0) {
      console.log(
        `\n⚠️  Note: Some collections failed. This is expected when:`
      );
      console.log(`   - Social accounts don't have valid credentials stored`);
      console.log(`   - Platform APIs are rate-limited`);
      console.log(`   - Posts don't have platform post IDs`);
    }
  } catch (error: any) {
    console.error("💥 Fatal error during analytics collection:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the collection if this script is executed directly
if (require.main === module) {
  collectAnalytics()
    .then(() => {
      console.log("\n✨ Analytics collection completed!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Analytics collection failed:", error);
      process.exit(1);
    });
}
