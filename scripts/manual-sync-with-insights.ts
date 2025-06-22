import { PrismaClient } from "@prisma/client";
import { UnifiedMetaClient } from "../src/lib/services/analytics/clients/unified-meta-client";

const prisma = new PrismaClient();

async function manualSyncWithInsights() {
  console.log("🔄 Manual Sync with Proper Insights Storage...");

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

    // Create UnifiedMetaClient
    const client = new UnifiedMetaClient({
      accessToken: socialAccount.accessToken!,
      platform: "INSTAGRAM",
      profileId: socialAccount.profileId || undefined,
    });

    // Get the first media item
    const mediaAnalytics = await client.getMediaAnalytics(
      socialAccount.profileId || socialAccount.id,
      1
    );

    if (mediaAnalytics.length === 0) {
      console.log("❌ No media found");
      return;
    }

    const media = mediaAnalytics[0];
    console.log(`📊 Testing with media: ${media.id}`);
    console.log(`📝 Content: ${(media.content || "").substring(0, 50)}...`);

    // Get detailed insights by calling the Instagram API directly
    console.log(`\n🔍 Getting raw Instagram insights...`);

    // Make direct API call to get insights
    const axios = require("axios");
    const insightsResponse = await axios.get(
      `https://graph.facebook.com/v22.0/${media.id}/insights`,
      {
        params: {
          metric: "views,reach,likes,comments,shares,saved",
          access_token: socialAccount.accessToken,
        },
      }
    );

    const rawInsights = insightsResponse.data.data || [];
    console.log(
      `📋 Raw Instagram insights:`,
      JSON.stringify(rawInsights, null, 2)
    );

    // Parse insights into metrics object
    const insights: any = {};
    rawInsights.forEach((metric: any) => {
      insights[metric.name] = metric.values[0]?.value || 0;
    });

    console.log(`\n📊 Parsed metrics:`);
    console.log(`   - views: ${insights.views || 0}`);
    console.log(`   - reach: ${insights.reach || 0}`);
    console.log(`   - likes: ${insights.likes || 0}`);
    console.log(`   - comments: ${insights.comments || 0}`);
    console.log(`   - shares: ${insights.shares || 0}`);
    console.log(`   - saved: ${insights.saved || 0}`);

    // Find existing PostSocialAccount
    const postSocialAccount = await prisma.postSocialAccount.findFirst({
      where: {
        socialAccountId: socialAccount.id,
        platformPostId: media.id,
      },
    });

    if (!postSocialAccount) {
      console.log("❌ PostSocialAccount not found");
      return;
    }

    // Create new analytics entry with correct data
    console.log(`\n💾 Creating new analytics entry...`);
    const newAnalytics = await prisma.postAnalytics.create({
      data: {
        postSocialAccountId: postSocialAccount.id,
        views: insights.views || 0, // Use Instagram 'views' directly
        likes: insights.likes || 0,
        comments: insights.comments || 0,
        shares: insights.shares || 0,
        saves: insights.saved || 0,
        reach: insights.reach || 0,
        impressions: insights.views || 0, // Map views to impressions for consistency
        engagement:
          (insights.likes || 0) +
          (insights.comments || 0) +
          (insights.shares || 0) +
          (insights.saved || 0),
        clicks: 0,
        reactions: insights.likes || 0,
        recordedAt: new Date(),
        rawInsights: JSON.stringify(rawInsights), // Store actual Instagram insights array
      },
    });

    console.log(`✅ Created analytics entry: ${newAnalytics.id}`);
    console.log(`📊 Stored values:`);
    console.log(`   - views: ${newAnalytics.views}`);
    console.log(`   - reach: ${newAnalytics.reach}`);
    console.log(`   - impressions: ${newAnalytics.impressions}`);
    console.log(`   - likes: ${newAnalytics.likes}`);
    console.log(`   - comments: ${newAnalytics.comments}`);
    console.log(`   - shares: ${newAnalytics.shares}`);
    console.log(`   - saves: ${newAnalytics.saves}`);

    // Verify raw insights storage
    if (newAnalytics.rawInsights) {
      try {
        const storedRawData = JSON.parse(newAnalytics.rawInsights as string);
        console.log(
          `\n✅ Raw insights stored correctly as array with ${storedRawData.length} metrics`
        );

        // Extract and display stored metrics
        const storedMetrics = storedRawData.reduce((acc: any, item: any) => {
          if (item.name && item.values && item.values[0]) {
            acc[item.name] = item.values[0].value;
          }
          return acc;
        }, {});

        console.log(
          `📊 Stored metrics: ${Object.keys(storedMetrics).join(", ")}`
        );
        console.log(
          `📊 Instagram views from storage: ${storedMetrics.views || "N/A"}`
        );
        console.log(
          `📊 Instagram reach from storage: ${storedMetrics.reach || "N/A"}`
        );
      } catch (e) {
        console.log(`❌ Failed to parse stored raw insights`);
      }
    }

    console.log(`\n🎯 SUMMARY:`);
    console.log(
      `✅ Successfully stored Instagram insights as proper metrics array`
    );
    console.log(`✅ Views mapped correctly from Instagram API`);
    console.log(
      `✅ Raw insights now contain actual metrics, not post metadata`
    );
    console.log(
      `\n💡 This demonstrates the correct way to store Instagram analytics data`
    );
  } catch (error) {
    console.error("❌ Manual sync failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

manualSyncWithInsights();
