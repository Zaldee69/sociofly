import { createTRPCRouter } from "../trpc";
import { analyticsComparisonRouter } from "./analytics-comparison";
import { analyticsDatabaseRouter } from "./analytics-database";
import { hotspotsRouter } from "./hotspots";

/**
 * Unified Analytics Router - SIMPLIFIED VERSION
 *
 * Organized analytics functionality:
 * - database: Database-only queries (fast, optimized for UI)
 * - comparison: Growth analysis and trends
 * - hotspots: Engagement hotspots analysis
 *
 * REMOVED:
 * - collection/realtime router (functionality moved to sync system)
 * - Redundant endpoints consolidated
 */
export const analyticsRouter = createTRPCRouter({
  // Database-only queries (optimized for frontend, no API calls)
  database: analyticsDatabaseRouter,

  // Comparison and growth analysis
  comparison: analyticsComparisonRouter,

  // Hotspots analysis
  hotspots: hotspotsRouter,
});
