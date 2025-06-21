/**
 * Analytics V2 Collection API
 * New API that uses refactored analytics system instead of job-based approach
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createEnhancedAnalyticsManager } from "@/lib/services/analytics/advanced/enhanced-analytics-manager";
import { PrismaClient } from "@prisma/client";

export async function POST(request: NextRequest) {
  console.log("🚀 Analytics V2 Collection API called");

  try {
    // Check authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const {
      accountId,
      platform,
      accessToken,
      profileId,
      pageId,
      options = {},
    } = body;

    // Validate required fields
    if (!accountId || !platform || !accessToken) {
      return NextResponse.json(
        { error: "Missing required fields: accountId, platform, accessToken" },
        { status: 400 }
      );
    }

    // Validate platform
    if (!["instagram", "facebook"].includes(platform)) {
      return NextResponse.json(
        { error: 'Platform must be either "instagram" or "facebook"' },
        { status: 400 }
      );
    }

    console.log(
      `📊 Starting analytics collection for ${platform} account: ${accountId}`
    );

    // Create credentials object
    const credentials = {
      accessToken,
      profileId: platform === "instagram" ? profileId : undefined,
      pageId: platform === "facebook" ? pageId : undefined,
      userId: userId,
    };

    // Set default options
    const collectionOptions = {
      platform: platform as "instagram" | "facebook",
      daysBack: options.daysBack || 7,
      limit: options.limit || 25,
      includeStories: options.includeStories || false,
    };

    // Use Enhanced Analytics Manager directly
    const prisma = new PrismaClient();
    const manager = createEnhancedAnalyticsManager(prisma);

    const result = await manager.collectEnhancedAnalytics(
      accountId,
      credentials,
      {
        ...collectionOptions,
        storeInDatabase: true,
        useCache: true,
        generateInsights: true,
      }
    );

    if (result.success) {
      console.log(`✅ Analytics collection successful for ${accountId}`);

      return NextResponse.json({
        success: true,
        message: "Analytics collected successfully",
        data: {
          accountId: accountId,
          platform: platform,
          metrics: result.data || {},
          collected_at: new Date().toISOString(),
          performance: result.performance,
          cache: result.cache,
        },
      });
    } else {
      console.error(
        `❌ Analytics collection failed for ${accountId}:`,
        result.error || "Unknown error"
      );

      return NextResponse.json(
        {
          error: "Analytics collection failed",
          details: result.error || "Unknown error",
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("❌ Analytics V2 API error:", error);

    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  // Get collection status/history
  const { searchParams } = new URL(request.url);
  const accountId = searchParams.get("accountId");

  return NextResponse.json({
    message: "Analytics V2 Collection API",
    endpoints: {
      "POST /api/analytics-v2/collect": "Collect analytics data for an account",
      "GET /api/analytics-v2/collect?accountId=xxx": "Get collection status",
    },
    version: "2.0.0",
    improvements: [
      "Direct API calls instead of job queues",
      "Real-time results",
      "Better error handling",
      "Unified platform interface",
    ],
  });
}
