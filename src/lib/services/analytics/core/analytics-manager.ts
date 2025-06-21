/**
 * Analytics Manager
 * Main orchestrator for all analytics operations
 *
 * This is the primary interface for collecting, analyzing, and generating insights
 * from social media data. It coordinates between data collection, analysis, and
 * insight generation while maintaining a simple, easy-to-understand API.
 */

import { AccountMetric, PostMetric, InsightMetric } from "../config/metrics";
import { DataAnalyzer } from "./data-analyzer";
import { DataCollector } from "./data-collector";
import { InsightGenerator } from "./insight-generator";

export interface CollectionOptions {
  platform: string;
  days_back?: number;
  include_posts?: boolean;
  include_stories?: boolean;
  limit?: number;
}

export interface AnalysisOptions {
  compare_period?: "week" | "month" | "quarter";
  include_recommendations?: boolean;
  benchmark_industry?: string;
}

export interface AnalyticsResult {
  account: AccountMetric;
  posts?: PostMetric[];
  insights?: InsightMetric;
  recommendations?: string[];
  collected_at: Date;
  analysis_metadata: {
    data_quality: number;
    completeness: number;
    source: string;
    has_api_errors?: boolean;
    api_errors?: string[];
    warnings?: string[];
    fallback_used?: boolean;
  };
}

export class AnalyticsManager {
  private collector: DataCollector;
  private analyzer: DataAnalyzer;
  private insightGenerator: InsightGenerator;

  constructor() {
    this.collector = new DataCollector();
    this.analyzer = new DataAnalyzer();
    this.insightGenerator = new InsightGenerator();
  }

  /**
   * Collect comprehensive analytics data for an account
   *
   * @param accountId - Social media account ID
   * @param options - Collection options
   * @returns Complete analytics data
   */
  async collectAccountData(
    accountId: string,
    options: CollectionOptions
  ): Promise<AnalyticsResult> {
    try {
      console.log(`📊 Collecting analytics for account: ${accountId}`);

      // 1. Collect account metrics
      const accountData = await this.collector.fetchAccountMetrics(
        accountId,
        options
      );

      // 2. Collect post metrics (if requested)
      let postData: PostMetric[] | undefined;
      if (options.include_posts) {
        postData = await this.collector.fetchPostMetrics(accountId, options);
      }

      // 3. Check for API errors and data quality
      const hasApiErrors = this.collector.lastApiErrors.length > 0;
      const hasWarnings = this.collector.lastWarnings.length > 0;
      const fallbackUsed = this.collector.lastFallbackUsed;

      // 4. Determine actual data quality based on API success
      const baseDataQuality = this.calculateDataQuality(accountData, postData);
      const adjustedDataQuality = fallbackUsed
        ? Math.min(baseDataQuality, 20) // Fallback data = very low quality
        : baseDataQuality;

      // 5. Generate basic insights
      const insights = await this.insightGenerator.generateBasicInsights(
        accountData,
        postData
      );

      // 6. Get recommendations
      const recommendations =
        await this.insightGenerator.generateRecommendations(
          accountData,
          insights
        );

      const result: AnalyticsResult = {
        account: accountData,
        posts: postData,
        insights,
        recommendations,
        collected_at: new Date(),
        analysis_metadata: {
          data_quality: adjustedDataQuality,
          completeness: this.calculateCompleteness(accountData, postData),
          source: fallbackUsed
            ? `${options.platform}_fallback`
            : `${options.platform}_api`,
          has_api_errors: hasApiErrors,
          api_errors: hasApiErrors
            ? [...this.collector.lastApiErrors]
            : undefined,
          warnings: hasWarnings ? [...this.collector.lastWarnings] : undefined,
          fallback_used: fallbackUsed,
        },
      };

      // Log with appropriate status
      if (hasApiErrors || fallbackUsed) {
        console.warn(
          `⚠️ Analytics collection completed with issues for ${accountId}:`,
          {
            fallback_used: fallbackUsed,
            api_errors: this.collector.lastApiErrors,
            warnings: this.collector.lastWarnings,
            data_quality: adjustedDataQuality,
          }
        );
      } else {
        console.log(`✅ Analytics collection completed for ${accountId}`);
      }

      return result;
    } catch (error) {
      console.error(`❌ Failed to collect analytics for ${accountId}:`, error);
      throw new Error(`Analytics collection failed: ${error}`);
    }
  }

  /**
   * Analyze existing data and generate insights
   *
   * @param data - Previously collected analytics data
   * @param options - Analysis options
   * @returns Enhanced analytics with insights
   */
  async analyzeData(
    data: AnalyticsResult,
    options: AnalysisOptions = {}
  ): Promise<AnalyticsResult> {
    try {
      console.log(`🔍 Analyzing data for enhanced insights`);

      // 1. Perform comparative analysis
      let comparisonInsights;
      if (options.compare_period) {
        comparisonInsights = await this.analyzer.performComparison(
          data.account,
          options.compare_period
        );
      }

      // 2. Generate advanced insights
      const advancedInsights =
        await this.insightGenerator.generateAdvancedInsights(
          data,
          comparisonInsights
        );

      // 3. Update recommendations
      const enhancedRecommendations =
        await this.insightGenerator.generateRecommendations(
          data.account,
          advancedInsights,
          options.benchmark_industry
        );

      // Return enhanced data
      return {
        ...data,
        insights: advancedInsights,
        recommendations: enhancedRecommendations,
        analysis_metadata: {
          ...data.analysis_metadata,
          data_quality: this.calculateDataQuality(data.account, data.posts),
          completeness: this.calculateCompleteness(data.account, data.posts),
        },
      };
    } catch (error) {
      console.error(`❌ Failed to analyze data:`, error);
      throw new Error(`Data analysis failed: ${error}`);
    }
  }

  /**
   * Get quick insights for dashboard
   *
   * @param accountId - Account ID
   * @param platform - Platform name
   * @returns Quick insights for dashboard display
   */
  async getQuickInsights(accountId: string, platform: string) {
    try {
      const options: CollectionOptions = {
        platform,
        days_back: 7,
        include_posts: true,
        limit: 10,
      };

      const data = await this.collectAccountData(accountId, options);

      return {
        followers: data.account.followers,
        engagement_rate: data.account.engagement_rate,
        best_performing_post: data.posts?.[0],
        growth_trend: await this.analyzer.getGrowthTrend(accountId),
        recommendations: data.recommendations?.slice(0, 3),
      };
    } catch (error) {
      console.error(`❌ Failed to get quick insights:`, error);
      return null;
    }
  }

  /**
   * Batch process multiple accounts
   *
   * @param accountIds - Array of account IDs
   * @param options - Collection options
   * @returns Array of analytics results
   */
  async batchProcess(
    accountIds: string[],
    options: CollectionOptions
  ): Promise<AnalyticsResult[]> {
    console.log(`📊 Batch processing ${accountIds.length} accounts`);

    const results: AnalyticsResult[] = [];

    for (const accountId of accountIds) {
      try {
        const data = await this.collectAccountData(accountId, options);
        results.push(data);
      } catch (error) {
        console.error(`Failed to process account ${accountId}:`, error);
        // Continue with other accounts
      }
    }

    console.log(
      `✅ Batch processing completed: ${results.length}/${accountIds.length} successful`
    );
    return results;
  }

  // Private helper methods
  private calculateDataQuality(
    account: AccountMetric,
    posts?: PostMetric[]
  ): number {
    let quality = 0;

    // Account data quality (60% weight)
    const requiredAccountFields = ["followers", "posts", "engagement_rate"];
    const accountCompleteness =
      requiredAccountFields.filter(
        (field) => account[field as keyof AccountMetric] !== undefined
      ).length / requiredAccountFields.length;
    quality += accountCompleteness * 60;

    // Post data quality (40% weight)
    if (posts && posts.length > 0) {
      const requiredPostFields = ["likes", "comments", "reach"];
      const postsWithCompleteData = posts.filter((post) =>
        requiredPostFields.every(
          (field) => post[field as keyof PostMetric] !== undefined
        )
      ).length;
      const postCompleteness = postsWithCompleteData / posts.length;
      quality += postCompleteness * 40;
    } else {
      quality += 20; // Partial quality if no post data
    }

    return Math.round(quality);
  }

  private calculateCompleteness(
    account: AccountMetric,
    posts?: PostMetric[]
  ): number {
    let completeness = 0;

    // Account completeness (50%)
    const totalAccountFields = Object.keys(account).length;
    const filledAccountFields = Object.values(account).filter(
      (v) => v !== undefined && v !== null
    ).length;
    completeness += (filledAccountFields / totalAccountFields) * 50;

    // Posts completeness (50%)
    if (posts && posts.length > 0) {
      const totalPostFields = Object.keys(posts[0]).length;
      const avgFilledPostFields =
        posts.reduce((avg, post) => {
          const filledFields = Object.values(post).filter(
            (v) => v !== undefined && v !== null
          ).length;
          return avg + filledFields / totalPostFields;
        }, 0) / posts.length;
      completeness += avgFilledPostFields * 50;
    }

    return Math.round(completeness);
  }
}
