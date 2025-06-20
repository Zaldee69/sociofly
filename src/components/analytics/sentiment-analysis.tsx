import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  MessageSquare,
  BarChart2,
  ArrowUp,
  ArrowDown,
  Construction,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { ChartContainer, ChartTooltip } from "@/components/ui/chart";
import {
  Line,
  Bar,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  BarChart,
} from "recharts";
import { toast } from "sonner";

// Mock data for sentiment trends
const mockSentimentTrends = [
  { date: "2024-04-20", positive: 65, negative: 15, neutral: 20 },
  { date: "2024-04-21", positive: 70, negative: 10, neutral: 20 },
  { date: "2024-04-22", positive: 60, negative: 25, neutral: 15 },
  { date: "2024-04-23", positive: 75, negative: 12, neutral: 13 },
  { date: "2024-04-24", positive: 68, negative: 18, neutral: 14 },
  { date: "2024-04-25", positive: 72, negative: 16, neutral: 12 },
  { date: "2024-04-26", positive: 80, negative: 10, neutral: 10 },
];

// Mock data for competitor comparison
const mockCompetitorData = [
  { name: "@yourbrand", positive: 70, negative: 10, neutral: 20 },
  { name: "@competitor1", positive: 60, negative: 25, neutral: 15 },
  { name: "@competitor2", positive: 45, negative: 35, neutral: 20 },
];

// Mock data for priority negative comments
const mockPriorityComments = [
  {
    text: "Pengiriman sangat lambat, sudah 1 minggu belum sampai",
    timestamp: "2 jam yang lalu",
    priority: "high",
  },
  {
    text: "CS tidak merespon chat saya selama 2 hari",
    timestamp: "5 jam yang lalu",
    priority: "high",
  },
  {
    text: "Kualitas produk tidak sesuai dengan gambar",
    timestamp: "1 hari yang lalu",
    priority: "medium",
  },
];

// Mock data for competitor comments sentiment analysis
const mockCompetitorComments: {
  [key: string]: { text: string; sentiment: string }[];
} = {
  "@competitor1": [
    {
      text: "Produknya bagus banget, pelayanan juga ramah!",
      sentiment: "positive",
    },
    { text: "Pengiriman cepat, recommended banget!", sentiment: "positive" },
    { text: "Kualitas sesuai dengan harga", sentiment: "neutral" },
    {
      text: "Barang datang cepat tapi packingnya kurang rapih",
      sentiment: "mixed",
    },
    { text: "Sudah beli 3x disini selalu puas", sentiment: "positive" },
  ],
  "@competitor2": [
    { text: "Harga mahal tapi kualitas biasa aja", sentiment: "negative" },
    {
      text: "Responnya lama banget, CS kurang profesional",
      sentiment: "negative",
    },
    { text: "Barangnya sesuai deskripsi", sentiment: "neutral" },
    { text: "Pengiriman lambat, tapi barangnya bagus", sentiment: "mixed" },
    { text: "Barang cepat rusak, tidak awet", sentiment: "negative" },
  ],
  "@yourbrand": [
    {
      text: "Produknya sangat bagus dan harga terjangkau!",
      sentiment: "positive",
    },
    { text: "Admin ramah dan pengiriman cepat", sentiment: "positive" },
    { text: "Sesuai dengan yang di gambar", sentiment: "neutral" },
    {
      text: "Packingnya kurang rapi, tapi barangnya bagus",
      sentiment: "mixed",
    },
    { text: "Selalu puas belanja disini", sentiment: "positive" },
  ],
};

const mockSentimentPercentages: {
  [key: string]: {
    positive: number;
    neutral: number;
    negative: number;
    mixed: number;
  };
} = {
  "@competitor1": { positive: 60, neutral: 20, negative: 10, mixed: 10 },
  "@competitor2": { positive: 20, neutral: 30, negative: 40, mixed: 10 },
  "@yourbrand": { positive: 70, neutral: 15, negative: 5, mixed: 10 },
};

const mockKeywordAnalysis: {
  [key: string]: { keyword: string; count: number; sentiment: string }[];
} = {
  "@competitor1": [
    { keyword: "bagus", count: 35, sentiment: "positive" },
    { keyword: "pengiriman cepat", count: 28, sentiment: "positive" },
    { keyword: "harga", count: 22, sentiment: "neutral" },
    { keyword: "rusak", count: 8, sentiment: "negative" },
    { keyword: "mahal", count: 7, sentiment: "negative" },
  ],
  "@competitor2": [
    { keyword: "mahal", count: 42, sentiment: "negative" },
    { keyword: "lambat", count: 38, sentiment: "negative" },
    { keyword: "kualitas", count: 25, sentiment: "neutral" },
    { keyword: "sesuai", count: 20, sentiment: "positive" },
    { keyword: "rusak", count: 18, sentiment: "negative" },
  ],
  "@yourbrand": [
    { keyword: "bagus", count: 45, sentiment: "positive" },
    { keyword: "ramah", count: 32, sentiment: "positive" },
    { keyword: "cepat", count: 28, sentiment: "positive" },
    { keyword: "harga terjangkau", count: 24, sentiment: "positive" },
    { keyword: "sesuai", count: 18, sentiment: "neutral" },
  ],
};

interface SentimentAnalysisProps {
  platform?: string;
}

const SentimentAnalysis = ({
  platform = "instagram",
}: SentimentAnalysisProps) => {
  const [selectedCompetitor, setSelectedCompetitor] = useState("@yourbrand");
  const [competitors] = useState(Object.keys(mockCompetitorComments));
  const [searchTerm, setSearchTerm] = useState("");

  const filteredComments =
    searchTerm.trim() === ""
      ? mockCompetitorComments[selectedCompetitor]
      : mockCompetitorComments[selectedCompetitor].filter((comment) =>
          comment.text.toLowerCase().includes(searchTerm.toLowerCase())
        );

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case "positive":
        return "bg-green-500";
      case "negative":
        return "bg-red-500";
      case "neutral":
        return "bg-gray-500";
      case "mixed":
        return "bg-yellow-500";
      default:
        return "bg-gray-500";
    }
  };

  const handleAnalyzeCompetitor = (username: string) => {
    if (!username.startsWith("@")) {
      username = "@" + username;
    }

    if (competitors.includes(username)) {
      setSelectedCompetitor(username);
      toast.success(`Menampilkan hasil analisis untuk ${username}`);
    } else {
      toast.error("Kompetitor tidak ditemukan");
    }
  };

  const getKeywordColor = (sentiment: string) => {
    switch (sentiment) {
      case "positive":
        return "text-green-600";
      case "negative":
        return "text-red-600";
      case "neutral":
        return "text-gray-600";
      default:
        return "";
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Analisis Sentimen Kompetitor
          <Badge
            variant="outline"
            className="text-orange-600 border-orange-300"
          >
            <Construction className="h-3 w-3 mr-1" />
            Coming Soon
          </Badge>
        </CardTitle>
        <CardDescription>
          Analisis sentimen komentar pada akun kompetitor untuk memahami
          persepsi pelanggan
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Coming Soon Alert */}
        <Alert className="border-orange-200 bg-orange-50">
          <Construction className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-800">
            <strong>Coming Soon:</strong> AI-powered sentiment analysis for
            competitor benchmarking will be available in future updates. This
            will include automated comment analysis, brand perception tracking,
            and competitive insights.
          </AlertDescription>
        </Alert>

        <div className="flex flex-wrap gap-3 mb-4">
          <Input
            placeholder="Masukkan username kompetitor..."
            className="max-w-xs"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Button onClick={() => handleAnalyzeCompetitor(searchTerm)}>
            <Search className="h-4 w-4 mr-2" />
            Analisis
          </Button>
        </div>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Ringkasan</TabsTrigger>
            <TabsTrigger value="trends">Tren</TabsTrigger>
            <TabsTrigger value="comparison">Perbandingan</TabsTrigger>
            <TabsTrigger value="priority">Prioritas</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <h3 className="font-medium text-sm mb-2">
                  Persentase Sentimen untuk {selectedCompetitor}
                </h3>
                <div className="space-y-4">
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span>Positif</span>
                      <span>
                        {mockSentimentPercentages[selectedCompetitor].positive}%
                      </span>
                    </div>
                    <Progress
                      value={
                        mockSentimentPercentages[selectedCompetitor].positive
                      }
                      className="h-2"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span>Netral</span>
                      <span>
                        {mockSentimentPercentages[selectedCompetitor].neutral}%
                      </span>
                    </div>
                    <Progress
                      value={
                        mockSentimentPercentages[selectedCompetitor].neutral
                      }
                      className="h-2"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span>Negatif</span>
                      <span>
                        {mockSentimentPercentages[selectedCompetitor].negative}%
                      </span>
                    </div>
                    <Progress
                      value={
                        mockSentimentPercentages[selectedCompetitor].negative
                      }
                      className="h-2"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span>Campuran</span>
                      <span>
                        {mockSentimentPercentages[selectedCompetitor].mixed}%
                      </span>
                    </div>
                    <Progress
                      value={mockSentimentPercentages[selectedCompetitor].mixed}
                      className="h-2"
                    />
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-medium text-sm mb-2">Kata Kunci Teratas</h3>
                <div className="space-y-2">
                  {mockKeywordAnalysis[selectedCompetitor].slice(0, 5).map(
                    (
                      keywordData: {
                        keyword: string;
                        count: number;
                        sentiment: string;
                      },
                      index: number
                    ) => (
                      <div
                        key={index}
                        className="flex justify-between items-center border-b pb-1"
                      >
                        <span
                          className={`text-sm ${getKeywordColor(keywordData.sentiment)}`}
                        >
                          "{keywordData.keyword}"
                        </span>
                        <span className="text-xs font-medium">
                          {keywordData.count}x
                        </span>
                      </div>
                    )
                  )}
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="trends">
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Tren Sentimen Harian</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Grafik di bawah ini menunjukkan tren sentimen komentar selama 7
                hari terakhir.
              </p>
              <div className="h-[400px] w-full">
                <ChartContainer
                  config={{
                    positive: { color: "#22c55e", label: "Positif" },
                    negative: { color: "#ef4444", label: "Negatif" },
                    neutral: { color: "#94a3b8", label: "Netral" },
                  }}
                >
                  <ResponsiveContainer>
                    <Line data={mockSentimentTrends}>
                      <XAxis dataKey="date" />
                      <YAxis />
                      <CartesianGrid strokeDasharray="3 3" />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="bg-background border p-2 rounded-md shadow-md">
                                <p className="font-medium">
                                  {payload[0].payload.date}
                                </p>
                                <p className="text-green-500">
                                  Positif: {payload[0].value}%
                                </p>
                                <p className="text-red-500">
                                  Negatif: {payload[1].value}%
                                </p>
                                <p className="text-gray-500">
                                  Netral: {payload[2].value}%
                                </p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="positive"
                        stroke="#22c55e"
                        name="Positif"
                        strokeWidth={2}
                        dot={{ r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="negative"
                        stroke="#ef4444"
                        name="Negatif"
                        strokeWidth={2}
                        dot={{ r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="neutral"
                        stroke="#94a3b8"
                        name="Netral"
                        strokeWidth={2}
                        dot={{ r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                    </Line>
                  </ResponsiveContainer>
                </ChartContainer>
              </div>

              <div className="grid grid-cols-3 gap-4 mt-6">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-full bg-green-100">
                        <ArrowUp className="h-4 w-4 text-green-600" />
                      </div>
                      <div>
                        <div className="text-sm font-medium">
                          Sentimen Positif
                        </div>
                        <div className="text-2xl font-bold">+15%</div>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground mt-2">
                      Dibandingkan minggu lalu
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-full bg-red-100">
                        <ArrowDown className="h-4 w-4 text-red-600" />
                      </div>
                      <div>
                        <div className="text-sm font-medium">
                          Sentimen Negatif
                        </div>
                        <div className="text-2xl font-bold">-5%</div>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground mt-2">
                      Dibandingkan minggu lalu
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-full bg-gray-100">
                        <BarChart2 className="h-4 w-4 text-gray-600" />
                      </div>
                      <div>
                        <div className="text-sm font-medium">
                          Sentimen Netral
                        </div>
                        <div className="text-2xl font-bold">-10%</div>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground mt-2">
                      Dibandingkan minggu lalu
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="comparison">
            <div className="space-y-4">
              <h3 className="text-lg font-medium">
                Perbandingan dengan Kompetitor
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Grafik di bawah menunjukkan perbandingan sentimen komentar pada
                akun Anda dengan kompetitor.
              </p>
              <div className="h-[400px] w-full">
                <ChartContainer
                  config={{
                    positive: { color: "#22c55e", label: "Positif" },
                    negative: { color: "#ef4444", label: "Negatif" },
                    neutral: { color: "#94a3b8", label: "Netral" },
                  }}
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={mockCompetitorData}
                      margin={{
                        top: 20,
                        right: 30,
                        left: 20,
                        bottom: 5,
                      }}
                    >
                      <XAxis dataKey="name" />
                      <YAxis />
                      <CartesianGrid strokeDasharray="3 3" />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const name = payload[0].payload.name;
                            return (
                              <div className="bg-background border p-2 rounded-md shadow-md">
                                <p className="font-medium">{name}</p>
                                <p className="text-green-500">
                                  Positif: {payload[0].value}%
                                </p>
                                <p className="text-red-500">
                                  Negatif: {payload[1].value}%
                                </p>
                                <p className="text-gray-500">
                                  Netral: {payload[2].value}%
                                </p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Legend />
                      <Bar
                        dataKey="positive"
                        stackId="a"
                        fill="#22c55e"
                        name="Positif"
                        isAnimationActive={false}
                        barSize={40}
                      />
                      <Bar
                        dataKey="negative"
                        stackId="a"
                        fill="#ef4444"
                        name="Negatif"
                        isAnimationActive={false}
                        barSize={40}
                      />
                      <Bar
                        dataKey="neutral"
                        stackId="a"
                        fill="#94a3b8"
                        name="Netral"
                        isAnimationActive={false}
                        barSize={40}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </div>

              <div className="mt-6 border rounded-lg overflow-hidden">
                <div className="bg-muted p-4 font-medium">
                  Insight Perbandingan Kompetitor
                </div>
                <div className="p-4 space-y-2">
                  <div className="flex items-start gap-2">
                    <Badge
                      variant="outline"
                      className="bg-green-50 text-green-700 border-green-200"
                    >
                      Insight
                    </Badge>
                    <p className="text-sm">
                      Akun Anda memiliki sentimen positif tertinggi (70%)
                      dibandingkan @competitor1 (60%) dan @competitor2 (45%).
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <Badge
                      variant="outline"
                      className="bg-yellow-50 text-yellow-700 border-yellow-200"
                    >
                      Peluang
                    </Badge>
                    <p className="text-sm">
                      @competitor2 memiliki sentimen negatif tinggi (35%) yang
                      dapat menjadi peluang untuk mengambil pangsa pasar mereka.
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <Badge
                      variant="outline"
                      className="bg-blue-50 text-blue-700 border-blue-200"
                    >
                      Aksi
                    </Badge>
                    <p className="text-sm">
                      Tingkatkan pengelolaan komentar positif untuk
                      mempertahankan keunggulan sentimen dan memperhatikan area
                      yang menjadi kelemahan kompetitor.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="priority">
            <div className="space-y-4">
              <h3 className="text-lg font-medium">
                Komentar Negatif Prioritas
              </h3>
              <div className="space-y-4">
                {mockPriorityComments.map((comment, index) => (
                  <Card key={index}>
                    <CardContent className="pt-6">
                      <div className="flex justify-between items-start mb-2">
                        <Badge
                          variant={
                            comment.priority === "high"
                              ? "destructive"
                              : "secondary"
                          }
                        >
                          {comment.priority === "high"
                            ? "Prioritas Tinggi"
                            : "Prioritas Menengah"}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {comment.timestamp}
                        </span>
                      </div>
                      <p className="text-sm">{comment.text}</p>
                      <div className="mt-4 flex justify-end gap-2">
                        <Button variant="outline" size="sm">
                          Tandai Selesai
                        </Button>
                        <Button size="sm">Balas</Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <div className="text-center mt-4">
                <Button variant="outline">Lihat Semua Komentar Negatif</Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="text-xs text-muted-foreground mt-4 border-t pt-2">
          Data sentimen dianalisis menggunakan NLP Bahasa Indonesia dengan
          IndoNLU. Data yang ditampilkan adalah data simulasi.
        </div>
      </CardContent>
    </Card>
  );
};

export default SentimentAnalysis;
