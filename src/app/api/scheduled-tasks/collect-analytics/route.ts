import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma/client";
import { SchedulerService } from "../../../../lib/services/scheduler.service";

export async function POST(request: NextRequest) {
  try {
    // Verify authorization (you might want to add API key or other auth)
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { teamId, socialAccountId, action } = body;

    if (action === "schedule-team" && teamId) {
      // Run analytics for all accounts in a team
      const result = await SchedulerService.runAccountInsightsForAllAccounts();

      return NextResponse.json({
        success: true,
        message: `Analytics collection completed for ${result.success} of ${result.total} accounts`,
        data: result,
      });
    }

    if (action === "schedule-account" && socialAccountId) {
      // Run analytics for a specific account
      const account = await prisma.socialAccount.findUnique({
        where: { id: socialAccountId },
        select: {
          id: true,
          platform: true,
          name: true,
          teamId: true,
        },
      });

      if (!account) {
        return NextResponse.json(
          { error: "Social account not found" },
          { status: 404 }
        );
      }

      try {
        // Fetch account insights
        await SchedulerService.fetchInitialAccountInsights(account.id);

        // Fetch heatmap data for engagement hotspots
        await SchedulerService.fetchInitialHeatmapData(account.id);

        return NextResponse.json({
          success: true,
          message: `Analytics collection completed for ${account.name}`,
          data: { accountId: account.id, platform: account.platform },
        });
      } catch (error: any) {
        return NextResponse.json(
          { error: "Failed to collect analytics", details: error.message },
          { status: 500 }
        );
      }
    }

    if (action === "schedule-all") {
      // Run analytics for all teams
      try {
        const result =
          await SchedulerService.runAccountInsightsForAllAccounts();

        return NextResponse.json({
          success: true,
          message: `Analytics collection completed for ${result.success} of ${result.total} accounts`,
          data: result,
        });
      } catch (error: any) {
        console.error("Failed to run analytics for all accounts:", error);
        return NextResponse.json(
          {
            error: "Failed to run analytics collection",
            details: error.message,
          },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(
      {
        error:
          "Invalid action. Use 'schedule-team', 'schedule-account', or 'schedule-all'",
      },
      { status: 400 }
    );
  } catch (error: any) {
    console.error("Analytics scheduling error:", error);
    return NextResponse.json(
      {
        error: "Failed to schedule analytics collection",
        details: error.message,
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get analytics collection status and stats
    const url = new URL(request.url);
    const teamId = url.searchParams.get("teamId");

    if (!teamId) {
      return NextResponse.json(
        { error: "teamId parameter is required" },
        { status: 400 }
      );
    }

    // Get recent analytics collection stats
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000); // Last 24 hours

    const recentAnalytics = await prisma.accountAnalytics.findMany({
      where: {
        recordedAt: { gte: since },
        socialAccount: {
          teamId,
        },
      },
      include: {
        socialAccount: {
          select: {
            id: true,
            name: true,
            platform: true,
          },
        },
      },
      orderBy: { recordedAt: "desc" },
    });

    // Group by social account
    const accountStats = recentAnalytics.reduce(
      (acc, analytics) => {
        const accountId = analytics.socialAccountId;
        if (!acc[accountId]) {
          acc[accountId] = {
            accountId,
            accountName: analytics.socialAccount.name,
            platform: analytics.socialAccount.platform,
            lastCollection: analytics.recordedAt,
            collectionsCount: 0,
          };
        }
        acc[accountId].collectionsCount++;
        return acc;
      },
      {} as Record<string, any>
    );

    return NextResponse.json({
      success: true,
      data: {
        teamId,
        period: "24 hours",
        totalCollections: recentAnalytics.length,
        accountsWithData: Object.keys(accountStats).length,
        accounts: Object.values(accountStats),
      },
    });
  } catch (error: any) {
    console.error("Analytics status error:", error);
    return NextResponse.json(
      {
        error: "Failed to get analytics status",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
