import { NextRequest, NextResponse } from "next/server";
import { AnalyticsComparisonService } from "@/lib/services/analytics/core/analytics-comparison.service";
import { prisma } from "@/lib/prisma/client";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { socialAccountId, analyticsData, options } = body;

    if (!socialAccountId || !analyticsData) {
      return NextResponse.json(
        { error: "socialAccountId and analyticsData are required" },
        { status: 400 }
      );
    }

    const service = new AnalyticsComparisonService(prisma);
    const result = await service.collectAnalyticsDataSafely(
      socialAccountId,
      analyticsData,
      options
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("❌ Error collecting analytics data safely:", error);
    return NextResponse.json(
      { error: "Failed to collect analytics data safely" },
      { status: 500 }
    );
  }
}
