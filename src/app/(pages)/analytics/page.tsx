"use client";

import { useState } from "react";
import { ChartBar, Calendar, TrendingUp, Users, Filter, Download, ArrowUpRight, ArrowDownRight, BarChart as BarChartIcon, LineChart, PieChart, Share2 } from "lucide-react";
import { Card, CardHeader, CardContent, CardTitle, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { 
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, 
  LineChart as RechartsLineChart, Line, 
  PieChart as RechartsPieChart, Pie, Cell, Legend 
} from "recharts";

// Data untuk periode harian
const dailyData = [
  { name: "19 Apr", post: 2, sent: 2, failed: 0, engagement: 28, impressions: 357, clicks: 12 },
  { name: "20 Apr", post: 1, sent: 1, failed: 0, engagement: 16, impressions: 245, clicks: 8 },
  { name: "21 Apr", post: 3, sent: 3, failed: 0, engagement: 42, impressions: 470, clicks: 18 },
  { name: "22 Apr", post: 2, sent: 1, failed: 1, engagement: 19, impressions: 310, clicks: 9 },
  { name: "23 Apr", post: 4, sent: 4, failed: 0, engagement: 53, impressions: 580, clicks: 21 },
  { name: "24 Apr", post: 2, sent: 2, failed: 0, engagement: 35, impressions: 390, clicks: 15 },
  { name: "25 Apr", post: 3, sent: 2, failed: 1, engagement: 41, impressions: 420, clicks: 17 },
];

// Data untuk periode mingguan
const weeklyData = [
  { name: "Week 1", post: 12, sent: 11, failed: 1, engagement: 187, impressions: 2450, clicks: 78 },
  { name: "Week 2", post: 15, sent: 13, failed: 2, engagement: 210, impressions: 2800, clicks: 92 },
  { name: "Week 3", post: 18, sent: 17, failed: 1, engagement: 245, impressions: 3100, clicks: 105 },
  { name: "Week 4", post: 14, sent: 14, failed: 0, engagement: 198, impressions: 2600, clicks: 87 },
];

// Data untuk periode bulanan
const monthlyData = [
  { name: "Jan", post: 45, sent: 42, failed: 3, engagement: 780, impressions: 9800, clicks: 320 },
  { name: "Feb", post: 52, sent: 49, failed: 3, engagement: 850, impressions: 10500, clicks: 345 },
  { name: "Mar", post: 58, sent: 55, failed: 3, engagement: 910, impressions: 11200, clicks: 370 },
  { name: "Apr", post: 65, sent: 61, failed: 4, engagement: 1050, impressions: 12800, clicks: 410 },
];

// Data untuk platform distribution (pie chart)
const platformData = [
  { name: "Twitter", value: 45, color: "#1DA1F2" },
  { name: "Instagram", value: 35, color: "#E1306C" },
  { name: "Facebook", value: 20, color: "#4267B2" },
];

// Data untuk engagement by content type
const contentTypeData = [
  { name: "Images", engagement: 45, impressions: 62, clicks: 38 },
  { name: "Videos", engagement: 65, impressions: 72, clicks: 58 },
  { name: "Links", engagement: 35, impressions: 45, clicks: 28 },
  { name: "Text", engagement: 25, impressions: 30, clicks: 18 },
];

// Data untuk Top Performing Posts
const topPostsData = [
  { 
    id: 1, 
    title: "New Product Launch", 
    platform: "Instagram", 
    date: "23 Apr", 
    engagement: 187, 
    impressions: 2450, 
    clicks: 78,
    growth: 24 
  },
  { 
    id: 2, 
    title: "Weekly Tips & Tricks", 
    platform: "Twitter", 
    date: "21 Apr", 
    engagement: 156, 
    impressions: 1980, 
    clicks: 65,
    growth: 18 
  },
  { 
    id: 3, 
    title: "Customer Testimonial", 
    platform: "Facebook", 
    date: "24 Apr", 
    engagement: 142, 
    impressions: 1790, 
    clicks: 59,
    growth: 12 
  },
  { 
    id: 4, 
    title: "Behind the Scenes", 
    platform: "Instagram", 
    date: "20 Apr", 
    engagement: 128, 
    impressions: 1650, 
    clicks: 53,
    growth: 9 
  },
  { 
    id: 5, 
    title: "Industry News Update", 
    platform: "Twitter", 
    date: "25 Apr", 
    engagement: 115, 
    impressions: 1520, 
    clicks: 48,
    growth: -5 
  },
];

const Analytics = () => {
  const [period, setPeriod] = useState("daily");
  const [metric, setMetric] = useState("engagement");
  
  // Select the appropriate dataset based on the period
  const getChartData = () => {
    switch(period) {
      case "weekly": return weeklyData;
      case "monthly": return monthlyData;
      default: return dailyData;
    }
  };

  // Calculate totals for the selected period
  const calculateTotals = () => {
    const data = getChartData();
    return {
      posts: data.reduce((sum, item) => sum + item.post, 0),
      sent: data.reduce((sum, item) => sum + item.sent, 0),
      failed: data.reduce((sum, item) => sum + item.failed, 0),
      engagement: data.reduce((sum, item) => sum + item.engagement, 0),
      impressions: data.reduce((sum, item) => sum + item.impressions, 0),
      clicks: data.reduce((sum, item) => sum + item.clicks, 0),
    };
  };

  const totals = calculateTotals();
  
  // Growth percentages (hard-coded for demo, would normally be calculated)
  const growth = {
    posts: 12,
    engagement: 18,
    impressions: 15,
    clicks: 22
  };

  return (
    <div className="space-y-6">
      {/* Header with filters */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Analytics & Insights</h1>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm">
            <Filter className="w-4 h-4 mr-2" />
            Filter
          </Button>
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Select Period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="shadow-none">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Posts</p>
                <div className="flex items-baseline mt-1">
                  <h3 className="text-2xl font-bold">{totals.posts}</h3>
                  <span className={`ml-2 text-xs font-medium ${growth.posts >= 0 ? 'text-green-500' : 'text-red-500'} flex items-center`}>
                    {growth.posts >= 0 ? <ArrowUpRight className="w-3 h-3 mr-1" /> : <ArrowDownRight className="w-3 h-3 mr-1" />}
                    {Math.abs(growth.posts)}%
                  </span>
                </div>
              </div>
              <div className="bg-primary/10 p-2 rounded-full">
                <BarChartIcon className="w-5 h-5 text-primary" />
              </div>
            </div>
            <div className="mt-4">
              <Progress value={totals.sent / totals.posts * 100} className="h-1" />
              <div className="flex justify-between mt-1 text-xs text-muted-foreground">
                <span>Sent: {totals.sent}</span>
                <span>Failed: {totals.failed}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Engagement</p>
                <div className="flex items-baseline mt-1">
                  <h3 className="text-2xl font-bold">{totals.engagement}</h3>
                  <span className={`ml-2 text-xs font-medium ${growth.engagement >= 0 ? 'text-green-500' : 'text-red-500'} flex items-center`}>
                    {growth.engagement >= 0 ? <ArrowUpRight className="w-3 h-3 mr-1" /> : <ArrowDownRight className="w-3 h-3 mr-1" />}
                    {Math.abs(growth.engagement)}%
                  </span>
                </div>
              </div>
              <div className="bg-primary/10 p-2 rounded-full">
                <Users className="w-5 h-5 text-primary" />
              </div>
            </div>
            <div className="mt-4 text-xs text-muted-foreground">
              <p>Avg. engagement per post: {Math.round(totals.engagement / totals.posts)}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Impressions</p>
                <div className="flex items-baseline mt-1">
                  <h3 className="text-2xl font-bold">{totals.impressions.toLocaleString()}</h3>
                  <span className={`ml-2 text-xs font-medium ${growth.impressions >= 0 ? 'text-green-500' : 'text-red-500'} flex items-center`}>
                    {growth.impressions >= 0 ? <ArrowUpRight className="w-3 h-3 mr-1" /> : <ArrowDownRight className="w-3 h-3 mr-1" />}
                    {Math.abs(growth.impressions)}%
                  </span>
                </div>
              </div>
              <div className="bg-primary/10 p-2 rounded-full">
                <TrendingUp className="w-5 h-5 text-primary" />
              </div>
            </div>
            <div className="mt-4 text-xs text-muted-foreground">
              <p>Reach rate: {Math.round((totals.impressions / (totals.posts * 1000)) * 100)}%</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Clicks</p>
                <div className="flex items-baseline mt-1">
                  <h3 className="text-2xl font-bold">{totals.clicks}</h3>
                  <span className={`ml-2 text-xs font-medium ${growth.clicks >= 0 ? 'text-green-500' : 'text-red-500'} flex items-center`}>
                    {growth.clicks >= 0 ? <ArrowUpRight className="w-3 h-3 mr-1" /> : <ArrowDownRight className="w-3 h-3 mr-1" />}
                    {Math.abs(growth.clicks)}%
                  </span>
                </div>
              </div>
              <div className="bg-primary/10 p-2 rounded-full">
                <Share2 className="w-5 h-5 text-primary" />
              </div>
            </div>
            <div className="mt-4 text-xs text-muted-foreground">
              <p>CTR: {((totals.clicks / totals.impressions) * 100).toFixed(2)}%</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Analytics Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="platforms">Platforms</TabsTrigger>
          <TabsTrigger value="content">Content Analysis</TabsTrigger>
          <TabsTrigger value="audience">Audience</TabsTrigger>
        </TabsList>
        
        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg">
                  <span className="inline-flex items-center gap-2">
                    <ChartBar className="w-5 h-5 text-primary" />
                    Performance Metrics
                  </span>
                </CardTitle>
                <Select value={metric} onValueChange={setMetric}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="Select Metric" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="engagement">Engagement</SelectItem>
                    <SelectItem value="impressions">Impressions</SelectItem>
                    <SelectItem value="clicks">Clicks</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsLineChart data={getChartData()}>
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip content={<CustomTooltip active={true} payload={[]} label={""} />} />
                    <Line 
                      type="monotone" 
                      dataKey={metric} 
                      stroke="#8884d8" 
                      strokeWidth={2} 
                      dot={{ r: 4 }} 
                      activeDot={{ r: 6 }} 
                    />
                  </RechartsLineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  <span className="inline-flex items-center gap-2">
                    <BarChartIcon className="w-5 h-5 text-primary" />
                    Posts Overview
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={getChartData()}>
                      <XAxis dataKey="name" />
                      <YAxis allowDecimals={false} />
                      <Tooltip content={<CustomTooltip active={true} payload={[]} label={""} />} />
                      <Bar dataKey="sent" fill="#4ade80" name="Sent" />
                      <Bar dataKey="failed" fill="#f87171" name="Failed" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  <span className="inline-flex items-center gap-2">
                    <PieChart className="w-5 h-5 text-primary" />
                    Platform Distribution
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[250px] flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        data={platformData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        label={renderCustomizedLabel}
                      >
                        {platformData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip content={<PieChartTooltip active={true} payload={[]} />} />
                      <Legend />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                <span className="inline-flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  Top Performing Posts
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Post</TableHead>
                    <TableHead>Platform</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Engagement</TableHead>
                    <TableHead>Impressions</TableHead>
                    <TableHead>Clicks</TableHead>
                    <TableHead>Growth</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topPostsData.map((post) => (
                    <TableRow key={post.id}>
                      <TableCell className="font-medium">{post.title}</TableCell>
                      <TableCell>{post.platform}</TableCell>
                      <TableCell>{post.date}</TableCell>
                      <TableCell>{post.engagement}</TableCell>
                      <TableCell>{post.impressions}</TableCell>
                      <TableCell>{post.clicks}</TableCell>
                      <TableCell>
                        <span className={`flex items-center ${post.growth >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {post.growth >= 0 ? <ArrowUpRight className="w-3 h-3 mr-1" /> : <ArrowDownRight className="w-3 h-3 mr-1" />}
                          {Math.abs(post.growth)}%
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Platforms Tab - Simplified for brevity */}
        <TabsContent value="platforms">
          <Card>
            <CardHeader>
              <CardTitle>Platform Performance Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Detailed platform analytics would be shown here.</p>
              <div className="h-[400px] mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={platformData}>
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" name="Posts">
                      {platformData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Content Analysis Tab - Simplified for brevity */}
        <TabsContent value="content">
          <Card>
            <CardHeader>
              <CardTitle>Content Type Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Analytics by content type would be shown here.</p>
              <div className="h-[400px] mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={contentTypeData}>
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="engagement" fill="#8884d8" name="Engagement" />
                    <Bar dataKey="impressions" fill="#82ca9d" name="Impressions" />
                    <Bar dataKey="clicks" fill="#ffc658" name="Clicks" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Audience Tab - Simplified placeholder */}
        <TabsContent value="audience">
          <Card>
            <CardHeader>
              <CardTitle>Audience Insights</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Detailed audience demographics and behavior would be shown here.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

// Custom Tooltip Component for line and bar charts
const CustomTooltip = ({ active, payload, label }: { active: boolean, payload: any[], label: string }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-background border border-border p-2 rounded-md shadow-md">
        <p className="font-medium">{label}</p>
        {payload.map((entry, index) => (
          <p key={index} style={{ color: entry.color }}>
            {entry.name}: {entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

// Custom Tooltip for Pie Chart
const PieChartTooltip = ({ active, payload }: { active: boolean, payload: any[] }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-background border border-border p-2 rounded-md shadow-md">
        <p className="font-medium">{payload[0].name}</p>
        <p>{payload[0].value}%</p>
      </div>
    );
  }
  return null;
};

// Custom label for pie chart sections
const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index }: { cx: number, cy: number, midAngle: number, innerRadius: number, outerRadius: number, percent: number, index: number }) => {
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text 
      x={x} 
      y={y} 
      fill="white" 
      textAnchor={x > cx ? 'start' : 'end'} 
      dominantBaseline="central"
      fontSize={12}
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

export default Analytics;