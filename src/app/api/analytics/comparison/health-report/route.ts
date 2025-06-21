import { NextRequest, NextResponse } from "next/server";
import { AnalyticsComparisonService } from "@/lib/services/analytics/core/analytics-comparison.service";
import { prisma } from "@/lib/prisma/client";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const daysToCheck = parseInt(searchParams.get("daysToCheck") || "7");

    const service = new AnalyticsComparisonService(prisma);
    const healthReport = await service.getDuplicateHealthReport(daysToCheck);

    return NextResponse.json(healthReport);
  } catch (error) {
    console.error("❌ Error fetching health report:", error);
    return NextResponse.json(
      { error: "Failed to fetch health report" },
      { status: 500 }
    );
  }
}
