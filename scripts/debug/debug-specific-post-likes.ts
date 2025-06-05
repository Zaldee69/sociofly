#!/usr/bin/env tsx

import { PrismaClient } from "@prisma/client";
import axios from "axios";

const prisma = new PrismaClient();

async function debugPostLikes() {
  try {
    console.log("🔍 Debugging post likes issue...\n");

    // Get Facebook account
    const facebookAccount = await prisma.socialAccount.findFirst({
      where: { platform: "FACEBOOK", accessToken: { not: "" } },
      select: { accessToken: true, name: true },
    });

    if (!facebookAccount) {
      console.log("❌ No Facebook account found");
      return;
    }

    // Get all published posts with platform IDs
    const publishedPosts = await prisma.postSocialAccount.findMany({
      where: {
        socialAccount: { platform: "FACEBOOK" },
        status: "PUBLISHED",
        platformPostId: { not: null },
      },
      include: {
        post: {
          select: { content: true },
        },
        analytics: {
          orderBy: { recordedAt: "desc" },
          take: 1,
        },
      },
    });

    console.log(
      `📊 Found ${publishedPosts.length} published Facebook posts with platform IDs\n`
    );

    for (const psa of publishedPosts) {
      const postId = psa.platformPostId!;
      const postContent = psa.post.content.substring(0, 50) + "...";

      console.log(`🔍 Testing post: ${postContent}`);
      console.log(`   Platform Post ID: ${postId}`);

      // Check current analytics from DB
      if (psa.analytics.length > 0) {
        const dbAnalytics = psa.analytics[0];
        console.log(
          `   📊 DB Analytics: ${dbAnalytics.likes} likes, ${dbAnalytics.views} views`
        );
      } else {
        console.log(`   📊 DB Analytics: No data`);
      }

      try {
        // Test direct Facebook API call
        console.log(`   🌐 Testing direct Facebook API...`);

        // First, get basic post info to see if it has reactions
        const basicResponse = await axios.get(
          `https://graph.facebook.com/v18.0/${postId}`,
          {
            params: {
              access_token: facebookAccount.accessToken,
              fields:
                "id,message,created_time,likes.summary(true),reactions.summary(true)",
            },
          }
        );

        console.log(`   📝 Post data:`, {
          id: basicResponse.data.id,
          likesCount: basicResponse.data.likes?.summary?.total_count || 0,
          reactionsCount:
            basicResponse.data.reactions?.summary?.total_count || 0,
        });

        // Now test insights
        const insightsResponse = await axios.get(
          `https://graph.facebook.com/v18.0/${postId}`,
          {
            params: {
              access_token: facebookAccount.accessToken,
              fields:
                "insights.metric(post_reactions_like_total,post_reactions_love_total,post_reactions_wow_total,post_reactions_haha_total,post_reactions_sorry_total,post_reactions_anger_total,post_impressions,post_clicks)",
            },
          }
        );

        console.log(`   📈 Insights data:`);
        if (insightsResponse.data.insights?.data) {
          insightsResponse.data.insights.data.forEach((insight: any) => {
            const value = insight.values?.[0]?.value || 0;
            console.log(`      ${insight.name}: ${value}`);
          });
        } else {
          console.log(`      No insights data available`);
        }
      } catch (error: any) {
        console.log(
          `   ❌ API Error: ${error.response?.data?.error?.message || error.message}`
        );
      }

      console.log(""); // Empty line for separation
    }
  } catch (error: any) {
    console.error("💥 Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

debugPostLikes();
