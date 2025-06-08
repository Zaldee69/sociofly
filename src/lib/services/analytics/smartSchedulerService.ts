import { PrismaClient, PostSocialAccount, PostAnalytics } from "@prisma/client";
import { addDays, subDays, startOfDay } from "date-fns";

interface HeatmapCell {
  totalScore: number;
  count: number;
}

type Heatmap = Map<number, Map<number, HeatmapCell>>;

// Get prisma instance
const prisma = new PrismaClient();

/**
 * Analyzes historical post data to identify optimal posting times
 * and stores the results in the EngagementHotspot table.
 *
 * @param socialAccountId - The ID of the social account to analyze
 * @returns void
 */
export async function analyzeAndStoreHotspots(
  socialAccountId: string
): Promise<void> {
  try {
    // First, get the social account to verify it exists and get its teamId
    const socialAccount = await prisma.socialAccount.findUnique({
      where: { id: socialAccountId },
      select: { teamId: true },
    });

    if (!socialAccount) {
      console.error(`Social account ${socialAccountId} not found`);
      return;
    }

    // Get posts from the last 90 days with their analytics
    const startDate = subDays(startOfDay(new Date()), 90);
    const posts = await prisma.postSocialAccount.findMany({
      where: {
        socialAccountId,
        publishedAt: {
          gte: startDate,
        },
        status: "PUBLISHED",
      },
      include: {
        analytics: true,
      },
    });

    // Initialize heatmap for each day of week and hour
    const heatmap: Heatmap = new Map();
    for (let day = 0; day < 7; day++) {
      heatmap.set(day, new Map());
      for (let hour = 0; hour < 24; hour++) {
        heatmap.get(day)!.set(hour, { totalScore: 0, count: 0 });
      }
    }

    // Process each post
    posts.forEach(
      (post: PostSocialAccount & { analytics: PostAnalytics[] }) => {
        if (!post.publishedAt || !post.analytics.length) return;

        const publishDate = new Date(post.publishedAt);
        const dayOfWeek = publishDate.getUTCDay(); // 0 = Sunday
        const hourOfDay = publishDate.getUTCHours();

        // Get the most recent analytics for this post
        const latestAnalytics = post.analytics.reduce(
          (latest: PostAnalytics | null, current: PostAnalytics) => {
            return !latest || current.recordedAt > latest.recordedAt
              ? current
              : latest;
          },
          null
        );

        if (!latestAnalytics) return;

        // Calculate engagement score (weighted average of different metrics)
        const engagementScore = calculateEngagementScore(latestAnalytics);

        // Update heatmap
        const cell = heatmap.get(dayOfWeek)!.get(hourOfDay)!;
        cell.totalScore += engagementScore;
        cell.count += 1;
      }
    );

    // Convert heatmap to hotspots and store in database
    const hotspots = [];
    for (const [dayOfWeek, hours] of heatmap.entries()) {
      for (const [hourOfDay, data] of hours.entries()) {
        const score = data.count > 0 ? data.totalScore / data.count : 0;
        hotspots.push({
          teamId: socialAccount.teamId,
          socialAccountId,
          dayOfWeek,
          hourOfDay,
          score: normalizeScore(score),
          updatedAt: new Date(),
        });
      }
    }

    // Use transaction to update all hotspots atomically
    await prisma.$transaction([
      // Delete existing hotspots for this account
      prisma.engagementHotspot.deleteMany({
        where: { socialAccountId },
      }),
      // Insert new hotspots
      prisma.engagementHotspot.createMany({
        data: hotspots,
      }),
    ]);
  } catch (error) {
    console.error("Error analyzing hotspots:", error);
    throw error;
  }
}

function calculateEngagementScore(analytics: PostAnalytics): number {
  const { engagement, likes, comments, shares, clicks, reach, impressions } =
    analytics;

  // Base score is the engagement rate
  let score = engagement * 100;

  // Add weighted contributions from other metrics
  if (reach > 0) {
    score += ((likes + comments * 2 + shares * 3) / reach) * 100;
  }

  if (impressions > 0) {
    score += (clicks / impressions) * 100;
  }

  return score;
}

function normalizeScore(score: number): number {
  // Normalize score to 0-100 range
  // You might want to adjust these bounds based on your data
  const MIN_SCORE = 0;
  const MAX_SCORE = 200; // Assuming max possible score from calculateEngagementScore

  return Math.min(
    100,
    Math.max(0, ((score - MIN_SCORE) / (MAX_SCORE - MIN_SCORE)) * 100)
  );
}
