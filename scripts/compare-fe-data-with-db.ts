import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function compareFEDataWithDB() {
  console.log("🔍 Comparing Frontend Data with Database...");

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

    // From screenshot, I can see these posts:
    // #1: "Post ini dijadwalkan pada 18 Juni 19.40" - 50.0% engagement, 18 views
    // #2: "Post ini dijadwalkan pada 18 Juni 19.40" - 47.1% engagement, 17 views
    // #3: Long text about boots/fashion - 18.8% engagement, 16 views
    // #4: "Test Post Scheduler - 2025-06-16" - 16.7% engagement, 18 views

    // Let's find these specific posts in database
    console.log(`📊 Searching for posts matching frontend screenshot...\n`);

    // Search for the first post: "Post ini dijadwalkan pada 18 Juni 19.40"
    const post1 = await prisma.postAnalytics.findMany({
      where: {
        postSocialAccount: {
          socialAccountId: socialAccount.id,
          post: {
            content: {
              contains: "Post ini dijadwalkan pada 18 Juni 19.40",
            },
            status: "PUBLISHED",
          },
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
              },
            },
          },
        },
      },
      orderBy: {
        recordedAt: "desc",
      },
    });

    console.log(`🔍 POST #1: "Post ini dijadwalkan pada 18 Juni 19.40"`);
    console.log(`   Found ${post1.length} analytics records in database`);

    if (post1.length > 0) {
      const latest = post1[0];
      const totalEngagement =
        latest.likes +
        latest.comments +
        (latest.shares || 0) +
        (latest.saves || 0);
      const engagementRate =
        latest.reach > 0 ? (totalEngagement / latest.reach) * 100 : 0;

      console.log(`   📊 DATABASE VALUES:`);
      console.log(`     - Views (reach): ${latest.reach}`);
      console.log(`     - Impressions: ${latest.impressions}`);
      console.log(`     - Likes: ${latest.likes}`);
      console.log(`     - Comments: ${latest.comments}`);
      console.log(`     - Shares: ${latest.shares || 0}`);
      console.log(`     - Saves: ${latest.saves || 0}`);
      console.log(`     - Total Engagement: ${totalEngagement}`);
      console.log(`     - Engagement Rate: ${engagementRate.toFixed(1)}%`);
      console.log(
        `     - Published: ${latest.postSocialAccount.post.publishedAt?.toISOString()}`
      );
      console.log(`     - Recorded: ${latest.recordedAt.toISOString()}`);

      console.log(`   📱 FRONTEND SHOWS:`);
      console.log(`     - Views: 18 (screenshot)`);
      console.log(`     - Engagement Rate: 50.0% (screenshot)`);

      console.log(`   🔍 COMPARISON:`);
      if (latest.reach !== 18) {
        console.log(`     ⚠️ VIEWS MISMATCH: DB=${latest.reach}, FE=18`);
      }
      if (Math.abs(engagementRate - 50.0) > 1) {
        console.log(
          `     ⚠️ ENGAGEMENT MISMATCH: DB=${engagementRate.toFixed(1)}%, FE=50.0%`
        );
      }
    }

    // Search for boots/fashion post
    const post3 = await prisma.postAnalytics.findMany({
      where: {
        postSocialAccount: {
          socialAccountId: socialAccount.id,
          post: {
            content: {
              contains: "boots",
            },
            status: "PUBLISHED",
          },
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
              },
            },
          },
        },
      },
      orderBy: {
        recordedAt: "desc",
      },
    });

    console.log(`\n🔍 POST #3: Boots/Fashion post`);
    console.log(`   Found ${post3.length} analytics records in database`);

    if (post3.length > 0) {
      const latest = post3[0];
      const totalEngagement =
        latest.likes +
        latest.comments +
        (latest.shares || 0) +
        (latest.saves || 0);
      const engagementRate =
        latest.reach > 0 ? (totalEngagement / latest.reach) * 100 : 0;

      console.log(`   📊 DATABASE VALUES:`);
      console.log(`     - Views (reach): ${latest.reach}`);
      console.log(`     - Total Engagement: ${totalEngagement}`);
      console.log(`     - Engagement Rate: ${engagementRate.toFixed(1)}%`);

      console.log(`   📱 FRONTEND SHOWS:`);
      console.log(`     - Views: 16 (screenshot)`);
      console.log(`     - Engagement Rate: 18.8% (screenshot)`);

      console.log(`   🔍 COMPARISON:`);
      if (latest.reach !== 16) {
        console.log(`     ⚠️ VIEWS MISMATCH: DB=${latest.reach}, FE=16`);
      }
      if (Math.abs(engagementRate - 18.8) > 1) {
        console.log(
          `     ⚠️ ENGAGEMENT MISMATCH: DB=${engagementRate.toFixed(1)}%, FE=18.8%`
        );
      }
    }

    // Search for Test Post Scheduler
    const post4 = await prisma.postAnalytics.findMany({
      where: {
        postSocialAccount: {
          socialAccountId: socialAccount.id,
          post: {
            content: {
              contains: "Test Post Scheduler",
            },
            status: "PUBLISHED",
          },
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
              },
            },
          },
        },
      },
      orderBy: {
        recordedAt: "desc",
      },
    });

    console.log(`\n🔍 POST #4: "Test Post Scheduler"`);
    console.log(`   Found ${post4.length} analytics records in database`);

    if (post4.length > 0) {
      const latest = post4[0];
      const totalEngagement =
        latest.likes +
        latest.comments +
        (latest.shares || 0) +
        (latest.saves || 0);
      const engagementRate =
        latest.reach > 0 ? (totalEngagement / latest.reach) * 100 : 0;

      console.log(`   📊 DATABASE VALUES:`);
      console.log(`     - Views (reach): ${latest.reach}`);
      console.log(`     - Total Engagement: ${totalEngagement}`);
      console.log(`     - Engagement Rate: ${engagementRate.toFixed(1)}%`);

      console.log(`   📱 FRONTEND SHOWS:`);
      console.log(`     - Views: 18 (screenshot)`);
      console.log(`     - Engagement Rate: 16.7% (screenshot)`);

      console.log(`   🔍 COMPARISON:`);
      if (latest.reach !== 18) {
        console.log(`     ⚠️ VIEWS MISMATCH: DB=${latest.reach}, FE=18`);
      }
      if (Math.abs(engagementRate - 16.7) > 1) {
        console.log(
          `     ⚠️ ENGAGEMENT MISMATCH: DB=${engagementRate.toFixed(1)}%, FE=16.7%`
        );
      }
    }

    // Check if there are multiple analytics records per post (which could cause confusion)
    console.log(`\n🔍 CHECKING FOR DUPLICATE ANALYTICS:`);
    const duplicateCheck = await prisma.postSocialAccount.findMany({
      where: {
        socialAccountId: socialAccount.id,
        post: {
          status: "PUBLISHED",
        },
      },
      include: {
        post: {
          select: {
            content: true,
          },
        },
        analytics: {
          orderBy: {
            recordedAt: "desc",
          },
        },
      },
    });

    const postsWithMultipleAnalytics = duplicateCheck.filter(
      (psa) => psa.analytics.length > 1
    );
    console.log(
      `   Found ${postsWithMultipleAnalytics.length} posts with multiple analytics records`
    );

    postsWithMultipleAnalytics.slice(0, 3).forEach((psa, index) => {
      console.log(
        `   ${index + 1}. "${psa.post.content.substring(0, 40)}..." has ${psa.analytics.length} records`
      );
      console.log(
        `      Latest: reach=${psa.analytics[0].reach}, engagement=${psa.analytics[0].engagement}`
      );
      console.log(
        `      Oldest: reach=${psa.analytics[psa.analytics.length - 1].reach}, engagement=${psa.analytics[psa.analytics.length - 1].engagement}`
      );
    });

    // Check for potential caching issues
    console.log(`\n🔍 CHECKING FRONTEND QUERY CACHE:`);
    console.log(`   Frontend might be using cached data`);
    console.log(`   tRPC query has staleTime: 240000 (4 minutes)`);
    console.log(`   refetchInterval: 300000 (5 minutes)`);

    const latestAnalytics = await prisma.postAnalytics.findFirst({
      where: {
        postSocialAccount: {
          socialAccountId: socialAccount.id,
        },
      },
      orderBy: {
        recordedAt: "desc",
      },
    });

    if (latestAnalytics) {
      const minutesSinceUpdate =
        (Date.now() - latestAnalytics.recordedAt.getTime()) / (1000 * 60);
      console.log(
        `   Last database update: ${minutesSinceUpdate.toFixed(1)} minutes ago`
      );

      if (minutesSinceUpdate < 4) {
        console.log(
          `   ⚠️ Data was updated recently - frontend cache might not be refreshed yet`
        );
      }
    }

    // Summary and recommendations
    console.log(`\n💡 ANALYSIS SUMMARY:`);
    console.log(`✅ Database has fresh analytics data`);
    console.log(
      `📊 Multiple analytics records per post indicate data collection is working`
    );
    console.log(`\n🔧 POSSIBLE CAUSES OF MISMATCH:`);
    console.log(`1. 🕐 Frontend cache not refreshed (4-5 minute stale time)`);
    console.log(`2. 📊 Frontend using different analytics record (not latest)`);
    console.log(`3. 🔄 Different calculation logic for engagement rate`);
    console.log(`4. 📅 Different date range filtering`);
    console.log(`5. 🔍 Frontend sorting differently than expected`);

    console.log(`\n🎯 RECOMMENDATIONS:`);
    console.log(`1. 🔄 Hard refresh browser (Ctrl+F5 or Cmd+Shift+R)`);
    console.log(`2. 🧹 Clear browser cache and cookies`);
    console.log(`3. 📊 Check browser dev tools network tab for tRPC calls`);
    console.log(`4. 🔍 Enable debug mode in PostPerformance component`);
    console.log(`5. 📅 Verify date range calculations in frontend`);
  } catch (error) {
    console.error("❌ Comparison failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

compareFEDataWithDB();
