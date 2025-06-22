import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function debugFrontendDataMismatch() {
  console.log("🔍 Debugging Frontend Data Mismatch...");

  try {
    // Get Instagram social account
    const socialAccount = await prisma.socialAccount.findFirst({
      where: {
        platform: "INSTAGRAM",
      },
    });

    if (!socialAccount) {
      console.log("❌ No Instagram social account found");
      return;
    }

    console.log(`📊 Analyzing account: ${socialAccount.id}`);
    console.log(`📊 Platform: ${socialAccount.platform}`);
    console.log(`📊 Team ID: ${socialAccount.teamId}`);

    // Get recent post analytics (what the frontend should show)
    const postAnalytics = await prisma.postAnalytics.findMany({
      where: {
        postSocialAccount: {
          socialAccountId: socialAccount.id,
          post: {
            status: "PUBLISHED",
          },
        },
        recordedAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
        },
      },
      include: {
        postSocialAccount: {
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
        },
      },
      orderBy: {
        recordedAt: "desc",
      },
      take: 10,
    });

    console.log(`\n📊 DATABASE ANALYTICS (${postAnalytics.length} records):`);

    if (postAnalytics.length === 0) {
      console.log("❌ No post analytics found in database!");
      console.log("   This explains why frontend shows no data");

      // Check if there are posts without analytics
      const postsWithoutAnalytics = await prisma.postSocialAccount.findMany({
        where: {
          socialAccountId: socialAccount.id,
          post: {
            status: "PUBLISHED",
          },
        },
        include: {
          post: {
            select: {
              id: true,
              content: true,
              publishedAt: true,
              status: true,
            },
          },
          analytics: true,
        },
      });

      console.log(
        `\n📋 POSTS WITHOUT ANALYTICS (${postsWithoutAnalytics.length} posts):`
      );
      postsWithoutAnalytics.forEach((psa, index) => {
        console.log(
          `${index + 1}. Post: ${psa.post.content.substring(0, 50)}...`
        );
        console.log(`   Status: ${psa.post.status}`);
        console.log(
          `   Published: ${psa.post.publishedAt?.toISOString() || "N/A"}`
        );
        console.log(`   Analytics count: ${psa.analytics.length}`);
        console.log(`   Platform Post ID: ${psa.platformPostId || "N/A"}`);
      });

      return;
    }

    // Analyze each analytics record
    postAnalytics.forEach((analytics, index) => {
      const post = analytics.postSocialAccount.post;

      console.log(`\n${index + 1}. POST ANALYTICS:`);
      console.log(`   Post ID: ${post.id}`);
      console.log(`   Content: ${post.content.substring(0, 50)}...`);
      console.log(`   Published: ${post.publishedAt?.toISOString() || "N/A"}`);
      console.log(`   Recorded: ${analytics.recordedAt.toISOString()}`);

      console.log(`   📊 METRICS:`);
      console.log(`     - Views: ${analytics.views}`);
      console.log(`     - Reach: ${analytics.reach}`);
      console.log(`     - Impressions: ${analytics.impressions}`);
      console.log(`     - Likes: ${analytics.likes}`);
      console.log(`     - Comments: ${analytics.comments}`);
      console.log(`     - Shares: ${analytics.shares}`);
      console.log(`     - Saves: ${analytics.saves}`);
      console.log(`     - Engagement: ${analytics.engagement}`);
      console.log(`     - Content Format: ${analytics.contentFormat || "N/A"}`);

      // Check raw insights
      if (analytics.rawInsights) {
        try {
          const rawData = JSON.parse(analytics.rawInsights as string);
          if (Array.isArray(rawData)) {
            console.log(
              `   📋 Raw Insights: Instagram metrics array (${rawData.length} metrics)`
            );
            const metrics = rawData.reduce((acc: any, item: any) => {
              if (item.name && item.values && item.values[0]) {
                acc[item.name] = item.values[0].value;
              }
              return acc;
            }, {});
            console.log(`     Available: ${Object.keys(metrics).join(", ")}`);
          } else if (typeof rawData === "object" && rawData.id) {
            console.log(`   📋 Raw Insights: Post metadata (not metrics)`);
          } else {
            console.log(`   📋 Raw Insights: Unknown format`);
          }
        } catch (e) {
          console.log(`   📋 Raw Insights: Parse error`);
        }
      } else {
        console.log(`   📋 Raw Insights: None`);
      }
    });

    // Check what the frontend query would return
    console.log(`\n🔍 FRONTEND QUERY SIMULATION:`);
    console.log(`   Query parameters that frontend uses:`);
    console.log(`   - socialAccountId: ${socialAccount.id}`);
    console.log(`   - teamId: ${socialAccount.teamId}`);
    console.log(`   - days: 30`);
    console.log(`   - platform: undefined (all)`);
    console.log(`   - contentFormat: undefined (all)`);
    console.log(`   - sortBy: "publishedAt"`);

    // Simulate the exact query that frontend makes
    const frontendQuery = await prisma.postAnalytics.findMany({
      where: {
        postSocialAccount: {
          socialAccountId: socialAccount.id,
          post: {
            status: "PUBLISHED",
          },
        },
        recordedAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          lte: new Date(),
        },
      },
      include: {
        postSocialAccount: {
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
        },
      },
      orderBy: {
        postSocialAccount: {
          post: {
            publishedAt: "desc",
          },
        },
      },
      take: 50,
    });

    console.log(`\n📊 FRONTEND QUERY RESULT: ${frontendQuery.length} records`);

    if (frontendQuery.length === 0) {
      console.log("❌ Frontend query returns no data!");
      console.log("   Possible causes:");
      console.log("   1. No analytics within last 30 days");
      console.log("   2. Posts not marked as PUBLISHED");
      console.log("   3. Wrong socialAccountId or teamId");
      console.log("   4. Analytics recordedAt outside date range");
    } else {
      console.log("✅ Frontend query returns data - should display in UI");

      // Transform data like frontend does
      const transformedData = frontendQuery.map((analytics) => {
        const totalEngagement =
          analytics.likes +
          analytics.comments +
          (analytics.shares || 0) +
          (analytics.saves || 0);
        const engagementRate =
          analytics.reach > 0 ? (totalEngagement / analytics.reach) * 100 : 0;

        return {
          id: analytics.id,
          platform: analytics.postSocialAccount.socialAccount.platform,
          contentFormat: analytics.contentFormat || "IMAGE",
          content: analytics.postSocialAccount.post.content,
          publishedAt:
            analytics.postSocialAccount.post.publishedAt?.toISOString() || "",
          likes: analytics.likes,
          comments: analytics.comments,
          shares: analytics.shares || 0,
          saves: analytics.saves || 0,
          reach: analytics.reach,
          impressions: analytics.impressions,
          engagementRate: Number(engagementRate.toFixed(2)),
          recordedAt: analytics.recordedAt,
        };
      });

      console.log(`\n📊 TRANSFORMED DATA (first 3 records):`);
      transformedData.slice(0, 3).forEach((item, index) => {
        console.log(`${index + 1}. ${item.content.substring(0, 40)}...`);
        console.log(`   Platform: ${item.platform}`);
        console.log(`   Engagement Rate: ${item.engagementRate}%`);
        console.log(
          `   Reach: ${item.reach}, Likes: ${item.likes}, Comments: ${item.comments}`
        );
        console.log(`   Published: ${item.publishedAt}`);
      });
    }

    // Check for data freshness
    console.log(`\n⏰ DATA FRESHNESS CHECK:`);
    const latestAnalytics = postAnalytics[0];
    if (latestAnalytics) {
      const hoursSinceLastUpdate =
        (Date.now() - latestAnalytics.recordedAt.getTime()) / (1000 * 60 * 60);
      console.log(
        `   Last analytics update: ${hoursSinceLastUpdate.toFixed(1)} hours ago`
      );

      if (hoursSinceLastUpdate > 24) {
        console.log(`   ⚠️ Data is stale (>24 hours old)`);
      } else {
        console.log(`   ✅ Data is fresh (<24 hours old)`);
      }
    }

    // Summary and recommendations
    console.log(`\n💡 SUMMARY:`);
    if (frontendQuery.length > 0) {
      console.log(`✅ Database has ${frontendQuery.length} analytics records`);
      console.log(`✅ Frontend should display this data`);
      console.log(`🔍 If frontend shows different data, check:`);
      console.log(`   1. Browser cache/refresh`);
      console.log(`   2. tRPC query parameters`);
      console.log(`   3. Frontend filtering logic`);
      console.log(`   4. Date range calculations`);
    } else {
      console.log(`❌ No data available for frontend`);
      console.log(`🔧 To fix this:`);
      console.log(`   1. Run incremental sync to collect fresh data`);
      console.log(`   2. Check if posts are marked as PUBLISHED`);
      console.log(`   3. Verify analytics collection is working`);
    }
  } catch (error) {
    console.error("❌ Debug failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

debugFrontendDataMismatch();
