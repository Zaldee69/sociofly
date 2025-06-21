/**
 * Enhanced Analytics Dashboard - Phase 4
 * Advanced analytics dashboard with insights, comparisons, and real-time updates
 */

"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  TrendingUp,
  TrendingDown,
  Users,
  Eye,
  Heart,
  MessageCircle,
  Share2,
  Bookmark,
  Clock,
  Target,
  Zap,
  RefreshCw,
  CheckCircle,
} from "lucide-react";

interface EnhancedAnalyticsData {
  account: {
    followers: number;
    following: number;
    posts: number;
    engagement_rate: number;
    avg_reach: number;
    profile_visits: number;
  };
  posts: Array<{
    likes: number;
    comments: number;
    shares: number;
    saves: number;
    reach: number;
    impressions: number;
  }>;
  insights?: {
    engagement_analysis: {
      trend: "up" | "down" | "stable";
      change_percent: number;
      best_performing_content: string[];
      worst_performing_content: string[];
    };
    growth_analysis: {
      follower_trend: "growing" | "declining" | "stable";
      growth_rate: number;
      projected_followers: number;
    };
    content_recommendations: {
      best_posting_times: string[];
      recommended_content_types: string[];
      hashtag_suggestions: string[];
    };
    audience_insights: {
      most_active_times: string[];
      engagement_patterns: Record<string, number>;
      demographic_highlights: string[];
    };
  };
  comparison?: {
    period: string;
    changes: {
      followers: {
        current: number;
        previous: number;
        change: number;
        change_percent: number;
      };
      engagement_rate: {
        current: number;
        previous: number;
        change: number;
        change_percent: number;
      };
      avg_reach: {
        current: number;
        previous: number;
        change: number;
        change_percent: number;
      };
    };
    performance_summary: {
      overall_trend: "improving" | "declining" | "stable";
      key_improvements: string[];
      areas_for_improvement: string[];
    };
  };
  cache_info?: {
    used: boolean;
    key: string;
    expiry: Date;
  };
  performance?: {
    collection_time: number;
    storage_time: number;
    total_time: number;
    api_total_time: number;
  };
}

interface EnhancedAnalyticsDashboardProps {
  socialAccountId: string;
  platform: "instagram" | "facebook";
  onRefresh?: () => void;
}

export function EnhancedAnalyticsDashboard({
  socialAccountId,
  platform,
  onRefresh,
}: EnhancedAnalyticsDashboardProps) {
  const [data, setData] = useState<EnhancedAnalyticsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Fetch enhanced analytics data
  const fetchAnalytics = async (forceRefresh = false) => {
    setLoading(true);
    setError(null);

    try {
      console.log("🔄 Fetching enhanced analytics...");

      const response = await fetch("/api/analytics-v2/enhanced", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          socialAccountId,
          platform,
          options: {
            days_back: 7,
            storeInDatabase: true,
            useCache: !forceRefresh,
            generateInsights: true,
            compareWithPrevious: true,
            include_posts: true,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      if (result.success) {
        setData(result.data);
        setLastUpdated(new Date());
        console.log("✅ Enhanced analytics loaded successfully");
      } else {
        throw new Error(result.error || "Failed to fetch analytics");
      }
    } catch (err) {
      console.error("❌ Error fetching enhanced analytics:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchAnalytics();
  }, [socialAccountId, platform]);

  // Handle refresh
  const handleRefresh = () => {
    fetchAnalytics(true);
    onRefresh?.();
  };

  // Render loading state
  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            Loading enhanced analytics...
          </p>
        </div>
      </div>
    );
  }

  // Render error state
  if (error && !data) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center">
            <p className="text-red-600 mb-4">Error: {error}</p>
            <Button onClick={() => fetchAnalytics()} variant="outline">
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Render no data state
  if (!data) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center">
            <p className="text-muted-foreground mb-4">
              No analytics data available
            </p>
            <Button onClick={() => fetchAnalytics()} variant="outline">
              Load Analytics
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calculate totals
  const totalEngagement = data.posts.reduce(
    (sum, post) => sum + post.likes + post.comments + post.shares + post.saves,
    0
  );
  const totalReach = data.posts.reduce((sum, post) => sum + post.reach, 0);
  const totalImpressions = data.posts.reduce(
    (sum, post) => sum + post.impressions,
    0
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Enhanced Analytics</h2>
          <p className="text-muted-foreground">
            Advanced insights and performance analysis
          </p>
        </div>
        <div className="flex items-center space-x-2">
          {data.cache_info?.used && (
            <Badge variant="secondary">
              <Zap className="h-3 w-3 mr-1" />
              Cached
            </Badge>
          )}
          {lastUpdated && (
            <p className="text-sm text-muted-foreground">
              Updated {lastUpdated.toLocaleTimeString()}
            </p>
          )}
          <Button
            onClick={handleRefresh}
            disabled={loading}
            variant="outline"
            size="sm"
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        </div>
      </div>

      {/* Performance Metrics */}
      {data.performance && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Clock className="h-5 w-5 mr-2" />
              Performance Metrics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Collection Time</p>
                <p className="font-semibold">
                  {data.performance.collection_time}ms
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Storage Time</p>
                <p className="font-semibold">
                  {data.performance.storage_time}ms
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Total Time</p>
                <p className="font-semibold">{data.performance.total_time}ms</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">API Time</p>
                <p className="font-semibold">
                  {data.performance.api_total_time}ms
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
          <TabsTrigger value="comparison">Comparison</TabsTrigger>
          <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center space-x-2">
                  <Users className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="text-sm font-medium">Followers</p>
                    <p className="text-2xl font-bold">
                      {data.account.followers.toLocaleString()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center space-x-2">
                  <Target className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="text-sm font-medium">Engagement Rate</p>
                    <p className="text-2xl font-bold">
                      {data.account.engagement_rate.toFixed(1)}%
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center space-x-2">
                  <Eye className="h-5 w-5 text-purple-600" />
                  <div>
                    <p className="text-sm font-medium">Avg Reach</p>
                    <p className="text-2xl font-bold">
                      {data.account.avg_reach.toLocaleString()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center space-x-2">
                  <Heart className="h-5 w-5 text-red-600" />
                  <div>
                    <p className="text-sm font-medium">Total Engagement</p>
                    <p className="text-2xl font-bold">
                      {totalEngagement.toLocaleString()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Post Performance */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Posts Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.posts.slice(0, 5).map((post, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 border rounded"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="text-sm font-medium">
                        Post {index + 1}
                      </div>
                      <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                        <Heart className="h-4 w-4" />
                        <span>{post.likes}</span>
                        <MessageCircle className="h-4 w-4" />
                        <span>{post.comments}</span>
                        <Share2 className="h-4 w-4" />
                        <span>{post.shares}</span>
                        <Bookmark className="h-4 w-4" />
                        <span>{post.saves}</span>
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Reach: {post.reach.toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Insights Tab */}
        <TabsContent value="insights" className="space-y-6">
          {data.insights ? (
            <>
              {/* Engagement Analysis */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <TrendingUp className="h-5 w-5 mr-2" />
                    Engagement Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Badge
                        variant={
                          data.insights.engagement_analysis.trend === "up"
                            ? "default"
                            : data.insights.engagement_analysis.trend === "down"
                              ? "destructive"
                              : "secondary"
                        }
                      >
                        {data.insights.engagement_analysis.trend === "up" && (
                          <TrendingUp className="h-3 w-3 mr-1" />
                        )}
                        {data.insights.engagement_analysis.trend === "down" && (
                          <TrendingDown className="h-3 w-3 mr-1" />
                        )}
                        {data.insights.engagement_analysis.trend ===
                          "stable" && <Target className="h-3 w-3 mr-1" />}
                        {data.insights.engagement_analysis.trend} (
                        {data.insights.engagement_analysis.change_percent}%)
                      </Badge>
                    </div>

                    <div>
                      <h4 className="font-medium mb-2">
                        Best Performing Content
                      </h4>
                      <ul className="space-y-1">
                        {data.insights.engagement_analysis.best_performing_content.map(
                          (content, index) => (
                            <li
                              key={index}
                              className="text-sm text-muted-foreground flex items-center"
                            >
                              <CheckCircle className="h-3 w-3 mr-2 text-green-600" />
                              {content}
                            </li>
                          )
                        )}
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Growth Analysis */}
              <Card>
                <CardHeader>
                  <CardTitle>Growth Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span>Follower Trend</span>
                      <Badge>
                        {data.insights.growth_analysis.follower_trend}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Growth Rate</span>
                      <span className="font-semibold">
                        {data.insights.growth_analysis.growth_rate}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Projected Followers</span>
                      <span className="font-semibold">
                        {data.insights.growth_analysis.projected_followers.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Audience Insights */}
              <Card>
                <CardHeader>
                  <CardTitle>Audience Insights</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium mb-2">Most Active Times</h4>
                      <div className="flex flex-wrap gap-2">
                        {data.insights.audience_insights.most_active_times.map(
                          (time, index) => (
                            <Badge key={index} variant="outline">
                              {time}
                            </Badge>
                          )
                        )}
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium mb-2">
                        Weekly Engagement Pattern
                      </h4>
                      <div className="space-y-2">
                        {Object.entries(
                          data.insights.audience_insights.engagement_patterns
                        ).map(([day, score]) => (
                          <div
                            key={day}
                            className="flex items-center justify-between"
                          >
                            <span className="text-sm">{day}</span>
                            <div className="flex items-center space-x-2">
                              <Progress value={score} className="w-20" />
                              <span className="text-sm font-medium">
                                {score}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium mb-2">
                        Demographic Highlights
                      </h4>
                      <ul className="space-y-1">
                        {data.insights.audience_insights.demographic_highlights.map(
                          (highlight, index) => (
                            <li
                              key={index}
                              className="text-sm text-muted-foreground"
                            >
                              • {highlight}
                            </li>
                          )
                        )}
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground">
                  No insights available
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Comparison Tab */}
        <TabsContent value="comparison" className="space-y-6">
          {data.comparison ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>
                    Performance Comparison ({data.comparison.period})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {/* Overall Trend */}
                    <div className="text-center">
                      <Badge
                        variant={
                          data.comparison.performance_summary.overall_trend ===
                          "improving"
                            ? "default"
                            : data.comparison.performance_summary
                                  .overall_trend === "declining"
                              ? "destructive"
                              : "secondary"
                        }
                        className="text-lg px-4 py-2"
                      >
                        {data.comparison.performance_summary.overall_trend}
                      </Badge>
                    </div>

                    {/* Metrics Comparison */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Card>
                        <CardContent className="pt-4">
                          <div className="text-center">
                            <p className="text-sm text-muted-foreground">
                              Followers
                            </p>
                            <p className="text-2xl font-bold">
                              {data.comparison.changes.followers.current.toLocaleString()}
                            </p>
                            <p
                              className={`text-sm ${data.comparison.changes.followers.change >= 0 ? "text-green-600" : "text-red-600"}`}
                            >
                              {data.comparison.changes.followers.change >= 0
                                ? "+"
                                : ""}
                              {data.comparison.changes.followers.change}(
                              {data.comparison.changes.followers.change_percent.toFixed(
                                1
                              )}
                              %)
                            </p>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardContent className="pt-4">
                          <div className="text-center">
                            <p className="text-sm text-muted-foreground">
                              Engagement Rate
                            </p>
                            <p className="text-2xl font-bold">
                              {data.comparison.changes.engagement_rate.current.toFixed(
                                1
                              )}
                              %
                            </p>
                            <p
                              className={`text-sm ${data.comparison.changes.engagement_rate.change >= 0 ? "text-green-600" : "text-red-600"}`}
                            >
                              {data.comparison.changes.engagement_rate.change >=
                              0
                                ? "+"
                                : ""}
                              {data.comparison.changes.engagement_rate.change.toFixed(
                                1
                              )}
                              % (
                              {data.comparison.changes.engagement_rate.change_percent.toFixed(
                                1
                              )}
                              %)
                            </p>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardContent className="pt-4">
                          <div className="text-center">
                            <p className="text-sm text-muted-foreground">
                              Avg Reach
                            </p>
                            <p className="text-2xl font-bold">
                              {data.comparison.changes.avg_reach.current.toLocaleString()}
                            </p>
                            <p
                              className={`text-sm ${data.comparison.changes.avg_reach.change >= 0 ? "text-green-600" : "text-red-600"}`}
                            >
                              {data.comparison.changes.avg_reach.change >= 0
                                ? "+"
                                : ""}
                              {data.comparison.changes.avg_reach.change}(
                              {data.comparison.changes.avg_reach.change_percent.toFixed(
                                1
                              )}
                              %)
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Improvements & Areas for Improvement */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-green-600">
                            Key Improvements
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ul className="space-y-2">
                            {data.comparison.performance_summary.key_improvements.map(
                              (improvement, index) => (
                                <li
                                  key={index}
                                  className="text-sm flex items-center"
                                >
                                  <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                                  {improvement}
                                </li>
                              )
                            )}
                          </ul>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle className="text-orange-600">
                            Areas for Improvement
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ul className="space-y-2">
                            {data.comparison.performance_summary.areas_for_improvement.map(
                              (area, index) => (
                                <li
                                  key={index}
                                  className="text-sm flex items-center"
                                >
                                  <Target className="h-4 w-4 mr-2 text-orange-600" />
                                  {area}
                                </li>
                              )
                            )}
                          </ul>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground">
                  No comparison data available
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Recommendations Tab */}
        <TabsContent value="recommendations" className="space-y-6">
          {data.insights?.content_recommendations ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Content Recommendations</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div>
                      <h4 className="font-medium mb-2">Best Posting Times</h4>
                      <div className="flex flex-wrap gap-2">
                        {data.insights.content_recommendations.best_posting_times.map(
                          (time, index) => (
                            <Badge key={index} variant="outline">
                              {time}
                            </Badge>
                          )
                        )}
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <h4 className="font-medium mb-2">
                        Recommended Content Types
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {data.insights.content_recommendations.recommended_content_types.map(
                          (type, index) => (
                            <Badge key={index}>{type}</Badge>
                          )
                        )}
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <h4 className="font-medium mb-2">Suggested Hashtags</h4>
                      <div className="flex flex-wrap gap-2">
                        {data.insights.content_recommendations.hashtag_suggestions.map(
                          (hashtag, index) => (
                            <Badge key={index} variant="secondary">
                              {hashtag}
                            </Badge>
                          )
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground">
                  No recommendations available
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
