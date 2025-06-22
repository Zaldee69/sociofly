import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Users,
  TrendingUp,
  TrendingDown,
  Minus,
  ArrowUpRight,
  Heart,
  Info,
  MessageSquare,
  Share2,
  Bookmark,
  MousePointer,
  Eye,
  BarChart3,
  ChevronRight,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  Instagram,
  Facebook,
  Image,
  Video,
  Layers,
  PlayCircle,
} from "lucide-react";
import { trpc } from "@/lib/trpc/client";

interface OverviewSectionProps {
  accountInsight?: {
    // Basic metrics
    totalFollowers?: number;
    followingCount?: number;
    totalPosts?: number;

    // Engagement metrics (comprehensive)
    totalLikes?: number;
    totalReactions?: number; // Facebook reactions
    totalComments?: number;
    totalShares?: number;
    totalSaves?: number; // Instagram saves
    totalClicks?: number;

    // Reach & Impressions
    totalReach?: number;
    totalImpressions?: number;
    avgReachPerPost?: number;

    // Calculated metrics
    engagementRate?: number; // (likes + comments + shares) ÷ reach × 100%
    avgEngagementPerPost?: number;
    avgClickThroughRate?: number;

    // Pre-calculated averages from database
    avgLikesPerPost?: number;
    avgCommentsPerPost?: number;
    avgSharesPerPost?: number;
    avgSavesPerPost?: number;

    // Analytics metadata
    postsAnalyzed?: number; // Number of posts used for aggregation
    totalPostsOnPlatform?: number; // Total posts on the platform

    // Growth metrics
    followerGrowth?: Array<{ name: string; followers: number }>;
    followersGrowthPercent?: number;
    mediaGrowthPercent?: number;
    engagementGrowthPercent?: number;
    reachGrowthPercent?: number;

    // Platform specific
    platform?: "INSTAGRAM" | "FACEBOOK";
    bioLinkClicks?: number;
    storyViews?: number;
    profileVisits?: number;

    // New fields
    socialAccountId?: string;
    teamId?: string;
  };
  stats?: Record<string, unknown>;
  isLoading: boolean;
}

const OverviewSection: React.FC<OverviewSectionProps> = ({
  accountInsight = {
    totalFollowers: 0,
    followingCount: 0,
    totalPosts: 0,
    totalLikes: 0,
    totalReactions: 0,
    totalComments: 0,
    totalShares: 0,
    totalSaves: 0,
    totalClicks: 0,
    totalReach: 0,
    totalImpressions: 0,
    avgReachPerPost: 0,
    engagementRate: 0,
    avgEngagementPerPost: 0,
    avgClickThroughRate: 0,
    // Pre-calculated averages from database
    avgLikesPerPost: 0,
    avgCommentsPerPost: 0,
    avgSharesPerPost: 0,
    avgSavesPerPost: 0,
    // Analytics metadata
    postsAnalyzed: 0,
    totalPostsOnPlatform: 0,
    followerGrowth: [],
    followersGrowthPercent: 0,
    mediaGrowthPercent: 0,
    engagementGrowthPercent: 0,
    reachGrowthPercent: 0,
    bioLinkClicks: 0,
    storyViews: 0,
    profileVisits: 0,
  },
  stats,
  isLoading,
}) => {
  // Calculate engagement rate using the correct formula
  const calculatedEngagementRate = React.useMemo(() => {
    // Use the engagement rate from the API if available, otherwise calculate
    if (accountInsight.engagementRate && accountInsight.engagementRate > 0) {
      return accountInsight.engagementRate;
    }

    const totalEngagements =
      (accountInsight.totalLikes || 0) +
      (accountInsight.totalComments || 0) +
      (accountInsight.totalShares || 0) +
      (accountInsight.totalSaves || 0);
    const reach = accountInsight.totalReach || 0;
    return reach > 0 ? (totalEngagements / reach) * 100 : 0;
  }, [
    accountInsight.engagementRate,
    accountInsight.totalLikes,
    accountInsight.totalComments,
    accountInsight.totalShares,
    accountInsight.totalReach,
  ]);

  // Helper functions for growth comparison
  const getTrendIcon = (percentage: number) => {
    if (percentage > 0.5) {
      return <TrendingUp className="h-3 w-3 text-green-600" />;
    } else if (percentage < -0.5) {
      return <TrendingDown className="h-3 w-3 text-red-600" />;
    }
    return <Minus className="h-3 w-3 text-gray-600" />;
  };

  const getTrendColor = (percentage: number) => {
    if (percentage > 0.5) return "text-green-600";
    if (percentage < -0.5) return "text-red-600";
    return "text-gray-600";
  };

  const formatPercentage = (percentage: number) => {
    const absPercentage = Math.abs(percentage);
    const sign = percentage > 0 ? "+" : percentage < 0 ? "-" : "";
    return `${sign}${absPercentage.toFixed(1)}%`;
  };

  if (isLoading) {
    return (
      <section id="overview" className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">Overview</h2>
          <p className="text-muted-foreground">Loading...</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-[120px] w-full" />
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-[140px] w-full" />
          ))}
        </div>
      </section>
    );
  }

  const getEngagementBadge = (rate: number) => {
    if (rate >= 6)
      return {
        variant: "default" as const,
        label: "Excellent",
        color: "bg-green-500",
      };
    if (rate >= 3)
      return {
        variant: "secondary" as const,
        label: "Good",
        color: "bg-blue-500",
      };
    if (rate >= 1)
      return {
        variant: "outline" as const,
        label: "Average",
        color: "bg-yellow-500",
      };
    return {
      variant: "destructive" as const,
      label: "Low",
      color: "bg-red-500",
    };
  };

  const engagementBadge = getEngagementBadge(calculatedEngagementRate);

  return (
    <section id="overview" className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Overview</h2>
        <p className="text-muted-foreground">
          Comprehensive performance metrics with growth comparison
        </p>
      </div>

      {/* Primary Metrics with Growth Comparison */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Followers
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(accountInsight.totalFollowers || 0).toLocaleString()}
            </div>
            <div className="flex items-center justify-between text-xs mt-2">
              <span className="text-muted-foreground">vs yesterday</span>
              <div
                className={`flex items-center gap-1 ${getTrendColor(accountInsight.followersGrowthPercent || 0)}`}
              >
                {getTrendIcon(accountInsight.followersGrowthPercent || 0)}
                <span className="font-medium">
                  {formatPercentage(accountInsight.followersGrowthPercent || 0)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Engagement Rate
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <div className="text-2xl font-bold">
                {calculatedEngagementRate.toFixed(2)}%
              </div>
              <Badge variant={engagementBadge.variant} className="text-xs">
                {engagementBadge.label}
              </Badge>
            </div>
            <div className="flex items-center justify-between text-xs mt-2">
              <span className="text-muted-foreground">vs yesterday</span>
              <div
                className={`flex items-center gap-1 ${getTrendColor(accountInsight.engagementGrowthPercent || 0)}`}
              >
                {getTrendIcon(accountInsight.engagementGrowthPercent || 0)}
                <span className="font-medium">
                  {formatPercentage(
                    accountInsight.engagementGrowthPercent || 0
                  )}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Reach & Views</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground flex items-center gap-1">
                  <Eye className="h-3 w-3 text-blue-500" />
                  Unique Reach
                </span>
                <span className="text-lg font-bold">
                  {(accountInsight.totalReach || 0).toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground flex items-center gap-1">
                  <MousePointer className="h-3 w-3 text-purple-500" />
                  Total Views
                </span>
                <span className="text-lg font-bold">
                  {(accountInsight.totalImpressions || 0).toLocaleString()}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between text-xs mt-2 pt-2 border-t">
              <span className="text-muted-foreground">reach growth</span>
              <div
                className={`flex items-center gap-1 ${getTrendColor(accountInsight.reachGrowthPercent || 0)}`}
              >
                {getTrendIcon(accountInsight.reachGrowthPercent || 0)}
                <span className="font-medium">
                  {formatPercentage(accountInsight.reachGrowthPercent || 0)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Posts</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {accountInsight.totalPosts || 0}
            </div>
            <div className="flex items-center justify-between text-xs mt-2">
              <span className="text-muted-foreground">vs yesterday</span>
              <div
                className={`flex items-center gap-1 ${getTrendColor(accountInsight.mediaGrowthPercent || 0)}`}
              >
                {getTrendIcon(accountInsight.mediaGrowthPercent || 0)}
                <span className="font-medium">
                  {formatPercentage(accountInsight.mediaGrowthPercent || 0)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Comparison Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-blue-600" />
            Growth Comparison (vs Yesterday)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <span className="text-muted-foreground">Followers</span>
              <div
                className={`flex items-center gap-1 font-medium ${getTrendColor(accountInsight.followersGrowthPercent || 0)}`}
              >
                {getTrendIcon(accountInsight.followersGrowthPercent || 0)}
                <span>
                  {formatPercentage(accountInsight.followersGrowthPercent || 0)}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <span className="text-muted-foreground">Engagement</span>
              <div
                className={`flex items-center gap-1 font-medium ${getTrendColor(accountInsight.engagementGrowthPercent || 0)}`}
              >
                {getTrendIcon(accountInsight.engagementGrowthPercent || 0)}
                <span>
                  {formatPercentage(
                    accountInsight.engagementGrowthPercent || 0
                  )}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <span className="text-muted-foreground">Reach</span>
              <div
                className={`flex items-center gap-1 font-medium ${getTrendColor(accountInsight.reachGrowthPercent || 0)}`}
              >
                {getTrendIcon(accountInsight.reachGrowthPercent || 0)}
                <span>
                  {formatPercentage(accountInsight.reachGrowthPercent || 0)}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <span className="text-muted-foreground">Posts</span>
              <div
                className={`flex items-center gap-1 font-medium ${getTrendColor(accountInsight.mediaGrowthPercent || 0)}`}
              >
                {getTrendIcon(accountInsight.mediaGrowthPercent || 0)}
                <span>
                  {formatPercentage(accountInsight.mediaGrowthPercent || 0)}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Metrics Explanation */}
      <Card className="border-purple-200 bg-purple-50/50">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Info className="h-4 w-4 text-purple-600" />
            Understanding Reach vs Views/Impressions
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <div className="grid gap-3">
            <div className="flex items-start gap-3">
              <Eye className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
              <div>
                <div className="font-medium text-blue-700">
                  Reach (Unique Users)
                </div>
                <div>
                  Number of unique accounts that saw your content. Each person
                  is counted only once.
                </div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <MousePointer className="h-4 w-4 text-purple-500 mt-0.5 flex-shrink-0" />
              <div>
                <div className="font-medium text-purple-700">
                  Views/Impressions (Total)
                </div>
                <div>
                  Total number of times your content was displayed. Same person
                  can be counted multiple times.
                </div>
              </div>
            </div>
            <div className="bg-white/70 p-3 rounded-lg border border-purple-200">
              <div className="text-xs text-purple-600 font-medium">
                📊 Example:
              </div>
              <div className="text-xs mt-1">
                If 18 people see your post, but 10 of them view it twice ={" "}
                <strong>18 Reach</strong> + <strong>38 Views</strong>
              </div>
            </div>
            <div className="text-xs text-purple-600">
              💡 <strong>Engagement Rate</strong> is calculated using{" "}
              <strong>Reach</strong> (unique users) for more accurate
              measurement.
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Source Information */}
      <Card className="border-blue-200 bg-blue-50/50">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Info className="h-4 w-4 text-blue-600" />
            Analytics Data Source
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <div className="grid gap-2">
            <div className="flex justify-between">
              <span>Posts analyzed for engagement:</span>
              <span className="font-medium text-foreground">
                {accountInsight.postsAnalyzed || "N/A"} posts
              </span>
            </div>
            <div className="flex justify-between">
              <span>Total posts on platform:</span>
              <span className="font-medium text-foreground">
                {accountInsight.totalPostsOnPlatform ||
                  accountInsight.totalPosts ||
                  "N/A"}{" "}
                posts
              </span>
            </div>
            <div className="text-xs text-blue-600 mt-2">
              💡 Engagement metrics (likes, comments, shares, saves) are
              calculated from the most recent{" "}
              {accountInsight.postsAnalyzed || 25} posts to ensure data accuracy
              and performance.
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Engagement Breakdown */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Likes & Reactions
            </CardTitle>
            <Heart className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(
                (accountInsight.totalLikes || 0) +
                (accountInsight.totalReactions || 0)
              ).toLocaleString()}
            </div>
            <div className="text-xs text-muted-foreground space-y-1">
              <div>
                Likes: {(accountInsight.totalLikes || 0).toLocaleString()}
              </div>
              {accountInsight.platform === "FACEBOOK" && (
                <div>
                  Reactions:{" "}
                  {(accountInsight.totalReactions || 0).toLocaleString()}
                </div>
              )}
              <div>
                Avg per post: {(accountInsight.avgLikesPerPost || 0).toFixed(1)}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Comments</CardTitle>
            <MessageSquare className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(accountInsight.totalComments || 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Avg per post:{" "}
              {(accountInsight.avgCommentsPerPost || 0).toFixed(1)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Shares</CardTitle>
            <Share2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(accountInsight.totalShares || 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Avg per post:{" "}
              {(accountInsight.avgSharesPerPost || 0) < 0.1
                ? (accountInsight.avgSharesPerPost || 0).toFixed(2)
                : (accountInsight.avgSharesPerPost || 0).toFixed(1)}
            </p>
          </CardContent>
        </Card>

        {accountInsight.platform === "INSTAGRAM" && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Saves</CardTitle>
              <Bookmark className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {(accountInsight.totalSaves || 0).toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                Avg per post: {(accountInsight.avgSavesPerPost || 0).toFixed(1)}
              </p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Link Clicks</CardTitle>
            <MousePointer className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(accountInsight.totalClicks || 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Avg per post:{" "}
              {accountInsight.totalPosts && accountInsight.totalPosts > 0
                ? (
                    (accountInsight.totalClicks || 0) /
                    accountInsight.totalPosts
                  ).toFixed(1)
                : "0"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Impressions</CardTitle>
            <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(accountInsight.totalImpressions || 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Frequency:{" "}
              {accountInsight.totalReach
                ? (
                    (accountInsight.totalImpressions || 0) /
                    accountInsight.totalReach
                  ).toFixed(2)
                : 0}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Performance Indicators */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Performance Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Engagement Rate</span>
                <span>{calculatedEngagementRate.toFixed(2)}%</span>
              </div>
              <Progress
                value={Math.min(calculatedEngagementRate * 10, 100)}
                className="h-2"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Target: 3-6% for good performance
              </p>
            </div>

            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Reach vs Impressions Ratio</span>
                <span>
                  {accountInsight.totalReach && accountInsight.totalImpressions
                    ? (
                        (accountInsight.totalReach /
                          accountInsight.totalImpressions) *
                        100
                      ).toFixed(1)
                    : 0}
                  %
                </span>
              </div>
              <Progress
                value={
                  accountInsight.totalReach && accountInsight.totalImpressions
                    ? Math.min(
                        (accountInsight.totalReach /
                          accountInsight.totalImpressions) *
                          200,
                        100
                      )
                    : 0
                }
                className="h-2"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Higher ratio indicates better unique reach
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Top Performing Posts Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-green-600" />
            Top Performing Posts
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Your best performing content from the last 30 days
          </p>
        </CardHeader>
        <CardContent>
          <TopPerformingPosts
            socialAccountId={accountInsight.socialAccountId}
            teamId={accountInsight.teamId}
            dateRange={{
              days: 30,
              startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
              endDate: new Date(),
            }}
          />
        </CardContent>
      </Card>
    </section>
  );
};

// New component for Top Performing Posts
interface TopPerformingPostsProps {
  socialAccountId?: string;
  teamId?: string;
  dateRange: {
    days: number;
    startDate: Date;
    endDate: Date;
  };
}

interface PostMetrics {
  id: string;
  platform: string;
  contentFormat: string;
  content: string;
  publishedAt: string;
  likes: number;
  comments: number;
  shares: number | null;
  saves: number | null;
  reach: number;
  engagementRate: number;
}

const TopPerformingPosts: React.FC<TopPerformingPostsProps> = ({
  socialAccountId,
  teamId,
  dateRange,
}) => {
  const { data: postAnalyticsResult, isLoading } =
    trpc.analytics.database.getPostAnalytics.useQuery(
      {
        socialAccountId: socialAccountId || "",
        teamId: teamId || "",
        days: dateRange.days,
        sortBy: "engagementRate",
        limit: 10, // Show top 10 posts
      },
      {
        enabled: !!socialAccountId && !!teamId,
        refetchInterval: 60000, // 1 minute for real-time data
        staleTime: 30000, // 30 seconds
        refetchOnWindowFocus: true,
        refetchOnMount: true,
      }
    );

  const postAnalytics = (postAnalyticsResult?.data || []) as PostMetrics[];

  const renderPlatformIcon = (platform: string) => {
    switch (platform) {
      case "INSTAGRAM":
        return <Instagram className="h-4 w-4 text-[#E1306C]" />;
      case "FACEBOOK":
        return <Facebook className="h-4 w-4 text-[#4267B2]" />;
      default:
        return <Instagram className="h-4 w-4" />;
    }
  };

  const renderContentFormatIcon = (format: string) => {
    switch (format) {
      case "IMAGE":
        return <Image className="h-4 w-4 text-blue-500" />;
      case "VIDEO":
        return <Video className="h-4 w-4 text-red-500" />;
      case "CAROUSEL":
        return <Layers className="h-4 w-4 text-purple-500" />;
      case "REELS":
        return <PlayCircle className="h-4 w-4 text-orange-500" />;
      default:
        return <Image className="h-4 w-4" />;
    }
  };

  const getEngagementBadge = (rate: number) => {
    if (rate >= 10) return { variant: "default" as const, label: "Excellent" };
    if (rate >= 5) return { variant: "secondary" as const, label: "Good" };
    if (rate >= 2) return { variant: "outline" as const, label: "Average" };
    return { variant: "destructive" as const, label: "Low" };
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="flex items-center space-x-4 p-4 border rounded-lg"
          >
            <Skeleton className="h-12 w-12 rounded" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
            <Skeleton className="h-6 w-16" />
          </div>
        ))}
      </div>
    );
  }

  if (postAnalytics.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>No post analytics data available</p>
        <p className="text-sm">
          Posts will appear here once analytics are collected
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {postAnalytics.slice(0, 5).map((post: PostMetrics, index: number) => {
        const engagementBadge = getEngagementBadge(post.engagementRate);

        return (
          <div
            key={post.id}
            className="flex items-start space-x-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
          >
            {/* Rank & Platform */}
            <div className="flex flex-col items-center min-w-0">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-sm">
                #{index + 1}
              </div>
              <div className="mt-2">{renderPlatformIcon(post.platform)}</div>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    {renderContentFormatIcon(post.contentFormat)}
                    <span className="text-xs text-muted-foreground uppercase tracking-wide">
                      {post.contentFormat}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(post.publishedAt)}
                    </span>
                  </div>
                  <p className="text-sm line-clamp-2 text-foreground mb-2">
                    {post.content || "No content available"}
                  </p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Heart className="h-3 w-3" />
                      {post.likes}
                    </div>
                    <div className="flex items-center gap-1">
                      <MessageSquare className="h-3 w-3" />
                      {post.comments}
                    </div>
                    <div className="flex items-center gap-1">
                      <Share2 className="h-3 w-3" />
                      {post.shares || 0}
                    </div>
                    {post.saves !== null && (
                      <div className="flex items-center gap-1">
                        <Bookmark className="h-3 w-3" />
                        {post.saves}
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <Eye className="h-3 w-3 text-blue-500" />
                      {post.reach.toLocaleString()} reach
                    </div>
                    <div className="flex items-center gap-1">
                      <MousePointer className="h-3 w-3 text-purple-500" />
                      {(post as any).impressions?.toLocaleString() ||
                        "N/A"}{" "}
                      views
                    </div>
                  </div>
                </div>

                {/* Engagement Rate Badge */}
                <div className="flex flex-col items-end gap-2 ml-4">
                  <Badge variant={engagementBadge.variant} className="text-xs">
                    {post.engagementRate.toFixed(1)}%
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {engagementBadge.label}
                  </span>
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {/* View All Posts Link */}
      <div className="pt-4 border-t">
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => {
            // Scroll to posts section if it exists, or show all posts modal
            const postsSection = document.getElementById("posts");
            if (postsSection) {
              postsSection.scrollIntoView({ behavior: "smooth" });
            }
          }}
        >
          View All Posts Analytics
          <ChevronRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
};

export default OverviewSection;
