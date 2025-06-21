/**
 * Enhanced Analytics API Route - Phase 4
 * Provides advanced analytics with database integration, caching, and insights
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { PrismaClient } from "@prisma/client";
import {
  createEnhancedAnalyticsManager,
  EnhancedCollectionOptions,
} from "@/lib/services/analytics/advanced/enhanced-analytics-manager";
const prisma = new PrismaClient();

interface PlatformCredentials {
  accessToken: string;
  profileId: string;
  userId: string;
}

interface EnhancedAnalyticsRequest {
  socialAccountId: string;
  platform: "instagram" | "facebook";
  options?: {
    days_back?: number;
    storeInDatabase?: boolean;
    useCache?: boolean;
    generateInsights?: boolean;
    compareWithPrevious?: boolean;
    include_posts?: boolean;
  };
}

/**
 * POST /api/analytics-v2/enhanced
 * Collect enhanced analytics with advanced features
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    console.log("📊 Enhanced Analytics API - Starting request");

    // Check authentication
    const authResult = await auth();
    const userId = authResult?.userId;
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Parse request body
    const body: EnhancedAnalyticsRequest = await request.json();
    const { socialAccountId, platform, options = {} } = body;

    // Validate required fields
    if (!socialAccountId || !platform) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields: socialAccountId, platform",
        },
        { status: 400 }
      );
    }

    console.log(
      `🎯 Processing enhanced analytics for ${socialAccountId} (${platform})`
    );

    // Verify user has access to this social account
    const socialAccount = await prisma.socialAccount.findUnique({
      where: { id: socialAccountId },
      include: {
        team: {
          include: {
            memberships: {
              where: { userId },
            },
          },
        },
      },
    });

    if (!socialAccount || socialAccount.team.memberships.length === 0) {
      return NextResponse.json(
        { success: false, error: "Access denied to this social account" },
        { status: 403 }
      );
    }

    // Create enhanced analytics manager
    const manager = createEnhancedAnalyticsManager(prisma);

    // Prepare credentials
    const credentials: PlatformCredentials = {
      accessToken: socialAccount.accessToken || "",
      profileId: socialAccount.profileId || socialAccount.id,
      userId,
    };

    // Prepare enhanced collection options
    const collectionOptions: EnhancedCollectionOptions = {
      platform,
      days_back: options.days_back || 7,
      include_posts: options.include_posts ?? true,
      include_stories: false,
      limit: 20,

      // Enhanced features
      storeInDatabase: options.storeInDatabase ?? true,
      useCache: options.useCache ?? true,
      generateInsights: options.generateInsights ?? true,
      compareWithPrevious: options.compareWithPrevious ?? true,
    };

    console.log(`⚙️ Collection options:`, {
      platform,
      days_back: collectionOptions.days_back,
      storeInDatabase: collectionOptions.storeInDatabase,
      useCache: collectionOptions.useCache,
      generateInsights: collectionOptions.generateInsights,
      compareWithPrevious: collectionOptions.compareWithPrevious,
    });

    // Collect enhanced analytics
    const result = await manager.collectEnhancedAnalytics(
      socialAccountId,
      credentials,
      collectionOptions
    );

    // Close database connection
    await manager.disconnect();

    const totalTime = Date.now() - startTime;

    if (result.success) {
      console.log(`✅ Enhanced analytics successful in ${totalTime}ms`);
      console.log(`📊 Results summary:`, {
        account_followers: result.data?.account.followers,
        posts_analyzed: result.data?.posts.length,
        insights_generated: !!result.data?.insights,
        comparison_available: !!result.data?.comparison,
        cache_used: result.cache?.used,
        database_stored: result.storage?.stored,
        performance: result.performance,
      });

      return NextResponse.json({
        success: true,
        data: {
          // Account metrics
          account: {
            followers: result.data?.account.followers,
            following: result.data?.account.following,
            posts: result.data?.account.posts,
            engagement_rate: result.data?.account.engagement_rate,
            avg_reach: result.data?.account.avg_reach,
            profile_visits: result.data?.account.profile_visits,
          },

          // Post metrics (limited for API response)
          posts: result.data?.posts.slice(0, 10).map((post) => ({
            likes: post.likes,
            comments: post.comments,
            shares: post.shares,
            saves: post.saves,
            reach: post.reach,
            impressions: post.impressions,
          })),

          // Advanced insights
          insights: result.data?.insights,

          // Comparison data
          comparison: result.data?.comparison,

          // Metadata
          collected_at: new Date().toISOString(),
          cache_info: result.cache,
          storage_info: result.storage,
          performance: {
            ...result.performance,
            api_total_time: totalTime,
          },
        },
      });
    } else {
      console.error(`❌ Enhanced analytics failed: ${result.error}`);
      return NextResponse.json(
        {
          success: false,
          error: result.error || "Analytics collection failed",
          performance: {
            ...result.performance,
            api_total_time: totalTime,
          },
        },
        { status: 500 }
      );
    }
  } catch (error) {
    const totalTime = Date.now() - startTime;
    console.error("❌ Enhanced Analytics API error:", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
        performance: {
          api_total_time: totalTime,
        },
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * GET /api/analytics-v2/enhanced?accountId=xxx&platform=xxx
 * Get cached analytics or lightweight summary
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const socialAccountId = searchParams.get("socialAccountId");
    const days = parseInt(searchParams.get("days") || "30");
    const useCache = searchParams.get("useCache") !== "false";

    if (!socialAccountId) {
      return NextResponse.json(
        { error: "socialAccountId parameter is required" },
        { status: 400 }
      );
    }

    // Verify user has access to this social account
    const socialAccount = await prisma.socialAccount.findFirst({
      where: {
        id: socialAccountId,
        team: {
          memberships: {
            some: { userId },
          },
        },
      },
    });

    if (!socialAccount) {
      return NextResponse.json(
        { error: "Social account not found or access denied" },
        { status: 404 }
      );
    }

    console.log(`🚀 Enhanced API endpoint for ${socialAccount.name}`);

    // Use Enhanced Analytics Manager
    const manager = createEnhancedAnalyticsManager(prisma);

    const credentials = {
      accessToken: socialAccount.accessToken,
      userId: userId,
      accountId: socialAccount.profileId || socialAccount.id,
    };

    const result = await manager.collectEnhancedAnalytics(
      socialAccountId,
      credentials,
      {
        platform: socialAccount.platform.toLowerCase() as
          | "instagram"
          | "facebook",
        days_back: Math.min(days, 30),
        include_posts: true,
        include_stories: false,
        limit: 20,

        // Enhanced features
        storeInDatabase: true,
        useCache,
        generateInsights: true,
        compareWithPrevious: true,
      }
    );

    await manager.disconnect();

    if (!result.success) {
      return NextResponse.json(
        {
          error: "Enhanced analytics collection failed",
          details: result.error,
        },
        { status: 500 }
      );
    }

    // Transform to format compatible with existing components
    const enhancedResponse = {
      success: true,
      source: "enhanced_analytics_v4",
      performance: result.performance,
      cache: result.cache,

      // Core data (compatible with existing UI)
      data: {
        // Account metrics
        followersCount: result.data!.account.followers,
        followingCount: result.data!.account.following || 0,
        mediaCount: result.data!.account.posts,
        engagementRate: result.data!.account.engagement_rate,
        avgReachPerPost: result.data!.account.avg_reach || 0,
        profileVisits: result.data!.account.profile_visits || 0,

        // Enhanced insights (Phase 4 exclusive)
        insights: result.data!.insights,

        // Comparison data
        comparison: result.data!.comparison,

        // Recent posts
        recentPosts: result.data!.posts.slice(0, 10).map((post, index) => ({
          id: `post_${index}`,
          content: `Post ${index + 1}`, // Simple post identifier
          likes: post.likes,
          comments: post.comments,
          shares: post.shares,
          saves: post.saves,
          reach: post.reach,
          impressions: post.impressions,
          engagement:
            ((post.likes + post.comments + post.shares + post.saves) /
              post.reach) *
              100 || 0,
          engagementRate:
            ((post.likes + post.comments + post.shares + post.saves) /
              Math.max(post.reach, 1)) *
            100,
        })),

        // Growth data for charts (formatted for existing components)
        growthData: result.data!.comparison
          ? {
              followers: {
                current: result.data!.comparison.changes.followers.current,
                previous: result.data!.comparison.changes.followers.previous,
                change: result.data!.comparison.changes.followers.change,
                changePercent:
                  result.data!.comparison.changes.followers.change_percent,
                trend:
                  result.data!.comparison.changes.followers.change > 0
                    ? "up"
                    : result.data!.comparison.changes.followers.change < 0
                      ? "down"
                      : "stable",
              },
              engagement: {
                current:
                  result.data!.comparison.changes.engagement_rate.current,
                previous:
                  result.data!.comparison.changes.engagement_rate.previous,
                change: result.data!.comparison.changes.engagement_rate.change,
                changePercent:
                  result.data!.comparison.changes.engagement_rate
                    .change_percent,
                trend:
                  result.data!.comparison.changes.engagement_rate.change > 0
                    ? "up"
                    : result.data!.comparison.changes.engagement_rate.change < 0
                      ? "down"
                      : "stable",
              },
              reach: {
                current: result.data!.comparison.changes.avg_reach.current,
                previous: result.data!.comparison.changes.avg_reach.previous,
                change: result.data!.comparison.changes.avg_reach.change,
                changePercent:
                  result.data!.comparison.changes.avg_reach.change_percent,
                trend:
                  result.data!.comparison.changes.avg_reach.change > 0
                    ? "up"
                    : result.data!.comparison.changes.avg_reach.change < 0
                      ? "down"
                      : "stable",
              },
            }
          : null,

        // Performance summary
        performanceSummary: result.data!.comparison?.performance_summary,

        // Metadata
        collectedAt: new Date(),
        accountInfo: {
          id: socialAccount.id,
          name: socialAccount.name,
          platform: socialAccount.platform,
        },
      },
    };

    console.log(
      `✅ Enhanced analytics API successful for ${socialAccount.name}`
    );

    return NextResponse.json(enhancedResponse);
  } catch (error) {
    console.error("❌ Enhanced analytics API error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
