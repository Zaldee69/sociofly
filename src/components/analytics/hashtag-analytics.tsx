import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Hash,
  TrendingUp,
  Search,
  Eye,
  Target,
  BarChart3,
  Award,
  Instagram,
  Zap,
  Users,
  MousePointer,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc/client";

interface HashtagAnalyticsProps {
  socialAccountId?: string;
  teamId?: string;
}

interface HashtagMetrics {
  id: string;
  hashtag: string;
  reach: number;
  impressions: number;
  discovery: number; // Posts discovered via this hashtag
  usageCount: number; // How many times you've used it
  isTop: boolean; // Is it a top performing hashtag
  rank?: number; // Ranking position
  engagementRate: number;
  averageLikes: number;
  averageComments: number;
  trendingScore: number; // 0-100
  competitionLevel: "LOW" | "MEDIUM" | "HIGH";
  lastUsed: string;
}

interface HashtagRecommendation {
  hashtag: string;
  reason: string;
  estimatedReach: number;
  competitionLevel: "LOW" | "MEDIUM" | "HIGH";
  relevanceScore: number;
}

const HashtagAnalyticsSection: React.FC<HashtagAnalyticsProps> = ({
  socialAccountId,
  teamId,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<string>("reach");
  const [filterBy, setFilterBy] = useState<string>("all");

  // Fetch hashtag analytics data (commented out until tRPC router is implemented)
  // const { data: hashtagData, isLoading } = trpc.analytics.getHashtagAnalytics.useQuery({
  //   socialAccountId: socialAccountId || "",
  //   teamId: teamId || "",
  //   sortBy: sortBy as "reach" | "impressions" | "discovery" | "usageCount",
  //   filterBy: filterBy !== "all" ? filterBy : undefined
  // }, {
  //   enabled: !!socialAccountId && !!teamId
  // });

  const isLoading = false;

  // Mock data for demonstration
  const mockHashtagData: HashtagMetrics[] = [
    {
      id: "1",
      hashtag: "#digitalmarketing",
      reach: 45200,
      impressions: 67800,
      discovery: 1240,
      usageCount: 23,
      isTop: true,
      rank: 1,
      engagementRate: 4.2,
      averageLikes: 890,
      averageComments: 45,
      trendingScore: 85,
      competitionLevel: "HIGH",
      lastUsed: "2024-01-15T10:30:00Z",
    },
    {
      id: "2",
      hashtag: "#socialmediamarketing",
      reach: 38500,
      impressions: 52100,
      discovery: 980,
      usageCount: 18,
      isTop: true,
      rank: 2,
      engagementRate: 3.8,
      averageLikes: 720,
      averageComments: 38,
      trendingScore: 78,
      competitionLevel: "HIGH",
      lastUsed: "2024-01-14T14:20:00Z",
    },
    {
      id: "3",
      hashtag: "#contentcreator",
      reach: 28900,
      impressions: 41200,
      discovery: 750,
      usageCount: 15,
      isTop: false,
      rank: 3,
      engagementRate: 5.1,
      averageLikes: 650,
      averageComments: 52,
      trendingScore: 72,
      competitionLevel: "MEDIUM",
      lastUsed: "2024-01-13T09:15:00Z",
    },
    {
      id: "4",
      hashtag: "#brandingstrategy",
      reach: 15600,
      impressions: 22800,
      discovery: 420,
      usageCount: 12,
      isTop: false,
      rank: 4,
      engagementRate: 6.2,
      averageLikes: 380,
      averageComments: 28,
      trendingScore: 65,
      competitionLevel: "LOW",
      lastUsed: "2024-01-12T07:00:00Z",
    },
    {
      id: "5",
      hashtag: "#smallbusiness",
      reach: 12400,
      impressions: 18700,
      discovery: 320,
      usageCount: 8,
      isTop: false,
      rank: 5,
      engagementRate: 4.8,
      averageLikes: 290,
      averageComments: 22,
      trendingScore: 58,
      competitionLevel: "MEDIUM",
      lastUsed: "2024-01-11T16:45:00Z",
    },
  ];

  const mockRecommendations: HashtagRecommendation[] = [
    {
      hashtag: "#marketingtips",
      reason: "High relevance to your content",
      estimatedReach: 32000,
      competitionLevel: "MEDIUM",
      relevanceScore: 92,
    },
    {
      hashtag: "#businessgrowth",
      reason: "Trending in your niche",
      estimatedReach: 28500,
      competitionLevel: "LOW",
      relevanceScore: 88,
    },
    {
      hashtag: "#entrepreneurship",
      reason: "Similar audience engagement",
      estimatedReach: 41200,
      competitionLevel: "HIGH",
      relevanceScore: 85,
    },
  ];

  const data = mockHashtagData;
  const recommendations = mockRecommendations;

  const getCompetitionColor = (level: string) => {
    switch (level) {
      case "LOW":
        return "text-green-600 bg-green-100";
      case "MEDIUM":
        return "text-orange-600 bg-orange-100";
      case "HIGH":
        return "text-red-600 bg-red-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  const getTrendingBadge = (score: number) => {
    if (score >= 80) return { variant: "default" as const, label: "🔥 Hot" };
    if (score >= 60)
      return { variant: "secondary" as const, label: "📈 Trending" };
    return { variant: "outline" as const, label: "📊 Stable" };
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
    });
  };

  const filteredData = data.filter(
    (hashtag) =>
      hashtag.hashtag.toLowerCase().includes(searchTerm.toLowerCase()) &&
      (filterBy === "all" ||
        (filterBy === "top" && hashtag.isTop) ||
        (filterBy === "trending" && hashtag.trendingScore >= 70))
  );

  if (isLoading) {
    return (
      <section id="hashtag-analytics" className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">Hashtag Analytics</h2>
          <p className="text-muted-foreground">
            Loading hashtag performance...
          </p>
        </div>
        <div className="space-y-4">
          <Skeleton className="h-[60px] w-full" />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-[120px] w-full" />
            ))}
          </div>
          <Skeleton className="h-[400px] w-full" />
        </div>
      </section>
    );
  }

  return (
    <section id="hashtag-analytics" className="space-y-6">
      <div className="flex items-center gap-2">
        <Instagram className="h-6 w-6 text-[#E1306C]" />
        <div>
          <h2 className="text-2xl font-bold">Hashtag Analytics</h2>
          <p className="text-muted-foreground">
            Instagram hashtag performance and discovery insights
          </p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-wrap gap-4 p-4 border rounded-lg bg-muted/5">
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search hashtags..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="reach">Reach</SelectItem>
            <SelectItem value="impressions">Impressions</SelectItem>
            <SelectItem value="discovery">Discovery</SelectItem>
            <SelectItem value="usageCount">Usage Count</SelectItem>
            <SelectItem value="engagementRate">Engagement Rate</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterBy} onValueChange={setFilterBy}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Hashtags</SelectItem>
            <SelectItem value="top">Top Performers</SelectItem>
            <SelectItem value="trending">Trending</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Hashtags
            </CardTitle>
            <Hash className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.length}</div>
            <p className="text-xs text-muted-foreground">
              {data.filter((h) => h.isTop).length} top performers
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Reach</CardTitle>
            <Eye className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.reduce((sum, h) => sum + h.reach, 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Across all hashtags</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Discovery</CardTitle>
            <Target className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.reduce((sum, h) => sum + h.discovery, 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Posts discovered</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Avg Engagement
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.length > 0
                ? (
                    data.reduce((sum, h) => sum + h.engagementRate, 0) /
                    data.length
                  ).toFixed(1)
                : 0}
              %
            </div>
            <p className="text-xs text-muted-foreground">Average rate</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="performance" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
          <TabsTrigger value="trending">Trending</TabsTrigger>
        </TabsList>

        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Hashtag Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredData.map((hashtag) => {
                  const trendingBadge = getTrendingBadge(hashtag.trendingScore);

                  return (
                    <div
                      key={hashtag.id}
                      className={`p-4 border rounded-lg ${hashtag.isTop ? "bg-green-50/50 border-green-200" : ""}`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center w-8 h-8 bg-primary/10 rounded-full">
                            <span className="text-sm font-bold">
                              #{hashtag.rank}
                            </span>
                          </div>
                          <div>
                            <div className="font-medium text-lg text-blue-600">
                              {hashtag.hashtag}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge
                                variant={trendingBadge.variant}
                                className="text-xs"
                              >
                                {trendingBadge.label}
                              </Badge>
                              <Badge
                                variant="outline"
                                className={`text-xs ${getCompetitionColor(hashtag.competitionLevel)}`}
                              >
                                {hashtag.competitionLevel} Competition
                              </Badge>
                              {hashtag.isTop && (
                                <Badge variant="default" className="text-xs">
                                  <Award className="h-3 w-3 mr-1" />
                                  Top Performer
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="text-right text-xs text-muted-foreground">
                          Last used: {formatDate(hashtag.lastUsed)}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                        <div className="text-center p-3 bg-muted/20 rounded-lg">
                          <div className="text-lg font-bold text-blue-600">
                            {hashtag.reach.toLocaleString()}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Reach
                          </div>
                        </div>
                        <div className="text-center p-3 bg-muted/20 rounded-lg">
                          <div className="text-lg font-bold text-green-600">
                            {hashtag.impressions.toLocaleString()}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Impressions
                          </div>
                        </div>
                        <div className="text-center p-3 bg-muted/20 rounded-lg">
                          <div className="text-lg font-bold text-purple-600">
                            {hashtag.discovery.toLocaleString()}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Discovery
                          </div>
                        </div>
                        <div className="text-center p-3 bg-muted/20 rounded-lg">
                          <div className="text-lg font-bold text-orange-600">
                            {hashtag.engagementRate}%
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Engagement
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <div className="flex items-center gap-4">
                          <span>Used {hashtag.usageCount} times</span>
                          <span>Avg {hashtag.averageLikes} likes</span>
                          <span>Avg {hashtag.averageComments} comments</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Zap className="h-4 w-4" />
                          <span>
                            Trending Score: {hashtag.trendingScore}/100
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recommendations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recommended Hashtags</CardTitle>
              <p className="text-sm text-muted-foreground">
                Suggested hashtags based on your content and audience
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recommendations.map((rec, index) => (
                  <div
                    key={rec.hashtag}
                    className="p-4 border rounded-lg hover:bg-muted/20 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-8 h-8 bg-blue-100 rounded-full">
                          <Hash className="h-4 w-4 text-blue-600" />
                        </div>
                        <div>
                          <div className="font-medium text-lg text-blue-600">
                            {rec.hashtag}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {rec.reason}
                          </div>
                        </div>
                      </div>
                      <Button size="sm" variant="outline">
                        Add to Library
                      </Button>
                    </div>

                    <div className="grid grid-cols-3 gap-4 mb-3">
                      <div className="text-center p-3 bg-muted/20 rounded-lg">
                        <div className="text-lg font-bold">
                          {rec.estimatedReach.toLocaleString()}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Est. Reach
                        </div>
                      </div>
                      <div className="text-center p-3 bg-muted/20 rounded-lg">
                        <div
                          className={`text-lg font-bold ${getCompetitionColor(rec.competitionLevel).split(" ")[0]}`}
                        >
                          {rec.competitionLevel}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Competition
                        </div>
                      </div>
                      <div className="text-center p-3 bg-muted/20 rounded-lg">
                        <div className="text-lg font-bold text-green-600">
                          {rec.relevanceScore}%
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Relevance
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trending" className="space-y-4">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Trending Hashtags</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data
                    .filter((h) => h.trendingScore >= 70)
                    .sort((a, b) => b.trendingScore - a.trendingScore)
                    .map((hashtag, index) => (
                      <div
                        key={hashtag.id}
                        className="flex items-center justify-between p-3 bg-muted/20 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center w-6 h-6 bg-orange-100 rounded-full">
                            <span className="text-xs font-bold text-orange-600">
                              #{index + 1}
                            </span>
                          </div>
                          <div>
                            <div className="font-medium">{hashtag.hashtag}</div>
                            <div className="text-xs text-muted-foreground">
                              {hashtag.reach.toLocaleString()} reach
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-orange-500" />
                          <span className="font-medium">
                            {hashtag.trendingScore}
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Hashtag Insights</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-medium text-sm mb-2 text-blue-800">
                    📊 Performance Tips
                  </h4>
                  <div className="space-y-2 text-xs text-blue-700">
                    <div>• Use 5-10 hashtags per post for optimal reach</div>
                    <div>• Mix popular and niche hashtags (80/20 rule)</div>
                    <div>• Rotate hashtags to avoid shadow banning</div>
                    <div>• Track hashtag performance weekly</div>
                  </div>
                </div>

                <div className="p-4 bg-green-50 rounded-lg">
                  <h4 className="font-medium text-sm mb-2 text-green-800">
                    🎯 Best Practices
                  </h4>
                  <div className="space-y-2 text-xs text-green-700">
                    <div>
                      • Your top hashtag: {data[0]?.hashtag} (
                      {data[0]?.reach.toLocaleString()} reach)
                    </div>
                    <div>
                      • Average engagement:{" "}
                      {(
                        data.reduce((sum, h) => sum + h.engagementRate, 0) /
                        data.length
                      ).toFixed(1)}
                      %
                    </div>
                    <div>
                      • Total discovery:{" "}
                      {data
                        .reduce((sum, h) => sum + h.discovery, 0)
                        .toLocaleString()}{" "}
                      posts
                    </div>
                    <div>• Recommended frequency: 3-4 posts per week</div>
                  </div>
                </div>

                <div className="p-4 bg-orange-50 rounded-lg">
                  <h4 className="font-medium text-sm mb-2 text-orange-800">
                    ⚠️ Optimization Alerts
                  </h4>
                  <div className="space-y-2 text-xs text-orange-700">
                    <div>
                      •{" "}
                      {data.filter((h) => h.competitionLevel === "HIGH").length}{" "}
                      high-competition hashtags detected
                    </div>
                    <div>• Consider adding more low-competition tags</div>
                    <div>
                      • {data.filter((h) => h.usageCount > 20).length} hashtags
                      may need rotation
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </section>
  );
};

export default HashtagAnalyticsSection;
