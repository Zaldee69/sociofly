import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  MousePointer,
  ExternalLink,
  TrendingUp,
  BarChart3,
  Target,
  Globe,
  Instagram,
  Facebook,
  Link,
  ShoppingCart,
  Phone,
  Mail,
  Info,
  Construction,
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

interface LinkAnalyticsProps {
  socialAccountId?: string;
  teamId?: string;
}

interface LinkMetrics {
  id: string;
  linkUrl: string;
  linkType: "BIO" | "POST" | "STORY" | "BUTTON" | "SWIPE_UP";
  buttonType?: string; // "contact", "shop_now", "learn_more", etc.
  platform: "INSTAGRAM" | "FACEBOOK";

  // Performance metrics
  clicks: number;
  uniqueClicks: number;
  ctr: number; // Click-through rate

  // Context
  sourcePostId?: string;
  postContent?: string;
  recordedAt: string;

  // Additional metrics
  conversions?: number;
  conversionRate?: number;
  topReferrer?: string;
}

interface CTAPerformance {
  buttonType: string;
  icon: React.ReactNode;
  totalClicks: number;
  averageCTR: number;
  conversions: number;
  conversionRate: number;
  topPerformer: boolean;
}

const LinkAnalyticsSection: React.FC<LinkAnalyticsProps> = ({
  socialAccountId,
  teamId,
}) => {
  const [selectedPlatform, setSelectedPlatform] = useState<string>("all");
  const [selectedLinkType, setSelectedLinkType] = useState<string>("all");
  const [dateRange, setDateRange] = useState<string>("30d");

  // Fetch link analytics data (commented out until tRPC router is implemented)
  // const { data: linkData, isLoading } = trpc.analytics.getLinkAnalytics.useQuery({
  //   socialAccountId: socialAccountId || "",
  //   teamId: teamId || "",
  //   platform: selectedPlatform !== "all" ? selectedPlatform : undefined,
  //   linkType: selectedLinkType !== "all" ? selectedLinkType : undefined,
  //   dateRange: dateRange as "7d" | "30d" | "90d"
  // }, {
  //   enabled: !!socialAccountId && !!teamId
  // });

  const isLoading = false;

  // Mock data for demonstration
  const mockLinkData: LinkMetrics[] = [
    {
      id: "1",
      linkUrl: "https://mystore.com/products",
      linkType: "BIO",
      platform: "INSTAGRAM",
      clicks: 1240,
      uniqueClicks: 980,
      ctr: 3.2,
      conversions: 89,
      conversionRate: 9.1,
      recordedAt: "2024-01-15T10:30:00Z",
      topReferrer: "Instagram Bio",
    },
    {
      id: "2",
      linkUrl: "https://blog.mysite.com/latest-post",
      linkType: "POST",
      platform: "INSTAGRAM",
      clicks: 450,
      uniqueClicks: 380,
      ctr: 2.8,
      sourcePostId: "post_123",
      postContent: "Check out our latest blog post about...",
      conversions: 23,
      conversionRate: 6.1,
      recordedAt: "2024-01-14T14:20:00Z",
    },
    {
      id: "3",
      linkUrl: "tel:+6281234567890",
      linkType: "BUTTON",
      buttonType: "contact",
      platform: "FACEBOOK",
      clicks: 320,
      uniqueClicks: 280,
      ctr: 4.1,
      conversions: 45,
      conversionRate: 16.1,
      recordedAt: "2024-01-13T09:15:00Z",
    },
    {
      id: "4",
      linkUrl: "https://mystore.com/checkout",
      linkType: "BUTTON",
      buttonType: "shop_now",
      platform: "FACEBOOK",
      clicks: 890,
      uniqueClicks: 720,
      ctr: 5.2,
      conversions: 134,
      conversionRate: 18.6,
      recordedAt: "2024-01-12T16:45:00Z",
    },
    {
      id: "5",
      linkUrl: "https://mysite.com/learn-more",
      linkType: "STORY",
      platform: "INSTAGRAM",
      clicks: 180,
      uniqueClicks: 150,
      ctr: 2.1,
      conversions: 12,
      conversionRate: 8.0,
      recordedAt: "2024-01-11T12:30:00Z",
    },
  ];

  const data = mockLinkData;

  // Calculate CTA performance
  const ctaPerformance: CTAPerformance[] = [
    {
      buttonType: "Shop Now",
      icon: <ShoppingCart className="h-5 w-5 text-green-500" />,
      totalClicks: 890,
      averageCTR: 5.2,
      conversions: 134,
      conversionRate: 18.6,
      topPerformer: true,
    },
    {
      buttonType: "Contact Us",
      icon: <Phone className="h-5 w-5 text-blue-500" />,
      totalClicks: 320,
      averageCTR: 4.1,
      conversions: 45,
      conversionRate: 16.1,
      topPerformer: false,
    },
    {
      buttonType: "Learn More",
      icon: <Info className="h-5 w-5 text-purple-500" />,
      totalClicks: 180,
      averageCTR: 2.1,
      conversions: 12,
      conversionRate: 8.0,
      topPerformer: false,
    },
    {
      buttonType: "Email Us",
      icon: <Mail className="h-5 w-5 text-orange-500" />,
      totalClicks: 45,
      averageCTR: 1.8,
      conversions: 5,
      conversionRate: 11.1,
      topPerformer: false,
    },
  ];

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

  const renderLinkTypeIcon = (type: string) => {
    switch (type) {
      case "BIO":
        return <Globe className="h-4 w-4 text-blue-500" />;
      case "POST":
        return <BarChart3 className="h-4 w-4 text-green-500" />;
      case "STORY":
        return <Target className="h-4 w-4 text-purple-500" />;
      case "BUTTON":
        return <MousePointer className="h-4 w-4 text-orange-500" />;
      case "SWIPE_UP":
        return <TrendingUp className="h-4 w-4 text-red-500" />;
      default:
        return <Link className="h-4 w-4" />;
    }
  };

  const getCTRBadge = (ctr: number) => {
    if (ctr >= 4) return { variant: "default" as const, label: "Excellent" };
    if (ctr >= 2.5) return { variant: "secondary" as const, label: "Good" };
    if (ctr >= 1) return { variant: "outline" as const, label: "Average" };
    return { variant: "destructive" as const, label: "Low" };
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
    });
  };

  const truncateUrl = (url: string, maxLength: number = 40) => {
    return url.length > maxLength ? `${url.substring(0, maxLength)}...` : url;
  };

  if (isLoading) {
    return (
      <section id="link-analytics" className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">Link & CTA Analytics</h2>
          <p className="text-muted-foreground">Loading link performance...</p>
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
    <section id="link-analytics" className="space-y-6">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <h2 className="text-2xl font-bold">Link & CTA Analytics</h2>
          <Badge
            variant="outline"
            className="text-orange-600 border-orange-300"
          >
            <Construction className="h-3 w-3 mr-1" />
            Coming Soon
          </Badge>
        </div>
        <p className="text-muted-foreground">
          Track link clicks and call-to-action performance across platforms
        </p>
      </div>

      {/* Coming Soon Alert */}
      <Alert className="border-orange-200 bg-orange-50">
        <Construction className="h-4 w-4 text-orange-600" />
        <AlertDescription className="text-orange-800">
          <strong>Coming Soon:</strong> Link & CTA Analytics will provide
          detailed tracking of link clicks, conversion rates, and call-to-action
          performance across all your social media platforms.
        </AlertDescription>
      </Alert>

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
          </SelectContent>
        </Select>

        <Select value={selectedLinkType} onValueChange={setSelectedLinkType}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Link Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="BIO">Bio Links</SelectItem>
            <SelectItem value="POST">Post Links</SelectItem>
            <SelectItem value="STORY">Story Links</SelectItem>
            <SelectItem value="BUTTON">CTA Buttons</SelectItem>
          </SelectContent>
        </Select>

        <Select value={dateRange} onValueChange={setDateRange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Date Range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="90d">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clicks</CardTitle>
            <MousePointer className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data
                .reduce((sum, link) => sum + link.clicks, 0)
                .toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {data
                .reduce((sum, link) => sum + link.uniqueClicks, 0)
                .toLocaleString()}{" "}
              unique
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average CTR</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.length > 0
                ? (
                    data.reduce((sum, link) => sum + link.ctr, 0) / data.length
                  ).toFixed(1)
                : 0}
              %
            </div>
            <p className="text-xs text-muted-foreground">Click-through rate</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversions</CardTitle>
            <Target className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.reduce((sum, link) => sum + (link.conversions || 0), 0)}
            </div>
            <p className="text-xs text-muted-foreground">Total conversions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conv. Rate</CardTitle>
            <BarChart3 className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.length > 0
                ? (
                    data.reduce(
                      (sum, link) => sum + (link.conversionRate || 0),
                      0
                    ) / data.length
                  ).toFixed(1)
                : 0}
              %
            </div>
            <p className="text-xs text-muted-foreground">Average conversion</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="links" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="links">Link Performance</TabsTrigger>
          <TabsTrigger value="cta">CTA Buttons</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="links" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Link Performance Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.map((link) => {
                  const ctrBadge = getCTRBadge(link.ctr);

                  return (
                    <div
                      key={link.id}
                      className="p-4 border rounded-lg hover:bg-muted/20 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          {renderLinkTypeIcon(link.linkType)}
                          <div className="flex-1">
                            <div className="font-medium text-sm mb-1">
                              {truncateUrl(link.linkUrl)}
                            </div>
                            <div className="flex items-center gap-2">
                              {renderPlatformIcon(link.platform)}
                              <Badge variant="outline" className="text-xs">
                                {link.linkType}
                              </Badge>
                              {link.buttonType && (
                                <Badge
                                  variant="secondary"
                                  className="text-xs capitalize"
                                >
                                  {link.buttonType.replace("_", " ")}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="text-right text-xs text-muted-foreground">
                          {formatDate(link.recordedAt)}
                        </div>
                      </div>

                      {link.postContent && (
                        <div className="mb-3 p-2 bg-muted/20 rounded text-xs text-muted-foreground">
                          From post: "{link.postContent}"
                        </div>
                      )}

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                        <div className="text-center p-3 bg-muted/20 rounded-lg">
                          <div className="text-lg font-bold text-blue-600">
                            {link.clicks.toLocaleString()}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Total Clicks
                          </div>
                        </div>
                        <div className="text-center p-3 bg-muted/20 rounded-lg">
                          <div className="text-lg font-bold text-green-600">
                            {link.uniqueClicks.toLocaleString()}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Unique Clicks
                          </div>
                        </div>
                        <div className="text-center p-3 bg-muted/20 rounded-lg">
                          <Badge variant={ctrBadge.variant} className="text-sm">
                            {link.ctr}% CTR
                          </Badge>
                          <div className="text-xs text-muted-foreground mt-1">
                            {ctrBadge.label}
                          </div>
                        </div>
                        <div className="text-center p-3 bg-muted/20 rounded-lg">
                          <div className="text-lg font-bold text-purple-600">
                            {link.conversions || 0}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {link.conversionRate?.toFixed(1) || 0}% conv.
                          </div>
                        </div>
                      </div>

                      {link.topReferrer && (
                        <div className="text-xs text-muted-foreground">
                          Top referrer: {link.topReferrer}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cta" className="space-y-4">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>CTA Button Performance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {ctaPerformance.map((cta, index) => (
                  <div
                    key={cta.buttonType}
                    className={`p-4 border rounded-lg ${cta.topPerformer ? "bg-green-50/50 border-green-200" : ""}`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-10 h-10 bg-muted/20 rounded-full">
                          {cta.icon}
                        </div>
                        <div>
                          <div className="font-medium">{cta.buttonType}</div>
                          {cta.topPerformer && (
                            <Badge variant="default" className="text-xs mt-1">
                              Top Performer
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-lg">
                          {cta.totalClicks.toLocaleString()}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          clicks
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center">
                        <div className="font-medium">{cta.averageCTR}%</div>
                        <div className="text-xs text-muted-foreground">CTR</div>
                      </div>
                      <div className="text-center">
                        <div className="font-medium">{cta.conversions}</div>
                        <div className="text-xs text-muted-foreground">
                          Conversions
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="font-medium">{cta.conversionRate}%</div>
                        <div className="text-xs text-muted-foreground">
                          Conv. Rate
                        </div>
                      </div>
                    </div>

                    <div className="mt-3">
                      <Progress
                        value={Math.min((cta.averageCTR / 6) * 100, 100)}
                        className="h-2"
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>CTA Optimization</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-medium text-sm mb-2 text-blue-800">
                    🎯 Best Performing CTA
                  </h4>
                  <div className="space-y-2 text-xs text-blue-700">
                    <div>
                      • {ctaPerformance[0].buttonType}:{" "}
                      {ctaPerformance[0].averageCTR}% CTR
                    </div>
                    <div>
                      • {ctaPerformance[0].conversions} conversions (
                      {ctaPerformance[0].conversionRate}% rate)
                    </div>
                    <div>
                      • {ctaPerformance[0].totalClicks.toLocaleString()} total
                      clicks
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-green-50 rounded-lg">
                  <h4 className="font-medium text-sm mb-2 text-green-800">
                    💡 Recommendations
                  </h4>
                  <div className="space-y-2 text-xs text-green-700">
                    <div>• Use action-oriented button text</div>
                    <div>• Place CTAs above the fold</div>
                    <div>• A/B test button colors and sizes</div>
                    <div>• Match CTA to post content</div>
                  </div>
                </div>

                <div className="p-4 bg-orange-50 rounded-lg">
                  <h4 className="font-medium text-sm mb-2 text-orange-800">
                    📊 Platform Insights
                  </h4>
                  <div className="space-y-2 text-xs text-orange-700">
                    <div>• Instagram: Bio links perform best</div>
                    <div>• Facebook: Shop Now buttons convert well</div>
                    <div>• Stories: Use swipe-up for high CTR</div>
                    <div>• Posts: Include clear call-to-action</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="insights" className="space-y-4">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Link Type Performance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {["BIO", "POST", "STORY", "BUTTON"].map((type) => {
                  const typeData = data.filter(
                    (link) => link.linkType === type
                  );
                  const totalClicks = typeData.reduce(
                    (sum, link) => sum + link.clicks,
                    0
                  );
                  const avgCTR =
                    typeData.length > 0
                      ? typeData.reduce((sum, link) => sum + link.ctr, 0) /
                        typeData.length
                      : 0;

                  return (
                    <div
                      key={type}
                      className="flex items-center justify-between p-3 bg-muted/20 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        {renderLinkTypeIcon(type)}
                        <div>
                          <div className="font-medium">{type} Links</div>
                          <div className="text-xs text-muted-foreground">
                            {typeData.length} links
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">
                          {totalClicks.toLocaleString()}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {avgCTR.toFixed(1)}% CTR
                        </div>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Performance Trends</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Total Clicks Growth</span>
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-green-500" />
                      <span className="font-medium text-green-600">+24%</span>
                    </div>
                  </div>
                  <Progress value={75} className="h-2" />

                  <div className="flex justify-between items-center">
                    <span className="text-sm">CTR Improvement</span>
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-blue-500" />
                      <span className="font-medium text-blue-600">+12%</span>
                    </div>
                  </div>
                  <Progress value={60} className="h-2" />

                  <div className="flex justify-between items-center">
                    <span className="text-sm">Conversion Rate</span>
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-purple-500" />
                      <span className="font-medium text-purple-600">+8%</span>
                    </div>
                  </div>
                  <Progress value={45} className="h-2" />
                </div>

                <div className="mt-6 p-4 bg-muted/20 rounded-lg">
                  <h4 className="font-medium text-sm mb-2">Key Insights</h4>
                  <div className="space-y-1 text-xs text-muted-foreground">
                    <div>• Bio links generate 40% of total clicks</div>
                    <div>• CTA buttons have highest conversion rate</div>
                    <div>• Story links show growing engagement</div>
                    <div>• Mobile users click 3x more than desktop</div>
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

export default LinkAnalyticsSection;
