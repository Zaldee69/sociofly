import { NextRequest, NextResponse } from "next/server";
import { AnalyticsComparisonService } from "@/lib/services/analytics-comparison.service";
import { prisma } from "@/lib/prisma/client";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { socialAccountId, analyticsData, targetDate } = body;

    if (!socialAccountId || !analyticsData) {
      return NextResponse.json(
        { error: "socialAccountId and analyticsData are required" },
        { status: 400 }
      );
    }

    const service = new AnalyticsComparisonService(prisma);
    const result = await service.upsertAnalyticsData(
      socialAccountId,
      analyticsData,
      targetDate ? new Date(targetDate) : undefined
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("❌ Error upserting analytics data:", error);
    return NextResponse.json(
      { error: "Failed to upsert analytics data" },
      { status: 500 }
    );
  }
}
