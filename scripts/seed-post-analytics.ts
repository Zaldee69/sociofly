#!/usr/bin/env tsx

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function seedPostAnalytics() {
  console.log("🌱 Starting to seed post analytics data...");

  try {
    // Get all published posts that don't have analytics yet
    const postsWithoutAnalytics = await prisma.postSocialAccount.findMany({
      where: {
        post: {
          status: "PUBLISHED",
          publishedAt: { not: null },
        },
        analytics: {
          none: {},
        },
      },
      include: {
        post: {
          select: {
            id: true,
            content: true,
            publishedAt: true,
            mediaUrls: true,
          },
        },
        socialAccount: {
          select: {
            platform: true,
            name: true,
          },
        },
      },
    });

    console.log(
      `📊 Found ${postsWithoutAnalytics.length} posts without analytics`
    );

    if (postsWithoutAnalytics.length === 0) {
      console.log("✅ All posts already have analytics data");
      return;
    }

    // Generate realistic sample analytics for each post
    for (const psa of postsWithoutAnalytics) {
      const platform = psa.socialAccount.platform;
      const publishedAt = psa.post.publishedAt;

      if (!publishedAt) continue;

      // Calculate days since publication for realistic decay
      const daysSincePublished = Math.floor(
        (Date.now() - publishedAt.getTime()) / (1000 * 60 * 60 * 24)
      );

      // Generate realistic metrics based on platform
      let baseReach, baseImpressions, baseLikes, baseComments, baseShares;

      switch (platform) {
        case "INSTAGRAM":
          baseReach = Math.floor(Math.random() * 500) + 100; // 100-600
          baseImpressions = Math.floor(baseReach * (1.2 + Math.random() * 0.8)); // 1.2-2x reach
          baseLikes = Math.floor(baseReach * (0.03 + Math.random() * 0.05)); // 3-8% of reach
          baseComments = Math.floor(baseLikes * (0.1 + Math.random() * 0.2)); // 10-30% of likes
          baseShares = Math.floor(baseLikes * (0.05 + Math.random() * 0.1)); // 5-15% of likes
          break;
        case "FACEBOOK":
          baseReach = Math.floor(Math.random() * 300) + 50; // 50-350
          baseImpressions = Math.floor(baseReach * (1.5 + Math.random() * 1)); // 1.5-2.5x reach
          baseLikes = Math.floor(baseReach * (0.02 + Math.random() * 0.04)); // 2-6% of reach
          baseComments = Math.floor(baseLikes * (0.15 + Math.random() * 0.25)); // 15-40% of likes
          baseShares = Math.floor(baseLikes * (0.1 + Math.random() * 0.2)); // 10-30% of likes
          break;
        case "TWITTER":
          baseReach = Math.floor(Math.random() * 200) + 30; // 30-230
          baseImpressions = Math.floor(baseReach * (2 + Math.random() * 1)); // 2-3x reach
          baseLikes = Math.floor(baseReach * (0.04 + Math.random() * 0.06)); // 4-10% of reach
          baseComments = Math.floor(baseLikes * (0.05 + Math.random() * 0.15)); // 5-20% of likes
          baseShares = Math.floor(baseLikes * (0.2 + Math.random() * 0.3)); // 20-50% of likes (retweets)
          break;
        default:
          baseReach = Math.floor(Math.random() * 300) + 50;
          baseImpressions = Math.floor(baseReach * 1.5);
          baseLikes = Math.floor(baseReach * 0.04);
          baseComments = Math.floor(baseLikes * 0.2);
          baseShares = Math.floor(baseLikes * 0.1);
      }

      // Apply decay factor for older posts (engagement typically decreases over time)
      const decayFactor = Math.max(0.1, 1 - daysSincePublished * 0.1);

      const reach = Math.max(1, Math.floor(baseReach * decayFactor));
      const impressions = Math.max(
        reach,
        Math.floor(baseImpressions * decayFactor)
      );
      const likes = Math.max(0, Math.floor(baseLikes * decayFactor));
      const comments = Math.max(0, Math.floor(baseComments * decayFactor));
      const shares = Math.max(0, Math.floor(baseShares * decayFactor));
      const saves =
        platform === "INSTAGRAM"
          ? Math.floor(likes * (0.1 + Math.random() * 0.2))
          : 0;
      const reactions =
        platform === "FACEBOOK"
          ? Math.floor(likes * (0.8 + Math.random() * 0.4))
          : 0;
      const clicks = Math.floor(impressions * (0.01 + Math.random() * 0.02)); // 1-3% CTR

      // Calculate engagement rate
      const totalEngagement = likes + comments + shares + saves + reactions;
      const engagementRate = reach > 0 ? (totalEngagement / reach) * 100 : 0;

      // Calculate CTR
      const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;

      // Determine content format from media URLs
      let contentFormat = "IMAGE";
      if (psa.post.mediaUrls.length > 0) {
        const firstMedia = psa.post.mediaUrls[0];
        if (
          firstMedia.includes(".mp4") ||
          firstMedia.includes(".mov") ||
          firstMedia.includes("video")
        ) {
          contentFormat = "VIDEO";
        } else if (psa.post.mediaUrls.length > 1) {
          contentFormat = "CAROUSEL";
        }
      }

      // Create analytics record
      await prisma.postAnalytics.create({
        data: {
          postSocialAccountId: psa.id,
          views: impressions, // Use impressions as views for compatibility
          likes,
          reactions,
          comments,
          shares,
          saves,
          clicks,
          reach,
          impressions,
          engagement: Math.round(engagementRate * 100) / 100, // Round to 2 decimal places
          ctr: Math.round(ctr * 100) / 100,
          contentFormat: contentFormat as any,
          recordedAt: new Date(),
          timeToEngagement: Math.floor(Math.random() * 120) + 5, // 5-125 minutes
        },
      });

      console.log(
        `✅ Created analytics for post: ${psa.post.content.substring(0, 50)}... (${platform})`
      );
      console.log(
        `   📊 Reach: ${reach}, Engagement: ${engagementRate.toFixed(2)}%, CTR: ${ctr.toFixed(2)}%`
      );
    }

    console.log(
      `🎉 Successfully seeded analytics for ${postsWithoutAnalytics.length} posts`
    );
  } catch (error) {
    console.error("❌ Error seeding post analytics:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seeder
if (require.main === module) {
  seedPostAnalytics()
    .then(() => {
      console.log("✅ Post analytics seeding completed");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Post analytics seeding failed:", error);
      process.exit(1);
    });
}

export { seedPostAnalytics };
