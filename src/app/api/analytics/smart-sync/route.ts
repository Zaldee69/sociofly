import { NextRequest, NextResponse } from "next/server";
import { SmartSyncManager } from "@/lib/services/analytics/core/smart-sync-manager";
import { auth } from "@clerk/nextjs/server";

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { socialAccountId, strategy, forceStrategy = false } = body;

    if (!socialAccountId) {
      return NextResponse.json(
        { error: "socialAccountId is required" },
        { status: 400 }
      );
    }

    console.log(`🔄 Starting smart sync for account: ${socialAccountId}`);
    console.log(`📋 Strategy: ${strategy || "auto-detect"}`);

    // Execute smart sync
    const result = await SmartSyncManager.performSmartSync({
      socialAccountId,
      strategy,
      forceStrategy,
    });

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: `Smart sync completed successfully`,
        data: {
          strategy: result.strategy,
          daysCollected: result.daysCollected,
          dataPointsCollected: result.dataPointsCollected,
          nextRecommendedSync: result.nextRecommendedSync,
        },
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: "Smart sync failed",
          details: result.error,
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("Smart sync API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to execute smart sync",
        details: error.message,
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const socialAccountId = url.searchParams.get("socialAccountId");

    if (!socialAccountId) {
      return NextResponse.json(
        { error: "socialAccountId parameter is required" },
        { status: 400 }
      );
    }

    // Get sync recommendations
    const recommendations =
      await SmartSyncManager.getSyncRecommendations(socialAccountId);

    return NextResponse.json({
      success: true,
      data: recommendations,
    });
  } catch (error: any) {
    console.error("Smart sync recommendations error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to get sync recommendations",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
