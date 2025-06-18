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
      // Get the most recent previous record
      const previousRecord = await this.prisma.accountAnalytics.findFirst({
        where: { socialAccountId },
        orderBy: { recordedAt: "desc" },
      });

      if (previousRecord && newData.followersCount !== undefined) {
        // Calculate growth percentages
        const followersGrowth = this.calculatePercentageGrowth(
          newData.followersCount,
          previousRecord.followersCount
        );

        const engagementGrowth =
          newData.engagementRate !== undefined
            ? this.calculatePercentageGrowth(
                newData.engagementRate,
                previousRecord.engagementRate
              )
            : 0;

        const reachGrowth =
          newData.totalReach !== undefined &&
          previousRecord.totalReach !== undefined
            ? this.calculatePercentageGrowth(
                newData.totalReach || 0,
                previousRecord.totalReach || 0
              )
            : 0;

        const mediaGrowth =
          newData.mediaCount !== undefined
            ? this.calculatePercentageGrowth(
                newData.mediaCount,
                previousRecord.mediaCount
              )
            : 0;

        // Update the new record with comparison data
        Object.assign(newData, {
          previousFollowersCount: previousRecord.followersCount,
          previousMediaCount: previousRecord.mediaCount,
          previousEngagementRate: previousRecord.engagementRate,
          previousAvgReachPerPost: previousRecord.avgReachPerPost,
          followersGrowthPercent: followersGrowth,
          engagementGrowthPercent: engagementGrowth,
          reachGrowthPercent: reachGrowth,
          mediaGrowthPercent: mediaGrowth,
        });
      }
    } catch (error) {
      console.error("Error updating comparison fields:", error);
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
}
