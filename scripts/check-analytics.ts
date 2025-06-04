#!/usr/bin/env tsx

/**
 * Script to check analytics data status in the database
 * Usage: npm run analytics:check
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function checkAnalytics() {
  try {
    console.log("🔍 Checking analytics data status...\n");

    // Check published posts
    const publishedPosts = await prisma.postSocialAccount.findMany({
      where: {
        status: "PUBLISHED",
      },
      include: {
        post: {
          select: {
            id: true,
            content: true,
            createdAt: true,
          },
        },
        socialAccount: {
          select: {
            name: true,
            platform: true,
          },
        },
        analytics: {
          orderBy: { recordedAt: "desc" },
          take: 1,
        },
      },
    });

    console.log(`📊 Found ${publishedPosts.length} published posts\n`);

    if (publishedPosts.length === 0) {
      console.log("ℹ️ No published posts found");
      return;
    }

    // Group by platform
    const platformStats = publishedPosts.reduce(
      (acc, psa) => {
        const platform = psa.socialAccount.platform;
        if (!acc[platform]) {
          acc[platform] = {
            total: 0,
            withAnalytics: 0,
            withoutAnalytics: 0,
            posts: [],
          };
        }

        acc[platform].total++;

        if (psa.analytics.length > 0) {
          acc[platform].withAnalytics++;
          const latest = psa.analytics[0];
          acc[platform].posts.push({
            content: psa.post.content.substring(0, 40) + "...",
            account: psa.socialAccount.name,
            lastAnalytics: latest.recordedAt,
            views: latest.views,
            likes: latest.likes,
            engagement: latest.engagement,
          });
        } else {
          acc[platform].withoutAnalytics++;
        }

        return acc;
      },
      {} as Record<string, any>
    );

    // Display platform breakdown
    console.log("📈 Platform Analytics Summary:");
    console.log(
      "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    );

    Object.entries(platformStats).forEach(
      ([platform, stats]: [string, any]) => {
        const coverage = Math.round((stats.withAnalytics / stats.total) * 100);
        console.log(`\n🎯 ${platform}:`);
        console.log(`   Total posts: ${stats.total}`);
        console.log(`   With analytics: ${stats.withAnalytics} (${coverage}%)`);
        console.log(`   Without analytics: ${stats.withoutAnalytics}`);

        if (stats.posts.length > 0) {
          console.log(`   Recent analytics:`);
          stats.posts.slice(0, 3).forEach((post: any) => {
            console.log(`     📝 ${post.content}`);
            console.log(`        Account: ${post.account}`);
            console.log(
              `        Last data: ${post.lastAnalytics.toLocaleDateString()}`
            );
            console.log(
              `        Metrics: ${post.views} views, ${post.likes} likes, ${post.engagement}% engagement`
            );
          });

          if (stats.posts.length > 3) {
            console.log(`     ... and ${stats.posts.length - 3} more posts`);
          }
        }
      }
    );

    // Overall statistics
    const totalAnalyticsRecords = await prisma.postAnalytics.count();
    const uniquePostsWithAnalytics = await prisma.postAnalytics.groupBy({
      by: ["postSocialAccountId"],
    });

    console.log(`\n📊 Overall Analytics Statistics:`);
    console.log(
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
    );
    console.log(`   Total analytics records: ${totalAnalyticsRecords}`);
    console.log(
      `   Unique posts with analytics: ${uniquePostsWithAnalytics.length}`
    );
    console.log(`   Published posts: ${publishedPosts.length}`);
    console.log(
      `   Analytics coverage: ${Math.round((uniquePostsWithAnalytics.length / publishedPosts.length) * 100)}%`
    );

    // Recent activity
    const recentAnalytics = await prisma.postAnalytics.findMany({
      orderBy: { recordedAt: "desc" },
      take: 5,
      include: {
        postSocialAccount: {
          include: {
            socialAccount: {
              select: { platform: true, name: true },
            },
            post: {
              select: { content: true },
            },
          },
        },
      },
    });

    if (recentAnalytics.length > 0) {
      console.log(`\n⏰ Recent Analytics Activity:`);
      console.log(
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
      );

      recentAnalytics.forEach((analytics, index) => {
        const psa = analytics.postSocialAccount;
        console.log(
          `\n${index + 1}. ${psa.socialAccount.platform} - ${psa.socialAccount.name}`
        );
        console.log(`   Post: ${psa.post.content.substring(0, 50)}...`);
        console.log(`   Recorded: ${analytics.recordedAt.toLocaleString()}`);
        console.log(
          `   Metrics: ${analytics.views} views, ${analytics.likes} likes, ${analytics.engagement}% engagement`
        );
      });
    }

    // Check for posts without platformPostId (can't collect analytics)
    const postsWithoutPlatformId = await prisma.postSocialAccount.findMany({
      where: {
        status: "PUBLISHED",
        platformPostId: null,
      },
      include: {
        socialAccount: {
          select: { platform: true, name: true },
        },
        post: {
          select: { content: true, createdAt: true },
        },
      },
    });

    if (postsWithoutPlatformId.length > 0) {
      console.log(
        `\n⚠️  Posts Without Platform ID (Cannot Collect Analytics):`
      );
      console.log(
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
      );
      console.log(`   Count: ${postsWithoutPlatformId.length}`);

      postsWithoutPlatformId.slice(0, 3).forEach((psa, index) => {
        console.log(
          `\n${index + 1}. ${psa.socialAccount.platform} - ${psa.socialAccount.name}`
        );
        console.log(`   Post: ${psa.post.content.substring(0, 50)}...`);
        console.log(`   Created: ${psa.post.createdAt.toLocaleDateString()}`);
      });

      if (postsWithoutPlatformId.length > 3) {
        console.log(
          `   ... and ${postsWithoutPlatformId.length - 3} more posts`
        );
      }

      console.log(
        `\n   💡 These posts were published but don't have platform post IDs stored.`
      );
      console.log(
        `      This usually happens with older posts or posts published outside the system.`
      );
    }
  } catch (error: any) {
    console.error("💥 Error checking analytics:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the check if this script is executed directly
if (require.main === module) {
  checkAnalytics()
    .then(() => {
      console.log("\n✨ Analytics check completed!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Analytics check failed:", error);
      process.exit(1);
    });
}
