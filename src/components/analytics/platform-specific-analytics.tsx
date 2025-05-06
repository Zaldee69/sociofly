import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import PostAnalysis from "@/components/analytics/post-analysis";
import { SocialAccount } from "@/components/analytics/account-selector";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import {
  Instagram,
  Facebook,
  Twitter,
  Linkedin,
  BarChart,
  LineChart,
  PieChart,
  TrendingUp,
} from "lucide-react";

interface PlatformSpecificAnalyticsProps {
  account: SocialAccount;
}

type Post = {
  id: string;
  content: string;
  imageUrl?: string;
  date: string;
  likes: number;
  shares?: number;
  retweets?: number;
  replies?: number;
  comments?: number;
  engagement: number;
  reach: number;
  clicks: number;
  impressions: number;
};

const PlatformSpecificAnalytics: React.FC<PlatformSpecificAnalyticsProps> = ({
  account,
}) => {
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);

  const mockPosts: Record<string, Post[]> = {
    instagram: [
      {
        id: "inst1",
        content: "Produk terbaru kami! 🌟 #NewProduct #UMKM",
        imageUrl: "https://picsum.photos/id/26/400/400",
        date: "2023-05-15",
        likes: 245,
        comments: 42,
        shares: 23,
        engagement: 4.8,
        reach: 1890,
        clicks: 89,
        impressions: 2890,
      },
      {
        id: "inst2",
        content: "Promo spesial untuk followers setia! 🎁 #Promo #Diskon",
        imageUrl: "https://picsum.photos/id/96/400/400",
        date: "2023-05-10",
        likes: 310,
        comments: 67,
        shares: 45,
        engagement: 5.2,
        reach: 2150,
        clicks: 124,
        impressions: 3200,
      },
      {
        id: "inst3",
        content: "Behind the scenes dari tim kami 👥 #BTS #TeamWork",
        imageUrl: "https://picsum.photos/id/84/400/400",
        date: "2023-05-05",
        likes: 189,
        comments: 28,
        shares: 12,
        engagement: 3.7,
        reach: 1450,
        clicks: 52,
        impressions: 2100,
      },
    ],
    facebook: [
      {
        id: "fb1",
        content: "Pengumuman penting untuk komunitas kami!",
        imageUrl: "https://picsum.photos/id/28/400/400",
        date: "2023-05-16",
        likes: 156,
        comments: 34,
        shares: 45,
        engagement: 3.9,
        reach: 1560,
        clicks: 67,
        impressions: 2100,
      },
      {
        id: "fb2",
        content: "Testimoni pelanggan kami yang puas dengan layanan kami",
        imageUrl: "https://picsum.photos/id/14/400/400",
        date: "2023-05-12",
        likes: 203,
        comments: 28,
        shares: 32,
        engagement: 4.3,
        reach: 1780,
        clicks: 82,
        impressions: 2450,
      },
    ],
    twitter: [
      {
        id: "tw1",
        content: "Berita terbaru dari industri kami! Apa pendapat Anda?",
        date: "2023-05-14",
        likes: 89,
        replies: 15,
        retweets: 42,
        engagement: 3.2,
        reach: 980,
        clicks: 45,
        impressions: 1670,
      },
      {
        id: "tw2",
        content:
          "Poll: Fitur apa yang paling Anda inginkan di produk kami berikutnya?",
        date: "2023-05-09",
        likes: 132,
        replies: 87,
        retweets: 28,
        engagement: 4.5,
        reach: 1240,
        clicks: 68,
        impressions: 2100,
      },
    ],
    linkedin: [
      {
        id: "li1",
        content: "Pandangan industri dari CEO kami tentang tren masa depan",
        imageUrl: "https://picsum.photos/id/94/400/400",
        date: "2023-05-15",
        likes: 75,
        comments: 14,
        shares: 23,
        engagement: 2.3,
        reach: 1250,
        clicks: 38,
        impressions: 1900,
      },
    ],
  };

  // Get posts for current platform
  const platformPosts = mockPosts[account.platform] || [];

  // For charts
  const weeklyData = [
    { date: "Min", engagement: 3.2, reach: 950, followers: 5 },
    { date: "Sen", engagement: 3.5, reach: 1050, followers: 8 },
    { date: "Sel", engagement: 3.8, reach: 1200, followers: 12 },
    { date: "Rab", engagement: 4.2, reach: 1350, followers: 15 },
    { date: "Kam", engagement: 3.9, reach: 1250, followers: 10 },
    { date: "Jum", engagement: 4.5, reach: 1450, followers: 18 },
    { date: "Sab", engagement: 4.1, reach: 1300, followers: 14 },
  ];

  const audienceData = [
    { name: "18-24", value: 25 },
    { name: "25-34", value: 40 },
    { name: "35-44", value: 20 },
    { name: "45+", value: 15 },
  ];

  const contentTypes = [
    { name: "Foto", engagement: 4.2 },
    { name: "Video", engagement: 5.1 },
    { name: "Carousel", engagement: 4.8 },
    { name: "Teks", engagement: 2.9 },
    { name: "Link", engagement: 3.6 },
  ];

  const COLORS = [
    "#0088FE",
    "#00C49F",
    "#FFBB28",
    "#FF8042",
    "#8884d8",
    "#82ca9d",
  ];

  const renderPlatformIcon = () => {
    switch (account.platform) {
      case "instagram":
        return <Instagram className="h-5 w-5 text-[#E1306C]" />;
      case "facebook":
        return <Facebook className="h-5 w-5 text-[#4267B2]" />;
      case "twitter":
        return <Twitter className="h-5 w-5 text-[#1DA1F2]" />;
      case "linkedin":
        return <Linkedin className="h-5 w-5 text-[#0077B5]" />;
      default:
        return <Instagram className="h-5 w-5" />;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center gap-2">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              {renderPlatformIcon()}
              <CardTitle>Analytics: {account.name}</CardTitle>
            </div>
            <CardDescription>
              Detail metrik untuk @{account.username} di {account.platform}
            </CardDescription>
          </div>
          <Badge variant="outline" className="text-xs">
            {account.platform.charAt(0).toUpperCase() +
              account.platform.slice(1)}
          </Badge>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid grid-cols-4 mb-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="post-analysis">Post Analysis</TabsTrigger>
              <TabsTrigger value="audience">Audience</TabsTrigger>
              <TabsTrigger value="engagement">Engagement</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">
                      Total Followers
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {account.platform === "instagram" && "15.8K"}
                      {account.platform === "facebook" && "12.3K"}
                      {account.platform === "twitter" && "9.8K"}
                      {account.platform === "linkedin" && "7.5K"}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      +6.8% dari bulan lalu
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">
                      Engagement Rate
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {account.platform === "instagram" && "4.2%"}
                      {account.platform === "facebook" && "3.8%"}
                      {account.platform === "twitter" && "2.9%"}
                      {account.platform === "linkedin" && "2.3%"}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      +0.5% dari bulan lalu
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Reach</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {account.platform === "instagram" && "95K"}
                      {account.platform === "facebook" && "75K"}
                      {account.platform === "twitter" && "35K"}
                      {account.platform === "linkedin" && "45K"}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      +12.5% dari bulan lalu
                    </p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    Pertumbuhan Mingguan
                  </CardTitle>
                </CardHeader>
                <CardContent style={{ width: "100%", height: 400 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsLineChart
                      data={weeklyData}
                      margin={{
                        top: 5,
                        right: 30,
                        left: 20,
                        bottom: 5,
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis yAxisId="left" />
                      <YAxis yAxisId="right" orientation="right" />
                      <Tooltip />
                      <Legend />
                      <Line
                        yAxisId="left"
                        type="monotone"
                        dataKey="engagement"
                        name="Engagement (%)"
                        stroke="#8884d8"
                        strokeWidth={2}
                        dot={{ r: 4 }}
                        activeDot={{ r: 8 }}
                      />
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="followers"
                        name="Followers Baru"
                        stroke="#82ca9d"
                        strokeWidth={2}
                        dot={{ r: 4 }}
                      />
                    </RechartsLineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <div className="grid md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">
                      Tipe Konten Terbaik
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsBarChart data={contentTypes}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Bar
                          dataKey="engagement"
                          name="Engagement %"
                          fill="#8884d8"
                        />
                      </RechartsBarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">
                      Demografi Audience
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPieChart>
                        <Pie
                          data={audienceData}
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
                          {audienceData.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={COLORS[index % COLORS.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => `${value}%`} />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    Insight & Rekomendasi
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-4">
                    <li className="flex items-start gap-2">
                      <div className="bg-blue-100 p-1 rounded text-blue-700">
                        <LineChart className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">
                          Engagement meningkat 20% dibanding bulan lalu
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Jadwal posting yang konsisten memberikan hasil yang
                          baik
                        </p>
                      </div>
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="bg-green-100 p-1 rounded text-green-700">
                        <BarChart className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">
                          Konten video menunjukkan performa terbaik
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Tingkat engagement 5.1%, lebih tinggi dari rata-rata
                        </p>
                      </div>
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="bg-purple-100 p-1 rounded text-purple-700">
                        <PieChart className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">
                          Mayoritas pengikut berada di kelompok usia 25-34
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Sesuaikan konten untuk target demografis ini
                        </p>
                      </div>
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="bg-amber-100 p-1 rounded text-amber-700">
                        <TrendingUp className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">
                          Waktu posting terbaik: Rabu 12-14 WIB
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Post pada waktu ini mendapat engagement 35% lebih
                          tinggi
                        </p>
                      </div>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="post-analysis" className="space-y-6">
              {selectedPost ? (
                <div>
                  <div className="mb-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedPost(null)}
                    >
                      Kembali ke daftar
                    </Button>
                  </div>

                  <PostAnalysis
                    platform={account.platform}
                    customPost={selectedPost}
                  />
                </div>
              ) : (
                <Card>
                  <CardHeader>
                    <CardTitle>Posts Analytics</CardTitle>
                    <CardDescription>
                      Pilih post untuk melihat analitik detailnya
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Tanggal</TableHead>
                          <TableHead>Konten</TableHead>
                          <TableHead className="text-right">
                            Engagement
                          </TableHead>
                          <TableHead className="text-right">Reach</TableHead>
                          <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {platformPosts.map((post) => (
                          <TableRow key={post.id}>
                            <TableCell>{post.date}</TableCell>
                            <TableCell className="max-w-[200px] truncate">
                              {post.content}
                            </TableCell>
                            <TableCell className="text-right">
                              {post.engagement}%
                            </TableCell>
                            <TableCell className="text-right">
                              {post.reach}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedPost(post)}
                              >
                                Detail
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="audience">
              <div className="grid gap-6 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Demografi Audience</CardTitle>
                    <CardDescription>Kelompok usia pengikut</CardDescription>
                  </CardHeader>
                  <CardContent className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPieChart>
                        <Pie
                          data={audienceData}
                          cx="50%"
                          cy="50%"
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="value"
                          label={({ name, percent }) =>
                            `${name} ${(percent * 100).toFixed(0)}%`
                          }
                        >
                          {audienceData.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={COLORS[index % COLORS.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => `${value}%`} />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Lokasi Pengikut</CardTitle>
                    <CardDescription>Top lokasi pengikut</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Lokasi</TableHead>
                          <TableHead className="text-right">
                            Persentase
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <TableRow>
                          <TableCell>Jakarta</TableCell>
                          <TableCell className="text-right">35%</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>Surabaya</TableCell>
                          <TableCell className="text-right">20%</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>Bandung</TableCell>
                          <TableCell className="text-right">15%</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>Medan</TableCell>
                          <TableCell className="text-right">10%</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>Lainnya</TableCell>
                          <TableCell className="text-right">20%</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>

              <Card className="mt-6">
                <CardHeader>
                  <CardTitle>Aktivitas Pengikut</CardTitle>
                  <CardDescription>
                    Kapan pengikut Anda paling aktif
                  </CardDescription>
                </CardHeader>
                <CardContent className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsBarChart
                      data={[
                        { jam: "00:00", aktif: 5 },
                        { jam: "03:00", aktif: 3 },
                        { jam: "06:00", aktif: 12 },
                        { jam: "09:00", aktif: 45 },
                        { jam: "12:00", aktif: 78 },
                        { jam: "15:00", aktif: 85 },
                        { jam: "18:00", aktif: 92 },
                        { jam: "21:00", aktif: 54 },
                      ]}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="jam" />
                      <YAxis />
                      <Tooltip />
                      <Bar
                        dataKey="aktif"
                        name="Pengguna aktif (%)"
                        fill="#8884d8"
                      />
                    </RechartsBarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="engagement">
              <Card>
                <CardHeader>
                  <CardTitle>Engagement Metrics</CardTitle>
                  <CardDescription>Informasi engagement detail</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid gap-6 md:grid-cols-2">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">
                          Tipe Engagement
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <RechartsPieChart>
                            <Pie
                              data={[
                                { name: "Likes", value: 60 },
                                { name: "Comments", value: 15 },
                                { name: "Shares", value: 10 },
                                { name: "Saves", value: 8 },
                                { name: "Other", value: 7 },
                              ]}
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
                              {audienceData.map((entry, index) => (
                                <Cell
                                  key={`cell-${index}`}
                                  fill={COLORS[index % COLORS.length]}
                                />
                              ))}
                            </Pie>
                            <Tooltip formatter={(value) => `${value}%`} />
                          </RechartsPieChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">
                          Waktu Posting Terbaik
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Hari</TableHead>
                              <TableHead>Jam</TableHead>
                              <TableHead className="text-right">
                                Engagement
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            <TableRow>
                              <TableCell>Senin</TableCell>
                              <TableCell>09:00</TableCell>
                              <TableCell className="text-right">4.3%</TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell>Rabu</TableCell>
                              <TableCell>12:00</TableCell>
                              <TableCell className="text-right">4.8%</TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell>Kamis</TableCell>
                              <TableCell>18:00</TableCell>
                              <TableCell className="text-right">5.1%</TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell>Sabtu</TableCell>
                              <TableCell>11:00</TableCell>
                              <TableCell className="text-right">4.7%</TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell>Minggu</TableCell>
                              <TableCell>20:00</TableCell>
                              <TableCell className="text-right">4.5%</TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  </div>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">
                        Performa Hashtag
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Hashtag</TableHead>
                            <TableHead className="text-right">Reach</TableHead>
                            <TableHead className="text-right">
                              Engagement
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          <TableRow>
                            <TableCell>#productlaunch</TableCell>
                            <TableCell className="text-right">12,500</TableCell>
                            <TableCell className="text-right">4.8%</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell>#specialoffer</TableCell>
                            <TableCell className="text-right">10,800</TableCell>
                            <TableCell className="text-right">4.2%</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell>#brandname</TableCell>
                            <TableCell className="text-right">9,500</TableCell>
                            <TableCell className="text-right">3.9%</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell>#industrytrends</TableCell>
                            <TableCell className="text-right">7,800</TableCell>
                            <TableCell className="text-right">3.5%</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell>#customerreviews</TableCell>
                            <TableCell className="text-right">6,500</TableCell>
                            <TableCell className="text-right">3.3%</TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default PlatformSpecificAnalytics;
