"use client";

import React, { useState, useEffect } from "react";
import { GrowthComparisonCards } from "@/components/analytics/growth-comparison-cards";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
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
  BarChart3,
  Image,
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Production Health Report
  const [healthReport, setHealthReport] = useState<any>(null);
  const [healthLoading, setHealthLoading] = useState(false);
  const [autoCleanupResult, setAutoCleanupResult] = useState<any>(null);

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
  const {
    data: comparisonData,
    isLoading: isLoadingComparison,
    error: comparisonError,
  } = api.analyticsComparison.getAccountComparison.useQuery(
    { socialAccountId: selectedAccountId, comparisonType },
    { enabled: !!selectedAccountId }
  );

  // Debug logging
  React.useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      console.log("🔍 Analytics Comparison Debug:", {
        selectedAccountId,
        comparisonType,
        isLoadingComparison,
        hasComparisonData: !!comparisonData,
        comparisonError: comparisonError?.message,
        comparisonData: comparisonData ? "Data available" : "No data",
      });
    }
  }, [
    selectedAccountId,
    comparisonType,
    isLoadingComparison,
    comparisonData,
    comparisonError,
  ]);

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

  const handleGenerateData = async () => {
    if (!selectedAccountId) {
      setError("Please select a social account first");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        "/api/analytics/comparison/generate-sample-data",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            socialAccountId: selectedAccountId,
            days: 7,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log("✅ Sample data generated:", result);

      // Refresh growth data after generating
      refetchGrowth();
    } catch (err) {
      console.error("❌ Error generating sample data:", err);
      setError(
        err instanceof Error ? err.message : "Failed to generate sample data"
      );
    } finally {
      setLoading(false);
    }
  };

  // Production Health Monitoring
  const fetchHealthReport = async () => {
    setHealthLoading(true);
    try {
      const response = await fetch("/api/analytics/comparison/health-report", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      setHealthReport(result);
    } catch (err) {
      console.error("❌ Error fetching health report:", err);
    } finally {
      setHealthLoading(false);
    }
  };

  const runAutoCleanup = async () => {
    setHealthLoading(true);
    try {
      const response = await fetch("/api/analytics/comparison/auto-cleanup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          daysToCheck: 7,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      setAutoCleanupResult(result);

      // Refresh health report
      await fetchHealthReport();
    } catch (err) {
      console.error("❌ Error running auto cleanup:", err);
    } finally {
      setHealthLoading(false);
    }
  };

  useEffect(() => {
    // Auto-fetch health report on mount
    fetchHealthReport();
  }, []);

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="flex flex-col space-y-4">
        <h1 className="text-2xl font-bold">Growth Comparison Analytics</h1>
        <p className="text-muted-foreground">
          Compare your social media growth across different time periods with
          duplicate detection and cleanup tools.
        </p>
      </div>

      {/* Production Health Dashboard */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            🏥 Production Health Dashboard
            <Badge
              variant={
                !healthReport
                  ? "secondary"
                  : healthReport.status === "healthy"
                    ? "default"
                    : healthReport.status === "warning"
                      ? "destructive"
                      : "destructive"
              }
            >
              {!healthReport ? "Loading..." : healthReport.status.toUpperCase()}
            </Badge>
          </CardTitle>
          <CardDescription>
            Monitor data quality and manage duplicate records
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {healthLoading && (
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
              <span>Checking system health...</span>
            </div>
          )}

          {healthReport && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="p-4 border rounded-lg">
                <div className="text-2xl font-bold">
                  {healthReport.totalAccounts}
                </div>
                <div className="text-sm text-muted-foreground">
                  Total Accounts
                </div>
              </div>
              <div className="p-4 border rounded-lg">
                <div className="text-2xl font-bold text-orange-600">
                  {healthReport.accountsWithDuplicates}
                </div>
                <div className="text-sm text-muted-foreground">
                  Accounts with Duplicates
                </div>
              </div>
              <div className="p-4 border rounded-lg">
                <div className="text-2xl font-bold text-red-600">
                  {healthReport.totalDuplicates}
                </div>
                <div className="text-sm text-muted-foreground">
                  Total Duplicates
                </div>
              </div>
              <div className="p-4 border rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {healthReport.status === "healthy"
                    ? "✅"
                    : healthReport.status === "warning"
                      ? "⚠️"
                      : "🚨"}
                </div>
                <div className="text-sm text-muted-foreground">
                  System Status
                </div>
              </div>
            </div>
          )}

          {healthReport?.worstOffenders &&
            healthReport.worstOffenders.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2">🔥 Worst Offenders</h4>
                <div className="space-y-2">
                  {healthReport.worstOffenders.map(
                    (offender: any, index: number) => (
                      <div
                        key={index}
                        className="flex justify-between items-center p-2 bg-red-50 rounded"
                      >
                        <span className="font-medium">
                          {offender.accountName}
                        </span>
                        <div className="flex gap-2">
                          <Badge variant="destructive">
                            {offender.duplicateCount} duplicates
                          </Badge>
                          <Badge variant="outline">
                            {offender.duplicateDates.length} dates affected
                          </Badge>
                        </div>
                      </div>
                    )
                  )}
                </div>
              </div>
            )}

          {healthReport?.recommendations &&
            healthReport.recommendations.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2">💡 Recommendations</h4>
                <ul className="space-y-1">
                  {healthReport.recommendations.map(
                    (rec: string, index: number) => (
                      <li key={index} className="flex items-center gap-2">
                        <span className="text-blue-500">•</span>
                        <span className="text-sm">{rec}</span>
                      </li>
                    )
                  )}
                </ul>
              </div>
            )}

          <div className="flex gap-2">
            <Button
              onClick={fetchHealthReport}
              disabled={healthLoading}
              variant="outline"
              size="sm"
            >
              🔄 Refresh Health Report
            </Button>
            <Button
              onClick={runAutoCleanup}
              disabled={healthLoading || !healthReport?.totalDuplicates}
              variant={
                healthReport?.totalDuplicates > 0 ? "destructive" : "outline"
              }
              size="sm"
            >
              🧹 Auto-Cleanup Duplicates
            </Button>
          </div>

          {autoCleanupResult && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <h4 className="font-semibold text-green-800 mb-2">
                ✅ Cleanup Completed
              </h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Accounts Processed:</span>{" "}
                  {autoCleanupResult.accountsProcessed}
                </div>
                <div>
                  <span className="font-medium">Duplicates Removed:</span>{" "}
                  {autoCleanupResult.duplicatesRemoved}
                </div>
              </div>
              {autoCleanupResult.summary &&
                autoCleanupResult.summary.length > 0 && (
                  <div className="mt-2">
                    <div className="font-medium mb-1">Summary:</div>
                    {autoCleanupResult.summary.map(
                      (item: any, index: number) => (
                        <div key={index} className="text-xs text-green-700">
                          • {item.accountName}: {item.duplicatesRemoved}{" "}
                          duplicates removed
                        </div>
                      )
                    )}
                  </div>
                )}
            </div>
          )}
        </CardContent>
      </Card>

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
            {isLoadingComparison ? (
              <Card>
                <CardContent className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                    <h3 className="text-lg font-medium mb-2">
                      Loading Detailed Analysis
                    </h3>
                    <p className="text-muted-foreground">
                      Fetching comprehensive analytics data...
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : comparisonError ? (
              <Card>
                <CardContent className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <div className="text-red-500 mb-4">
                      <svg
                        className="h-12 w-12 mx-auto"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.232 15.5c-.77.833.192 2.5 1.732 2.5z"
                        />
                      </svg>
                    </div>
                    <h3 className="text-lg font-medium mb-2 text-red-600">
                      Error Loading Data
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      {comparisonError.message ||
                        "Failed to load comparison data"}
                    </p>
                    <Button
                      variant="outline"
                      onClick={() => window.location.reload()}
                      className="text-sm"
                    >
                      Try Again
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : comparisonData ? (
              <>
                {/* Performance Overview */}
                <div className="grid gap-6 md:grid-cols-3">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5" />
                        Growth Metrics
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {Object.entries(comparisonData.growth).map(
                          ([key, metric]) => (
                            <div
                              key={key}
                              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                            >
                              <div>
                                <span className="font-medium capitalize">
                                  {key.replace("Growth", "")}
                                </span>
                                <div className="text-sm text-muted-foreground">
                                  {metric.absolute > 0 ? "+" : ""}
                                  {metric.absolute}
                                </div>
                              </div>
                              <div className="flex items-center space-x-2">
                                {getTrendIcon(metric.trend)}
                                <span
                                  className={`text-sm font-semibold ${
                                    metric.percentage > 0
                                      ? "text-green-600"
                                      : metric.percentage < 0
                                        ? "text-red-600"
                                        : "text-gray-600"
                                  }`}
                                >
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
                      <CardTitle className="flex items-center gap-2">
                        <BarChart3 className="h-5 w-5" />
                        Current vs Previous
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">Followers</span>
                          <div className="text-right">
                            <div className="font-semibold">
                              {comparisonData.current.followersCount.toLocaleString()}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              vs{" "}
                              {comparisonData.previous?.followersCount?.toLocaleString() ||
                                0}
                            </div>
                          </div>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">
                            Engagement Rate
                          </span>
                          <div className="text-right">
                            <div className="font-semibold">
                              {comparisonData.current.engagementRate.toFixed(2)}
                              %
                            </div>
                            <div className="text-xs text-muted-foreground">
                              vs{" "}
                              {comparisonData.previous?.engagementRate?.toFixed(
                                2
                              ) || 0}
                              %
                            </div>
                          </div>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">
                            Media Count
                          </span>
                          <div className="text-right">
                            <div className="font-semibold">
                              {comparisonData.current.mediaCount}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              vs {comparisonData.previous?.mediaCount || 0}
                            </div>
                          </div>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">
                            Total Reach
                          </span>
                          <div className="text-right">
                            <div className="font-semibold">
                              {(
                                comparisonData.current.totalReach || 0
                              ).toLocaleString()}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              vs{" "}
                              {(
                                comparisonData.previous?.totalReach || 0
                              ).toLocaleString()}
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Calendar className="h-5 w-5" />
                        Period Analysis
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div>
                          <p className="text-sm font-medium">
                            Comparison Period
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {comparisonData.period.label}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm font-medium">Current Period</p>
                          <p className="text-sm text-muted-foreground">
                            {comparisonData.current.recordedAt.toLocaleDateString()}
                          </p>
                        </div>
                        {comparisonData.previous && (
                          <div>
                            <p className="text-sm font-medium">
                              Previous Period
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {comparisonData.previous.recordedAt.toLocaleDateString()}
                            </p>
                          </div>
                        )}
                        <div className="pt-2 border-t">
                          <p className="text-sm font-medium">Data Quality</p>
                          <div className="flex items-center gap-2 mt-1">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            <span className="text-xs text-muted-foreground">
                              Complete Data
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Performance Breakdown */}
                <div className="grid gap-6 md:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Target className="h-5 w-5" />
                        Performance Breakdown
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Detailed analysis of key performance indicators
                      </p>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {/* Engagement Analysis */}
                        <div className="p-4 border rounded-lg">
                          <h4 className="font-medium mb-3 flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            Engagement Analysis
                          </h4>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-muted-foreground">
                                Engagement Rate
                              </span>
                              <div className="font-semibold">
                                {comparisonData.current.engagementRate.toFixed(
                                  2
                                )}
                                %
                              </div>
                            </div>
                            <div>
                              <span className="text-muted-foreground">
                                Avg Reach/Post
                              </span>
                              <div className="font-semibold">
                                {comparisonData.current.avgReachPerPost
                                  ? comparisonData.current.avgReachPerPost.toLocaleString()
                                  : "N/A"}
                              </div>
                            </div>
                          </div>
                          <div className="mt-3 p-2 bg-blue-50 rounded text-xs">
                            <strong>Insight:</strong>{" "}
                            {comparisonData.growth.engagementGrowth.percentage >
                            0
                              ? `Engagement improved by ${comparisonData.growth.engagementGrowth.percentage.toFixed(1)}% - great content strategy!`
                              : comparisonData.growth.engagementGrowth
                                    .percentage < -5
                                ? `Engagement declined by ${Math.abs(comparisonData.growth.engagementGrowth.percentage).toFixed(1)}% - consider content optimization.`
                                : "Engagement is stable - maintain current strategy."}
                          </div>
                        </div>

                        {/* Growth Analysis */}
                        <div className="p-4 border rounded-lg">
                          <h4 className="font-medium mb-3 flex items-center gap-2">
                            <TrendingUp className="h-4 w-4" />
                            Growth Analysis
                          </h4>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-muted-foreground">
                                Follower Growth
                              </span>
                              <div className="font-semibold">
                                {comparisonData.growth.followersGrowth
                                  .absolute > 0
                                  ? "+"
                                  : ""}
                                {comparisonData.growth.followersGrowth.absolute}
                              </div>
                            </div>
                            <div>
                              <span className="text-muted-foreground">
                                Content Growth
                              </span>
                              <div className="font-semibold">
                                {comparisonData.growth.postsGrowth.absolute > 0
                                  ? "+"
                                  : ""}
                                {comparisonData.growth.postsGrowth.absolute}{" "}
                                posts
                              </div>
                            </div>
                          </div>
                          <div className="mt-3 p-2 bg-green-50 rounded text-xs">
                            <strong>Growth Rate:</strong>{" "}
                            {comparisonData.growth.followersGrowth.percentage >
                            10
                              ? "Excellent growth trajectory!"
                              : comparisonData.growth.followersGrowth
                                    .percentage > 5
                                ? "Good steady growth."
                                : comparisonData.growth.followersGrowth
                                      .percentage > 0
                                  ? "Slow but positive growth."
                                  : "Focus needed on growth strategies."}
                          </div>
                        </div>

                        {/* Content Performance */}
                        <div className="p-4 border rounded-lg">
                          <h4 className="font-medium mb-3 flex items-center gap-2">
                            <Image className="h-4 w-4" />
                            Content Performance
                          </h4>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">
                                Posts Published
                              </span>
                              <span className="font-semibold">
                                {comparisonData.current.mediaCount}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">
                                Avg Engagement/Post
                              </span>
                              <span className="font-semibold">
                                {comparisonData.current.mediaCount > 0
                                  ? (
                                      (comparisonData.current.engagementRate *
                                        comparisonData.current.followersCount) /
                                      100 /
                                      comparisonData.current.mediaCount
                                    ).toFixed(0)
                                  : "N/A"}
                              </span>
                            </div>
                          </div>
                          <div className="mt-3 p-2 bg-purple-50 rounded text-xs">
                            <strong>Content Strategy:</strong>{" "}
                            {comparisonData.growth.postsGrowth.percentage > 0 &&
                            comparisonData.growth.engagementGrowth.percentage >
                              0
                              ? "More content + better engagement = winning strategy!"
                              : comparisonData.growth.postsGrowth.percentage >
                                    0 &&
                                  comparisonData.growth.engagementGrowth
                                    .percentage <= 0
                                ? "Publishing more but engagement declining - focus on quality."
                                : "Consider increasing content frequency."}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <BarChart3 className="h-5 w-5" />
                        Key Insights & Recommendations
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        AI-powered insights based on your performance data
                      </p>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {/* Performance Summary */}
                        <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border">
                          <h4 className="font-medium mb-3 flex items-center gap-2">
                            🎯 Performance Summary
                          </h4>
                          <div className="space-y-2 text-sm">
                            <div className="flex items-center justify-between">
                              <span>Best Performing Metric</span>
                              <Badge
                                variant="secondary"
                                className="text-green-600 bg-green-50"
                              >
                                {comparisonData.insights.bestPerformingMetric}
                              </Badge>
                            </div>
                            <div className="flex items-center justify-between">
                              <span>Overall Trend</span>
                              <div className="flex items-center gap-1">
                                {getTrendIcon(
                                  comparisonData.insights.overallTrend ===
                                    "improving"
                                    ? "up"
                                    : comparisonData.insights.overallTrend ===
                                        "declining"
                                      ? "down"
                                      : "stable"
                                )}
                                <span className="capitalize font-medium">
                                  {comparisonData.insights.overallTrend}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Actionable Recommendations */}
                        <div className="p-4 border rounded-lg">
                          <h4 className="font-medium mb-3 flex items-center gap-2">
                            💡 Actionable Recommendations
                          </h4>
                          <div className="space-y-3">
                            {comparisonData.insights.recommendations.map(
                              (rec, index) => (
                                <div
                                  key={index}
                                  className="flex items-start gap-3 p-3 bg-yellow-50 rounded-lg"
                                >
                                  <div className="w-6 h-6 bg-yellow-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                                    {index + 1}
                                  </div>
                                  <p className="text-sm">{rec}</p>
                                </div>
                              )
                            )}
                          </div>
                        </div>

                        {/* Platform-Specific Insights */}
                        <div className="p-4 border rounded-lg">
                          <h4 className="font-medium mb-3 flex items-center gap-2">
                            📱 Platform-Specific Insights
                          </h4>
                          <div className="space-y-2 text-sm">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">
                                {comparisonData.platform}
                              </Badge>
                              <span className="text-muted-foreground">
                                Platform
                              </span>
                            </div>
                            {comparisonData.platform === "INSTAGRAM" && (
                              <div className="mt-3 p-3 bg-pink-50 rounded-lg">
                                <p className="text-xs">
                                  <strong>Instagram Tips:</strong>
                                </p>
                                <ul className="text-xs text-muted-foreground mt-1 space-y-1">
                                  <li>• Post consistently 1-2 times per day</li>
                                  <li>• Use 8-15 relevant hashtags</li>
                                  <li>• Engage with Stories and Reels</li>
                                  <li>• Optimal posting: 6-9 AM or 7-9 PM</li>
                                </ul>
                              </div>
                            )}
                            {comparisonData.platform === "FACEBOOK" && (
                              <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                                <p className="text-xs">
                                  <strong>Facebook Tips:</strong>
                                </p>
                                <ul className="text-xs text-muted-foreground mt-1 space-y-1">
                                  <li>• Post 1-2 times per day maximum</li>
                                  <li>• Focus on video content</li>
                                  <li>• Engage in Facebook Groups</li>
                                  <li>• Optimal posting: 1-3 PM weekdays</li>
                                </ul>
                              </div>
                            )}
                            {comparisonData.platform === "LINKEDIN" && (
                              <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                                <p className="text-xs">
                                  <strong>LinkedIn Tips:</strong>
                                </p>
                                <ul className="text-xs text-muted-foreground mt-1 space-y-1">
                                  <li>• Post 2-5 times per week</li>
                                  <li>• Share industry insights</li>
                                  <li>• Use professional tone</li>
                                  <li>• Optimal posting: 8-10 AM or 12-2 PM</li>
                                </ul>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Next Steps */}
                        <div className="p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg border">
                          <h4 className="font-medium mb-3 flex items-center gap-2">
                            🚀 Next Steps
                          </h4>
                          <div className="space-y-2 text-sm">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                              <span>Monitor engagement rates daily</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                              <span>A/B test posting times</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                              <span>Analyze top-performing content</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                              <span>Review weekly comparison reports</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Advanced Metrics */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5" />
                      Advanced Metrics & Calculations
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Deep dive into calculated metrics and performance
                      indicators
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-6 md:grid-cols-3">
                      {/* Engagement Metrics */}
                      <div className="space-y-4">
                        <h4 className="font-medium text-sm">
                          Engagement Metrics
                        </h4>
                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">
                              Engagement Rate
                            </span>
                            <span className="font-semibold">
                              {comparisonData.current.engagementRate.toFixed(2)}
                              %
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">
                              Est. Total Engagements
                            </span>
                            <span className="font-semibold">
                              {Math.round(
                                (comparisonData.current.engagementRate *
                                  comparisonData.current.followersCount) /
                                  100
                              ).toLocaleString()}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">
                              Engagement/Follower
                            </span>
                            <span className="font-semibold">
                              {(
                                comparisonData.current.engagementRate / 100
                              ).toFixed(3)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Growth Metrics */}
                      <div className="space-y-4">
                        <h4 className="font-medium text-sm">Growth Metrics</h4>
                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">
                              Daily Growth Rate
                            </span>
                            <span className="font-semibold">
                              {comparisonData.previous
                                ? (
                                    comparisonData.growth.followersGrowth
                                      .percentage / 7
                                  ).toFixed(2)
                                : 0}
                              %
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">
                              Content Velocity
                            </span>
                            <span className="font-semibold">
                              {comparisonData.previous
                                ? (
                                    comparisonData.growth.postsGrowth.absolute /
                                    7
                                  ).toFixed(1)
                                : 0}{" "}
                              posts/day
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">
                              Reach Efficiency
                            </span>
                            <span className="font-semibold">
                              {comparisonData.current.totalReach &&
                              comparisonData.current.mediaCount > 0
                                ? (
                                    comparisonData.current.totalReach /
                                    comparisonData.current.mediaCount
                                  ).toFixed(0)
                                : "N/A"}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Performance Scores */}
                      <div className="space-y-4">
                        <h4 className="font-medium text-sm">
                          Performance Scores
                        </h4>
                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">
                              Growth Score
                            </span>
                            <div className="flex items-center gap-2">
                              <div className="w-12 h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-green-500 rounded-full"
                                  style={{
                                    width: `${Math.min(100, Math.max(0, (comparisonData.growth.followersGrowth.percentage + 10) * 5))}%`,
                                  }}
                                ></div>
                              </div>
                              <span className="text-xs font-semibold">
                                {Math.min(
                                  100,
                                  Math.max(
                                    0,
                                    Math.round(
                                      (comparisonData.growth.followersGrowth
                                        .percentage +
                                        10) *
                                        5
                                    )
                                  )
                                )}
                              </span>
                            </div>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">
                              Engagement Score
                            </span>
                            <div className="flex items-center gap-2">
                              <div className="w-12 h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-blue-500 rounded-full"
                                  style={{
                                    width: `${Math.min(100, comparisonData.current.engagementRate * 10)}%`,
                                  }}
                                ></div>
                              </div>
                              <span className="text-xs font-semibold">
                                {Math.min(
                                  100,
                                  Math.round(
                                    comparisonData.current.engagementRate * 10
                                  )
                                )}
                              </span>
                            </div>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">
                              Overall Score
                            </span>
                            <div className="flex items-center gap-2">
                              <div className="w-12 h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-purple-500 rounded-full"
                                  style={{
                                    width: `${Math.min(
                                      100,
                                      (Math.max(
                                        0,
                                        (comparisonData.growth.followersGrowth
                                          .percentage +
                                          10) *
                                          5
                                      ) +
                                        Math.min(
                                          100,
                                          comparisonData.current
                                            .engagementRate * 10
                                        )) /
                                        2
                                    )}%`,
                                  }}
                                ></div>
                              </div>
                              <span className="text-xs font-semibold">
                                {Math.round(
                                  Math.min(
                                    100,
                                    (Math.max(
                                      0,
                                      (comparisonData.growth.followersGrowth
                                        .percentage +
                                        10) *
                                        5
                                    ) +
                                      Math.min(
                                        100,
                                        comparisonData.current.engagementRate *
                                          10
                                      )) /
                                      2
                                  )
                                )}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Performance Insights */}
                    <div className="mt-6 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg border">
                      <h4 className="font-medium mb-3 flex items-center gap-2">
                        🧠 AI Performance Analysis
                      </h4>
                      <div className="grid gap-4 md:grid-cols-2 text-sm">
                        <div>
                          <p className="font-medium mb-2">
                            Strengths Identified:
                          </p>
                          <ul className="space-y-1 text-muted-foreground">
                            {comparisonData.growth.followersGrowth.percentage >
                              5 && <li>• Strong follower growth momentum</li>}
                            {comparisonData.current.engagementRate > 3 && (
                              <li>• Above-average engagement rate</li>
                            )}
                            {comparisonData.growth.postsGrowth.percentage >
                              0 && <li>• Consistent content publishing</li>}
                            {comparisonData.growth.reachGrowth.percentage >
                              0 && <li>• Expanding reach and visibility</li>}
                          </ul>
                        </div>
                        <div>
                          <p className="font-medium mb-2">
                            Areas for Improvement:
                          </p>
                          <ul className="space-y-1 text-muted-foreground">
                            {comparisonData.growth.followersGrowth.percentage <
                              1 && (
                              <li>
                                • Focus on follower acquisition strategies
                              </li>
                            )}
                            {comparisonData.current.engagementRate < 2 && (
                              <li>• Improve content engagement tactics</li>
                            )}
                            {comparisonData.growth.postsGrowth.percentage <
                              0 && (
                              <li>• Increase content publishing frequency</li>
                            )}
                            {comparisonData.growth.reachGrowth.percentage <
                              0 && <li>• Optimize content for better reach</li>}
                          </ul>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card>
                <CardContent className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">
                      No Comparison Data Available
                    </h3>
                    <p className="text-muted-foreground">
                      Detailed analysis will appear here once analytics data is
                      collected for comparison
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Historical Trends Tab */}
          <TabsContent value="trends" className="space-y-6">
            {trendsData ? (
              <>
                {/* Trends Overview */}
                <div className="grid gap-6 md:grid-cols-3">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-blue-600" />
                        Followers Trend
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="text-2xl font-bold">
                          {trendsData.trends.followers.length} data points
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Over {trendsData.period}
                        </div>
                        {trendsData.trends.followers.length > 1 && (
                          <div className="flex items-center gap-2">
                            <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div className="h-full bg-blue-500 rounded-full w-3/4"></div>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              Progress
                            </span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5 text-green-600" />
                        Engagement Trend
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="text-2xl font-bold">
                          {trendsData.trends.engagement.length} data points
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Over {trendsData.period}
                        </div>
                        {trendsData.trends.engagement.length > 1 && (
                          <div className="flex items-center gap-2">
                            <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div className="h-full bg-green-500 rounded-full w-2/3"></div>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              Activity
                            </span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Eye className="h-5 w-5 text-purple-600" />
                        Reach Trend
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="text-2xl font-bold">
                          {trendsData.trends.reach.length} data points
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Over {trendsData.period}
                        </div>
                        {trendsData.trends.reach.length > 1 && (
                          <div className="flex items-center gap-2">
                            <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div className="h-full bg-purple-500 rounded-full w-4/5"></div>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              Visibility
                            </span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Detailed Trends Analysis */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5" />
                      Trend Analysis & Patterns
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Detailed breakdown of historical performance patterns
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-6 md:grid-cols-2">
                      {/* Followers Analysis */}
                      <div className="space-y-4">
                        <h4 className="font-medium flex items-center gap-2">
                          <TrendingUp className="h-4 w-4" />
                          Followers Pattern Analysis
                        </h4>
                        <div className="p-4 border rounded-lg space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">
                              Data Points Available
                            </span>
                            <span className="font-semibold">
                              {trendsData.trends.followers.length}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">
                              Tracking Period
                            </span>
                            <span className="font-semibold">
                              {trendsData.period}
                            </span>
                          </div>
                          <div className="pt-2 border-t">
                            <p className="text-xs text-muted-foreground">
                              {trendsData.trends.followers.length > 7
                                ? "Sufficient data for trend analysis"
                                : "More data needed for accurate trends"}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Engagement Analysis */}
                      <div className="space-y-4">
                        <h4 className="font-medium flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          Engagement Pattern Analysis
                        </h4>
                        <div className="p-4 border rounded-lg space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">
                              Data Points Available
                            </span>
                            <span className="font-semibold">
                              {trendsData.trends.engagement.length}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">
                              Tracking Period
                            </span>
                            <span className="font-semibold">
                              {trendsData.period}
                            </span>
                          </div>
                          <div className="pt-2 border-t">
                            <p className="text-xs text-muted-foreground">
                              {trendsData.trends.engagement.length > 7
                                ? "Strong engagement tracking available"
                                : "Building engagement history"}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Trend Insights */}
                    <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border">
                      <h4 className="font-medium mb-3 flex items-center gap-2">
                        📊 Historical Insights
                      </h4>
                      <div className="grid gap-4 md:grid-cols-3 text-sm">
                        <div className="p-3 bg-white rounded-lg border">
                          <p className="font-medium mb-1">Growth Consistency</p>
                          <p className="text-muted-foreground">
                            {trendsData.trends.followers.length > 10
                              ? "Excellent tracking history"
                              : trendsData.trends.followers.length > 5
                                ? "Good data foundation"
                                : "Building data history"}
                          </p>
                        </div>
                        <div className="p-3 bg-white rounded-lg border">
                          <p className="font-medium mb-1">
                            Engagement Stability
                          </p>
                          <p className="text-muted-foreground">
                            {trendsData.trends.engagement.length > 10
                              ? "Strong engagement tracking"
                              : trendsData.trends.engagement.length > 5
                                ? "Developing patterns"
                                : "Early stage tracking"}
                          </p>
                        </div>
                        <div className="p-3 bg-white rounded-lg border">
                          <p className="font-medium mb-1">Reach Visibility</p>
                          <p className="text-muted-foreground">
                            {trendsData.trends.reach.length > 10
                              ? "Comprehensive reach data"
                              : trendsData.trends.reach.length > 5
                                ? "Growing reach insights"
                                : "Initial reach tracking"}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Chart Placeholder */}
                    <div className="mt-6 p-8 border-2 border-dashed border-gray-300 rounded-lg text-center">
                      <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h4 className="font-medium text-gray-600 mb-2">
                        Interactive Charts Coming Soon
                      </h4>
                      <p className="text-sm text-gray-500">
                        Visual trend charts with line graphs, bar charts, and
                        interactive data points will be available here. Current
                        data:{" "}
                        {trendsData.trends.followers.length +
                          trendsData.trends.engagement.length +
                          trendsData.trends.reach.length}{" "}
                        total data points tracked.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card>
                <CardContent className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">
                      No Historical Data
                    </h3>
                    <p className="text-muted-foreground">
                      Historical trends will appear here once more analytics
                      data is collected over time
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Benchmark Tab */}
          <TabsContent value="benchmark" className="space-y-6">
            {benchmarkData ? (
              <>
                {/* Industry Benchmark Overview */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="h-5 w-5" />
                      Industry Benchmark Comparison
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {benchmarkData.note}
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-6 md:grid-cols-3">
                      <div className="text-center p-4 border rounded-lg">
                        <div className="text-3xl font-bold text-blue-600 mb-2">
                          {benchmarkData.benchmark.avgEngagementRate.toFixed(1)}
                          %
                        </div>
                        <div className="text-sm font-medium mb-1">
                          Industry Avg Engagement
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {comparisonData && (
                            <span
                              className={
                                comparisonData.current.engagementRate >
                                benchmarkData.benchmark.avgEngagementRate
                                  ? "text-green-600"
                                  : "text-orange-600"
                              }
                            >
                              You:{" "}
                              {comparisonData.current.engagementRate.toFixed(1)}
                              % (
                              {comparisonData.current.engagementRate >
                              benchmarkData.benchmark.avgEngagementRate
                                ? "Above"
                                : "Below"}{" "}
                              average)
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-center p-4 border rounded-lg">
                        <div className="text-3xl font-bold text-green-600 mb-2">
                          {benchmarkData.benchmark.avgFollowerGrowth.toFixed(1)}
                          %
                        </div>
                        <div className="text-sm font-medium mb-1">
                          Industry Avg Growth
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {comparisonData && (
                            <span
                              className={
                                comparisonData.growth.followersGrowth
                                  .percentage >
                                benchmarkData.benchmark.avgFollowerGrowth
                                  ? "text-green-600"
                                  : "text-orange-600"
                              }
                            >
                              You:{" "}
                              {comparisonData.growth.followersGrowth.percentage.toFixed(
                                1
                              )}
                              % (
                              {comparisonData.growth.followersGrowth
                                .percentage >
                              benchmarkData.benchmark.avgFollowerGrowth
                                ? "Above"
                                : "Below"}{" "}
                              average)
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-center p-4 border rounded-lg">
                        <div className="text-3xl font-bold text-purple-600 mb-2">
                          {benchmarkData.benchmark.avgReach.toLocaleString()}
                        </div>
                        <div className="text-sm font-medium mb-1">
                          Industry Avg Reach
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {comparisonData &&
                            comparisonData.current.totalReach && (
                              <span
                                className={
                                  comparisonData.current.totalReach >
                                  benchmarkData.benchmark.avgReach
                                    ? "text-green-600"
                                    : "text-orange-600"
                                }
                              >
                                You:{" "}
                                {comparisonData.current.totalReach.toLocaleString()}
                                (
                                {comparisonData.current.totalReach >
                                benchmarkData.benchmark.avgReach
                                  ? "Above"
                                  : "Below"}{" "}
                                average)
                              </span>
                            )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Performance Comparison */}
                {comparisonData && (
                  <div className="grid gap-6 md:grid-cols-2">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <BarChart3 className="h-5 w-5" />
                          Your Performance vs Industry
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {/* Engagement Comparison */}
                          <div className="p-4 border rounded-lg">
                            <div className="flex justify-between items-center mb-3">
                              <span className="font-medium">
                                Engagement Rate
                              </span>
                              <Badge
                                variant={
                                  comparisonData.current.engagementRate >
                                  benchmarkData.benchmark.avgEngagementRate
                                    ? "default"
                                    : "secondary"
                                }
                              >
                                {comparisonData.current.engagementRate >
                                benchmarkData.benchmark.avgEngagementRate
                                  ? "Above Average"
                                  : "Below Average"}
                              </Badge>
                            </div>
                            <div className="space-y-2">
                              <div className="flex justify-between text-sm">
                                <span>Your Rate</span>
                                <span className="font-semibold">
                                  {comparisonData.current.engagementRate.toFixed(
                                    2
                                  )}
                                  %
                                </span>
                              </div>
                              <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-blue-500 rounded-full"
                                  style={{
                                    width: `${Math.min(100, (comparisonData.current.engagementRate / benchmarkData.benchmark.avgEngagementRate) * 100)}%`,
                                  }}
                                ></div>
                              </div>
                              <div className="flex justify-between text-xs text-muted-foreground">
                                <span>
                                  Industry:{" "}
                                  {benchmarkData.benchmark.avgEngagementRate.toFixed(
                                    1
                                  )}
                                  %
                                </span>
                                <span>
                                  {comparisonData.current.engagementRate >
                                  benchmarkData.benchmark.avgEngagementRate
                                    ? `+${((comparisonData.current.engagementRate / benchmarkData.benchmark.avgEngagementRate - 1) * 100).toFixed(1)}%`
                                    : `${((comparisonData.current.engagementRate / benchmarkData.benchmark.avgEngagementRate - 1) * 100).toFixed(1)}%`}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Growth Comparison */}
                          <div className="p-4 border rounded-lg">
                            <div className="flex justify-between items-center mb-3">
                              <span className="font-medium">
                                Follower Growth
                              </span>
                              <Badge
                                variant={
                                  comparisonData.growth.followersGrowth
                                    .percentage >
                                  benchmarkData.benchmark.avgFollowerGrowth
                                    ? "default"
                                    : "secondary"
                                }
                              >
                                {comparisonData.growth.followersGrowth
                                  .percentage >
                                benchmarkData.benchmark.avgFollowerGrowth
                                  ? "Above Average"
                                  : "Below Average"}
                              </Badge>
                            </div>
                            <div className="space-y-2">
                              <div className="flex justify-between text-sm">
                                <span>Your Growth</span>
                                <span className="font-semibold">
                                  {comparisonData.growth.followersGrowth.percentage.toFixed(
                                    2
                                  )}
                                  %
                                </span>
                              </div>
                              <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-green-500 rounded-full"
                                  style={{
                                    width: `${Math.min(100, Math.max(0, (comparisonData.growth.followersGrowth.percentage / benchmarkData.benchmark.avgFollowerGrowth) * 100))}%`,
                                  }}
                                ></div>
                              </div>
                              <div className="flex justify-between text-xs text-muted-foreground">
                                <span>
                                  Industry:{" "}
                                  {benchmarkData.benchmark.avgFollowerGrowth.toFixed(
                                    1
                                  )}
                                  %
                                </span>
                                <span>
                                  {comparisonData.growth.followersGrowth
                                    .percentage >
                                  benchmarkData.benchmark.avgFollowerGrowth
                                    ? `+${((comparisonData.growth.followersGrowth.percentage / benchmarkData.benchmark.avgFollowerGrowth - 1) * 100).toFixed(1)}%`
                                    : `${((comparisonData.growth.followersGrowth.percentage / benchmarkData.benchmark.avgFollowerGrowth - 1) * 100).toFixed(1)}%`}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Target className="h-5 w-5" />
                          Benchmark Insights & Recommendations
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {/* Performance Summary */}
                          <div className="p-4 bg-gradient-to-r from-blue-50 to-green-50 rounded-lg border">
                            <h4 className="font-medium mb-3">
                              📊 Performance Summary
                            </h4>
                            <div className="space-y-2 text-sm">
                              <div className="flex items-center justify-between">
                                <span>Metrics Above Industry Average</span>
                                <span className="font-bold">
                                  {
                                    [
                                      comparisonData.current.engagementRate >
                                        benchmarkData.benchmark
                                          .avgEngagementRate,
                                      comparisonData.growth.followersGrowth
                                        .percentage >
                                        benchmarkData.benchmark
                                          .avgFollowerGrowth,
                                      comparisonData.current.totalReach &&
                                        comparisonData.current.totalReach >
                                          benchmarkData.benchmark.avgReach,
                                    ].filter(Boolean).length
                                  }
                                  /3
                                </span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span>Overall Benchmark Performance</span>
                                <Badge
                                  variant={
                                    [
                                      comparisonData.current.engagementRate >
                                        benchmarkData.benchmark
                                          .avgEngagementRate,
                                      comparisonData.growth.followersGrowth
                                        .percentage >
                                        benchmarkData.benchmark
                                          .avgFollowerGrowth,
                                      comparisonData.current.totalReach &&
                                        comparisonData.current.totalReach >
                                          benchmarkData.benchmark.avgReach,
                                    ].filter(Boolean).length >= 2
                                      ? "default"
                                      : "secondary"
                                  }
                                >
                                  {[
                                    comparisonData.current.engagementRate >
                                      benchmarkData.benchmark.avgEngagementRate,
                                    comparisonData.growth.followersGrowth
                                      .percentage >
                                      benchmarkData.benchmark.avgFollowerGrowth,
                                    comparisonData.current.totalReach &&
                                      comparisonData.current.totalReach >
                                        benchmarkData.benchmark.avgReach,
                                  ].filter(Boolean).length >= 2
                                    ? "Strong"
                                    : "Developing"}
                                </Badge>
                              </div>
                            </div>
                          </div>

                          {/* Recommendations */}
                          <div className="p-4 border rounded-lg">
                            <h4 className="font-medium mb-3 flex items-center gap-2">
                              💡 Benchmark-Based Recommendations
                            </h4>
                            <div className="space-y-3">
                              {comparisonData.current.engagementRate <=
                                benchmarkData.benchmark.avgEngagementRate && (
                                <div className="flex items-start gap-3 p-3 bg-orange-50 rounded-lg">
                                  <div className="w-6 h-6 bg-orange-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                                    !
                                  </div>
                                  <p className="text-sm">
                                    <strong>Engagement Focus:</strong> Your
                                    engagement rate is below industry average.
                                    Consider posting more interactive content,
                                    asking questions, and responding to comments
                                    quickly.
                                  </p>
                                </div>
                              )}
                              {comparisonData.growth.followersGrowth
                                .percentage <=
                                benchmarkData.benchmark.avgFollowerGrowth && (
                                <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                                  <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                                    📈
                                  </div>
                                  <p className="text-sm">
                                    <strong>Growth Strategy:</strong> Your
                                    follower growth is below industry average.
                                    Focus on hashtag optimization,
                                    collaborations, and consistent posting
                                    schedule.
                                  </p>
                                </div>
                              )}
                              {comparisonData.current.totalReach &&
                                comparisonData.current.totalReach <=
                                  benchmarkData.benchmark.avgReach && (
                                  <div className="flex items-start gap-3 p-3 bg-purple-50 rounded-lg">
                                    <div className="w-6 h-6 bg-purple-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                                      👁️
                                    </div>
                                    <p className="text-sm">
                                      <strong>Reach Optimization:</strong> Your
                                      reach is below industry average. Post
                                      during peak hours, use trending hashtags,
                                      and engage with your community more
                                      actively.
                                    </p>
                                  </div>
                                )}
                              {comparisonData.current.engagementRate >
                                benchmarkData.benchmark.avgEngagementRate &&
                                comparisonData.growth.followersGrowth
                                  .percentage >
                                  benchmarkData.benchmark.avgFollowerGrowth && (
                                  <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                                    <div className="w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                                      ✓
                                    </div>
                                    <p className="text-sm">
                                      <strong>Excellent Performance:</strong>{" "}
                                      You're outperforming industry benchmarks!
                                      Continue your current strategy and
                                      consider sharing your success tactics with
                                      the community.
                                    </p>
                                  </div>
                                )}
                            </div>
                          </div>

                          {/* Industry Context */}
                          <div className="p-4 bg-gray-50 rounded-lg">
                            <h4 className="font-medium mb-2">
                              📋 Industry Context
                            </h4>
                            <p className="text-sm text-muted-foreground">
                              These benchmarks are based on industry averages
                              for similar accounts. Performance can vary
                              significantly based on niche, audience size, and
                              content strategy. Use these as guidelines rather
                              than absolute targets.
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </>
            ) : (
              <Card>
                <CardContent className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">
                      No Benchmark Data
                    </h3>
                    <p className="text-muted-foreground">
                      Industry benchmark data will appear here once your account
                      platform is identified
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      )}

      {/* Debug Section (Development Only) */}
      {process.env.NODE_ENV === "development" && (
        <div className="mt-8 border-t pt-6">
          <h2 className="text-lg font-semibold mb-4 text-yellow-700">
            🔧 Debug Tools (Development Only)
          </h2>
          <DebugGrowthComparison socialAccountId={selectedAccountId} />
        </div>
      )}
    </div>
  );
}

// Debug Component for Growth Comparison
const DebugGrowthComparison = ({
  socialAccountId,
}: {
  socialAccountId: string;
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);

  const { data: debugData, refetch: refetchDebug } =
    api.analyticsComparison.getDebugData.useQuery(
      { socialAccountId, limit: 10 },
      { enabled: !!socialAccountId }
    );

  const generateSampleData =
    api.analyticsComparison.generateSampleData.useMutation({
      onSuccess: () => {
        refetchDebug();
        setIsGenerating(false);
      },
      onError: (error) => {
        console.error("Error generating sample data:", error);
        setIsGenerating(false);
      },
    });

  const cleanDuplicates = api.analyticsComparison.cleanDuplicates.useMutation({
    onSuccess: () => {
      refetchDebug();
      setIsCleaning(false);
    },
    onError: (error) => {
      console.error("Error cleaning duplicates:", error);
      setIsCleaning(false);
    },
  });

  const handleGenerateSampleData = () => {
    setIsGenerating(true);
    generateSampleData.mutate({ socialAccountId, days: 7 });
  };

  const handleCleanDuplicates = () => {
    setIsCleaning(true);
    cleanDuplicates.mutate({ socialAccountId });
  };

  return (
    <div className="space-y-4">
      {/* Alert for duplicates */}
      {debugData &&
        debugData.records.length > 0 &&
        (() => {
          const dateGroups = debugData.records.reduce(
            (acc, record) => {
              const date = new Date(record.recordedAt).toDateString();
              acc[date] = (acc[date] || 0) + 1;
              return acc;
            },
            {} as Record<string, number>
          );

          const hasDuplicates = Object.values(dateGroups).some(
            (count) => count > 1
          );

          return hasDuplicates ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg
                    className="h-5 w-5 text-red-400"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">
                    Data Duplikat Terdeteksi!
                  </h3>
                  <div className="mt-2 text-sm text-red-700">
                    <p>
                      Ditemukan multiple records di tanggal yang sama. Ini
                      menyebabkan Growth Comparison tidak akurat.
                      <strong>
                        {" "}
                        Klik "Clean Duplicates" untuk memperbaiki.
                      </strong>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : null;
        })()}

      <div className="flex gap-4 flex-wrap">
        <Button
          variant="outline"
          onClick={handleCleanDuplicates}
          disabled={isCleaning}
          className="bg-red-50 hover:bg-red-100 border-red-200 text-red-700 font-medium"
        >
          {isCleaning && <RefreshCw className="h-4 w-4 mr-2 animate-spin" />}
          🧹 Clean Duplicates (Fix Growth Issue)
        </Button>

        <Button
          variant="outline"
          onClick={handleGenerateSampleData}
          disabled={isGenerating}
          className="bg-blue-50 hover:bg-blue-100"
        >
          {isGenerating && <RefreshCw className="h-4 w-4 mr-2 animate-spin" />}
          🧪 Generate Realistic Sample Data (7 days)
        </Button>

        <Button
          variant="outline"
          onClick={() => refetchDebug()}
          className="bg-green-50 hover:bg-green-100"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          🔄 Refresh Debug Data
        </Button>
      </div>

      {debugData && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">
              Debug Data: {debugData.accountName} ({debugData.platform})
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Total Records: {debugData.totalRecords}
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {debugData.records.map((record) => (
                <div
                  key={record.id}
                  className="border rounded p-3 text-xs bg-slate-50"
                >
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <strong>Date:</strong>{" "}
                      {new Date(record.recordedAt).toLocaleDateString()}
                    </div>
                    <div>
                      <strong>Followers:</strong> {record.followersCount}
                      <span
                        className={`ml-1 ${
                          (record.followersGrowthPercent || 0) > 0
                            ? "text-green-600"
                            : (record.followersGrowthPercent || 0) < 0
                              ? "text-red-600"
                              : "text-gray-600"
                        }`}
                      >
                        ({record.followersGrowthPercent?.toFixed(1) || "0.0"}%)
                      </span>
                    </div>
                    <div>
                      <strong>Engagement:</strong> {record.engagementRate}%
                      <span
                        className={`ml-1 ${
                          (record.engagementGrowthPercent || 0) > 0
                            ? "text-green-600"
                            : (record.engagementGrowthPercent || 0) < 0
                              ? "text-red-600"
                              : "text-gray-600"
                        }`}
                      >
                        ({record.engagementGrowthPercent?.toFixed(1) || "0.0"}%)
                      </span>
                    </div>
                    <div>
                      <strong>Posts:</strong> {record.mediaCount}
                      <span
                        className={`ml-1 ${
                          (record.mediaGrowthPercent || 0) > 0
                            ? "text-green-600"
                            : (record.mediaGrowthPercent || 0) < 0
                              ? "text-red-600"
                              : "text-gray-600"
                        }`}
                      >
                        ({record.mediaGrowthPercent?.toFixed(1) || "0.0"}%)
                      </span>
                    </div>
                    <div className="col-span-2 mt-1 pt-1 border-t">
                      <strong>Previous:</strong> F:
                      {record.previousFollowersCount || 0}, E:
                      {record.previousEngagementRate || 0}%, P:
                      {record.previousMediaCount || 0}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
