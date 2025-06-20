import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Eye,
  Users,
  MessageCircle,
  SkipForward,
  ArrowLeft,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Clock,
  Target,
  Play,
  Pause,
  ExternalLink,
  Construction,
} from "lucide-react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

// Mock data untuk Stories Performance
const mockStoriesData = [
  {
    id: "story_1",
    date: "2024-06-17",
    type: "photo" as const,
    reach: 15420,
    impressions: 18930,
    replies: 87,
    exits: 1240,
    forwards: 523,
    back_taps: 203,
    completion_rate: 74.2,
    avg_watch_time: 8.3,
    total_duration: 15,
    sticker_taps: 45,
    link_clicks: 23,
    profile_visits: 67,
  },
  {
    id: "story_2",
    date: "2024-06-16",
    type: "video" as const,
    reach: 12850,
    impressions: 16420,
    replies: 56,
    exits: 1680,
    forwards: 342,
    back_taps: 445,
    completion_rate: 68.5,
    avg_watch_time: 12.8,
    total_duration: 30,
    sticker_taps: 78,
    link_clicks: 34,
    profile_visits: 43,
  },
  {
    id: "story_3",
    date: "2024-06-15",
    type: "photo" as const,
    reach: 18750,
    impressions: 22180,
    replies: 123,
    exits: 890,
    forwards: 678,
    back_taps: 156,
    completion_rate: 81.3,
    avg_watch_time: 9.7,
    total_duration: 15,
    sticker_taps: 89,
    link_clicks: 45,
    profile_visits: 92,
  },
];

const mockTrendData = [
  { date: "Jun 10", reach: 12000, impressions: 15000, completion_rate: 70 },
  { date: "Jun 11", reach: 14500, impressions: 18200, completion_rate: 72 },
  { date: "Jun 12", reach: 13800, impressions: 17100, completion_rate: 75 },
  { date: "Jun 13", reach: 16200, impressions: 19800, completion_rate: 73 },
  { date: "Jun 14", reach: 15600, impressions: 19200, completion_rate: 77 },
  { date: "Jun 15", reach: 18750, impressions: 22180, completion_rate: 81 },
  { date: "Jun 16", reach: 12850, impressions: 16420, completion_rate: 69 },
  { date: "Jun 17", reach: 15420, impressions: 18930, completion_rate: 74 },
];

const mockInteractionTypes = [
  { name: "Completion", value: 7420, color: "#10b981" },
  { name: "Forwards", value: 1543, color: "#3b82f6" },
  { name: "Replies", value: 266, color: "#8b5cf6" },
  { name: "Exits", value: 3810, color: "#ef4444" },
];

const mockStoryTypes = [
  { type: "Photo", count: 45, avg_completion: 78.5 },
  { type: "Video", count: 32, avg_completion: 71.2 },
  { type: "Carousel", count: 8, avg_completion: 82.1 },
  { type: "Boomerang", count: 12, avg_completion: 75.8 },
];

interface StoriesPerformanceProps {
  platform?: "instagram";
}

const StoriesPerformance: React.FC<StoriesPerformanceProps> = ({
  platform = "instagram",
}) => {
  const [selectedPeriod, setSelectedPeriod] = useState("7d");
  const [selectedStory, setSelectedStory] = useState<string | null>(null);

  // Calculate overall metrics
  const totalReach = mockStoriesData.reduce(
    (sum, story) => sum + story.reach,
    0
  );
  const totalImpressions = mockStoriesData.reduce(
    (sum, story) => sum + story.impressions,
    0
  );
  const avgCompletionRate =
    mockStoriesData.reduce((sum, story) => sum + story.completion_rate, 0) /
    mockStoriesData.length;
  const totalReplies = mockStoriesData.reduce(
    (sum, story) => sum + story.replies,
    0
  );

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toLocaleString();
  };

  const getCompletionRateColor = (rate: number) => {
    if (rate >= 80) return "text-green-600 bg-green-100";
    if (rate >= 70) return "text-yellow-600 bg-yellow-100";
    return "text-red-600 bg-red-100";
  };

  const renderStoryCard = (story: (typeof mockStoriesData)[0]) => (
    <Card
      key={story.id}
      className={`cursor-pointer transition-all hover:shadow-md ${
        selectedStory === story.id ? "ring-2 ring-blue-500" : ""
      }`}
      onClick={() => setSelectedStory(story.id)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-sm font-medium">
              {new Date(story.date).toLocaleDateString("id-ID", {
                day: "numeric",
                month: "short",
              })}
            </CardTitle>
            <CardDescription className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="text-xs">
                {story.type === "photo" ? "Foto" : "Video"}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {story.total_duration}s
              </span>
            </CardDescription>
          </div>
          <Badge
            className={`text-xs ${getCompletionRateColor(story.completion_rate)}`}
          >
            {story.completion_rate.toFixed(1)}% selesai
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-blue-500" />
            <div>
              <div className="font-medium">{formatNumber(story.reach)}</div>
              <div className="text-xs text-muted-foreground">Jangkauan</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-green-500" />
            <div>
              <div className="font-medium">
                {formatNumber(story.impressions)}
              </div>
              <div className="text-xs text-muted-foreground">Tayangan</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <MessageCircle className="w-4 h-4 text-purple-500" />
            <div>
              <div className="font-medium">{story.replies}</div>
              <div className="text-xs text-muted-foreground">Balasan</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <SkipForward className="w-4 h-4 text-orange-500" />
            <div>
              <div className="font-medium">{story.forwards}</div>
              <div className="text-xs text-muted-foreground">Lanjut</div>
            </div>
          </div>
        </div>
        <Progress value={story.completion_rate} className="h-2" />
        <div className="text-xs text-muted-foreground text-center">
          Rata-rata ditonton {story.avg_watch_time}s dari {story.total_duration}
          s
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Header dengan Filter */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-lg font-semibold">
              Instagram Stories Analytics
            </h3>
            <Badge
              variant="outline"
              className="text-orange-600 border-orange-300"
            >
              <Construction className="h-3 w-3 mr-1" />
              Coming Soon
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Lacak performa Stories dengan metrik engagement dan completion rate
          </p>
        </div>
        <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">7 Hari</SelectItem>
            <SelectItem value="30d">30 Hari</SelectItem>
            <SelectItem value="90d">90 Hari</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Coming Soon Alert */}
      <Alert className="border-orange-200 bg-orange-50">
        <Construction className="h-4 w-4 text-orange-600" />
        <AlertDescription className="text-orange-800">
          <strong>Coming Soon:</strong> Instagram Stories Analytics will be
          available soon. This feature will provide detailed insights into story
          performance, completion rates, and audience engagement patterns.
        </AlertDescription>
      </Alert>

      {/* Overview Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Jangkauan
            </CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(totalReach)}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              <TrendingUp className="w-3 h-3 mr-1" />
              +12.5% dari minggu lalu
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Tayangan
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatNumber(totalImpressions)}
            </div>
            <div className="flex items-center text-xs text-muted-foreground">
              <TrendingUp className="w-3 h-3 mr-1" />
              +8.2% dari minggu lalu
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Completion Rate
            </CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {avgCompletionRate.toFixed(1)}%
            </div>
            <div className="flex items-center text-xs text-muted-foreground">
              <TrendingUp className="w-3 h-3 mr-1" />
              +3.1% dari minggu lalu
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Balasan</CardTitle>
            <MessageCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalReplies}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              <TrendingDown className="w-3 h-3 mr-1" />
              -5.7% dari minggu lalu
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="performance" className="space-y-6">
        <TabsList>
          <TabsTrigger value="performance">Performa</TabsTrigger>
          <TabsTrigger value="trends">Trend</TabsTrigger>
          <TabsTrigger value="interactions">Interaksi</TabsTrigger>
          <TabsTrigger value="types">Tipe Konten</TabsTrigger>
        </TabsList>

        <TabsContent value="performance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Stories Individual</CardTitle>
              <CardDescription>
                Klik pada card untuk melihat detail lengkap
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {mockStoriesData.map(renderStoryCard)}
              </div>
            </CardContent>
          </Card>

          {selectedStory && (
            <Card>
              <CardHeader>
                <CardTitle>Detail Story</CardTitle>
                <CardDescription>
                  Analisis mendalam untuk story yang dipilih
                </CardDescription>
              </CardHeader>
              <CardContent>
                {(() => {
                  const story = mockStoriesData.find(
                    (s) => s.id === selectedStory
                  );
                  if (!story) return null;

                  return (
                    <div className="space-y-6">
                      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
                        <div className="text-center">
                          <div className="text-2xl font-bold">
                            {formatNumber(story.reach)}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Jangkauan
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold">
                            {formatNumber(story.impressions)}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Tayangan
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold">
                            {story.replies}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Balasan
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold">
                            {story.forwards}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Lanjut
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold">
                            {story.back_taps}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Kembali
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold">
                            {story.exits}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Keluar
                          </div>
                        </div>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <h4 className="font-medium mb-2">Navigasi Pattern</h4>
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="flex items-center gap-2 text-sm">
                                <ArrowRight className="w-4 h-4 text-green-500" />
                                Lanjut ke story berikutnya
                              </span>
                              <span className="font-medium">
                                {story.forwards}
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="flex items-center gap-2 text-sm">
                                <ArrowLeft className="w-4 h-4 text-blue-500" />
                                Kembali ke story sebelumnya
                              </span>
                              <span className="font-medium">
                                {story.back_taps}
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="flex items-center gap-2 text-sm">
                                <ExternalLink className="w-4 h-4 text-red-500" />
                                Keluar dari story
                              </span>
                              <span className="font-medium">{story.exits}</span>
                            </div>
                          </div>
                        </div>

                        <div>
                          <h4 className="font-medium mb-2">
                            Engagement Actions
                          </h4>
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-sm">Sticker Taps</span>
                              <span className="font-medium">
                                {story.sticker_taps}
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm">Link Clicks</span>
                              <span className="font-medium">
                                {story.link_clicks}
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm">Profile Visits</span>
                              <span className="font-medium">
                                {story.profile_visits}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h4 className="font-medium mb-2">
                          Watch Time Analysis
                        </h4>
                        <div className="bg-gray-100 rounded-lg p-4">
                          <div className="flex justify-between text-sm mb-2">
                            <span>Durasi Story: {story.total_duration}s</span>
                            <span>
                              Rata-rata ditonton: {story.avg_watch_time}s
                            </span>
                          </div>
                          <Progress
                            value={
                              (story.avg_watch_time / story.total_duration) *
                              100
                            }
                            className="h-3"
                          />
                          <div className="text-xs text-muted-foreground mt-2 text-center">
                            {story.completion_rate.toFixed(1)}% viewers
                            menyelesaikan story
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="trends" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Trend Performa Stories</CardTitle>
              <CardDescription>
                Perkembangan jangkauan, tayangan, dan completion rate
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={mockTrendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="reach"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    name="Jangkauan"
                  />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="impressions"
                    stroke="#10b981"
                    strokeWidth={2}
                    name="Tayangan"
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="completion_rate"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    name="Completion Rate (%)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="interactions" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Distribusi Interaksi</CardTitle>
                <CardDescription>
                  Breakdown cara audiens berinteraksi dengan Stories
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={mockInteractionTypes}
                      cx="50%"
                      cy="50%"
                      innerRadius={80}
                      outerRadius={120}
                      dataKey="value"
                    >
                      {mockInteractionTypes.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="grid grid-cols-2 gap-2 mt-4">
                  {mockInteractionTypes.map((item) => (
                    <div key={item.name} className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-sm">{item.name}</span>
                      <span className="text-sm font-medium ml-auto">
                        {formatNumber(item.value)}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Engagement Rate by Time</CardTitle>
                <CardDescription>
                  Waktu terbaik untuk posting Stories
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { time: "09:00 - 12:00", rate: 85.2, label: "Pagi" },
                    { time: "12:00 - 15:00", rate: 78.8, label: "Siang" },
                    { time: "15:00 - 18:00", rate: 92.1, label: "Sore" },
                    { time: "18:00 - 21:00", rate: 88.7, label: "Malam" },
                    { time: "21:00 - 24:00", rate: 74.3, label: "Larut" },
                  ].map((slot) => (
                    <div key={slot.time} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">{slot.label}</span>
                        <span>{slot.rate}%</span>
                      </div>
                      <Progress value={slot.rate} className="h-2" />
                      <div className="text-xs text-muted-foreground">
                        {slot.time}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="types" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Performa by Content Type</CardTitle>
              <CardDescription>
                Bandingkan performa berbagai tipe konten Stories
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockStoryTypes.map((type) => (
                  <div
                    key={type.type}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center gap-4">
                      <div>
                        <div className="font-medium">{type.type}</div>
                        <div className="text-sm text-muted-foreground">
                          {type.count} stories dipublikasi
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold">
                        {type.avg_completion.toFixed(1)}%
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Avg. completion
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Content Type Performance</CardTitle>
              <CardDescription>
                Visualisasi completion rate berdasarkan tipe konten
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={mockStoryTypes}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="type" />
                  <YAxis />
                  <Tooltip />
                  <Bar
                    dataKey="avg_completion"
                    fill="#3b82f6"
                    name="Avg. Completion Rate (%)"
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default StoriesPerformance;
