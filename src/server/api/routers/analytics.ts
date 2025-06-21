import { createTRPCRouter } from "../trpc";
import { realAnalyticsRouter } from "./real-analytics";
import { analyticsComparisonRouter } from "./analytics-comparison";
import { analyticsDatabaseRouter } from "./analytics-database";
import { hotspotsRouter } from "./hotspots";

/**
 * Unified Analytics Router
 *
 * Combines all analytics-related functionality:
 * - realtime: Real-time API data collection
 * - comparison: Growth comparison and trends
 * - database: Database-only queries (optimized)
 * - hotspots: Engagement hotspots analysis
 */
export const analyticsRouter = createTRPCRouter({
  // Real-time analytics (for manual collection)
  realtime: realAnalyticsRouter,

  // Comparison and growth analysis
  comparison: analyticsComparisonRouter,

  // Database-only queries (optimized for frontend)
  database: analyticsDatabaseRouter,

  // Hotspots analysis
  hotspots: hotspotsRouter,
});
