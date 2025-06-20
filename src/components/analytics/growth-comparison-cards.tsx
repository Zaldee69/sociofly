import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Users,
  Heart,
  Eye,
  FileText,
} from "lucide-react";

interface GrowthMetric {
  current: number;
  previous: number;
  percentage: number;
  trend: "up" | "down" | "stable";
}

interface GrowthData {
  socialAccountId: string;
  accountName: string | null;
  platform: string;
  lastUpdated: Date;
  growth: {
    followers: GrowthMetric;
    engagement: GrowthMetric;
    reach: GrowthMetric;
    posts: GrowthMetric;
  };
  comparisonPeriod?: string;
}

interface GrowthComparisonCardsProps {
  data: GrowthData;
  isLoading?: boolean;
  comparisonType?: "day" | "week" | "month" | "quarter";
}

const MetricCard = ({
  title,
  icon,
  metric,
  suffix = "",
  comparisonType,
}: {
  title: string;
  icon: React.ReactNode;
  metric: GrowthMetric;
  suffix?: string;
  comparisonType?: string;
}) => {
  const formatValue = (value: number) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K`;
    }
    return value.toString();
  };

  const getTrendIcon = () => {
    if (metric.trend === "up") {
      return <TrendingUp className="h-4 w-4 text-green-600" />;
    } else if (metric.trend === "down") {
      return <TrendingDown className="h-4 w-4 text-red-600" />;
    }
    return <Minus className="h-4 w-4 text-gray-600" />;
  };

  const getTrendColor = () => {
    if (metric.trend === "up") return "text-green-600";
    if (metric.trend === "down") return "text-red-600";
    return "text-gray-600";
  };

  const getPercentageDisplay = () => {
    const absPercentage = Math.abs(metric.percentage);
    const sign = metric.percentage > 0 ? "+" : metric.percentage < 0 ? "-" : "";

    if (absPercentage > 100) {
      return `${sign}${absPercentage.toFixed(0)}%`;
    } else if (absPercentage > 10) {
      return `${sign}${absPercentage.toFixed(1)}%`;
    } else {
      return `${sign}${absPercentage.toFixed(2)}%`;
    }
  };

  const getPeriodLabel = () => {
    switch (comparisonType) {
      case "day":
        return "yesterday";
      case "week":
        return "last week";
      case "month":
        return "last month";
      case "quarter":
        return "last quarter";
      default:
        return "previous period";
    }
  };

  const formatLastUpdated = (date: Date) => {
    const now = new Date();
    const diffMinutes = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60)
    );

    if (diffMinutes < 60) {
      return `${diffMinutes} minutes ago`;
    } else if (diffMinutes < 1440) {
      return `${Math.floor(diffMinutes / 60)} hours ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  return (
    <Card className="transition-all duration-200 hover:shadow-md">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          <div className="text-2xl font-bold">
            {formatValue(metric.current)}
            {suffix}
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              vs {getPeriodLabel()}: {formatValue(metric.previous)}
              {suffix}
            </span>
          </div>

          <div
            className={`flex items-center text-xs font-medium ${getTrendColor()}`}
          >
            {getTrendIcon()}
            <span className="ml-1">
              {getPercentageDisplay()} from {getPeriodLabel()}
            </span>
          </div>

          {/* Warning for extreme values */}
          {Math.abs(metric.percentage) > 50 && (
            <div className="text-xs text-yellow-600 bg-yellow-50 px-2 py-1 rounded">
              ⚠️ Extreme value detected
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

const LoadingSkeleton = () => (
  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
    {[...Array(4)].map((_, i) => (
      <Card key={i}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-4" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-16 mb-2" />
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-20" />
          </div>
          <div className="mt-2">
            <Skeleton className="h-3 w-full mb-1" />
            <Skeleton className="h-2 w-full" />
          </div>
        </CardContent>
      </Card>
    ))}
  </div>
);

export const GrowthComparisonCards: React.FC<GrowthComparisonCardsProps> = ({
  data,
  isLoading = false,
  comparisonType,
}) => {
  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (!data) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No comparison data available</p>
      </div>
    );
  }

  const getPeriodLabel = (type?: string) => {
    switch (type) {
      case "day":
        return "vs Yesterday";
      case "week":
        return "vs Last Week";
      case "month":
        return "vs Last Month";
      case "quarter":
        return "vs Last Quarter";
      default:
        return "vs Previous Period";
    }
  };

  const formatLastUpdated = (date: Date) => {
    const now = new Date();
    const diffMinutes = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60)
    );

    if (diffMinutes < 60) {
      return `${diffMinutes} minutes ago`;
    } else if (diffMinutes < 1440) {
      return `${Math.floor(diffMinutes / 60)} hours ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Growth Overview</h3>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Badge variant="outline">{data.accountName || "Account"}</Badge>
            <span>•</span>
            <span className="font-medium text-blue-600">
              {getPeriodLabel(comparisonType)}
            </span>
            <span>•</span>
            <span>Updated {formatLastUpdated(data.lastUpdated)}</span>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Followers"
          icon={<Users className="h-4 w-4 text-muted-foreground" />}
          metric={data.growth.followers}
          comparisonType={comparisonType}
        />

        <MetricCard
          title="Engagement Rate"
          icon={<Heart className="h-4 w-4 text-muted-foreground" />}
          metric={data.growth.engagement}
          suffix="%"
          comparisonType={comparisonType}
        />

        <MetricCard
          title="Total Reach"
          icon={<Eye className="h-4 w-4 text-muted-foreground" />}
          metric={data.growth.reach}
          comparisonType={comparisonType}
        />

        <MetricCard
          title="Total Posts"
          icon={<FileText className="h-4 w-4 text-muted-foreground" />}
          metric={data.growth.posts}
          comparisonType={comparisonType}
        />
      </div>

      {/* Comparison Summary */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">
            📊 Comparison Summary ({getPeriodLabel(comparisonType)})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Object.entries(data.growth).map(([key, metric]) => (
              <div
                key={key}
                className="flex items-center justify-between text-sm"
              >
                <span className="capitalize text-muted-foreground">
                  {key.replace("Growth", "")}:
                </span>
                <div className="flex items-center space-x-1">
                  {metric.trend === "up" ? (
                    <TrendingUp className="h-3 w-3 text-green-600" />
                  ) : metric.trend === "down" ? (
                    <TrendingDown className="h-3 w-3 text-red-600" />
                  ) : (
                    <Minus className="h-3 w-3 text-gray-600" />
                  )}
                  <span
                    className={
                      metric.trend === "up"
                        ? "text-green-600 font-medium"
                        : metric.trend === "down"
                          ? "text-red-600 font-medium"
                          : "text-gray-600"
                    }
                  >
                    {metric.percentage > 0 ? "+" : ""}
                    {Math.abs(metric.percentage) > 100
                      ? `${metric.percentage > 0 ? "+" : ""}${metric.percentage.toFixed(0)}%`
                      : `${metric.percentage > 0 ? "+" : ""}${metric.percentage.toFixed(1)}%`}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Alert for extreme values */}
          {Object.values(data.growth).some(
            (metric) => Math.abs(metric.percentage) > 50
          ) && (
            <div className="mt-3 p-2 bg-yellow-100 border border-yellow-300 rounded text-xs text-yellow-800">
              ⚠️ Note: Extreme growth values may indicate sample data or data
              quality issues
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default GrowthComparisonCards;
