#!/usr/bin/env tsx

import { PrismaClient } from "@prisma/client";
import axios from "axios";

const prisma = new PrismaClient();

async function debugFacebookAPI() {
  try {
    console.log("🔍 Debugging Facebook API calls...\n");

    // Get a Facebook account with credentials
    const facebookAccount = await prisma.socialAccount.findFirst({
      where: {
        platform: "FACEBOOK",
        accessToken: { not: "" },
      },
      select: {
        id: true,
        name: true,
        accessToken: true,
        profileId: true,
      },
    });

    if (!facebookAccount) {
      console.log("❌ No Facebook account found with credentials");
      return;
    }

    console.log(`📱 Testing Facebook account: ${facebookAccount.name}`);
    console.log(`   Profile ID: ${facebookAccount.profileId}`);
    console.log(
      `   Token: ${facebookAccount.accessToken.substring(0, 20)}...\n`
    );

    // Test 1: Basic token validation
    console.log("🧪 Test 1: Token validation...");
    try {
      const tokenTest = await axios.get("https://graph.facebook.com/v18.0/me", {
        params: {
          access_token: facebookAccount.accessToken,
          fields: "id,name",
        },
      });
      console.log("✅ Token is valid");
      console.log(`   User: ${tokenTest.data.name} (${tokenTest.data.id})`);
    } catch (error: any) {
      console.log("❌ Token validation failed:");
      console.log(
        `   Error: ${error.response?.data?.error?.message || error.message}`
      );
      console.log(`   Status: ${error.response?.status}`);
      console.log(`   Data:`, error.response?.data);
      return; // Stop if token is invalid
    }

    // Test 2: Get a published post with platform ID
    console.log("\n🧪 Test 2: Finding published post...");
    const publishedPost = await prisma.postSocialAccount.findFirst({
      where: {
        socialAccountId: facebookAccount.id,
        status: "PUBLISHED",
        platformPostId: { not: null },
      },
      include: {
        post: {
          select: { content: true },
        },
      },
    });

    if (!publishedPost) {
      console.log("❌ No published post found with platform ID");
      return;
    }

    console.log(
      `✅ Found published post: ${publishedPost.post.content.substring(0, 50)}...`
    );
    console.log(`   Platform Post ID: ${publishedPost.platformPostId}`);

    // Test 3: Direct Facebook Graph API call
    console.log("\n🧪 Test 3: Direct Facebook Graph API call...");
    const postId = publishedPost.platformPostId!;

    try {
      // First, try to get basic post info
      console.log("   Testing basic post info...");
      const basicInfo = await axios.get(
        `https://graph.facebook.com/v18.0/${postId}`,
        {
          params: {
            access_token: facebookAccount.accessToken,
            fields: "id,message,caption,created_time",
          },
        }
      );
      console.log("✅ Basic post info retrieved:");
      console.log(`   Post ID: ${basicInfo.data.id}`);
      console.log(
        `   Message: ${(basicInfo.data.message || basicInfo.data.caption || "No message").substring(0, 50)}...`
      );
      console.log(`   Created: ${basicInfo.data.created_time}`);

      // Now try to get insights
      console.log("\n   Testing insights...");
      const insights = [
        "post_impressions",
        "post_reach",
        "post_engaged_users",
        "post_clicks",
        "post_reactions_like_total",
        "post_comments",
        "post_shares",
      ].join(",");

      const insightsResponse = await axios.get(
        `https://graph.facebook.com/v18.0/${postId}`,
        {
          params: {
            access_token: facebookAccount.accessToken,
            fields: `insights.metric(${insights})`,
          },
        }
      );

      console.log("✅ Insights retrieved:");
      if (insightsResponse.data.insights?.data) {
        insightsResponse.data.insights.data.forEach((insight: any) => {
          console.log(
            `   ${insight.name}: ${insight.values?.[0]?.value || "N/A"}`
          );
        });
      } else {
        console.log("   No insights data found");
      }
    } catch (error: any) {
      console.log("❌ Facebook API call failed:");
      console.log(`   Status: ${error.response?.status}`);
      console.log(`   Error Code: ${error.response?.data?.error?.code}`);
      console.log(`   Error Message: ${error.response?.data?.error?.message}`);
      console.log(`   Error Type: ${error.response?.data?.error?.type}`);

      if (error.response?.data?.error?.error_subcode) {
        console.log(
          `   Error Subcode: ${error.response.data.error.error_subcode}`
        );
      }

      console.log(
        `\n   Full Error Response:`,
        JSON.stringify(error.response?.data, null, 2)
      );
    }

    console.log("\n✨ Debug completed!");
  } catch (error: any) {
    console.error("💥 Error during debug:", error);
  } finally {
    await prisma.$disconnect();
  }
}

debugFacebookAPI();
