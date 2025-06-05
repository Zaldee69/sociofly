#!/usr/bin/env tsx

import { PrismaClient } from "@prisma/client";
import axios from "axios";

const prisma = new PrismaClient();

async function testIndividualMetrics() {
  try {
    console.log("🧪 Testing individual Facebook metrics...\n");

    // Get Facebook account and post
    const facebookAccount = await prisma.socialAccount.findFirst({
      where: { platform: "FACEBOOK", accessToken: { not: "" } },
      select: { accessToken: true },
    });

    const publishedPost = await prisma.postSocialAccount.findFirst({
      where: {
        socialAccount: { platform: "FACEBOOK" },
        status: "PUBLISHED",
        platformPostId: { not: null },
      },
    });

    if (!facebookAccount || !publishedPost) {
      console.log("❌ Missing Facebook account or published post");
      return;
    }

    const postId = publishedPost.platformPostId!;
    const accessToken = facebookAccount.accessToken;

    // Test individual metrics
    const metricsToTest = [
      "post_impressions",
      "post_impressions_unique",
      "post_impressions_paid",
      "post_impressions_organic",
      "post_clicks",
      "post_reactions_like_total",
      "post_reactions_love_total",
      "post_reactions_wow_total",
      "post_reactions_haha_total",
      "post_reactions_sorry_total",
      "post_reactions_anger_total",
    ];

    const validMetrics: string[] = [];
    const invalidMetrics: string[] = [];

    for (const metric of metricsToTest) {
      try {
        console.log(`Testing: ${metric}...`);

        const response = await axios.get(
          `https://graph.facebook.com/v18.0/${postId}`,
          {
            params: {
              access_token: accessToken,
              fields: `insights.metric(${metric})`,
            },
          }
        );

        if (response.data.insights?.data?.length > 0) {
          const value = response.data.insights.data[0].values?.[0]?.value || 0;
          console.log(`✅ ${metric}: ${value}`);
          validMetrics.push(metric);
        } else {
          console.log(`⚠️  ${metric}: No data`);
          validMetrics.push(metric); // Still valid, just no data
        }
      } catch (error: any) {
        console.log(
          `❌ ${metric}: ${error.response?.data?.error?.message || error.message}`
        );
        invalidMetrics.push(metric);
      }
    }

    console.log(`\n📊 Results:`);
    console.log(`✅ Valid metrics (${validMetrics.length}):`, validMetrics);
    console.log(
      `❌ Invalid metrics (${invalidMetrics.length}):`,
      invalidMetrics
    );

    if (validMetrics.length > 0) {
      console.log(`\n🎯 Recommended metrics for Facebook client:`);
      console.log(`"${validMetrics.join('","')}"`);
    }
  } catch (error: any) {
    console.error("💥 Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

testIndividualMetrics();
