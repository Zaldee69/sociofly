import { NextRequest, NextResponse } from "next/server";
import { AnalyticsComparisonService } from "@/lib/services/analytics-comparison.service";
import { prisma } from "@/lib/prisma/client";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { socialAccountId, daysToCheck = 7 } = body;

    const service = new AnalyticsComparisonService(prisma);
    const result = await service.autoCleanupDuplicates(
      socialAccountId,
      daysToCheck
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("❌ Error running auto cleanup:", error);
    return NextResponse.json(
      { error: "Failed to run auto cleanup" },
      { status: 500 }
    );
  }
}
