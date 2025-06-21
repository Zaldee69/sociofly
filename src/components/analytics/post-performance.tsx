import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Instagram,
  Facebook,
  Twitter,
  MoreHorizontal,
  Image,
  Video,
  PlayCircle,
  Layers,
  Heart,
  MessageSquare,
  Share2,
  Bookmark,
  MousePointer,
  Eye,
  Clock,
  TrendingUp,
} from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SocialPlatform, ContentFormat } from "@prisma/client";

interface PostPerformanceProps {
  socialAccountId: string;
  teamId: string;
  dateRange?: {
    days: number;
    startDate: Date;
    endDate: Date;
  };
}

interface PostMetrics {
  id: string;
  platform: SocialPlatform;
  contentFormat: ContentFormat;
  content: string;
  publishedAt: string;

  // Engagement metrics
  likes: number;
  reactions?: number; // Facebook only
  comments: number;
  shares: number;
  saves?: number; // Instagram only
  clicks: number;

  // Reach & Impressions
  reach: number;
  impressions: number;

  // Calculated metrics
  engagementRate: number;
  ctr: number;
  timeToEngagement?: number | null; // minutes

  // Performance indicators
  isTopPerformer: boolean;
  performanceScore: number; // 0-100
}

const PostPerformanceSection: React.FC<PostPerformanceProps> = ({
  socialAccountId,
  teamId,
  dateRange = { days: 30, startDate: new Date(), endDate: new Date() }, // Default to 30 days
}) => {
  const [selectedPlatform, setSelectedPlatform] = useState<string>("all");
  const [selectedFormat, setSelectedFormat] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("engagementRate");
  const [showDebug, setShowDebug] = useState(false);

  // Fetch post analytics data from database (no real-time API calls)
  const {
    data: postAnalyticsResult,
    isLoading,
    error,
  } = trpc.analytics.database.getPostAnalytics.useQuery(
    {
      socialAccountId: socialAccountId || "",
      teamId: teamId || "",
      days: dateRange.days, // Use the date range from props
      platform:
        selectedPlatform !== "all"
          ? (selectedPlatform as "INSTAGRAM" | "FACEBOOK" | "TWITTER")
          : undefined,
      contentFormat:
        selectedFormat !== "all"
          ? (selectedFormat as
              | "IMAGE"
              | "VIDEO"
              | "CAROUSEL"
              | "REELS"
              | "STORY")
          : undefined,
      sortBy: sortBy as
        | "engagementRate"
        | "reach"
        | "impressions"
        | "publishedAt",
    },
    {
      enabled: !!socialAccountId && !!teamId,
      refetchInterval: 300000, // Refetch every 5 minutes (less frequent since it's from database)
      staleTime: 240000, // Consider data stale after 4 minutes
    }
  );

  // Extract data from result
  const postAnalytics = postAnalyticsResult?.data || [];

  // Debug query to see raw data
  const { data: debugData, isLoading: debugLoading } =
    trpc.analytics.realtime.debugPostAnalytics.useQuery(
      {
        socialAccountId: socialAccountId || "",
        teamId: teamId || "",
      },
      {
        enabled: !!socialAccountId && !!teamId && showDebug,
      }
    );

  const data = postAnalytics || [];

  const renderPlatformIcon = (platform: string) => {
    switch (platform) {
      case "INSTAGRAM":
        return <Instagram className="h-4 w-4 text-[#E1306C]" />;
      case "FACEBOOK":
        return <Facebook className="h-4 w-4 text-[#4267B2]" />;
      case "TWITTER":
        return <Twitter className="h-4 w-4 text-[#1DA1F2]" />;
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
      case "STORY":
        return <Clock className="h-4 w-4 text-green-500" />;
      default:
        return <Image className="h-4 w-4" />;
    }
  };

  const getEngagementBadge = (rate: number) => {
    if (rate >= 10) return { variant: "default" as const, label: "Excellent" };
    if (rate >= 5) return { variant: "secondary" as const, label: "Good" };
    if (rate >= 2) return { variant: "outline" as const, label: "Average" };
    if (rate > 0) return { variant: "outline" as const, label: "Low" };
    return { variant: "destructive" as const, label: "No Engagement" };
  };

  const getEngagementInsight = (post: PostMetrics) => {
    const totalEngagement = calculateTotalEngagement(post);

    if (totalEngagement === 0) {
      return {
        icon: "💡",
        message: "Post reached people but no engagement yet",
        suggestion:
          "Try adding hashtags, asking questions, or posting at peak times",
      };
    }

    if (post.engagementRate < 1) {
      return {
        icon: "📈",
        message: "Low engagement rate",
        suggestion: "Consider improving content quality or timing",
      };
    }

    return {
      icon: "✅",
      message: "Good engagement",
      suggestion: "Keep up the good work!",
    };
  };

  const getPerformanceColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-blue-600";
    if (score >= 40) return "text-yellow-600";
    return "text-red-600";
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const calculateTotalEngagement = (post: PostMetrics) => {
    return (
      post.likes +
      (post.reactions || 0) +
      post.comments +
      post.shares +
      (post.saves || 0)
    );
  };

  // Calculate metrics safely
  const calculateMetrics = () => {
    if (data.length === 0) {
      return {
        totalPosts: 0,
        topPerformers: 0,
        avgEngagement: 0,
        totalReach: 0,
        avgCTR: 0,
      };
    }

    return {
      totalPosts: data.length,
      topPerformers: data.filter((p: PostMetrics) => p.isTopPerformer).length,
      avgEngagement:
        data.reduce((sum, p) => sum + p.engagementRate, 0) / data.length,
      totalReach: data.reduce((sum, p) => sum + p.reach, 0),
      avgCTR: data.reduce((sum, p) => sum + p.ctr, 0) / data.length,
    };
  };

  const metrics = calculateMetrics();

  return (
    <section id="post-performance" className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Post Performance</h2>
          <p className="text-muted-foreground">
            Detailed analytics for your posts with comprehensive engagement
            metrics
          </p>
        </div>

        {/* Debug Toggle (Development Only) */}
        {process.env.NODE_ENV === "development" && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowDebug(!showDebug)}
          >
            {showDebug ? "Hide Debug" : "Show Debug"}
          </Button>
        )}
      </div>

      {/* Debug Section */}
      {showDebug && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="text-orange-800">
              🐛 Debug Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {debugLoading ? (
              <p>Loading debug data...</p>
            ) : debugData ? (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {debugData.totalPosts}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Total Posts
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {debugData.publishedPosts}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Published Posts
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {debugData.postsWithAnalytics}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      With Analytics
                    </div>
                  </div>
                </div>

                <div className="max-h-60 overflow-y-auto">
                  <h4 className="font-medium mb-2">Raw Post Data:</h4>
                  {debugData.posts.map((post, index) => (
                    <div
                      key={post.postId}
                      className="mb-3 p-3 bg-white rounded border text-sm"
                    >
                      <div className="font-medium">
                        Post {index + 1}: {post.content}
                      </div>
                      <div className="text-muted-foreground">
                        Status: {post.status} | Analytics: {post.analyticsCount}{" "}
                        records
                      </div>
                      {post.latestAnalytics && (
                        <div className="mt-2 grid grid-cols-4 gap-2 text-xs">
                          <div>Likes: {post.latestAnalytics.likes}</div>
                          <div>Comments: {post.latestAnalytics.comments}</div>
                          <div>Reach: {post.latestAnalytics.reach}</div>
                          <div>
                            Impressions: {post.latestAnalytics.impressions}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p>No debug data available</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Filters - Always visible regardless of data */}
      <div className="flex flex-wrap gap-4 p-4 border rounded-lg bg-muted/5">
        <Select value={selectedPlatform} onValueChange={setSelectedPlatform}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Platform" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Platforms</SelectItem>
            <SelectItem value="INSTAGRAM">Instagram</SelectItem>
            <SelectItem value="FACEBOOK">Facebook</SelectItem>
            <SelectItem value="TWITTER">Twitter</SelectItem>
          </SelectContent>
        </Select>

        <Select value={selectedFormat} onValueChange={setSelectedFormat}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Content Format" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Formats</SelectItem>
            <SelectItem value="IMAGE">Image</SelectItem>
            <SelectItem value="VIDEO">Video</SelectItem>
            <SelectItem value="CAROUSEL">Carousel</SelectItem>
            <SelectItem value="REELS">Reels</SelectItem>
            <SelectItem value="STORY">Story</SelectItem>
          </SelectContent>
        </Select>

        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="engagementRate">Engagement Rate</SelectItem>
            <SelectItem value="reach">Reach</SelectItem>
            <SelectItem value="impressions">Impressions</SelectItem>
            <SelectItem value="publishedAt">Date Published</SelectItem>
          </SelectContent>
        </Select>

        {/* Filter status indicator */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {selectedPlatform !== "all" && (
            <Badge variant="outline" className="text-xs">
              Platform: {selectedPlatform}
            </Badge>
          )}
          {selectedFormat !== "all" && (
            <Badge variant="outline" className="text-xs">
              Format: {selectedFormat}
            </Badge>
          )}
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardHeader className="pb-2">
                  <Skeleton className="h-4 w-24" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-16 mb-2" />
                  <Skeleton className="h-3 w-32" />
                </CardContent>
              </Card>
            ))}
          </div>
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Error State */}
      {error && (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="text-red-500 mb-2">⚠️</div>
              <h3 className="text-lg font-medium mb-2 text-red-800">
                Error Loading Data
              </h3>
              <p className="text-muted-foreground">
                {error.message || "Failed to load post performance data"}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Data loaded successfully */}
      {!isLoading && !error && (
        <>
          {/* Performance Summary Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Posts
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.totalPosts}</div>
                <p className="text-xs text-muted-foreground">
                  {metrics.topPerformers} top performers
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Avg Engagement
                </CardTitle>
                <Heart className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {metrics.avgEngagement.toFixed(1)}%
                </div>
                <p className="text-xs text-muted-foreground">
                  Across all posts
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Reach
                </CardTitle>
                <Eye className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {metrics.totalReach.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">
                  Unique users reached
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg CTR</CardTitle>
                <MousePointer className="h-4 w-4 text-orange-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {metrics.avgCTR.toFixed(2)}%
                </div>
                <p className="text-xs text-muted-foreground">
                  Click-through rate
                </p>
              </CardContent>
            </Card>
          </div>

          {/* No Data State */}
          {data.length === 0 && (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="text-muted-foreground mb-4">📊</div>
                  <h3 className="text-lg font-medium mb-2">No Posts Found</h3>
                  <p className="text-muted-foreground mb-4">
                    No posts match your current filters. Try adjusting the
                    filters above.
                  </p>
                  <div className="text-sm text-muted-foreground">
                    Current filters:
                    <div className="mt-2 flex justify-center gap-2">
                      {selectedPlatform !== "all" && (
                        <Badge variant="outline">
                          Platform: {selectedPlatform}
                        </Badge>
                      )}
                      {selectedFormat !== "all" && (
                        <Badge variant="outline">
                          Format: {selectedFormat}
                        </Badge>
                      )}
                      {selectedPlatform === "all" &&
                        selectedFormat === "all" && (
                          <Badge variant="outline">No filters applied</Badge>
                        )}
                    </div>
                  </div>

                  {/* Debug data summary in no data state */}
                  {debugData && (
                    <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm">
                        Found {debugData.totalPosts} total posts,{" "}
                        {debugData.publishedPosts} published,
                        {debugData.postsWithAnalytics} with analytics data
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Detailed Post Performance Table */}
          {data.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Detailed Post Analytics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Post</TableHead>
                        <TableHead>Platform</TableHead>
                        <TableHead>Format</TableHead>
                        <TableHead>Published</TableHead>
                        <TableHead>Engagement</TableHead>
                        <TableHead>Reach</TableHead>
                        <TableHead>CTR</TableHead>
                        <TableHead>Score</TableHead>
                        <TableHead>Insights</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.map((post) => {
                        const engagementBadge = getEngagementBadge(
                          post.engagementRate
                        );
                        const totalEngagement = calculateTotalEngagement(post);
                        const engagementInsight = getEngagementInsight(post);

                        return (
                          <TableRow
                            key={post.id}
                            className={
                              post.isTopPerformer ? "bg-green-50/50" : ""
                            }
                          >
                            <TableCell className="max-w-[300px]">
                              <div className="space-y-1">
                                <div className="font-medium text-sm truncate">
                                  {post.content}
                                </div>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <Heart className="h-3 w-3" />
                                  <span>{post.likes.toLocaleString()}</span>
                                  <MessageSquare className="h-3 w-3" />
                                  <span>{post.comments}</span>
                                  <Share2 className="h-3 w-3" />
                                  <span>{post.shares}</span>
                                  {post.saves && (
                                    <>
                                      <Bookmark className="h-3 w-3" />
                                      <span>{post.saves}</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </TableCell>

                            <TableCell>
                              <div className="flex items-center gap-2">
                                {renderPlatformIcon(post.platform)}
                                <span className="text-sm">{post.platform}</span>
                              </div>
                            </TableCell>

                            <TableCell>
                              <div className="flex items-center gap-2">
                                {renderContentFormatIcon(post.contentFormat)}
                                <span className="text-sm">
                                  {post.contentFormat}
                                </span>
                              </div>
                            </TableCell>

                            <TableCell className="text-sm">
                              {formatDate(post.publishedAt)}
                              {post.timeToEngagement && (
                                <div className="text-xs text-muted-foreground">
                                  First engage: {post.timeToEngagement}m
                                </div>
                              )}
                            </TableCell>

                            <TableCell>
                              <div className="space-y-1">
                                <Badge
                                  variant={engagementBadge.variant}
                                  className="text-xs"
                                >
                                  {post.engagementRate.toFixed(1)}%
                                </Badge>
                                <div className="text-xs text-muted-foreground">
                                  {totalEngagement.toLocaleString()} total
                                </div>
                              </div>
                            </TableCell>

                            <TableCell>
                              <div className="space-y-1">
                                <div className="font-medium text-sm">
                                  {post.reach.toLocaleString()}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {post.impressions.toLocaleString()}{" "}
                                  impressions
                                </div>
                              </div>
                            </TableCell>

                            <TableCell>
                              <div className="space-y-1">
                                <div className="font-medium text-sm">
                                  {post.ctr.toFixed(2)}%
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {post.clicks} clicks
                                </div>
                              </div>
                            </TableCell>

                            <TableCell>
                              <div className="space-y-1">
                                <div
                                  className={`font-bold text-sm ${getPerformanceColor(
                                    post.performanceScore
                                  )}`}
                                >
                                  {post.performanceScore}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {post.isTopPerformer
                                    ? "Top Performer"
                                    : "Standard"}
                                </div>
                              </div>
                            </TableCell>

                            <TableCell>
                              <div className="space-y-1">
                                <div className="font-medium text-sm">
                                  {engagementInsight.icon}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {engagementInsight.message}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {engagementInsight.suggestion}
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </section>
  );
};

export default PostPerformanceSection;
