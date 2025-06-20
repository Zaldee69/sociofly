import { PrismaClient } from "@prisma/client";
import type { AccountAnalytics, SocialAccount } from "@prisma/client";

interface ComparisonPeriod {
  current: Date;
  previous: Date;
  label: string;
}

interface GrowthMetrics {
  followersGrowth: {
    absolute: number;
    percentage: number;
    trend: "up" | "down" | "stable";
  };
  engagementGrowth: {
    absolute: number;
    percentage: number;
    trend: "up" | "down" | "stable";
  };
  reachGrowth: {
    absolute: number;
    percentage: number;
    trend: "up" | "down" | "stable";
  };
  postsGrowth: {
    absolute: number;
    percentage: number;
    trend: "up" | "down" | "stable";
  };
}

interface ComparisonResult {
  socialAccountId: string;
  accountName: string;
  platform: string;
  period: ComparisonPeriod;
  current: AccountAnalytics;
  previous: AccountAnalytics | null;
  growth: GrowthMetrics;
  insights: {
    bestPerformingMetric: string;
    worstPerformingMetric: string;
    overallTrend: "improving" | "declining" | "stable";
    recommendations: string[];
  };
}

export class AnalyticsComparisonService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Get comparison data for a specific social account
   */
  async getAccountComparison(
    socialAccountId: string,
    comparisonType: "week" | "month" | "quarter" = "week"
  ): Promise<ComparisonResult | null> {
    try {
      const socialAccount = await this.prisma.socialAccount.findUnique({
        where: { id: socialAccountId },
        select: { id: true, name: true, platform: true },
      });

      if (!socialAccount) {
        throw new Error("Social account not found");
      }

      const periods = this.getComparisonPeriods(comparisonType);

      // Get current and previous period data
      const currentData = await this.getDataForPeriod(
        socialAccountId,
        periods.current,
        periods.current
      );
      const previousData = await this.getDataForPeriod(
        socialAccountId,
        periods.previous,
        periods.previous
      );

      if (!currentData) {
        return null;
      }

      const growth = this.calculateGrowthMetrics(currentData, previousData);
      const insights = this.generateInsights(growth, socialAccount.platform);

      return {
        socialAccountId,
        accountName: socialAccount.name || "Unknown Account",
        platform: socialAccount.platform,
        period: {
          current: periods.current,
          previous: periods.previous,
          label: this.getPeriodLabel(comparisonType),
        },
        current: currentData,
        previous: previousData,
        growth,
        insights,
      };
    } catch (error) {
      console.error("Error in getAccountComparison:", error);
      return null;
    }
  }

  /**
   * Get comparison data for multiple accounts in a team
   */
  async getTeamComparison(
    teamId: string,
    comparisonType: "week" | "month" | "quarter" = "week"
  ): Promise<ComparisonResult[]> {
    try {
      const socialAccounts = await this.prisma.socialAccount.findMany({
        where: { teamId },
        select: { id: true, name: true, platform: true },
      });

      const comparisons: ComparisonResult[] = [];

      for (const account of socialAccounts) {
        const comparison = await this.getAccountComparison(
          account.id,
          comparisonType
        );
        if (comparison) {
          comparisons.push(comparison);
        }
      }

      return comparisons.sort((a, b) => {
        // Sort by overall performance (followers + engagement growth)
        const aScore =
          a.growth.followersGrowth.percentage +
          a.growth.engagementGrowth.percentage;
        const bScore =
          b.growth.followersGrowth.percentage +
          b.growth.engagementGrowth.percentage;
        return bScore - aScore;
      });
    } catch (error) {
      console.error("Error in getTeamComparison:", error);
      return [];
    }
  }

  /**
   * Get historical trend data for charts
   */
  async getHistoricalTrends(
    socialAccountId: string,
    days: number = 30
  ): Promise<{
    followers: Array<{ date: string; value: number; change?: number }>;
    engagement: Array<{ date: string; value: number; change?: number }>;
    reach: Array<{ date: string; value: number; change?: number }>;
  }> {
    try {
      const endDate = new Date();
      const startDate = new Date(
        endDate.getTime() - days * 24 * 60 * 60 * 1000
      );

      const analytics = await this.prisma.accountAnalytics.findMany({
        where: {
          socialAccountId,
          recordedAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        orderBy: { recordedAt: "asc" },
      });

      const followers = analytics.map((record, index) => ({
        date: record.recordedAt.toISOString().split("T")[0],
        value: record.followersCount,
        change:
          index > 0
            ? record.followersCount - analytics[index - 1].followersCount
            : 0,
      }));

      const engagement = analytics.map((record, index) => ({
        date: record.recordedAt.toISOString().split("T")[0],
        value: record.engagementRate,
        change:
          index > 0
            ? record.engagementRate - analytics[index - 1].engagementRate
            : 0,
      }));

      const reach = analytics.map((record, index) => ({
        date: record.recordedAt.toISOString().split("T")[0],
        value: record.totalReach || 0,
        change:
          index > 0
            ? (record.totalReach || 0) - (analytics[index - 1].totalReach || 0)
            : 0,
      }));

      return { followers, engagement, reach };
    } catch (error) {
      console.error("Error in getHistoricalTrends:", error);
      return { followers: [], engagement: [], reach: [] };
    }
  }

  /**
   * Update comparison fields when saving new analytics data
   */
  async updateComparisonFields(
    socialAccountId: string,
    newData: Partial<AccountAnalytics>
  ): Promise<void> {
    try {
      console.log(
        `🔍 Updating comparison fields for account: ${socialAccountId}`
      );
      console.log(`📊 New data:`, JSON.stringify(newData, null, 2));

      // Get the most recent previous record
      const previousRecord = await this.prisma.accountAnalytics.findFirst({
        where: { socialAccountId },
        orderBy: { recordedAt: "desc" },
      });

      console.log(`📋 Previous record found:`, previousRecord ? "YES" : "NO");

      if (previousRecord) {
        console.log(`📈 Previous data:`, {
          followersCount: previousRecord.followersCount,
          mediaCount: previousRecord.mediaCount,
          engagementRate: previousRecord.engagementRate,
          avgReachPerPost: previousRecord.avgReachPerPost,
          totalReach: previousRecord.totalReach,
          recordedAt: previousRecord.recordedAt,
        });

        // Calculate growth percentages with proper validation
        const followersGrowth = this.calculatePercentageGrowth(
          newData.followersCount || 0,
          previousRecord.followersCount || 0
        );

        const engagementGrowth = this.calculatePercentageGrowth(
          newData.engagementRate || 0,
          previousRecord.engagementRate || 0
        );

        const reachGrowth = this.calculatePercentageGrowth(
          newData.totalReach || newData.avgReachPerPost || 0,
          previousRecord.totalReach || previousRecord.avgReachPerPost || 0
        );

        const mediaGrowth = this.calculatePercentageGrowth(
          newData.mediaCount || 0,
          previousRecord.mediaCount || 0
        );

        console.log(`📊 Calculated growth percentages:`, {
          followersGrowth: followersGrowth.toFixed(2) + "%",
          engagementGrowth: engagementGrowth.toFixed(2) + "%",
          reachGrowth: reachGrowth.toFixed(2) + "%",
          mediaGrowth: mediaGrowth.toFixed(2) + "%",
        });

        // Update the new record with comparison data
        Object.assign(newData, {
          previousFollowersCount: previousRecord.followersCount,
          previousMediaCount: previousRecord.mediaCount,
          previousEngagementRate: previousRecord.engagementRate,
          previousAvgReachPerPost: previousRecord.avgReachPerPost,
          followersGrowthPercent: parseFloat(followersGrowth.toFixed(2)),
          engagementGrowthPercent: parseFloat(engagementGrowth.toFixed(2)),
          reachGrowthPercent: parseFloat(reachGrowth.toFixed(2)),
          mediaGrowthPercent: parseFloat(mediaGrowth.toFixed(2)),
        });

        console.log(`✅ Updated new data with comparison fields:`, {
          previousFollowersCount: newData.previousFollowersCount,
          previousMediaCount: newData.previousMediaCount,
          previousEngagementRate: newData.previousEngagementRate,
          followersGrowthPercent: newData.followersGrowthPercent,
          engagementGrowthPercent: newData.engagementGrowthPercent,
          reachGrowthPercent: newData.reachGrowthPercent,
          mediaGrowthPercent: newData.mediaGrowthPercent,
        });
      } else {
        console.log(
          `ℹ️ No previous record found - this is the first analytics entry`
        );
        // Set default values for first entry
        Object.assign(newData, {
          previousFollowersCount: 0,
          previousMediaCount: 0,
          previousEngagementRate: 0,
          previousAvgReachPerPost: 0,
          followersGrowthPercent: 0,
          engagementGrowthPercent: 0,
          reachGrowthPercent: 0,
          mediaGrowthPercent: 0,
        });
      }
    } catch (error) {
      console.error("❌ Error updating comparison fields:", error);
      throw error; // Re-throw to handle in calling function
    }
  }

  /**
   * Get benchmark data for industry comparison
   */
  async getBenchmarkData(platform: string): Promise<{
    avgEngagementRate: number;
    avgFollowerGrowth: number;
    avgReach: number;
  }> {
    try {
      // Calculate averages from all accounts on the same platform
      const result = await this.prisma.accountAnalytics.aggregate({
        where: {
          socialAccount: { platform: platform as any },
          recordedAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
          },
        },
        _avg: {
          engagementRate: true,
          followersGrowthPercent: true,
          totalReach: true,
        },
      });

      return {
        avgEngagementRate: result._avg?.engagementRate || 0,
        avgFollowerGrowth: result._avg?.followersGrowthPercent || 0,
        avgReach: result._avg?.totalReach || 0,
      };
    } catch (error) {
      console.error("Error getting benchmark data:", error);
      return { avgEngagementRate: 0, avgFollowerGrowth: 0, avgReach: 0 };
    }
  }

  // Private helper methods
  private getComparisonPeriods(type: "week" | "month" | "quarter"): {
    current: Date;
    previous: Date;
  } {
    const now = new Date();
    const current = new Date(now);

    let daysBack: number;
    switch (type) {
      case "week":
        daysBack = 7;
        break;
      case "month":
        daysBack = 30;
        break;
      case "quarter":
        daysBack = 90;
        break;
    }

    const previous = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);

    return { current, previous };
  }

  private async getDataForPeriod(
    socialAccountId: string,
    startDate: Date,
    endDate: Date
  ): Promise<AccountAnalytics | null> {
    return await this.prisma.accountAnalytics.findFirst({
      where: {
        socialAccountId,
        recordedAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { recordedAt: "desc" },
    });
  }

  private calculateGrowthMetrics(
    current: AccountAnalytics,
    previous: AccountAnalytics | null
  ): GrowthMetrics {
    if (!previous) {
      return {
        followersGrowth: { absolute: 0, percentage: 0, trend: "stable" },
        engagementGrowth: { absolute: 0, percentage: 0, trend: "stable" },
        reachGrowth: { absolute: 0, percentage: 0, trend: "stable" },
        postsGrowth: { absolute: 0, percentage: 0, trend: "stable" },
      };
    }

    const followersGrowth = {
      absolute: current.followersCount - previous.followersCount,
      percentage: this.calculatePercentageGrowth(
        current.followersCount,
        previous.followersCount
      ),
      trend: this.getTrend(current.followersCount, previous.followersCount),
    };

    const engagementGrowth = {
      absolute: current.engagementRate - previous.engagementRate,
      percentage: this.calculatePercentageGrowth(
        current.engagementRate,
        previous.engagementRate
      ),
      trend: this.getTrend(current.engagementRate, previous.engagementRate),
    };

    const reachGrowth = {
      absolute: (current.totalReach || 0) - (previous.totalReach || 0),
      percentage: this.calculatePercentageGrowth(
        current.totalReach || 0,
        previous.totalReach || 0
      ),
      trend: this.getTrend(current.totalReach || 0, previous.totalReach || 0),
    };

    const postsGrowth = {
      absolute: current.mediaCount - previous.mediaCount,
      percentage: this.calculatePercentageGrowth(
        current.mediaCount,
        previous.mediaCount
      ),
      trend: this.getTrend(current.mediaCount, previous.mediaCount),
    };

    return { followersGrowth, engagementGrowth, reachGrowth, postsGrowth };
  }

  private calculatePercentageGrowth(current: number, previous: number): number {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  }

  private getTrend(
    current: number,
    previous: number
  ): "up" | "down" | "stable" {
    const diff = current - previous;
    if (Math.abs(diff) < 0.01) return "stable";
    return diff > 0 ? "up" : "down";
  }

  private generateInsights(
    growth: GrowthMetrics,
    platform: string
  ): {
    bestPerformingMetric: string;
    worstPerformingMetric: string;
    overallTrend: "improving" | "declining" | "stable";
    recommendations: string[];
  } {
    const metrics = [
      { name: "Followers", growth: growth.followersGrowth.percentage },
      { name: "Engagement", growth: growth.engagementGrowth.percentage },
      { name: "Reach", growth: growth.reachGrowth.percentage },
      { name: "Posts", growth: growth.postsGrowth.percentage },
    ];

    const sortedMetrics = metrics.sort((a, b) => b.growth - a.growth);
    const bestPerformingMetric = sortedMetrics[0].name;
    const worstPerformingMetric = sortedMetrics[sortedMetrics.length - 1].name;

    const avgGrowth =
      metrics.reduce((sum, m) => sum + m.growth, 0) / metrics.length;
    const overallTrend =
      avgGrowth > 5 ? "improving" : avgGrowth < -5 ? "declining" : "stable";

    const recommendations = this.generateRecommendations(
      growth,
      platform,
      overallTrend
    );

    return {
      bestPerformingMetric,
      worstPerformingMetric,
      overallTrend,
      recommendations,
    };
  }

  private generateRecommendations(
    growth: GrowthMetrics,
    platform: string,
    trend: "improving" | "declining" | "stable"
  ): string[] {
    const recommendations: string[] = [];

    // Follower growth recommendations
    if (growth.followersGrowth.trend === "down") {
      recommendations.push(
        "Consider increasing posting frequency or improving content quality to attract more followers"
      );
    }

    // Engagement recommendations
    if (growth.engagementGrowth.trend === "down") {
      if (platform === "INSTAGRAM") {
        recommendations.push(
          "Try using more interactive content like polls, questions, or reels to boost engagement"
        );
      } else {
        recommendations.push(
          "Focus on creating more engaging content that encourages likes, comments, and shares"
        );
      }
    }

    // Reach recommendations
    if (growth.reachGrowth.trend === "down") {
      recommendations.push(
        "Optimize posting times and use relevant hashtags to improve content reach"
      );
    }

    // Overall trend recommendations
    if (trend === "declining") {
      recommendations.push(
        "Consider reviewing your content strategy and analyzing top-performing posts"
      );
    } else if (trend === "improving") {
      recommendations.push(
        "Great progress! Continue with your current strategy and consider scaling successful content types"
      );
    }

    return recommendations.slice(0, 3); // Limit to 3 recommendations
  }

  private getPeriodLabel(type: "week" | "month" | "quarter"): string {
    switch (type) {
      case "week":
        return "vs Last Week";
      case "month":
        return "vs Last Month";
      case "quarter":
        return "vs Last Quarter";
    }
  }

  /**
   * UTILITY: Clean duplicate records (keep only latest per day)
   */
  async cleanDuplicateRecords(socialAccountId: string): Promise<number> {
    console.log(
      `🧹 Cleaning duplicate records for account: ${socialAccountId}`
    );

    // Get all records grouped by date
    const allRecords = await this.prisma.accountAnalytics.findMany({
      where: { socialAccountId },
      orderBy: { recordedAt: "desc" },
    });

    const recordsByDate = new Map<string, any[]>();

    allRecords.forEach((record) => {
      const dateKey = record.recordedAt.toISOString().split("T")[0];
      if (!recordsByDate.has(dateKey)) {
        recordsByDate.set(dateKey, []);
      }
      recordsByDate.get(dateKey)!.push(record);
    });

    let deletedCount = 0;

    // For each date, keep only the latest record
    for (const [date, records] of recordsByDate.entries()) {
      if (records.length > 1) {
        // Sort by recordedAt desc, keep first (latest), delete others
        records.sort((a, b) => b.recordedAt.getTime() - a.recordedAt.getTime());
        const toDelete = records.slice(1); // All except the first (latest)

        for (const record of toDelete) {
          await this.prisma.accountAnalytics.delete({
            where: { id: record.id },
          });
          deletedCount++;
        }

        console.log(
          `🗑️ Cleaned ${toDelete.length} duplicate records for ${date}`
        );
      }
    }

    console.log(`✅ Cleaned ${deletedCount} duplicate records`);

    // After cleaning, recalculate growth percentages for remaining records
    await this.recalculateGrowthPercentages(socialAccountId);

    return deletedCount;
  }

  /**
   * UTILITY: Recalculate growth percentages after cleaning duplicates
   */
  private async recalculateGrowthPercentages(
    socialAccountId: string
  ): Promise<void> {
    console.log(
      `🔄 Recalculating growth percentages for account: ${socialAccountId}`
    );

    const records = await this.prisma.accountAnalytics.findMany({
      where: { socialAccountId },
      orderBy: { recordedAt: "asc" }, // Oldest first for proper calculation
    });

    for (let i = 1; i < records.length; i++) {
      const current = records[i];
      const previous = records[i - 1];

      // Calculate growth percentages
      const followersGrowth = this.calculatePercentageGrowth(
        current.followersCount,
        previous.followersCount
      );

      const engagementGrowth = this.calculatePercentageGrowth(
        current.engagementRate,
        previous.engagementRate
      );

      const mediaGrowth = this.calculatePercentageGrowth(
        current.mediaCount,
        previous.mediaCount
      );

      const reachGrowth = this.calculatePercentageGrowth(
        current.totalReach || current.avgReachPerPost || 0,
        previous.totalReach || previous.avgReachPerPost || 0
      );

      // Update the record with correct growth percentages
      await this.prisma.accountAnalytics.update({
        where: { id: current.id },
        data: {
          previousFollowersCount: previous.followersCount,
          previousMediaCount: previous.mediaCount,
          previousEngagementRate: previous.engagementRate,
          previousAvgReachPerPost: previous.avgReachPerPost,
          followersGrowthPercent: parseFloat(followersGrowth.toFixed(2)),
          engagementGrowthPercent: parseFloat(engagementGrowth.toFixed(2)),
          mediaGrowthPercent: parseFloat(mediaGrowth.toFixed(2)),
          reachGrowthPercent: parseFloat(reachGrowth.toFixed(2)),
        },
      });

      console.log(
        `📊 Updated growth for ${current.recordedAt.toISOString().split("T")[0]}: F:${followersGrowth.toFixed(1)}%, E:${engagementGrowth.toFixed(1)}%`
      );
    }
  }

  /**
   * UTILITY: Generate varied sample data for testing growth comparison
   * This should only be used for testing/development
   */
  async generateSampleGrowthData(
    socialAccountId: string,
    days: number = 7
  ): Promise<void> {
    if (process.env.NODE_ENV === "production") {
      throw new Error("Sample data generation is not allowed in production");
    }

    console.log(
      `🧪 Generating ${days} days of REALISTIC sample data for account: ${socialAccountId}`
    );

    // Clean existing data first to avoid duplicates
    await this.cleanDuplicateRecords(socialAccountId);

    // Base metrics to start with (more realistic)
    let baseFollowers = 150 + Math.floor(Math.random() * 200); // 150-350 followers
    let baseEngagement = 3 + Math.random() * 4; // 3-7% engagement rate
    let basePosts = 80 + Math.floor(Math.random() * 40); // 80-120 posts
    let baseReach = Math.floor(baseFollowers * (0.4 + Math.random() * 0.3)); // 40-70% of followers

    for (let i = days; i >= 0; i--) {
      const recordDate = new Date();
      recordDate.setDate(recordDate.getDate() - i);
      recordDate.setHours(
        Math.floor(Math.random() * 24),
        Math.floor(Math.random() * 60),
        0,
        0
      );

      // Add REALISTIC daily variance (not extreme)
      const followersVariation = Math.floor(Math.random() * 6) - 3; // +/- 3 followers per day
      const engagementVariation = Math.random() * 1 - 0.5; // +/- 0.5% engagement
      const postsVariation =
        Math.random() < 0.3 ? Math.floor(Math.random() * 3) : 0; // 0-2 new posts occasionally
      const reachVariation = Math.floor(Math.random() * 20) - 10; // +/- 10 reach

      baseFollowers = Math.max(50, baseFollowers + followersVariation);
      baseEngagement = Math.max(
        1,
        Math.min(12, baseEngagement + engagementVariation)
      );
      basePosts = Math.max(10, basePosts + postsVariation);
      baseReach = Math.max(20, baseReach + reachVariation);

      const sampleData = {
        followersCount: baseFollowers,
        mediaCount: basePosts,
        avgReachPerPost: Math.floor(baseReach / Math.max(1, basePosts)),
        engagementRate: parseFloat(baseEngagement.toFixed(2)),
        followerGrowth: JSON.stringify([followersVariation]),

        // Additional fields for completeness
        totalFollowers: baseFollowers,
        totalPosts: basePosts,
        totalReach: baseReach,
        totalImpressions: Math.floor(baseReach * 1.3),
        totalLikes: Math.floor(baseReach * 0.08),
        totalComments: Math.floor(baseReach * 0.015),
        totalShares: Math.floor(baseReach * 0.005),
        totalSaves: Math.floor(baseReach * 0.02),
        avgEngagementPerPost: Math.floor(
          (baseReach * 0.1) / Math.max(1, basePosts)
        ),
      };

      // Create the record without using updateComparisonFields to avoid duplicate calculation
      const createdRecord = await this.prisma.accountAnalytics.create({
        data: {
          socialAccountId,
          ...sampleData,
          recordedAt: recordDate,
          // Set initial values, will be recalculated later
          previousFollowersCount: 0,
          previousMediaCount: 0,
          previousEngagementRate: 0,
          previousAvgReachPerPost: 0,
          followersGrowthPercent: 0,
          engagementGrowthPercent: 0,
          mediaGrowthPercent: 0,
          reachGrowthPercent: 0,
        },
      });

      console.log(
        `📊 Created realistic sample record for ${recordDate.toISOString().split("T")[0]} - F:${baseFollowers}, E:${baseEngagement.toFixed(2)}%, P:${basePosts}`
      );
    }

    // Recalculate growth percentages for all records
    await this.recalculateGrowthPercentages(socialAccountId);

    console.log(
      `✅ Generated ${days + 1} realistic sample records with proper growth calculations`
    );
  }

  /**
   * PRODUCTION: Upsert analytics data (prevent duplicates)
   * This replaces direct prisma.create() calls in production
   */
  async upsertAnalyticsData(
    socialAccountId: string,
    newData: Partial<AccountAnalytics>,
    targetDate?: Date
  ): Promise<{ created: boolean; updated: boolean; record: any }> {
    const recordDate = targetDate || new Date();
    const dateKey = recordDate.toISOString().split("T")[0]; // YYYY-MM-DD

    console.log(
      `📊 Upserting analytics data for ${socialAccountId} on ${dateKey}`
    );

    try {
      // Check if record already exists for this date
      const existingRecord = await this.prisma.accountAnalytics.findFirst({
        where: {
          socialAccountId,
          recordedAt: {
            gte: new Date(`${dateKey}T00:00:00.000Z`),
            lt: new Date(`${dateKey}T23:59:59.999Z`),
          },
        },
        orderBy: { recordedAt: "desc" },
      });

      if (existingRecord) {
        // Update existing record (merge data)
        console.log(`🔄 Updating existing record for ${dateKey}`);

        // Calculate comparison fields based on previous record
        await this.updateComparisonFields(socialAccountId, newData);

        // Filter out fields that shouldn't be updated
        const { socialAccountId: _, id: __, ...updateData } = newData;

        const updatedRecord = await this.prisma.accountAnalytics.update({
          where: { id: existingRecord.id },
          data: {
            ...updateData,
            recordedAt: recordDate, // Update timestamp to latest
          } as any,
        });

        return { created: false, updated: true, record: updatedRecord };
      } else {
        // Create new record
        console.log(`✨ Creating new record for ${dateKey}`);

        // Calculate comparison fields
        await this.updateComparisonFields(socialAccountId, newData);

        // Ensure required fields are present and filter out problematic fields
        const { id, followerGrowth, ...safeData } = newData;
        const createData = {
          socialAccountId,
          recordedAt: recordDate,
          followersCount: newData.followersCount || 0,
          mediaCount: newData.mediaCount || 0,
          engagementRate: newData.engagementRate || 0,
          avgReachPerPost: newData.avgReachPerPost || 0,
          followerGrowth: followerGrowth || "[]",
          ...safeData, // Override with any provided values
        };

        const createdRecord = await this.prisma.accountAnalytics.create({
          data: createData as any,
        });

        return { created: true, updated: false, record: createdRecord };
      }
    } catch (error) {
      console.error(`❌ Error upserting analytics data:`, error);
      throw error;
    }
  }

  /**
   * PRODUCTION: Auto-cleanup duplicates (run daily)
   * Safe for production - only keeps latest record per day
   */
  async autoCleanupDuplicates(
    socialAccountId?: string,
    daysToCheck: number = 7
  ): Promise<{
    accountsProcessed: number;
    duplicatesRemoved: number;
    summary: Array<{
      accountId: string;
      accountName: string;
      duplicatesRemoved: number;
    }>;
  }> {
    console.log(
      `🧹 Starting auto-cleanup for duplicates (last ${daysToCheck} days)...`
    );

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysToCheck);

    let accountsToProcess: Array<{ id: string; name: string }> = [];

    if (socialAccountId) {
      // Process specific account
      const account = await this.prisma.socialAccount.findUnique({
        where: { id: socialAccountId },
        select: { id: true, name: true },
      });
      if (account && account.name) {
        accountsToProcess = [{ id: account.id, name: account.name }];
      }
    } else {
      // Process all accounts with recent analytics
      const accounts = await this.prisma.socialAccount.findMany({
        where: {
          AccountAnalytics: {
            some: {
              recordedAt: {
                gte: startDate,
                lte: endDate,
              },
            },
          },
        },
        select: { id: true, name: true },
      });

      accountsToProcess = accounts
        .filter((account) => account.name)
        .map((account) => ({ id: account.id, name: account.name! }));
    }

    const summary: Array<{
      accountId: string;
      accountName: string;
      duplicatesRemoved: number;
    }> = [];
    let totalDuplicatesRemoved = 0;

    for (const account of accountsToProcess) {
      const duplicatesRemoved = await this.cleanDuplicateRecords(account.id);
      totalDuplicatesRemoved += duplicatesRemoved;

      summary.push({
        accountId: account.id,
        accountName: account.name,
        duplicatesRemoved,
      });

      console.log(
        `✅ Processed ${account.name}: ${duplicatesRemoved} duplicates removed`
      );
    }

    console.log(
      `🎉 Auto-cleanup completed: ${accountsToProcess.length} accounts, ${totalDuplicatesRemoved} total duplicates removed`
    );

    return {
      accountsProcessed: accountsToProcess.length,
      duplicatesRemoved: totalDuplicatesRemoved,
      summary,
    };
  }

  /**
   * PRODUCTION: Check for duplicate data issues
   * Returns health report for monitoring
   */
  async getDuplicateHealthReport(daysToCheck: number = 7): Promise<{
    status: "healthy" | "warning" | "critical";
    totalAccounts: number;
    accountsWithDuplicates: number;
    totalDuplicates: number;
    worstOffenders: Array<{
      accountId: string;
      accountName: string;
      duplicateDates: string[];
      duplicateCount: number;
    }>;
    recommendations: string[];
  }> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysToCheck);

    // Get all analytics records in date range
    const records = await this.prisma.accountAnalytics.findMany({
      where: {
        recordedAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        socialAccount: {
          select: { name: true },
        },
      },
      orderBy: { recordedAt: "desc" },
    });

    // Group by account and date
    const accountDuplicates = new Map<
      string,
      {
        accountName: string;
        duplicateDates: Map<string, number>;
        totalDuplicates: number;
      }
    >();

    records.forEach((record) => {
      const accountId = record.socialAccountId;
      const dateKey = record.recordedAt.toISOString().split("T")[0];

      if (!accountDuplicates.has(accountId)) {
        accountDuplicates.set(accountId, {
          accountName: record.socialAccount.name || "Unknown Account",
          duplicateDates: new Map(),
          totalDuplicates: 0,
        });
      }

      const accountData = accountDuplicates.get(accountId)!;
      const currentCount = accountData.duplicateDates.get(dateKey) || 0;
      accountData.duplicateDates.set(dateKey, currentCount + 1);
    });

    // Calculate statistics
    let totalDuplicates = 0;
    let accountsWithDuplicates = 0;
    const worstOffenders: Array<{
      accountId: string;
      accountName: string;
      duplicateDates: string[];
      duplicateCount: number;
    }> = [];

    accountDuplicates.forEach((data, accountId) => {
      const duplicateDates: string[] = [];
      let accountDuplicateCount = 0;

      data.duplicateDates.forEach((count, date) => {
        if (count > 1) {
          duplicateDates.push(date);
          accountDuplicateCount += count - 1; // Only count extras as duplicates
        }
      });

      if (duplicateDates.length > 0) {
        accountsWithDuplicates++;
        totalDuplicates += accountDuplicateCount;

        worstOffenders.push({
          accountId,
          accountName: data.accountName,
          duplicateDates,
          duplicateCount: accountDuplicateCount,
        });
      }
    });

    // Sort worst offenders by duplicate count
    worstOffenders.sort((a, b) => b.duplicateCount - a.duplicateCount);

    // Determine status
    let status: "healthy" | "warning" | "critical";
    if (totalDuplicates === 0) {
      status = "healthy";
    } else if (totalDuplicates < 10 || accountsWithDuplicates <= 2) {
      status = "warning";
    } else {
      status = "critical";
    }

    // Generate recommendations
    const recommendations: string[] = [];
    if (totalDuplicates > 0) {
      recommendations.push(
        `Run auto-cleanup to remove ${totalDuplicates} duplicate records`
      );
    }
    if (accountsWithDuplicates > 0) {
      recommendations.push(
        `Check analytics collection jobs for ${accountsWithDuplicates} accounts`
      );
    }
    if (worstOffenders.length > 0) {
      recommendations.push(
        `Review data collection frequency for high-duplicate accounts`
      );
    }
    if (status === "critical") {
      recommendations.push(
        `Consider implementing upsertAnalyticsData() to prevent future duplicates`
      );
    }

    return {
      status,
      totalAccounts: accountDuplicates.size,
      accountsWithDuplicates,
      totalDuplicates,
      worstOffenders: worstOffenders.slice(0, 5), // Top 5 worst offenders
      recommendations,
    };
  }

  /**
   * PRODUCTION: Safe data collection with duplicate prevention
   * Use this instead of direct create() calls
   */
  async collectAnalyticsDataSafely(
    socialAccountId: string,
    analyticsData: Partial<AccountAnalytics>,
    options?: {
      allowSameDayUpdate?: boolean;
      mergeWithExisting?: boolean;
      targetDate?: Date;
    }
  ): Promise<{
    success: boolean;
    action: "created" | "updated" | "skipped";
    record?: any;
    message: string;
  }> {
    const {
      allowSameDayUpdate = true,
      mergeWithExisting = true,
      targetDate,
    } = options || {};

    try {
      if (allowSameDayUpdate && mergeWithExisting) {
        // Use upsert strategy (recommended for production)
        const result = await this.upsertAnalyticsData(
          socialAccountId,
          analyticsData,
          targetDate
        );

        return {
          success: true,
          action: result.created ? "created" : "updated",
          record: result.record,
          message: result.created
            ? "New analytics record created successfully"
            : "Existing record updated with latest data",
        };
      } else {
        // Check if data already exists for today
        const today = targetDate || new Date();
        const dateKey = today.toISOString().split("T")[0];

        const existingRecord = await this.prisma.accountAnalytics.findFirst({
          where: {
            socialAccountId,
            recordedAt: {
              gte: new Date(`${dateKey}T00:00:00.000Z`),
              lt: new Date(`${dateKey}T23:59:59.999Z`),
            },
          },
        });

        if (existingRecord && !allowSameDayUpdate) {
          return {
            success: true,
            action: "skipped",
            message:
              "Data already exists for today, skipping to prevent duplicates",
          };
        }

        // Create new record
        await this.updateComparisonFields(socialAccountId, analyticsData);

        // Ensure required fields are present
        const { id, followerGrowth, ...safeAnalyticsData } = analyticsData;
        const createData = {
          socialAccountId,
          recordedAt: today,
          followersCount: analyticsData.followersCount || 0,
          mediaCount: analyticsData.mediaCount || 0,
          engagementRate: analyticsData.engagementRate || 0,
          avgReachPerPost: analyticsData.avgReachPerPost || 0,
          followerGrowth: followerGrowth || "[]",
          ...safeAnalyticsData, // Override with any provided values
        };

        const newRecord = await this.prisma.accountAnalytics.create({
          data: createData as any,
        });

        return {
          success: true,
          action: "created",
          record: newRecord,
          message: "New analytics record created successfully",
        };
      }
    } catch (error) {
      console.error(`❌ Error collecting analytics data safely:`, error);
      return {
        success: false,
        action: "skipped",
        message: `Failed to collect analytics: ${error}`,
      };
    }
  }
}
