#!/usr/bin/env tsx

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function debugPostAnalytics() {
  console.log("🔍 Debugging post analytics data...\n");

  try {
    // Get all posts with their analytics
    const posts = await prisma.postSocialAccount.findMany({
      include: {
        post: {
          select: {
            id: true,
            content: true,
            publishedAt: true,
            status: true,
            mediaUrls: true,
          },
        },
        socialAccount: {
          select: {
            id: true,
            platform: true,
            name: true,
          },
        },
        analytics: {
          orderBy: { recordedAt: "desc" },
        },
      },
    });

    console.log(`📊 Total PostSocialAccount records: ${posts.length}`);

    const publishedPosts = posts.filter((p) => p.post.status === "PUBLISHED");
    console.log(`📚 Published posts: ${publishedPosts.length}`);

    const postsWithAnalytics = posts.filter((p) => p.analytics.length > 0);
    console.log(`📈 Posts with analytics: ${postsWithAnalytics.length}\n`);

    // Show detailed breakdown
    console.log("📋 Detailed breakdown:");
    console.log("=".repeat(80));

    posts.forEach((psa, index) => {
      console.log(
        `\n${index + 1}. Post: ${psa.post.content.substring(0, 60)}...`
      );
      console.log(`   Status: ${psa.post.status}`);
      console.log(
        `   Platform: ${psa.socialAccount.platform} (${psa.socialAccount.name})`
      );
      console.log(`   Published: ${psa.post.publishedAt}`);
      console.log(`   Analytics records: ${psa.analytics.length}`);

      if (psa.analytics.length > 0) {
        const latest = psa.analytics[0];
        console.log(`   Latest analytics:`);
        console.log(
          `     - Likes: ${latest.likes}, Comments: ${latest.comments}, Shares: ${latest.shares}`
        );
        console.log(
          `     - Reach: ${latest.reach}, Impressions: ${latest.impressions}`
        );
        console.log(
          `     - Engagement: ${latest.engagement}%, CTR: ${latest.ctr}%`
        );
        console.log(`     - Content Format: ${latest.contentFormat || "NULL"}`);
        console.log(`     - Recorded: ${latest.recordedAt}`);
      } else {
        console.log(`   ❌ No analytics data`);
      }
    });

    // Check for specific issues
    console.log("\n🔍 Checking for common issues:");
    console.log("=".repeat(50));

    const analyticsWithZeroData = await prisma.postAnalytics.findMany({
      where: {
        AND: [{ reach: 0 }, { impressions: 0 }, { likes: 0 }, { comments: 0 }],
      },
      include: {
        postSocialAccount: {
          include: {
            post: { select: { content: true } },
            socialAccount: { select: { platform: true } },
          },
        },
      },
    });

    console.log(
      `📊 Analytics records with all zero values: ${analyticsWithZeroData.length}`
    );

    if (analyticsWithZeroData.length > 0) {
      analyticsWithZeroData.forEach((analytics, index) => {
        console.log(
          `   ${index + 1}. ${analytics.postSocialAccount.post.content.substring(0, 40)}... (${analytics.postSocialAccount.socialAccount.platform})`
        );
      });
    }

    // Check contentFormat distribution
    const formatDistribution = await prisma.postAnalytics.groupBy({
      by: ["contentFormat"],
      _count: {
        contentFormat: true,
      },
    });

    console.log("\n📊 Content Format Distribution:");
    formatDistribution.forEach((format) => {
      console.log(
        `   ${format.contentFormat || "NULL"}: ${format._count.contentFormat} records`
      );
    });
  } catch (error) {
    console.error("❌ Error debugging post analytics:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the debug
if (require.main === module) {
  debugPostAnalytics()
    .then(() => {
      console.log("\n✅ Debug completed");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Debug failed:", error);
      process.exit(1);
    });
}

export { debugPostAnalytics };
