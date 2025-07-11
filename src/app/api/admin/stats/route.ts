import { NextRequest, NextResponse } from "next/server";
import { adminCacheService } from "@/lib/services/admin-cache.service";
import { auth } from "@clerk/nextjs/server";

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");
    const forceRefresh = searchParams.get("refresh") === "true";

    switch (action) {
      case "status":
        return handleCacheStatus();
      case "refresh":
        return handleRefreshStats();
      case "clear":
        return handleClearCache();
      default:
        return handleGetStats(forceRefresh);
    }
  } catch (error) {
    console.error("Error in admin stats API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * Get admin stats (with caching)
 */
async function handleGetStats(forceRefresh: boolean = false) {
  try {
    const stats = forceRefresh
      ? await adminCacheService.refreshAdminStats()
      : await adminCacheService.getAdminStats();

    const cacheStatus = await adminCacheService.getCacheStatus();

    return NextResponse.json({
      success: true,
      data: stats,
      cache: {
        fromCache: cacheStatus.isCached && !forceRefresh,
        lastUpdated: cacheStatus.lastUpdated,
        ttl: cacheStatus.ttl,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error getting admin stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch admin stats" },
      { status: 500 }
    );
  }
}

/**
 * Force refresh admin stats
 */
async function handleRefreshStats() {
  try {
    const stats = await adminCacheService.refreshAdminStats();
    
    return NextResponse.json({
      success: true,
      message: "Admin stats refreshed successfully",
      data: stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error refreshing admin stats:", error);
    return NextResponse.json(
      { error: "Failed to refresh admin stats" },
      { status: 500 }
    );
  }
}

/**
 * Get cache status
 */
async function handleCacheStatus() {
  try {
    const cacheStatus = await adminCacheService.getCacheStatus();
    
    return NextResponse.json({
      success: true,
      data: cacheStatus,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error getting cache status:", error);
    return NextResponse.json(
      { error: "Failed to get cache status" },
      { status: 500 }
    );
  }
}

/**
 * Clear admin stats cache
 */
async function handleClearCache() {
  try {
    await adminCacheService.clearCache();
    
    return NextResponse.json({
      success: true,
      message: "Admin stats cache cleared successfully",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error clearing cache:", error);
    return NextResponse.json(
      { error: "Failed to clear cache" },
      { status: 500 }
    );
  }
}

/**
 * Handle POST requests for cache management
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { action } = body;

    switch (action) {
      case "refresh":
        return handleRefreshStats();
      case "clear":
        return handleClearCache();
      default:
        return NextResponse.json(
          { error: "Invalid action" },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Error in admin stats POST API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}