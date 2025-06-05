#!/usr/bin/env tsx

import { PrismaClient } from "@prisma/client";
import { RealSocialAnalyticsService } from "../src/lib/services/social-analytics/real-analytics-service";

const prisma = new PrismaClient();

async function debugDetailedError() {
  try {
    console.log("🔍 Debugging detailed error...\n");

    const analyticsService = new RealSocialAnalyticsService(prisma);

    // Get a specific post that has likes
    const testPost = await prisma.postSocialAccount.findFirst({
      where: {
        socialAccount: { platform: "FACEBOOK" },
        status: "PUBLISHED",
        platformPostId: "592561457281696_122116138232857848", // The post we know has 1 like
      },
    });

    if (!testPost) {
      console.log("❌ Test post not found");
      return;
    }

    console.log(`🧪 Testing post: ${testPost.platformPostId}`);

    // Try to collect analytics
    const result = await analyticsService.collectPostAnalytics(testPost.postId);

    console.log("📊 Collection Result:", {
      success: result.success,
      resultsCount: result.results.length,
      errorsCount: result.errors.length,
    });

    if (result.results.length > 0) {
      result.results.forEach((res, index) => {
        console.log(`📈 Result ${index + 1}:`, {
          success: res.success,
          data: res.data
            ? {
                likes: res.data.likes,
                views: res.data.views,
                engagement: res.data.engagement,
              }
            : null,
          error: res.error
            ? {
                code: res.error.code,
                message: res.error.message,
                type: res.error.type,
              }
            : null,
        });
      });
    }

    if (result.errors.length > 0) {
      result.errors.forEach((error, index) => {
        console.log(`🚨 Error ${index + 1}:`, {
          platform: error.platform,
          code: error.code,
          message: error.message,
          type: error.type,
        });
      });
    }
  } catch (error: any) {
    console.error("💥 Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

debugDetailedError();
