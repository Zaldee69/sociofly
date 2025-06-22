/**
 * Insight Generator
 * Generates insights and recommendations from analytics data
 *
 * This class is responsible for:
 * - Generating actionable insights
 * - Creating recommendations
 * - Identifying opportunities
 * - Providing strategic guidance
 */

import { AccountMetric, PostMetric, InsightMetric } from "../config/metrics";
import { ComparisonResult } from "./data-analyzer";

// Define AnalyticsResult interface to replace the deleted one
export interface AnalyticsResult {
  account: AccountMetric;
  posts?: PostMetric[];
  insights?: InsightMetric;
  success: boolean;
  errors?: string[];
}

export class InsightGenerator {
  /**
   * Generate basic insights from account and post data
   *
   * @param accountData - Account metrics
   * @param postData - Post metrics (optional)
   * @returns Basic insights
   */
  async generateBasicInsights(
    accountData: AccountMetric,
    postData?: PostMetric[]
  ): Promise<InsightMetric> {
    try {
      console.log(`🔍 Generating basic insights`);

      const insights: InsightMetric = {
        best_time: await this.determineBestPostingTime(),
        best_day: await this.determineBestPostingDay(),
        audience_age: await this.analyzeAudienceAge(),
        audience_gender: await this.analyzeAudienceGender(),
        top_content: await this.identifyTopContent(postData),
      };

      return insights;
    } catch (error) {
      console.error(`❌ Failed to generate basic insights:`, error);
      throw error;
    }
  }

  /**
   * Generate advanced insights with comparison data
   *
   * @param analyticsData - Complete analytics data
   * @param comparisonData - Comparison results (optional)
   * @returns Advanced insights
   */
  async generateAdvancedInsights(
    analyticsData: AnalyticsResult,
    comparisonData?: ComparisonResult
  ): Promise<InsightMetric> {
    try {
      console.log(`🔍 Generating advanced insights`);

      // Start with basic insights
      const basicInsights =
        analyticsData.insights ||
        (await this.generateBasicInsights(
          analyticsData.account,
          analyticsData.posts
        ));

      // Enhance with comparison data (using type assertion for extended properties)
      const enhancedInsights: InsightMetric & Record<string, any> = {
        ...basicInsights,
        // Add advanced fields based on comparison
        growth_insights: comparisonData
          ? this.generateGrowthInsights(comparisonData)
          : undefined,
        performance_score: this.calculatePerformanceScore(analyticsData),
        optimization_opportunities:
          await this.identifyOptimizationOpportunities(analyticsData),
      };

      return enhancedInsights;
    } catch (error) {
      console.error(`❌ Failed to generate advanced insights:`, error);
      throw error;
    }
  }

  /**
   * Generate actionable recommendations
   *
   * @param accountData - Account metrics
   * @param insights - Generated insights
   * @param industry - Industry benchmark (optional)
   * @returns Array of recommendations
   */
  async generateRecommendations(
    accountData: AccountMetric,
    insights?: InsightMetric,
    industry?: string
  ): Promise<string[]> {
    try {
      console.log(`💡 Generating recommendations`);

      const recommendations: string[] = [];

      // Engagement-based recommendations
      recommendations.push(
        ...this.getEngagementRecommendations(accountData.engagement_rate)
      );

      // Follower-based recommendations
      recommendations.push(
        ...this.getFollowerRecommendations(accountData.followers)
      );

      // Content-based recommendations
      if (insights) {
        recommendations.push(...this.getContentRecommendations(insights));
      }

      // Industry-specific recommendations
      if (industry) {
        recommendations.push(
          ...this.getIndustryRecommendations(industry, accountData)
        );
      }

      // Remove duplicates and prioritize
      return this.prioritizeRecommendations(recommendations);
    } catch (error) {
      console.error(`❌ Failed to generate recommendations:`, error);
      return ["Unable to generate recommendations at this time"];
    }
  }

  // Private helper methods
  private async determineBestPostingTime(): Promise<string> {
    // TODO: Implement actual best time analysis based on historical data
    // This would analyze engagement patterns by hour of day
    return "2:00 PM";
  }

  private async determineBestPostingDay(): Promise<string> {
    // TODO: Implement actual best day analysis based on historical data
    // This would analyze engagement patterns by day of week
    return "Tuesday";
  }

  private async analyzeAudienceAge(): Promise<Record<string, number>> {
    // TODO: Implement actual audience age analysis
    // This would come from platform insights API
    return {
      "18-24": 25,
      "25-34": 35,
      "35-44": 20,
      "45-54": 15,
      "55+": 5,
    };
  }

  private async analyzeAudienceGender(): Promise<Record<string, number>> {
    // TODO: Implement actual audience gender analysis
    // This would come from platform insights API
    return {
      female: 60,
      male: 38,
      "non-binary": 2,
    };
  }

  private async identifyTopContent(postData?: PostMetric[]): Promise<string[]> {
    if (!postData || postData.length === 0) {
      return ["Insufficient post data for content analysis"];
    }

    // Sort posts by engagement and identify patterns
    const sortedPosts = postData
      .map((post, index) => ({
        ...post,
        engagement_score: post.likes + post.comments + post.shares,
        index,
      }))
      .sort((a, b) => b.engagement_score - a.engagement_score);

    // Generate content type insights
    const topContent = [
      "High-engagement posts typically receive more comments",
      "Visual content performs better than text-only posts",
      "Posts with calls-to-action generate more engagement",
    ];

    return topContent;
  }

  private generateGrowthInsights(comparisonData: ComparisonResult): any {
    const insights = {
      growth_trend: comparisonData.trend,
      period: comparisonData.period,
      key_metrics: {
        followers: comparisonData.growth.followers,
        engagement: comparisonData.growth.engagement,
        posts: comparisonData.growth.posts,
      },
    };

    return insights;
  }

  private calculatePerformanceScore(analyticsData: AnalyticsResult): number {
    const account = analyticsData.account;
    let score = 0;

    // Engagement rate scoring (40%)
    const engagementScore = Math.min(account.engagement_rate * 10, 40);
    score += engagementScore;

    // Follower growth scoring (30%)
    // TODO: Calculate based on historical data
    const followersScore = 20; // Placeholder
    score += followersScore;

    // Content quality scoring (30%)
    const contentScore = analyticsData.posts?.length
      ? Math.min(analyticsData.posts.length * 2, 30)
      : 10;
    score += contentScore;

    return Math.round(score);
  }

  private async identifyOptimizationOpportunities(
    analyticsData: AnalyticsResult
  ): Promise<string[]> {
    const opportunities = [];
    const account = analyticsData.account;

    // Low engagement opportunity
    if (account.engagement_rate < 2) {
      opportunities.push("engagement_improvement");
    }

    // Content frequency opportunity
    if (account.posts < 50) {
      opportunities.push("content_frequency");
    }

    // Reach optimization opportunity
    if (account.avg_reach < account.followers * 0.3) {
      opportunities.push("reach_optimization");
    }

    return opportunities;
  }

  private getEngagementRecommendations(engagementRate: number): string[] {
    const recommendations = [];

    if (engagementRate < 1) {
      recommendations.push(
        "🎯 Focus on creating more interactive content with questions and polls"
      );
      recommendations.push(
        "💬 Respond to all comments within 2-3 hours to boost engagement"
      );
      recommendations.push(
        "📱 Use Instagram Stories and Reels to increase visibility"
      );
    } else if (engagementRate < 3) {
      recommendations.push(
        "🚀 Your engagement is growing! Try posting at peak audience times"
      );
      recommendations.push(
        "🎨 Experiment with different content formats to find what works best"
      );
    } else {
      recommendations.push(
        "⭐ Excellent engagement! Consider partnering with other creators"
      );
      recommendations.push(
        "📈 Scale your successful content strategy across all platforms"
      );
    }

    return recommendations;
  }

  private getFollowerRecommendations(followers: number): string[] {
    const recommendations = [];

    if (followers < 1000) {
      recommendations.push(
        "👥 Use relevant hashtags to increase discoverability"
      );
      recommendations.push(
        "🤝 Engage with accounts in your niche to build community"
      );
      recommendations.push("📍 Tag your location to reach local audiences");
    } else if (followers < 10000) {
      recommendations.push("🎯 Create shareable content to expand your reach");
      recommendations.push("🔄 Cross-promote on other social platforms");
    } else {
      recommendations.push(
        "🌟 Leverage your influence with user-generated content campaigns"
      );
      recommendations.push(
        "💼 Consider monetization opportunities with your large audience"
      );
    }

    return recommendations;
  }

  private getContentRecommendations(insights: InsightMetric): string[] {
    const recommendations = [];

    recommendations.push(
      `⏰ Post at ${insights.best_time} for maximum engagement`
    );
    recommendations.push(`📅 ${insights.best_day} is your best performing day`);

    if (insights.top_content && insights.top_content.length > 0) {
      recommendations.push(
        "📊 Focus on content types that drive the most engagement"
      );
    }

    return recommendations;
  }

  private getIndustryRecommendations(
    industry: string,
    accountData: AccountMetric
  ): string[] {
    const recommendations = [];

    // Industry-specific recommendations
    switch (industry.toLowerCase()) {
      case "fashion":
        recommendations.push(
          "👗 Showcase behind-the-scenes content and styling tips"
        );
        recommendations.push("🛍️ Use shoppable posts to drive direct sales");
        break;
      case "food":
        recommendations.push(
          "🍕 Share recipe videos and cooking process content"
        );
        recommendations.push("📸 Invest in high-quality food photography");
        break;
      case "tech":
        recommendations.push(
          "💻 Create educational content about your products"
        );
        recommendations.push(
          "🔧 Share tips and tutorials to establish expertise"
        );
        break;
      default:
        recommendations.push(
          "🎨 Create authentic, brand-aligned content consistently"
        );
    }

    return recommendations;
  }

  private prioritizeRecommendations(recommendations: string[]): string[] {
    // Remove duplicates
    const unique = [...new Set(recommendations)];

    // Limit to top 5 most actionable recommendations
    return unique.slice(0, 5);
  }
}
