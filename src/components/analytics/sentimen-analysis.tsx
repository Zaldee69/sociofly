import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Search, MessageSquare } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

type Competitor = "@competitor1" | "@competitor2" | "@yourbrand";

interface Comment {
  text: string;
  sentiment: string;
}

interface SentimentPercentages {
  positive: number;
  neutral: number;
  negative: number;
  mixed: number;
}

interface KeywordData {
  keyword: string;
  count: number;
  sentiment: string;
}

// Mock data for competitor comments sentiment analysis
const mockCompetitorComments: Record<Competitor, Comment[]> = {
  "@competitor1": [
    { text: "Produknya bagus banget, pelayanan juga ramah!", sentiment: "positive" },
    { text: "Pengiriman cepat, recommended banget!", sentiment: "positive" },
    { text: "Kualitas sesuai dengan harga", sentiment: "neutral" },
    { text: "Barang datang cepat tapi packingnya kurang rapih", sentiment: "mixed" },
    { text: "Sudah beli 3x disini selalu puas", sentiment: "positive" }
  ],
  "@competitor2": [
    { text: "Harga mahal tapi kualitas biasa aja", sentiment: "negative" },
    { text: "Responnya lama banget, CS kurang profesional", sentiment: "negative" },
    { text: "Barangnya sesuai deskripsi", sentiment: "neutral" },
    { text: "Pengiriman lambat, tapi barangnya bagus", sentiment: "mixed" },
    { text: "Barang cepat rusak, tidak awet", sentiment: "negative" }
  ],
  "@yourbrand": [
    { text: "Produknya sangat bagus dan harga terjangkau!", sentiment: "positive" },
    { text: "Admin ramah dan pengiriman cepat", sentiment: "positive" },
    { text: "Sesuai dengan yang di gambar", sentiment: "neutral" },
    { text: "Packingnya kurang rapi, tapi barangnya bagus", sentiment: "mixed" },
    { text: "Selalu puas belanja disini", sentiment: "positive" }
  ]
};

const mockSentimentPercentages: Record<Competitor, SentimentPercentages> = {
  "@competitor1": { positive: 60, neutral: 20, negative: 10, mixed: 10 },
  "@competitor2": { positive: 20, neutral: 30, negative: 40, mixed: 10 },
  "@yourbrand": { positive: 70, neutral: 15, negative: 5, mixed: 10 }
};

const mockKeywordAnalysis: Record<Competitor, KeywordData[]> = {
  "@competitor1": [
    { keyword: "bagus", count: 35, sentiment: "positive" },
    { keyword: "pengiriman cepat", count: 28, sentiment: "positive" },
    { keyword: "harga", count: 22, sentiment: "neutral" },
    { keyword: "rusak", count: 8, sentiment: "negative" },
    { keyword: "mahal", count: 7, sentiment: "negative" }
  ],
  "@competitor2": [
    { keyword: "mahal", count: 42, sentiment: "negative" },
    { keyword: "lambat", count: 38, sentiment: "negative" },
    { keyword: "kualitas", count: 25, sentiment: "neutral" },
    { keyword: "sesuai", count: 20, sentiment: "positive" },
    { keyword: "rusak", count: 18, sentiment: "negative" }
  ],
  "@yourbrand": [
    { keyword: "bagus", count: 45, sentiment: "positive" },
    { keyword: "ramah", count: 32, sentiment: "positive" },
    { keyword: "cepat", count: 28, sentiment: "positive" },
    { keyword: "harga terjangkau", count: 24, sentiment: "positive" },
    { keyword: "sesuai", count: 18, sentiment: "neutral" }
  ]
};

interface SentimentAnalysisProps {
  platform?: string;
}

const SentimentAnalysis = ({ platform = "instagram" }: SentimentAnalysisProps) => {
  const [selectedCompetitor, setSelectedCompetitor] = useState<Competitor>("@yourbrand");
  const [competitors] = useState(Object.keys(mockCompetitorComments));
  const [searchTerm, setSearchTerm] = useState("");

  const filteredComments = searchTerm.trim() === ""
    ? mockCompetitorComments[selectedCompetitor]
    : mockCompetitorComments[selectedCompetitor].filter(
        comment => comment.text.toLowerCase().includes(searchTerm.toLowerCase())
      );

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case "positive": return "bg-green-500";
      case "negative": return "bg-red-500";
      case "neutral": return "bg-gray-500";
      case "mixed": return "bg-yellow-500";
      default: return "bg-gray-500";
    }
  };

  const handleAnalyzeCompetitor = (username: string) => {
    if (!username.startsWith('@')) {
      username = '@' + username;
    }
    
    if (competitors.includes(username)) {
      setSelectedCompetitor(username as Competitor);
      toast.success(`Menampilkan hasil analisis untuk ${username}`);
    } else {
      toast.error("Kompetitor tidak ditemukan");
    }
  };

  const getKeywordColor = (sentiment: string) => {
    switch (sentiment) {
      case "positive": return "text-green-600";
      case "negative": return "text-red-600";
      case "neutral": return "text-gray-600";
      default: return "";
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Analisis Sentimen Kompetitor
        </CardTitle>
        <CardDescription>
          Analisis sentimen komentar pada akun kompetitor untuk memahami persepsi pelanggan
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
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
          <TabsList className="mb-4 grid grid-cols-3">
            <TabsTrigger value="overview">Ringkasan</TabsTrigger>
            <TabsTrigger value="comments">Komentar</TabsTrigger>
            <TabsTrigger value="keywords">Kata Kunci</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <h3 className="font-medium text-sm mb-2">Persentase Sentimen untuk {selectedCompetitor}</h3>
                <div className="space-y-4">
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span>Positif</span>
                      <span>{mockSentimentPercentages[selectedCompetitor].positive}%</span>
                    </div>
                    <Progress value={mockSentimentPercentages[selectedCompetitor].positive} className="h-2" />
                  </div>
                  
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span>Netral</span>
                      <span>{mockSentimentPercentages[selectedCompetitor].neutral}%</span>
                    </div>
                    <Progress value={mockSentimentPercentages[selectedCompetitor].neutral} className="h-2" />
                  </div>
                  
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span>Negatif</span>
                      <span>{mockSentimentPercentages[selectedCompetitor].negative}%</span>
                    </div>
                    <Progress value={mockSentimentPercentages[selectedCompetitor].negative} className="h-2" />
                  </div>
                  
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span>Campuran</span>
                      <span>{mockSentimentPercentages[selectedCompetitor].mixed}%</span>
                    </div>
                    <Progress value={mockSentimentPercentages[selectedCompetitor].mixed} className="h-2" />
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="font-medium text-sm mb-2">Kata Kunci Teratas</h3>
                <div className="space-y-2">
                  {mockKeywordAnalysis[selectedCompetitor].slice(0, 5).map((keywordData, index) => (
                    <div key={index} className="flex justify-between items-center border-b pb-1">
                      <span className={`text-sm ${getKeywordColor(keywordData.sentiment)}`}>
                        "{keywordData.keyword}"
                      </span>
                      <span className="text-xs font-medium">{keywordData.count}x</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="comments">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-sm">Komentar Terbaru ({filteredComments.length})</h3>
                <div className="relative">
                  <Input
                    placeholder="Cari komentar..."
                    className="max-w-xs text-xs pl-8"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  <Search className="absolute left-2 top-2.5 h-3 w-3 text-muted-foreground" />
                </div>
              </div>

              <div className="space-y-3 mt-3">
                {filteredComments.length > 0 ? (
                  filteredComments.map((comment, index) => (
                    <div key={index} className="border rounded-md p-3">
                      <div className="flex justify-between">
                        <Badge variant="outline" className={`${getSentimentColor(comment.sentiment)} text-white`}>
                          {comment.sentiment === "positive" ? "Positif" : 
                           comment.sentiment === "negative" ? "Negatif" : 
                           comment.sentiment === "neutral" ? "Netral" : "Campuran"}
                        </Badge>
                        <span className="text-xs text-muted-foreground">2 hari yang lalu</span>
                      </div>
                      <p className="text-sm mt-2">{comment.text}</p>
                    </div>
                  ))
                ) : (
                  <div className="flex items-center justify-center h-32 border rounded-md bg-muted/20">
                    <p className="text-sm text-muted-foreground">Tidak ada komentar yang ditemukan</p>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="keywords">
            <div className="space-y-4">
              <h3 className="font-medium text-sm">Analisis Kata Kunci untuk {selectedCompetitor}</h3>
              <div className="grid gap-4 grid-cols-2 md:grid-cols-3">
                {mockKeywordAnalysis[selectedCompetitor].map((keywordData, index) => (
                  <div key={index} className="border rounded-md p-3 flex flex-col">
                    <div className="flex justify-between items-center mb-1">
                      <span className={`font-medium text-base ${getKeywordColor(keywordData.sentiment)}`}>
                        "{keywordData.keyword}"
                      </span>
                      <Badge variant="outline" className={`${getSentimentColor(keywordData.sentiment)} text-white text-xs`}>
                        {keywordData.sentiment === "positive" ? "Positif" : 
                         keywordData.sentiment === "negative" ? "Negatif" : "Netral"}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-xs text-muted-foreground">Muncul dalam:</span>
                      <span className="font-bold">{keywordData.count} komentar</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>
        
        <div className="text-xs text-muted-foreground mt-4 border-t pt-2">
          Data sentimen dianalisis menggunakan NLP Bahasa Indonesia dengan IndoNLU. Data yang ditampilkan adalah data simulasi.
        </div>
      </CardContent>
    </Card>
  );
};

export default SentimentAnalysis;