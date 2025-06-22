import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function deepAnalysisMismatch() {
  console.log("🔍 Deep Analysis of Data Mismatch...");

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

    // From the database screenshot, I can see specific IDs and values
    // Let's find the exact post that shows 38 views in DB but 18 in frontend

    // Look for posts with 38 views (from database screenshot)
    const postsWithSpecificViews = await prisma.postAnalytics.findMany({
      where: {
        postSocialAccount: {
          socialAccountId: socialAccount.id,
        },
        OR: [
          { reach: 38 }, // 38 views from DB screenshot
          { reach: 18 }, // 18 views from frontend
          { reach: 17 }, // Other values we've seen
          { impressions: 38 },
          { views: 38 },
        ],
      },
      include: {
        postSocialAccount: {
          include: {
            post: {
              select: {
                id: true,
                content: true,
                publishedAt: true,
              },
            },
            socialAccount: true,
          },
        },
      },
      orderBy: {
        recordedAt: "desc",
      },
    });

    console.log(
      `\n📊 POSTS WITH SPECIFIC VIEW COUNTS (${postsWithSpecificViews.length} found):`
    );

    postsWithSpecificViews.forEach((analytics, index) => {
      const post = analytics.postSocialAccount.post;
      const totalEngagement =
        analytics.likes +
        analytics.comments +
        (analytics.shares || 0) +
        (analytics.saves || 0);
      const engagementRate =
        analytics.reach > 0 ? (totalEngagement / analytics.reach) * 100 : 0;

      console.log(`\n${index + 1}. POST ANALYSIS:`);
      console.log(`   Post ID: ${post.id}`);
      console.log(`   Content: ${post.content.substring(0, 60)}...`);
      console.log(`   Published: ${post.publishedAt?.toISOString()}`);
      console.log(`   Recorded: ${analytics.recordedAt.toISOString()}`);

      console.log(`   📊 DATABASE VALUES:`);
      console.log(`     - Views (reach): ${analytics.reach}`);
      console.log(`     - Views (views field): ${analytics.views}`);
      console.log(`     - Impressions: ${analytics.impressions}`);
      console.log(`     - Likes: ${analytics.likes}`);
      console.log(`     - Comments: ${analytics.comments}`);
      console.log(`     - Shares: ${analytics.shares || 0}`);
      console.log(`     - Saves: ${analytics.saves || 0}`);
      console.log(`     - Total Engagement: ${totalEngagement}`);
      console.log(
        `     - Calculated Engagement Rate: ${engagementRate.toFixed(1)}%`
      );
      console.log(`     - Stored Engagement: ${analytics.engagement}`);

      // Check if this matches the frontend screenshot
      if (analytics.likes === 3 && analytics.comments === 4) {
        console.log(
          `   🎯 POTENTIAL MATCH: This might be the post from screenshot`
        );
        console.log(`   📱 Frontend shows: 18 views, 50% engagement`);
        console.log(
          `   💾 Database shows: ${analytics.reach} views, ${engagementRate.toFixed(1)}% engagement`
        );

        if (analytics.reach !== 18) {
          console.log(
            `   ⚠️ VIEW COUNT MISMATCH: DB=${analytics.reach}, FE=18`
          );
        }
        if (Math.abs(engagementRate - 50.0) > 1) {
          console.log(
            `   ⚠️ ENGAGEMENT MISMATCH: DB=${engagementRate.toFixed(1)}%, FE=50.0%`
          );
        }
      }
    });

    // Check for multiple analytics records for the same post
    console.log(`\n🔍 CHECKING FOR DUPLICATE ANALYTICS RECORDS:`);

    const postsWithMultipleRecords = await prisma.postSocialAccount.findMany({
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
          },
        },
        analytics: {
          orderBy: {
            recordedAt: "desc",
          },
        },
      },
    });

    const duplicates = postsWithMultipleRecords.filter(
      (psa) => psa.analytics.length > 1
    );

    console.log(
      `   Found ${duplicates.length} posts with multiple analytics records`
    );

    duplicates.slice(0, 5).forEach((psa, index) => {
      console.log(
        `\n   ${index + 1}. "${psa.post.content.substring(0, 40)}..."`
      );
      console.log(`      Total records: ${psa.analytics.length}`);

      psa.analytics.slice(0, 3).forEach((analytics, i) => {
        const totalEng =
          analytics.likes +
          analytics.comments +
          (analytics.shares || 0) +
          (analytics.saves || 0);
        const engRate =
          analytics.reach > 0 ? (totalEng / analytics.reach) * 100 : 0;

        console.log(
          `      Record ${i + 1}: reach=${analytics.reach}, likes=${analytics.likes}, comments=${analytics.comments}, eng=${engRate.toFixed(1)}%`
        );
        console.log(
          `                 recorded=${analytics.recordedAt.toISOString().split("T")[1].split(".")[0]}`
        );
      });

      // Check if frontend might be using different record
      if (psa.analytics.length > 1) {
        const latest = psa.analytics[0];
        const previous = psa.analytics[1];

        if (latest.reach !== previous.reach) {
          console.log(
            `      ⚠️ DIFFERENT VALUES: Latest=${latest.reach} vs Previous=${previous.reach}`
          );
          console.log(`      🔍 Frontend might be using older record!`);
        }
      }
    });

    // Check the exact tRPC query that frontend uses
    console.log(`\n🔍 SIMULATING EXACT FRONTEND QUERY:`);

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

    console.log(`   Query returned ${frontendQuery.length} records`);

    // Find the specific post that appears in frontend screenshot
    const targetPost = frontendQuery.find((analytics) =>
      analytics.postSocialAccount.post.content.includes(
        "Post ini dijadwalkan pada 18 Juni 19.40"
      )
    );

    if (targetPost) {
      const totalEng =
        targetPost.likes +
        targetPost.comments +
        (targetPost.shares || 0) +
        (targetPost.saves || 0);
      const engRate =
        targetPost.reach > 0 ? (totalEng / targetPost.reach) * 100 : 0;

      console.log(`\n🎯 FOUND TARGET POST IN FRONTEND QUERY:`);
      console.log(`   Post: "Post ini dijadwalkan pada 18 Juni 19.40"`);
      console.log(`   📊 Query Result Values:`);
      console.log(`     - Views (reach): ${targetPost.reach}`);
      console.log(`     - Likes: ${targetPost.likes}`);
      console.log(`     - Comments: ${targetPost.comments}`);
      console.log(`     - Engagement Rate: ${engRate.toFixed(1)}%`);
      console.log(`     - Record Date: ${targetPost.recordedAt.toISOString()}`);

      console.log(`   📱 Frontend Screenshot Shows:`);
      console.log(`     - Views: 18`);
      console.log(`     - Likes: 3`);
      console.log(`     - Comments: 4`);
      console.log(`     - Engagement Rate: 50.0%`);

      console.log(`   🔍 COMPARISON:`);
      if (targetPost.reach !== 18) {
        console.log(`     ❌ Views mismatch: DB=${targetPost.reach}, FE=18`);
      }
      if (targetPost.likes !== 3) {
        console.log(`     ❌ Likes mismatch: DB=${targetPost.likes}, FE=3`);
      }
      if (targetPost.comments !== 4) {
        console.log(
          `     ❌ Comments mismatch: DB=${targetPost.comments}, FE=4`
        );
      }

      // This suggests frontend is using a different data source or calculation
      console.log(`\n🚨 CRITICAL FINDING:`);
      console.log(
        `   Frontend is NOT using the same data that this query returns!`
      );
      console.log(`   Possible causes:`);
      console.log(`   1. Frontend using different tRPC endpoint`);
      console.log(`   2. Frontend using cached data from different source`);
      console.log(`   3. Frontend calculation logic is different`);
      console.log(
        `   4. Frontend using post.getAnalytics instead of analytics.database.getPostAnalytics`
      );
    }

    // Check if frontend is using post.getAnalytics endpoint instead
    console.log(`\n🔍 CHECKING POST.GETANALYTICS ENDPOINT:`);

    const postWithAnalytics = await prisma.post.findFirst({
      where: {
        content: {
          contains: "Post ini dijadwalkan pada 18 Juni 19.40",
        },
        status: "PUBLISHED",
      },
      include: {
        postSocialAccounts: {
          include: {
            socialAccount: true,
            analytics: {
              orderBy: { recordedAt: "desc" },
              take: 5,
            },
          },
        },
      },
    });

    if (postWithAnalytics) {
      console.log(`   Found post: ${postWithAnalytics.id}`);

      postWithAnalytics.postSocialAccounts.forEach((psa, index) => {
        console.log(
          `\n   Platform ${index + 1}: ${psa.socialAccount.platform}`
        );
        console.log(`   Analytics records: ${psa.analytics.length}`);

        if (psa.analytics.length > 0) {
          const latest = psa.analytics[0];
          const totalEng =
            latest.likes +
            latest.comments +
            (latest.shares || 0) +
            (latest.saves || 0);
          const engRate =
            latest.reach > 0 ? (totalEng / latest.reach) * 100 : 0;

          console.log(`   Latest analytics:`);
          console.log(`     - Views: ${latest.reach}`);
          console.log(`     - Likes: ${latest.likes}`);
          console.log(`     - Comments: ${latest.comments}`);
          console.log(`     - Engagement: ${engRate.toFixed(1)}%`);
          console.log(`     - Recorded: ${latest.recordedAt.toISOString()}`);

          // Check if this matches frontend
          if (
            latest.reach === 18 &&
            latest.likes === 3 &&
            latest.comments === 4
          ) {
            console.log(
              `   ✅ THIS MATCHES FRONTEND! Frontend is using post.getAnalytics`
            );
          } else {
            console.log(`   ❌ This doesn't match frontend either`);
          }
        }
      });
    }

    // Final analysis
    console.log(`\n💡 FINAL ANALYSIS:`);
    console.log(`1. 🔍 Database has multiple analytics records per post`);
    console.log(
      `2. 📊 Frontend might be using different endpoint (post.getAnalytics vs analytics.database.getPostAnalytics)`
    );
    console.log(`3. 🕐 Frontend might be using older cached data`);
    console.log(`4. 🔄 Different sorting/filtering logic between endpoints`);

    console.log(`\n🎯 NEXT STEPS:`);
    console.log(`1. Check which tRPC endpoint frontend is actually calling`);
    console.log(
      `2. Compare post.getAnalytics vs analytics.database.getPostAnalytics results`
    );
    console.log(`3. Check browser network tab to see actual API calls`);
    console.log(`4. Verify frontend component is using correct query`);
  } catch (error) {
    console.error("❌ Deep analysis failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

deepAnalysisMismatch();
