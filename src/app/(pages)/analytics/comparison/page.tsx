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
