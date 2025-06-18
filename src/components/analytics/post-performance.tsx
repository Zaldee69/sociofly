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

interface PostPerformanceProps {
  socialAccountId?: string;
  teamId?: string;
}

interface PostMetrics {
  id: string;
  platform: "INSTAGRAM" | "FACEBOOK" | "TWITTER";
  contentFormat: "IMAGE" | "VIDEO" | "CAROUSEL" | "REELS" | "STORY";
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
  timeToEngagement?: number; // minutes

  // Performance indicators
  isTopPerformer: boolean;
  performanceScore: number; // 0-100
}

const PostPerformanceSection: React.FC<PostPerformanceProps> = ({
  socialAccountId,
  teamId,
}) => {
  const [selectedPlatform, setSelectedPlatform] = useState<string>("all");
  const [selectedFormat, setSelectedFormat] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("engagementRate");

  // Fetch post analytics data (commented out until tRPC router is implemented)
  // const { data: postAnalytics, isLoading } = trpc.analytics.getPostPerformance.useQuery({
  //   socialAccountId: socialAccountId || "",
  //   teamId: teamId || "",
  //   platform: selectedPlatform !== "all" ? selectedPlatform : undefined,
  //   contentFormat: selectedFormat !== "all" ? selectedFormat : undefined,
  //   sortBy: sortBy as "engagementRate" | "reach" | "impressions" | "publishedAt"
  // }, {
  //   enabled: !!socialAccountId && !!teamId
  // });

  const isLoading = false;

  // Mock data for demonstration (remove when real API is ready)
  const mockPosts: PostMetrics[] = [
    {
      id: "1",
      platform: "INSTAGRAM",
      contentFormat: "REELS",
      content: "Behind the scenes of our latest product launch! 🚀",
      publishedAt: "2024-01-15T10:30:00Z",
      likes: 1250,
      comments: 89,
      shares: 34,
      saves: 156,
      clicks: 45,
      reach: 8500,
      impressions: 12400,
      engagementRate: 18.2,
      ctr: 0.53,
      timeToEngagement: 15,
      isTopPerformer: true,
      performanceScore: 92,
    },
    {
      id: "2",
      platform: "FACEBOOK",
      contentFormat: "VIDEO",
      content: "Customer testimonial: Why they love our service",
      publishedAt: "2024-01-14T14:20:00Z",
      likes: 890,
      reactions: 234,
      comments: 67,
      shares: 89,
      clicks: 234,
      reach: 12300,
      impressions: 18600,
      engagementRate: 9.8,
      ctr: 1.9,
      timeToEngagement: 8,
      isTopPerformer: false,
      performanceScore: 76,
    },
    {
      id: "3",
      platform: "INSTAGRAM",
      contentFormat: "CAROUSEL",
      content: "Step-by-step guide to maximize your productivity",
      publishedAt: "2024-01-13T09:15:00Z",
      likes: 2100,
      comments: 123,
      shares: 45,
      saves: 289,
      clicks: 78,
      reach: 15600,
      impressions: 21800,
      engagementRate: 14.6,
      ctr: 0.5,
      timeToEngagement: 22,
      isTopPerformer: true,
      performanceScore: 87,
    },
    {
      id: "4",
      platform: "INSTAGRAM",
      contentFormat: "IMAGE",
      content: "Motivational quote for Monday morning ✨",
      publishedAt: "2024-01-12T07:00:00Z",
      likes: 456,
      comments: 23,
      shares: 12,
      saves: 67,
      clicks: 8,
      reach: 3200,
      impressions: 4100,
      engagementRate: 15.3,
      ctr: 0.25,
      timeToEngagement: 45,
      isTopPerformer: false,
      performanceScore: 68,
    },
  ];

  const data = mockPosts;

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
    return { variant: "destructive" as const, label: "Low" };
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

  if (isLoading) {
    return (
      <section id="post-performance" className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">Post Performance</h2>
          <p className="text-muted-foreground">Loading post analytics...</p>
        </div>
        <div className="space-y-4">
          <Skeleton className="h-[60px] w-full" />
          <Skeleton className="h-[400px] w-full" />
        </div>
      </section>
    );
  }

  return (
    <section id="post-performance" className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Post Performance</h2>
        <p className="text-muted-foreground">
          Detailed analytics for your posts with comprehensive engagement
          metrics
        </p>
      </div>

      {/* Filters */}
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
      </div>

      {/* Performance Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Posts</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.length}</div>
            <p className="text-xs text-muted-foreground">
              {data.filter((p: PostMetrics) => p.isTopPerformer).length} top
              performers
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
              {data.length > 0
                ? (
                    data.reduce((sum, p) => sum + p.engagementRate, 0) /
                    data.length
                  ).toFixed(1)
                : 0}
              %
            </div>
            <p className="text-xs text-muted-foreground">Across all posts</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Reach</CardTitle>
            <Eye className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.reduce((sum, p) => sum + p.reach, 0).toLocaleString()}
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
              {data.length > 0
                ? (
                    data.reduce((sum, p) => sum + p.ctr, 0) / data.length
                  ).toFixed(2)
                : 0}
              %
            </div>
            <p className="text-xs text-muted-foreground">Click-through rate</p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Post Performance Table */}
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
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((post) => {
                  const engagementBadge = getEngagementBadge(
                    post.engagementRate
                  );
                  const totalEngagement = calculateTotalEngagement(post);

                  return (
                    <TableRow
                      key={post.id}
                      className={post.isTopPerformer ? "bg-green-50/50" : ""}
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
                          <span className="text-sm">{post.contentFormat}</span>
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
                            {post.impressions.toLocaleString()} impressions
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
                        <div className="flex items-center gap-2">
                          <div
                            className={`font-medium ${getPerformanceColor(post.performanceScore)}`}
                          >
                            {post.performanceScore}
                          </div>
                          {post.isTopPerformer && (
                            <Badge variant="default" className="text-xs">
                              Top
                            </Badge>
                          )}
                        </div>
                      </TableCell>

                      <TableCell>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </section>
  );
};

export default PostPerformanceSection;
