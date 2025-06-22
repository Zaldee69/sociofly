import { PrismaClient } from "@prisma/client";
import { UnifiedMetaClient } from "../src/lib/services/analytics/clients/unified-meta-client";

const prisma = new PrismaClient();

async function forceCollectNewData() {
  console.log("🔍 Force Collecting New Instagram Data...");

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

    console.log(`📊 Using account: ${socialAccount.id}`);
    console.log(`📊 Profile ID: ${socialAccount.profileId}`);

    // Create UnifiedMetaClient
    const client = new UnifiedMetaClient({
      accessToken: socialAccount.accessToken!,
      platform: "INSTAGRAM",
      profileId: socialAccount.profileId || undefined,
    });

    // Get fresh media analytics from Instagram API
    console.log(`\n🔄 Fetching fresh data from Instagram API...`);
    const mediaAnalytics = await client.getMediaAnalytics(
      socialAccount.profileId || socialAccount.id,
      5 // Just get 5 recent posts
    );

    console.log(`📊 Retrieved ${mediaAnalytics.length} media items`);

    // Analyze each media item
    for (let i = 0; i < Math.min(3, mediaAnalytics.length); i++) {
      const media = mediaAnalytics[i];

      console.log(`\n📋 MEDIA ${i + 1}: ${media.id}`);
      console.log(`📝 Content: ${(media.content || "").substring(0, 50)}...`);
      console.log(`📅 Timestamp: ${media.timestamp}`);

      console.log(`\n📊 PROCESSED INSIGHTS:`);
      console.log(`   - Views: ${media.insights.video_views || "N/A"}`);
      console.log(`   - Impressions: ${media.insights.impressions || "N/A"}`);
      console.log(`   - Reach: ${media.insights.reach || "N/A"}`);
      console.log(`   - Likes: ${media.insights.likes || "N/A"}`);
      console.log(`   - Comments: ${media.insights.comments || "N/A"}`);
      console.log(`   - Shares: ${media.insights.shares || "N/A"}`);
      console.log(`   - Saves: ${media.insights.saves || "N/A"}`);

      console.log(`\n📋 RAW DATA STRUCTURE:`);
      console.log(`Raw data keys:`, Object.keys(media.rawData));
      console.log(`Raw data:`, JSON.stringify(media.rawData, null, 2));

      // Try to get single media analytics for more detailed info
      try {
        console.log(`\n🔍 Getting detailed analytics for ${media.id}...`);
        const detailedMedia = await client.getSingleMediaAnalytics(media.id);

        console.log(`📊 DETAILED INSIGHTS:`);
        console.log(
          `   - Views: ${detailedMedia.insights.video_views || "N/A"}`
        );
        console.log(
          `   - Impressions: ${detailedMedia.insights.impressions || "N/A"}`
        );
        console.log(`   - Reach: ${detailedMedia.insights.reach || "N/A"}`);

        console.log(`\n📋 DETAILED RAW DATA:`);
        console.log(JSON.stringify(detailedMedia.rawData, null, 2));
      } catch (error) {
        console.log(`❌ Failed to get detailed analytics:`, error);
      }

      // Check our database for comparison
      const existingAnalytics = await prisma.postAnalytics.findFirst({
        where: {
          postSocialAccount: {
            socialAccountId: socialAccount.id,
            platformPostId: media.id,
          },
        },
        orderBy: {
          recordedAt: "desc",
        },
        select: {
          views: true,
          reach: true,
          impressions: true,
          rawInsights: true,
        },
      });

      if (existingAnalytics) {
        console.log(`\n📊 OUR DATABASE VALUES:`);
        console.log(`   - Views: ${existingAnalytics.views}`);
        console.log(`   - Reach: ${existingAnalytics.reach}`);
        console.log(`   - Impressions: ${existingAnalytics.impressions}`);

        // Compare values
        console.log(`\n🔍 COMPARISON:`);
        console.log(
          `   Instagram impressions (${media.insights.impressions}) vs Our views (${existingAnalytics.views})`
        );
        console.log(
          `   Instagram reach (${media.insights.reach}) vs Our reach (${existingAnalytics.reach})`
        );

        if (media.insights.impressions !== existingAnalytics.views) {
          console.log(
            `   ⚠️ VIEWS MISMATCH: Instagram=${media.insights.impressions}, Ours=${existingAnalytics.views}`
          );
        }

        if (media.insights.reach !== existingAnalytics.reach) {
          console.log(
            `   ⚠️ REACH MISMATCH: Instagram=${media.insights.reach}, Ours=${existingAnalytics.reach}`
          );
        }

        // Check raw insights in database
        if (existingAnalytics.rawInsights) {
          try {
            const dbRawData = JSON.parse(
              existingAnalytics.rawInsights as string
            );
            console.log(`\n📋 DATABASE RAW INSIGHTS:`);
            console.log(
              `Type: ${Array.isArray(dbRawData) ? "Array (Instagram metrics)" : "Object (Post metadata)"}`
            );

            if (Array.isArray(dbRawData)) {
              const metrics = dbRawData.reduce((acc: any, item: any) => {
                if (item.name && item.values && item.values[0]) {
                  acc[item.name] = item.values[0].value;
                }
                return acc;
              }, {});
              console.log(
                `Available metrics: ${Object.keys(metrics).join(", ")}`
              );
              if (metrics.views)
                console.log(`DB Instagram views: ${metrics.views}`);
              if (metrics.reach)
                console.log(`DB Instagram reach: ${metrics.reach}`);
            } else {
              console.log(
                `Post metadata: ${JSON.stringify(dbRawData, null, 2).substring(0, 200)}...`
              );
            }
          } catch (e) {
            console.log(`Failed to parse database raw insights`);
          }
        }
      } else {
        console.log(
          `\n📊 No existing analytics found in database for ${media.id}`
        );
      }

      console.log(`\n${"=".repeat(80)}`);
    }

    // Summary and recommendations
    console.log(`\n💡 ANALYSIS SUMMARY:`);
    console.log(`✅ Successfully retrieved fresh data from Instagram API`);
    console.log(`📊 Check the comparisons above for discrepancies`);
    console.log(`🔍 Look for "VIEWS MISMATCH" or "REACH MISMATCH" indicators`);

    console.log(`\n🎯 KEY FINDINGS TO CHECK:`);
    console.log(
      `1. Are we storing Instagram insights or post metadata in rawInsights?`
    );
    console.log(
      `2. Are we mapping the correct Instagram metric to our 'views' field?`
    );
    console.log(
      `3. Is there a difference between Instagram API response and dashboard?`
    );
    console.log(
      `4. Do we need to use 'views' instead of 'impressions' from Instagram API?`
    );
  } catch (error) {
    console.error("❌ Force collect failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

forceCollectNewData();
