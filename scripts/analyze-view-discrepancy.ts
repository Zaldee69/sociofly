import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function analyzeViewDiscrepancy() {
  console.log("🔍 Analyzing View Count Discrepancy...");

  try {
    // Get social account
    const socialAccount = await prisma.socialAccount.findFirst({
      where: {
        platform: "INSTAGRAM",
      },
    });

    if (!socialAccount) {
      console.log("❌ No Instagram social account found");
      return;
    }

    console.log(`📊 Account: ${socialAccount.id}`);

    // Get recent post analytics with detailed information
    const postAnalytics = await prisma.postAnalytics.findMany({
      where: {
        postSocialAccount: {
          socialAccountId: socialAccount.id,
          post: {
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
                mediaUrls: true,
              },
            },
            socialAccount: {
              select: {
                platform: true,
                profileId: true,
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

    console.log(`\n📊 RECENT POST ANALYTICS (${postAnalytics.length} posts):`);

    postAnalytics.forEach((analytics, index) => {
      const post = analytics.postSocialAccount.post;
      const engagement =
        analytics.likes +
        analytics.comments +
        (analytics.shares || 0) +
        (analytics.saves || 0);

      console.log(`\n${index + 1}. Post ID: ${post.id}`);
      console.log(`   Content: ${(post.content || "").substring(0, 60)}...`);
      console.log(`   Published: ${post.publishedAt?.toISOString() || "N/A"}`);
      console.log(`   Recorded: ${analytics.recordedAt.toISOString()}`);
      console.log(`   📊 Metrics:`);
      console.log(`     - Views (reach): ${analytics.reach}`);
      console.log(`     - Impressions: ${analytics.impressions}`);
      console.log(`     - Likes: ${analytics.likes}`);
      console.log(`     - Comments: ${analytics.comments}`);
      console.log(`     - Shares: ${analytics.shares || 0}`);
      console.log(`     - Saves: ${analytics.saves || 0}`);
      console.log(`     - Total Engagement: ${engagement}`);
      console.log(
        `   🔍 Raw Insights: ${analytics.rawInsights ? "Present" : "Missing"}`
      );

      // Check if this might be the post with discrepancy
      if (analytics.reach === 17) {
        console.log(
          `   ⚠️ POTENTIAL DISCREPANCY POST (17 views in our system)`
        );
        if (analytics.rawInsights) {
          try {
            const rawData = JSON.parse(analytics.rawInsights as string);
            console.log(
              `   📋 Raw Instagram Data:`,
              JSON.stringify(rawData, null, 2)
            );
          } catch (e) {
            console.log(
              `   📋 Raw Data (unparseable): ${analytics.rawInsights}`
            );
          }
        }
      }
    });

    // Analyze data collection patterns
    console.log(`\n🕐 DATA COLLECTION ANALYSIS:`);

    // Check collection frequency
    const recentCollections = await prisma.postAnalytics.findMany({
      where: {
        postSocialAccount: {
          socialAccountId: socialAccount.id,
        },
        recordedAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
        },
      },
      select: {
        recordedAt: true,
        reach: true,
        impressions: true,
      },
      orderBy: {
        recordedAt: "desc",
      },
    });

    const collectionDates = recentCollections.map(
      (c) => c.recordedAt.toISOString().split("T")[0]
    );
    const uniqueDates = [...new Set(collectionDates)];

    console.log(
      `📅 Collection frequency: ${recentCollections.length} collections over ${uniqueDates.length} unique days`
    );
    console.log(
      `📊 Average collections per day: ${(recentCollections.length / uniqueDates.length).toFixed(1)}`
    );

    // Check for data staleness
    const latestCollection = recentCollections[0];
    if (latestCollection) {
      const hoursSinceLastCollection =
        (Date.now() - latestCollection.recordedAt.getTime()) / (1000 * 60 * 60);
      console.log(
        `⏰ Hours since last collection: ${hoursSinceLastCollection.toFixed(1)}`
      );

      if (hoursSinceLastCollection > 24) {
        console.log(
          `⚠️ WARNING: Data is stale (last collected ${hoursSinceLastCollection.toFixed(1)} hours ago)`
        );
      }
    }

    // Analyze Instagram API response patterns
    console.log(`\n📡 INSTAGRAM API ANALYSIS:`);

    // Check what metrics we're actually getting from Instagram
    const analyticsWithRawData = postAnalytics.filter((p) => p.rawInsights);
    console.log(
      `📊 Posts with raw Instagram data: ${analyticsWithRawData.length}/${postAnalytics.length}`
    );

    if (analyticsWithRawData.length > 0) {
      const sampleRawData = analyticsWithRawData[0];
      try {
        const parsed = JSON.parse(sampleRawData.rawInsights as string);
        console.log(`📋 Sample Instagram API response structure:`);
        console.log(JSON.stringify(parsed, null, 2));
      } catch (e) {
        console.log(`❌ Failed to parse sample raw data`);
      }
    }

    // Check our data mapping logic
    console.log(`\n🔄 DATA MAPPING ANALYSIS:`);
    console.log(`📊 Our system maps:`);
    console.log(`   - Instagram "reach" → our "reach" (views)`);
    console.log(`   - Instagram "impressions" → our "impressions"`);
    console.log(`   - Instagram "views" → might be separate metric`);

    // Potential issues identification
    console.log(`\n🚨 POTENTIAL ISSUES:`);
    console.log(`1. 📊 Metric Mapping:`);
    console.log(
      `   - We use "reach" as views, but Instagram might have separate "views" metric`
    );
    console.log(`   - Instagram API v22.0+ has different metric names`);

    console.log(`2. ⏰ Timing Issues:`);
    console.log(
      `   - Our data might be collected at different time than user checks dashboard`
    );
    console.log(
      `   - Instagram dashboard shows real-time data, ours might be delayed`
    );

    console.log(`3. 🔄 API Limitations:`);
    console.log(
      `   - Instagram API might have rate limits affecting data freshness`
    );
    console.log(`   - Different endpoints might return different values`);

    console.log(`4. 📈 Data Aggregation:`);
    console.log(
      `   - We might be aggregating data differently than Instagram dashboard`
    );
    console.log(`   - Time zone differences in data collection`);

    // Recommendations
    console.log(`\n💡 RECOMMENDATIONS:`);
    console.log(`1. 🔍 Check Instagram API Documentation:`);
    console.log(`   - Verify correct metric names for views vs reach`);
    console.log(`   - Check if there's a separate "views" endpoint`);

    console.log(`2. 📊 Update Data Collection:`);
    console.log(`   - Request both "reach" and "views" if available`);
    console.log(`   - Increase collection frequency for real-time accuracy`);

    console.log(`3. 🕐 Improve Timing:`);
    console.log(`   - Collect data more frequently (every 15-30 minutes)`);
    console.log(`   - Add real-time sync option for critical posts`);

    console.log(`4. 🔄 Add Data Validation:`);
    console.log(`   - Compare our data with manual checks`);
    console.log(`   - Add alerts for significant discrepancies`);
  } catch (error) {
    console.error("❌ Analysis failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

analyzeViewDiscrepancy();
