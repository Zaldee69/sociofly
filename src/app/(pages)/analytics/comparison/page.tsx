"use client";

import React, { useState } from "react";
import { GrowthComparisonCards } from "@/components/analytics/growth-comparison-cards";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw,
  Calendar,
  Target,
  Users,
  Heart,
  Eye,
  FileText,
} from "lucide-react";
import { api } from "@/lib/utils/api";

type ComparisonType = "week" | "month" | "quarter";

// Simple AccountSelector replacement
const SimpleAccountSelector = ({
  value,
  onValueChange,
}: {
  value: string;
  onValueChange: (value: string) => void;
}) => {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Select an account" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="cmc1rehtx0006vx3iwena0qli">
          @akuzaldeee (Instagram)
        </SelectItem>
      </SelectContent>
    </Select>
  );
};

// Simple Growth Cards replacement
const SimpleGrowthCards = ({ data, isLoading }: any) => {
  if (isLoading) {
    return <div className="text-center py-8">Loading growth data...</div>;
  }

  if (!data) {
    return <div className="text-center py-8">No growth data available</div>;
  }

  const formatPercentage = (num: number) =>
    `${num > 0 ? "+" : ""}${num.toFixed(1)}%`;
  const getTrendColor = (percentage: number) =>
    percentage > 0
      ? "text-green-600"
      : percentage < 0
        ? "text-red-600"
        : "text-gray-600";

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Followers</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {data.growth.followers.current}
          </div>
          <p
            className={`text-xs ${getTrendColor(data.growth.followers.percentage)}`}
          >
            {formatPercentage(data.growth.followers.percentage)} from last
            period
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Engagement Rate</CardTitle>
          <Heart className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {data.growth.engagement.current.toFixed(1)}%
          </div>
          <p
            className={`text-xs ${getTrendColor(data.growth.engagement.percentage)}`}
          >
            {formatPercentage(data.growth.engagement.percentage)} from last
            period
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Reach</CardTitle>
          <Eye className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{data.growth.reach.current}</div>
          <p
            className={`text-xs ${getTrendColor(data.growth.reach.percentage)}`}
          >
            {formatPercentage(data.growth.reach.percentage)} from last period
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Posts</CardTitle>
          <FileText className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{data.growth.posts.current}</div>
          <p
            className={`text-xs ${getTrendColor(data.growth.posts.percentage)}`}
          >
            {formatPercentage(data.growth.posts.percentage)} from last period
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default function AnalyticsComparisonPage() {
  const [selectedAccountId, setSelectedAccountId] = useState<string>(
    "cmc1rehtx0006vx3iwena0qli"
  );
  const [comparisonType, setComparisonType] = useState<ComparisonType>("week");

  // Get growth summary data
  const {
    data: growthData,
    isLoading: isLoadingGrowth,
    refetch: refetchGrowth,
  } = api.analyticsComparison.getGrowthSummary.useQuery(
    { socialAccountId: selectedAccountId },
    { enabled: !!selectedAccountId }
  );

  // Get account comparison data
  const { data: comparisonData, isLoading: isLoadingComparison } =
    api.analyticsComparison.getAccountComparison.useQuery(
      { socialAccountId: selectedAccountId, comparisonType },
      { enabled: !!selectedAccountId }
    );

  // Get historical trends
  const { data: trendsData, isLoading: isLoadingTrends } =
    api.analyticsComparison.getHistoricalTrends.useQuery(
      { socialAccountId: selectedAccountId, days: 30 },
      { enabled: !!selectedAccountId }
    );

  // Get benchmark data
  const { data: benchmarkData } =
    api.analyticsComparison.getBenchmarkData.useQuery(
      { platform: "INSTAGRAM" }, // Dynamic based on selected account
      { enabled: !!selectedAccountId }
    );

  const handleRefresh = () => {
    refetchGrowth();
  };

  const getTrendIcon = (trend: "up" | "down" | "stable") => {
    switch (trend) {
      case "up":
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case "down":
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      case "stable":
        return <Minus className="h-4 w-4 text-gray-600" />;
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Analytics Comparison</h1>
          <p className="text-muted-foreground">
            Compare performance metrics and track growth trends
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoadingGrowth}
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${isLoadingGrowth ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        </div>
      </div>

      {/* Account and Period Selection */}
      <div className="flex items-center space-x-4">
        <div className="flex-1">
          <SimpleAccountSelector
            value={selectedAccountId}
            onValueChange={setSelectedAccountId}
          />
        </div>
        <Select
          value={comparisonType}
          onValueChange={(value: ComparisonType) => setComparisonType(value)}
        >
          <SelectTrigger className="w-48">
            <Calendar className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="week">vs Last Week</SelectItem>
            <SelectItem value="month">vs Last Month</SelectItem>
            <SelectItem value="quarter">vs Last Quarter</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {!selectedAccountId ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center">
              <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Select an Account</h3>
              <p className="text-muted-foreground">
                Choose a social media account to view comparison analytics
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="detailed">Detailed Analysis</TabsTrigger>
            <TabsTrigger value="trends">Historical Trends</TabsTrigger>
            <TabsTrigger value="benchmark">Benchmark</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {growthData && (
              <GrowthComparisonCards
                data={growthData as any}
                isLoading={isLoadingGrowth}
              />
            )}

            {/* Quick Insights */}
            {comparisonData && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <TrendingUp className="h-5 w-5 mr-2" />
                    Key Insights
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <h4 className="font-medium mb-2">Performance Summary</h4>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm">
                            Best Performing Metric
                          </span>
                          <Badge
                            variant="secondary"
                            className="text-green-600 bg-green-50"
                          >
                            {comparisonData.insights.bestPerformingMetric}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Overall Trend</span>
                          <div className="flex items-center space-x-1">
                            {getTrendIcon(
                              comparisonData.insights.overallTrend ===
                                "improving"
                                ? "up"
                                : comparisonData.insights.overallTrend ===
                                    "declining"
                                  ? "down"
                                  : "stable"
                            )}
                            <span className="text-sm capitalize">
                              {comparisonData.insights.overallTrend}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">Recommendations</h4>
                      <ul className="space-y-1">
                        {comparisonData.insights.recommendations
                          .slice(0, 3)
                          .map((rec, index) => (
                            <li
                              key={index}
                              className="text-sm text-muted-foreground"
                            >
                              • {rec}
                            </li>
                          ))}
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Detailed Analysis Tab */}
          <TabsContent value="detailed" className="space-y-6">
            {comparisonData && (
              <div className="grid gap-6 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Growth Metrics</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {Object.entries(comparisonData.growth).map(
                        ([key, metric]) => (
                          <div
                            key={key}
                            className="flex items-center justify-between"
                          >
                            <span className="capitalize">
                              {key.replace("Growth", "")}
                            </span>
                            <div className="flex items-center space-x-2">
                              {getTrendIcon(metric.trend)}
                              <span className="text-sm">
                                {metric.percentage > 0 ? "+" : ""}
                                {metric.percentage.toFixed(1)}%
                              </span>
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Period Comparison</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">
                        Comparing {comparisonData.period.label.toLowerCase()}
                      </p>
                      <div className="text-sm">
                        <strong>Current Period:</strong>{" "}
                        {comparisonData.current.recordedAt.toDateString()}
                      </div>
                      {comparisonData.previous && (
                        <div className="text-sm">
                          <strong>Previous Period:</strong>{" "}
                          {comparisonData.previous.recordedAt.toDateString()}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          {/* Historical Trends Tab */}
          <TabsContent value="trends" className="space-y-6">
            {trendsData && (
              <Card>
                <CardHeader>
                  <CardTitle>Historical Trends ({trendsData.period})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div>
                      <h4 className="font-medium mb-2">Followers</h4>
                      <p className="text-sm text-muted-foreground">
                        {trendsData.trends.followers.length} data points
                      </p>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">Engagement</h4>
                      <p className="text-sm text-muted-foreground">
                        {trendsData.trends.engagement.length} data points
                      </p>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">Reach</h4>
                      <p className="text-sm text-muted-foreground">
                        {trendsData.trends.reach.length} data points
                      </p>
                    </div>
                  </div>
                  {/* Here you could add charts using recharts or similar */}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Benchmark Tab */}
          <TabsContent value="benchmark" className="space-y-6">
            {benchmarkData && (
              <Card>
                <CardHeader>
                  <CardTitle>Industry Benchmark</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {benchmarkData.note}
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="text-center">
                      <div className="text-2xl font-bold">
                        {benchmarkData.benchmark.avgEngagementRate.toFixed(1)}%
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Avg Engagement Rate
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">
                        {benchmarkData.benchmark.avgFollowerGrowth.toFixed(1)}%
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Avg Follower Growth
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">
                        {benchmarkData.benchmark.avgReach.toFixed(0)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Avg Reach
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
