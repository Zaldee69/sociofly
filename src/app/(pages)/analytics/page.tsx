"use client";
import React, { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Instagram,
  Facebook,
  Twitter,
  Linkedin,
  Clock,
  Download,
  LineChart,
  BarChart,
  PieChart,
  Users,
  Target,
  ChartBar,
  Calendar,
  Filter,
} from "lucide-react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";
import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart as RechartsBarChart,
  Bar,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { toast } from "sonner";
import AccountSelector, {
  SocialAccount,
} from "@/components/analytics/account-selector";
import PlatformSpecificAnalytics from "@/components/analytics/platform-specific-analytics";

const COLORS = [
  "#0088FE",
  "#00C49F",
  "#FFBB28",
  "#FF8042",
  "#8884d8",
  "#82ca9d",
  "#ffc658",
];

const Analytics = () => {
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedTimeRange, setSelectedTimeRange] = useState("last7days");
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null);

  // Add the missing handler functions
  const handleExport = (format: string) => {
    toast.info(`Exporting data as ${format.toUpperCase()}`, {
      description: "Your report is being generated...",
    });

    // Simulate export process with timeout
    setTimeout(() => {
      toast.success(
        `Your ${format.toUpperCase()} report has been downloaded.`,
        {
          description: "Export Complete",
        }
      );
    }, 1500);
  };

  const handleSaveReport = () => {
    toast.success("Report Saved", {
      description: "Your custom report has been saved successfully.",
    });
  };

  // Mock accounts data
  const accounts: SocialAccount[] = [
    {
      id: "inst1",
      name: "Main Brand",
      username: "mainbrand",
      platform: "instagram",
    },
    {
      id: "fb1",
      name: "Brand Page",
      username: "brandpage",
      platform: "facebook",
    },
    {
      id: "tw1",
      name: "Company Official",
      username: "companyofficial",
      platform: "twitter",
    },
    {
      id: "li1",
      name: "Corporate Account",
      username: "corporateaccount",
      platform: "linkedin",
    },
    {
      id: "inst2",
      name: "Secondary Page",
      username: "secondarypage",
      platform: "instagram",
    },
    {
      id: "fb2",
      name: "Product Page",
      username: "productpage",
      platform: "facebook",
    },
  ];

  // Find the selected account data
  const selectedAccountData = selectedAccount
    ? accounts.find((account) => account.id === selectedAccount)
    : null;

  // Mock data for the charts
  const engagementData = [
    {
      date: "Mon",
      instagram: 1200,
      facebook: 900,
      twitter: 600,
      linkedin: 400,
    },
    {
      date: "Tue",
      instagram: 1300,
      facebook: 1000,
      twitter: 650,
      linkedin: 450,
    },
    {
      date: "Wed",
      instagram: 1100,
      facebook: 1200,
      twitter: 700,
      linkedin: 500,
    },
    {
      date: "Thu",
      instagram: 1400,
      facebook: 1100,
      twitter: 750,
      linkedin: 550,
    },
    {
      date: "Fri",
      instagram: 1500,
      facebook: 1300,
      twitter: 800,
      linkedin: 600,
    },
    {
      date: "Sat",
      instagram: 1300,
      facebook: 1000,
      twitter: 650,
      linkedin: 500,
    },
    {
      date: "Sun",
      instagram: 1200,
      facebook: 950,
      twitter: 700,
      linkedin: 450,
    },
  ];

  const platformData = [
    {
      name: "Instagram",
      followers: 15800,
      engagement: 4.2,
      reach: 95000,
      posts: 543,
    },
    {
      name: "Facebook",
      followers: 12300,
      engagement: 3.8,
      reach: 75000,
      posts: 412,
    },
    {
      name: "Twitter",
      followers: 9800,
      engagement: 2.9,
      reach: 35000,
      posts: 876,
    },
    {
      name: "LinkedIn",
      followers: 7500,
      engagement: 2.3,
      reach: 45000,
      posts: 245,
    },
  ];

  const topPosts = [
    {
      id: 1,
      platform: "Instagram",
      preview: "Product launch announcement",
      date: "2023-05-01",
      reach: 15000,
      engagement: "5.2%",
      clicks: 320,
    },
    {
      id: 2,
      platform: "Facebook",
      preview: "Customer testimonial video",
      date: "2023-05-03",
      reach: 12000,
      engagement: "4.8%",
      clicks: 280,
    },
    {
      id: 3,
      platform: "Instagram",
      preview: "Behind the scenes",
      date: "2023-05-05",
      reach: 11000,
      engagement: "4.5%",
      clicks: 210,
    },
    {
      id: 4,
      platform: "Twitter",
      preview: "Industry news comment",
      date: "2023-05-02",
      reach: 9000,
      engagement: "3.9%",
      clicks: 150,
    },
    {
      id: 5,
      platform: "LinkedIn",
      preview: "Thought leadership article",
      date: "2023-05-04",
      reach: 8500,
      engagement: "3.7%",
      clicks: 190,
    },
  ];

  const engagementBreakdown = [
    { name: "Likes", value: 60 },
    { name: "Comments", value: 15 },
    { name: "Shares", value: 10 },
    { name: "Saves", value: 8 },
    { name: "Other", value: 7 },
  ];

  const audienceData = {
    gender: [
      { name: "Female", value: 65 },
      { name: "Male", value: 35 },
    ],
    age: [
      { name: "18-24", value: 25 },
      { name: "25-34", value: 38 },
      { name: "35-44", value: 22 },
      { name: "45+", value: 15 },
    ],
    location: [
      { name: "Jakarta", value: 35 },
      { name: "Surabaya", value: 20 },
      { name: "Bandung", value: 15 },
      { name: "Medan", value: 10 },
      { name: "Others", value: 20 },
    ],
  };

  const sentimentData = [
    { name: "Positive", value: 67 },
    { name: "Neutral", value: 23 },
    { name: "Negative", value: 10 },
  ];

  const hashtagPerformance = [
    { name: "#productlaunch", reach: 12500, engagement: 4.8 },
    { name: "#specialoffer", reach: 10800, engagement: 4.2 },
    { name: "#brandname", reach: 9500, engagement: 3.9 },
    { name: "#industrytrends", reach: 7800, engagement: 3.5 },
    { name: "#customerreviews", reach: 6500, engagement: 3.3 },
  ];

  const bestPostingTimes = [
    { day: "Monday", time: "9:00 AM", engagement: 4.3 },
    { day: "Wednesday", time: "12:00 PM", engagement: 4.8 },
    { day: "Thursday", time: "6:00 PM", engagement: 5.1 },
    { day: "Saturday", time: "11:00 AM", engagement: 4.7 },
    { day: "Sunday", time: "8:00 PM", engagement: 4.5 },
  ];

  const competitorData = [
    { name: "Our Brand", followers: 15800, engagement: 4.2, reach: 95000 },
    { name: "Competitor A", followers: 23500, engagement: 3.8, reach: 125000 },
    { name: "Competitor B", followers: 18700, engagement: 3.5, reach: 105000 },
    { name: "Competitor C", followers: 12300, engagement: 4.5, reach: 85000 },
  ];

  const teamPerformance = [
    { name: "Response Time", value: "15 mins", change: "-12%" },
    { name: "Messages Handled", value: "1,243", change: "+8%" },
    { name: "Resolution Rate", value: "94%", change: "+3%" },
    { name: "Customer Satisfaction", value: "4.8/5", change: "+0.3" },
  ];

  const chartConfig = {
    instagram: {
      label: "Instagram",
      theme: { light: "#E1306C", dark: "#E1306C" },
    },
    facebook: {
      label: "Facebook",
      theme: { light: "#4267B2", dark: "#4267B2" },
    },
    twitter: {
      label: "Twitter",
      theme: { light: "#1DA1F2", dark: "#1DA1F2" },
    },
    linkedin: {
      label: "LinkedIn",
      theme: { light: "#0077B5", dark: "#0077B5" },
    },
  };

  const sentimentColors = {
    Positive: "#4ade80",
    Neutral: "#f59e0b",
    Negative: "#ef4444",
  };

  const renderTimeRangeSelector = () => (
    <div className="flex items-center gap-2">
      <Select value={selectedTimeRange} onValueChange={setSelectedTimeRange}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Select time range" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="today">Today</SelectItem>
          <SelectItem value="yesterday">Yesterday</SelectItem>
          <SelectItem value="last7days">Last 7 days</SelectItem>
          <SelectItem value="last30days">Last 30 days</SelectItem>
          <SelectItem value="thisMonth">This month</SelectItem>
          <SelectItem value="lastMonth">Last month</SelectItem>
          <SelectItem value="custom">Custom range</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );

  const renderPlatformIcon = (platform: string) => {
    switch (platform.toLowerCase()) {
      case "instagram":
        return <Instagram className="h-4 w-4 text-[#E1306C]" />;
      case "facebook":
        return <Facebook className="h-4 w-4 text-[#4267B2]" />;
      case "twitter":
        return <Twitter className="h-4 w-4 text-[#1DA1F2]" />;
      case "linkedin":
        return <Linkedin className="h-4 w-4 text-[#0077B5]" />;
      default:
        return <Instagram className="h-4 w-4" />;
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Analytics</h1>
          <p className="text-muted-foreground">
            Monitor engagement metrics, compare against competitors, and
            optimize your social media strategy.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">{renderTimeRangeSelector()}</div>
      </div>

      {/* Account Selection */}
      <Card className="border-dashed border-2">
        <CardHeader>
          <CardTitle>Select an Account</CardTitle>
          <CardDescription>
            Choose a social media account to view specific analytics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            <AccountSelector
              accounts={accounts}
              selectedAccount={selectedAccount}
              onSelectAccount={setSelectedAccount}
            />

            {!selectedAccount && (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">
                  Select an account to view analytics
                </p>
                <p className="max-w-md mx-auto mt-2">
                  Choose a specific social media account to see detailed
                  analytics and insights
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* If an account is selected, show platform-specific analytics */}
      {selectedAccountData && (
        <PlatformSpecificAnalytics account={selectedAccountData} />
      )}

      {/* Global Analytics (show when no account is selected) */}
      {!selectedAccount && (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 mb-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="post-performance">Post Performance</TabsTrigger>
            <TabsTrigger value="audience">Audience</TabsTrigger>
            <TabsTrigger value="sentiment">Sentiment</TabsTrigger>
            <TabsTrigger value="optimization">Optimization</TabsTrigger>
            <TabsTrigger value="competitors">Competitors</TabsTrigger>
            <TabsTrigger value="custom">Custom Reports</TabsTrigger>
          </TabsList>

          {/* Overview Tab Content */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">
                    Total Followers
                  </CardTitle>
                  <CardDescription>Across all platforms</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">45,400</div>
                  <p className="text-xs text-muted-foreground">
                    +6.8% from last month
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">
                    Average Engagement
                  </CardTitle>
                  <CardDescription>All platforms</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">3.6%</div>
                  <p className="text-xs text-muted-foreground">
                    +0.5% from last month
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">
                    Total Reach
                  </CardTitle>
                  <CardDescription>All content</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">250K</div>
                  <p className="text-xs text-muted-foreground">
                    +12.5% from last month
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">
                    Total Clicks
                  </CardTitle>
                  <CardDescription>Website/Link clicks</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">8,750</div>
                  <p className="text-xs text-muted-foreground">
                    +4.1% from last month
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Engagement Over Time</CardTitle>
                <CardDescription>
                  Performance comparison across platforms
                </CardDescription>
              </CardHeader>
              <CardContent style={{ width: "100%", height: 400 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsLineChart
                    data={engagementData}
                    margin={{
                      top: 5,
                      right: 30,
                      left: 20,
                      bottom: 5,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="instagram"
                      name="Instagram"
                      stroke="#E1306C"
                      strokeWidth={2}
                      dot={{ r: 4 }}
                      activeDot={{ r: 8 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="facebook"
                      name="Facebook"
                      stroke="#4267B2"
                      strokeWidth={2}
                      dot={{ r: 4 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="twitter"
                      name="Twitter"
                      stroke="#1DA1F2"
                      strokeWidth={2}
                      dot={{ r: 4 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="linkedin"
                      name="LinkedIn"
                      stroke="#0077B5"
                      strokeWidth={2}
                      dot={{ r: 4 }}
                    />
                  </RechartsLineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Platform Performance</CardTitle>
                  <CardDescription>
                    Comparison across all social platforms
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {platformData.map((platform) => (
                      <div key={platform.name} className="flex items-center">
                        <div className="mr-4">
                          {renderPlatformIcon(platform.name)}
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-medium">
                            {platform.name}
                          </div>
                          <div className="flex items-center mt-1">
                            <div className="w-full bg-gray-200 rounded-full h-2.5 mr-2">
                              <div
                                className="h-2.5 rounded-full"
                                style={{
                                  width: `${(platform.engagement / 5) * 100}%`,
                                  backgroundColor:
                                    platform.name === "Instagram"
                                      ? "#E1306C"
                                      : platform.name === "Facebook"
                                        ? "#4267B2"
                                        : platform.name === "Twitter"
                                          ? "#1DA1F2"
                                          : "#0077B5",
                                }}
                              ></div>
                            </div>
                            <span className="text-xs font-medium">
                              {platform.engagement}%
                            </span>
                          </div>
                        </div>
                        <div className="ml-2 text-right">
                          <div className="font-medium">
                            {platform.followers.toLocaleString()}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            followers
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Engagement Breakdown</CardTitle>
                  <CardDescription>Types of engagement</CardDescription>
                </CardHeader>
                <CardContent className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        data={engagementBreakdown}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, percent }) =>
                          `${name} ${(percent * 100).toFixed(0)}%`
                        }
                      >
                        {engagementBreakdown.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={COLORS[index % COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => `${value}%`} />
                      <Legend />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>AI Insights</CardTitle>
                  <CardDescription>
                    Generated based on your data
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm">
                  Refresh
                </Button>
              </CardHeader>
              <CardContent>
                <ul className="space-y-4">
                  <li className="flex items-start gap-2">
                    <div className="bg-blue-100 p-1 rounded text-blue-700">
                      <LineChart className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        Engagement increased by 20% compared to last month
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Your consistent posting schedule is yielding good
                        results
                      </p>
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="bg-green-100 p-1 rounded text-green-700">
                      <BarChart className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        Your Instagram account is performing best with a 4.2%
                        engagement rate
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Above average for your industry which is at 2.8%
                      </p>
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="bg-purple-100 p-1 rounded text-purple-700">
                      <Clock className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        Best posting time: Wednesday 12-2 PM
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Posts during this time receive 35% higher engagement
                      </p>
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="bg-amber-100 p-1 rounded text-amber-700">
                      <Target className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        Hashtag #productlaunch generated most reach
                      </p>
                      <p className="text-xs text-muted-foreground">
                        12,500 accounts reached using this hashtag
                      </p>
                    </div>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Post Performance Tab Content */}
          <TabsContent value="post-performance" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Top Performing Posts</CardTitle>
                <CardDescription>
                  Posts with highest engagement across platforms
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Platform</TableHead>
                      <TableHead>Post Preview</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Reach</TableHead>
                      <TableHead className="text-right">Engagement</TableHead>
                      <TableHead className="text-right">Clicks</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topPosts.map((post) => (
                      <TableRow key={post.id}>
                        <TableCell>
                          <div className="flex items-center">
                            {renderPlatformIcon(post.platform)}
                            <span className="ml-2">{post.platform}</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">
                          {post.preview}
                        </TableCell>
                        <TableCell>{post.date}</TableCell>
                        <TableCell className="text-right">
                          {post.reach.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">
                          {post.engagement}
                        </TableCell>
                        <TableCell className="text-right">
                          {post.clicks}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm">
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Performance Metrics</CardTitle>
                  <CardDescription>
                    Comparing reach vs engagement
                  </CardDescription>
                </CardHeader>
                <CardContent className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsBarChart
                      data={topPosts}
                      margin={{
                        top: 20,
                        right: 30,
                        left: 20,
                        bottom: 5,
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="preview" />
                      <YAxis
                        yAxisId="left"
                        orientation="left"
                        stroke="#8884d8"
                      />
                      <YAxis
                        yAxisId="right"
                        orientation="right"
                        stroke="#82ca9d"
                      />
                      <Tooltip />
                      <Legend />
                      <Bar
                        yAxisId="left"
                        dataKey="reach"
                        fill="#8884d8"
                        name="Reach"
                      />
                      <Bar
                        yAxisId="right"
                        dataKey="clicks"
                        fill="#82ca9d"
                        name="Clicks"
                      />
                    </RechartsBarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Engagement by Content Type</CardTitle>
                  <CardDescription>Which content performs best</CardDescription>
                </CardHeader>
                <CardContent className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsBarChart
                      data={[
                        { type: "Images", engagement: 4.2 },
                        { type: "Videos", engagement: 5.1 },
                        { type: "Carousels", engagement: 4.8 },
                        { type: "Text-only", engagement: 2.7 },
                        { type: "Links", engagement: 3.3 },
                      ]}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="type" />
                      <YAxis />
                      <Tooltip />
                      <Bar
                        dataKey="engagement"
                        fill="#8884d8"
                        name="Engagement %"
                      />
                    </RechartsBarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Audience Tab Content */}
          <TabsContent value="audience" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle>Gender Distribution</CardTitle>
                  <CardDescription>Follower demographics</CardDescription>
                </CardHeader>
                <CardContent className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        data={audienceData.gender}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, percent }) =>
                          `${name} ${(percent * 100).toFixed(0)}%`
                        }
                      >
                        <Cell fill="#FF6B81" />
                        <Cell fill="#5352ED" />
                      </Pie>
                      <Tooltip formatter={(value) => `${value}%`} />
                      <Legend />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Age Distribution</CardTitle>
                  <CardDescription>Follower demographics</CardDescription>
                </CardHeader>
                <CardContent className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsBarChart data={audienceData.age}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip formatter={(value) => `${value}%`} />
                      <Bar dataKey="value" fill="#8884d8" name="Percentage" />
                    </RechartsBarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Location</CardTitle>
                  <CardDescription>Top follower locations</CardDescription>
                </CardHeader>
                <CardContent className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        data={audienceData.location}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, percent }) =>
                          `${name} ${(percent * 100).toFixed(0)}%`
                        }
                      >
                        {audienceData.location.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={COLORS[index % COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => `${value}%`} />
                      <Legend />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Active Hours</CardTitle>
                <CardDescription>
                  When your audience is most active
                </CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsBarChart
                    data={[
                      { hour: "00:00", active: 5 },
                      { hour: "03:00", active: 3 },
                      { hour: "06:00", active: 12 },
                      { hour: "09:00", active: 45 },
                      { hour: "12:00", active: 78 },
                      { hour: "15:00", active: 85 },
                      { hour: "18:00", active: 92 },
                      { hour: "21:00", active: 54 },
                    ]}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="hour" />
                    <YAxis />
                    <Tooltip />
                    <Bar
                      dataKey="active"
                      fill="#8884d8"
                      name="Active users %"
                    />
                  </RechartsBarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Sentiment Analysis Tab Content */}
          <TabsContent value="sentiment" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Comment Sentiment</CardTitle>
                  <CardDescription>Analysis of comment tone</CardDescription>
                </CardHeader>
                <CardContent className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        data={sentimentData}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        innerRadius={40}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, percent }) =>
                          `${name} ${(percent * 100).toFixed(0)}%`
                        }
                      >
                        {sentimentData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={
                              sentimentColors[
                                entry.name as keyof typeof sentimentColors
                              ]
                            }
                          />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => `${value}%`} />
                      <Legend />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Sentiment Over Time</CardTitle>
                  <CardDescription>How sentiment has changed</CardDescription>
                </CardHeader>
                <CardContent className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsLineChart
                      data={[
                        {
                          date: "Week 1",
                          positive: 60,
                          neutral: 25,
                          negative: 15,
                        },
                        {
                          date: "Week 2",
                          positive: 65,
                          neutral: 23,
                          negative: 12,
                        },
                        {
                          date: "Week 3",
                          positive: 62,
                          neutral: 28,
                          negative: 10,
                        },
                        {
                          date: "Week 4",
                          positive: 67,
                          neutral: 23,
                          negative: 10,
                        },
                      ]}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="positive"
                        stroke="#4ade80"
                        name="Positive"
                      />
                      <Line
                        type="monotone"
                        dataKey="neutral"
                        stroke="#f59e0b"
                        name="Neutral"
                      />
                      <Line
                        type="monotone"
                        dataKey="negative"
                        stroke="#ef4444"
                        name="Negative"
                      />
                    </RechartsLineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Hashtag Performance</CardTitle>
                <CardDescription>Which hashtags perform best</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Hashtag</TableHead>
                      <TableHead className="text-right">Reach</TableHead>
                      <TableHead className="text-right">Engagement</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {hashtagPerformance.map((item) => (
                      <TableRow key={item.name}>
                        <TableCell className="font-medium">
                          {item.name}
                        </TableCell>
                        <TableCell className="text-right">
                          {item.reach.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">
                          {item.engagement}%
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Optimization Tab Content */}
          <TabsContent value="optimization" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Best Posting Times</CardTitle>
                <CardDescription>
                  When your content performs best
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Day</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead className="text-right">Engagement</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bestPostingTimes.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">
                          {item.day}
                        </TableCell>
                        <TableCell>{item.time}</TableCell>
                        <TableCell className="text-right">
                          {item.engagement}%
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="outline" size="sm">
                            Schedule
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
              <CardFooter className="border-t px-6 py-4">
                <Button className="ml-auto">View Calendar</Button>
              </CardFooter>
            </Card>

            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Suggested Post Types</CardTitle>
                  <CardDescription>
                    Content that resonates with your audience
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="bg-green-100 p-1 rounded text-green-700">
                          <ChartBar className="h-4 w-4" />
                        </div>
                        <span className="font-medium">Video Content</span>
                      </div>
                      <span>5.1% engagement</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="bg-blue-100 p-1 rounded text-blue-700">
                          <ChartBar className="h-4 w-4" />
                        </div>
                        <span className="font-medium">Carousel Posts</span>
                      </div>
                      <span>4.8% engagement</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="bg-purple-100 p-1 rounded text-purple-700">
                          <ChartBar className="h-4 w-4" />
                        </div>
                        <span className="font-medium">
                          User Generated Content
                        </span>
                      </div>
                      <span>4.5% engagement</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="bg-amber-100 p-1 rounded text-amber-700">
                          <ChartBar className="h-4 w-4" />
                        </div>
                        <span className="font-medium">Behind the Scenes</span>
                      </div>
                      <span>4.3% engagement</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Optimal Caption Length</CardTitle>
                  <CardDescription>
                    What works best for your audience
                  </CardDescription>
                </CardHeader>
                <CardContent className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsBarChart
                      data={[
                        { length: "0-50", engagement: 3.2 },
                        { length: "51-100", engagement: 3.8 },
                        { length: "101-150", engagement: 4.5 },
                        { length: "151-200", engagement: 4.2 },
                        { length: "201+", engagement: 3.5 },
                      ]}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="length" />
                      <YAxis />
                      <Tooltip />
                      <Bar
                        dataKey="engagement"
                        fill="#8884d8"
                        name="Engagement %"
                      />
                    </RechartsBarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Competitors Tab Content */}
          <TabsContent value="competitors" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Competitor Benchmarking</CardTitle>
                <CardDescription>
                  How your accounts stack up against competitors
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Brand</TableHead>
                      <TableHead className="text-right">Followers</TableHead>
                      <TableHead className="text-right">Engagement</TableHead>
                      <TableHead className="text-right">Reach</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {competitorData.map((item, index) => (
                      <TableRow
                        key={index}
                        className={
                          item.name === "Our Brand" ? "bg-muted/30" : ""
                        }
                      >
                        <TableCell className="font-medium">
                          {item.name}
                        </TableCell>
                        <TableCell className="text-right">
                          {item.followers.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">
                          {item.engagement}%
                        </TableCell>
                        <TableCell className="text-right">
                          {item.reach.toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Competitor Growth Comparison</CardTitle>
                <CardDescription>Follower growth over time</CardDescription>
              </CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsLineChart
                    data={[
                      {
                        date: "Jan",
                        "Our Brand": 12000,
                        "Competitor A": 20000,
                        "Competitor B": 16000,
                        "Competitor C": 10000,
                      },
                      {
                        date: "Feb",
                        "Our Brand": 13000,
                        "Competitor A": 21000,
                        "Competitor B": 16800,
                        "Competitor C": 10500,
                      },
                      {
                        date: "Mar",
                        "Our Brand": 14200,
                        "Competitor A": 22000,
                        "Competitor B": 17500,
                        "Competitor C": 11000,
                      },
                      {
                        date: "Apr",
                        "Our Brand": 15000,
                        "Competitor A": 22800,
                        "Competitor B": 18100,
                        "Competitor C": 11700,
                      },
                      {
                        date: "May",
                        "Our Brand": 15800,
                        "Competitor A": 23500,
                        "Competitor B": 18700,
                        "Competitor C": 12300,
                      },
                    ]}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="Our Brand"
                      stroke="#0ea5e9"
                      strokeWidth={3}
                    />
                    <Line
                      type="monotone"
                      dataKey="Competitor A"
                      stroke="#f97316"
                    />
                    <Line
                      type="monotone"
                      dataKey="Competitor B"
                      stroke="#84cc16"
                    />
                    <Line
                      type="monotone"
                      dataKey="Competitor C"
                      stroke="#8b5cf6"
                    />
                  </RechartsLineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Custom Reports Tab Content */}
          <TabsContent value="custom" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Custom Report Builder</CardTitle>
                <CardDescription>
                  Select metrics and time periods for your report
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <h3 className="text-sm font-medium">Select Metrics</h3>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="followers"
                            className="rounded border-gray-300"
                            defaultChecked
                          />
                          <label htmlFor="followers" className="text-sm">
                            Followers
                          </label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="engagement"
                            className="rounded border-gray-300"
                            defaultChecked
                          />
                          <label htmlFor="engagement" className="text-sm">
                            Engagement
                          </label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="reach"
                            className="rounded border-gray-300"
                            defaultChecked
                          />
                          <label htmlFor="reach" className="text-sm">
                            Reach
                          </label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="clicks"
                            className="rounded border-gray-300"
                            defaultChecked
                          />
                          <label htmlFor="clicks" className="text-sm">
                            Clicks
                          </label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="impressions"
                            className="rounded border-gray-300"
                          />
                          <label htmlFor="impressions" className="text-sm">
                            Impressions
                          </label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="sentiments"
                            className="rounded border-gray-300"
                          />
                          <label htmlFor="sentiments" className="text-sm">
                            Sentiments
                          </label>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-sm font-medium">Time Period</h3>
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="justify-start"
                        >
                          <Calendar className="mr-2 h-4 w-4" />
                          Start date
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="justify-start"
                        >
                          <Calendar className="mr-2 h-4 w-4" />
                          End date
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium mb-2">Report Format</h3>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex gap-2"
                        onClick={() => handleExport("pdf")}
                      >
                        <Download className="h-4 w-4" />
                        Export as PDF
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex gap-2"
                        onClick={() => handleExport("csv")}
                      >
                        <Download className="h-4 w-4" />
                        Export as CSV
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex gap-2"
                        onClick={() => handleSaveReport()}
                      >
                        <Filter className="h-4 w-4" />
                        Save Report
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Saved Reports</CardTitle>
                <CardDescription>Your custom reports</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Report Name</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Period</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium">
                        Monthly Performance
                      </TableCell>
                      <TableCell>May 1, 2023</TableCell>
                      <TableCell>Apr 1-30, 2023</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm">
                            View
                          </Button>
                          <Button variant="outline" size="sm">
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">
                        Campaign Results
                      </TableCell>
                      <TableCell>Apr 15, 2023</TableCell>
                      <TableCell>Apr 1-15, 2023</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm">
                            View
                          </Button>
                          <Button variant="outline" size="sm">
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};

export default Analytics;
