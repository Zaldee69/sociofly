import { RedisManager } from "./redis-manager";
import { PrismaClient } from "@prisma/client";

interface AdminStats {
  publishedToday: number;
  scheduledPosts: number;
  failedPosts: number;
  pendingApprovals: number;
  overdueApprovals: number;
  totalPosts: number;
  lastUpdated: string;
}

export class AdminCacheService {
  private static instance: AdminCacheService;
  private redisManager: RedisManager;
  private prisma: PrismaClient;
  private readonly CACHE_KEY = "admin:dashboard:stats";
  private readonly CACHE_TTL = 300; // 5 minutes
  private readonly FALLBACK_TTL = 60; // 1 minute for fallback data

  private constructor() {
    this.redisManager = RedisManager.getInstance();
    this.prisma = new PrismaClient();
  }

  public static getInstance(): AdminCacheService {
    if (!AdminCacheService.instance) {
      AdminCacheService.instance = new AdminCacheService();
      // Initialize Redis connection if not already done
      AdminCacheService.instance.initializeRedis();
    }
    return AdminCacheService.instance;
  }

  /**
   * Initialize Redis connection
   */
  private async initializeRedis(): Promise<void> {
    try {
      if (!this.redisManager.isAvailable()) {
        console.log("🔗 Initializing Redis for AdminCacheService...");
        await this.redisManager.initialize();
      }
    } catch (error) {
      console.error("Failed to initialize Redis for AdminCacheService:", error);
    }
  }

  /**
   * Get admin stats with Redis caching
   */
  async getAdminStats(): Promise<AdminStats> {
    try {
      // Try to get from cache first
      const cachedStats = await this.getCachedStats();
      if (cachedStats) {
        console.log("📊 Admin stats served from Redis cache");
        return cachedStats;
      }

      // If not in cache, fetch from database
      console.log("🔄 Fetching admin stats from database");
      const freshStats = await this.fetchStatsFromDatabase();

      // Cache the fresh data
      await this.setCachedStats(freshStats);

      return freshStats;
    } catch (error) {
      console.error("Error getting admin stats:", error);

      // Return fallback data if everything fails
      return this.getFallbackStats();
    }
  }

  /**
   * Force refresh admin stats and update cache
   */
  async refreshAdminStats(): Promise<AdminStats> {
    try {
      console.log("🔄 Force refreshing admin stats");
      const freshStats = await this.fetchStatsFromDatabase();
      await this.setCachedStats(freshStats);
      return freshStats;
    } catch (error) {
      console.error("Error refreshing admin stats:", error);
      return this.getFallbackStats();
    }
  }

  /**
   * Get stats from Redis cache
   */
  private async getCachedStats(): Promise<AdminStats | null> {
    try {
      if (!this.redisManager.isAvailable()) {
        return null;
      }

      const connection = this.redisManager.getConnection();
      if (!connection) {
        return null;
      }

      const cached = await connection.get(this.CACHE_KEY);
      if (!cached) {
        return null;
      }

      const stats = JSON.parse(cached) as AdminStats;

      // Check if cache is still valid (additional safety check)
      const cacheAge = Date.now() - new Date(stats.lastUpdated).getTime();
      if (cacheAge > this.CACHE_TTL * 1000) {
        console.log("⚠️ Cache expired, removing stale data");
        await connection.del(this.CACHE_KEY);
        return null;
      }

      return stats;
    } catch (error) {
      console.error("Error getting cached stats:", error);
      return null;
    }
  }

  /**
   * Set stats in Redis cache
   */
  private async setCachedStats(stats: AdminStats): Promise<void> {
    try {
      if (!this.redisManager.isAvailable()) {
        console.log("⚠️ Redis not available, skipping cache");
        return;
      }

      const connection = this.redisManager.getConnection();
      if (!connection) {
        return;
      }

      const statsWithTimestamp = {
        ...stats,
        lastUpdated: new Date().toISOString(),
      };

      await connection.setex(
        this.CACHE_KEY,
        this.CACHE_TTL,
        JSON.stringify(statsWithTimestamp)
      );

      console.log(`✅ Admin stats cached for ${this.CACHE_TTL} seconds`);
    } catch (error) {
      console.error("Error setting cached stats:", error);
    }
  }

  /**
   * Fetch fresh stats from database
   */
  private async fetchStatsFromDatabase(): Promise<AdminStats> {
    // Get today's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get post stats with optimized queries
    const [
      publishedToday,
      scheduledPosts,
      failedPosts,
      pendingApprovals,
      overdueApprovals,
      totalPosts,
    ] = await Promise.all([
      // Published today
      this.prisma.postSocialAccount.count({
        where: {
          publishedAt: {
            gte: today,
            lt: tomorrow,
          },
          status: "PUBLISHED",
        },
      }),

      // Scheduled posts
      this.prisma.post.count({
        where: {
          status: "SCHEDULED",
        },
      }),

      // Failed posts
      this.prisma.postSocialAccount.count({
        where: {
          status: "FAILED",
        },
      }),

      // Pending approvals
      this.prisma.approvalInstance.count({
        where: {
          status: "IN_PROGRESS",
        },
      }),

      // Overdue approvals (>24h)
      this.prisma.approvalInstance.count({
        where: {
          status: "IN_PROGRESS",
          createdAt: {
            lt: new Date(Date.now() - 24 * 60 * 60 * 1000),
          },
        },
      }),

      // Total posts
      this.prisma.post.count(),
    ]);

    return {
      publishedToday,
      scheduledPosts,
      failedPosts,
      pendingApprovals,
      overdueApprovals,
      totalPosts,
      lastUpdated: new Date().toISOString(),
    };
  }

  /**
   * Get fallback stats when everything fails
   */
  private getFallbackStats(): AdminStats {
    return {
      publishedToday: 0,
      scheduledPosts: 0,
      failedPosts: 0,
      pendingApprovals: 0,
      overdueApprovals: 0,
      totalPosts: 0,
      lastUpdated: new Date().toISOString(),
    };
  }

  /**
   * Clear admin stats cache
   */
  async clearCache(): Promise<void> {
    try {
      if (!this.redisManager.isAvailable()) {
        return;
      }

      const connection = this.redisManager.getConnection();
      if (!connection) {
        return;
      }

      await connection.del(this.CACHE_KEY);
      console.log("🗑️ Admin stats cache cleared");
    } catch (error) {
      console.error("Error clearing cache:", error);
    }
  }

  /**
   * Get cache status and metadata
   */
  async getCacheStatus(): Promise<{
    isCached: boolean;
    lastUpdated?: string;
    ttl?: number;
  }> {
    try {
      if (!this.redisManager.isAvailable()) {
        return { isCached: false };
      }

      const connection = this.redisManager.getConnection();
      if (!connection) {
        return { isCached: false };
      }

      const [cached, ttl] = await Promise.all([
        connection.get(this.CACHE_KEY),
        connection.ttl(this.CACHE_KEY),
      ]);

      if (!cached) {
        return { isCached: false };
      }

      const stats = JSON.parse(cached) as AdminStats;
      return {
        isCached: true,
        lastUpdated: stats.lastUpdated,
        ttl: ttl > 0 ? ttl : undefined,
      };
    } catch (error) {
      console.error("Error getting cache status:", error);
      return { isCached: false };
    }
  }

  /**
   * Cleanup method
   */
  async cleanup(): Promise<void> {
    try {
      await this.prisma.$disconnect();
    } catch (error) {
      console.error("Error during cleanup:", error);
    }
  }
}

// Export singleton instance
export const adminCacheService = AdminCacheService.getInstance();
