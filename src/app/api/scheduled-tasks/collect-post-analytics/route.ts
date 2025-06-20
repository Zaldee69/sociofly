import { NextRequest, NextResponse } from "next/server";
import { RealSocialAnalyticsService } from "@/lib/services/social-analytics/real-analytics-service";
import { prisma } from "@/lib/prisma/client";
import { currentUser } from "@clerk/nextjs/server";

/**
 * Manual trigger for collecting post analytics
 * POST /api/scheduled-tasks/collect-post-analytics
 */
export async function POST(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { postId, teamId, platforms } = body;

    if (!postId) {
      return NextResponse.json(
        { error: "Post ID is required" },
        { status: 400 }
      );
    }

    console.log(`🔄 Manual analytics collection triggered for post ${postId}`);

    const analyticsService = new RealSocialAnalyticsService(prisma);
    const result = await analyticsService.collectPostAnalytics(postId);

    return NextResponse.json({
      success: result.success,
      message: result.success
        ? `Analytics collected successfully for ${result.results.length} platforms`
        : `Analytics collection completed with ${result.errors.length} errors`,
      results: {
        successCount: result.results.filter((r) => r.success).length,
        errorCount: result.errors.length,
        platforms: result.results.map((r) => ({
          success: r.success,
          platform: r.data?.platform || r.error?.platform,
          error: r.error?.message,
        })),
      },
    });
  } catch (error: any) {
    console.error("Manual analytics collection failed:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Analytics collection failed",
        details: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * Get analytics collection status for a post
 * GET /api/scheduled-tasks/collect-post-analytics?postId=xxx
 */
export async function GET(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const postId = searchParams.get("postId");

    if (!postId) {
      return NextResponse.json(
        { error: "Post ID is required" },
        { status: 400 }
      );
    }

    // Check if post exists and user has access
    const post = await prisma.post.findUnique({
      where: { id: postId },
      include: {
        team: {
          include: {
            memberships: {
              where: { userId: user.id },
            },
          },
        },
        postSocialAccounts: {
          include: {
            socialAccount: true,
            analytics: {
              orderBy: { recordedAt: "desc" },
              take: 1,
            },
          },
        },
      },
    });

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    if (post.team.memberships.length === 0) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Calculate analytics status
    const platformStatus = post.postSocialAccounts.map((psa) => ({
      platform: psa.socialAccount.platform,
      accountName: psa.socialAccount.name,
      hasAnalytics: psa.analytics.length > 0,
      lastCollected: psa.analytics[0]?.recordedAt || null,
      status: psa.status,
      platformPostId: psa.platformPostId,
    }));

    const totalPlatforms = platformStatus.length;
    const platformsWithAnalytics = platformStatus.filter(
      (p) => p.hasAnalytics
    ).length;

    return NextResponse.json({
      success: true,
      post: {
        id: post.id,
        status: post.status,
        publishedAt: post.publishedAt,
        content: post.content.substring(0, 100) + "...",
      },
      analytics: {
        totalPlatforms,
        platformsWithAnalytics,
        coveragePercentage:
          totalPlatforms > 0
            ? Math.round((platformsWithAnalytics / totalPlatforms) * 100)
            : 0,
        platforms: platformStatus,
      },
    });
  } catch (error: any) {
    console.error("Failed to get analytics status:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to get analytics status",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
