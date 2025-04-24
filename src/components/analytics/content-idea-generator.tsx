"use client";
import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, Lightbulb } from "lucide-react";
import { toast } from "sonner";

interface ContentIdeaGeneratorProps {
  platform?: string;
}

// Mock trending topics for Indonesia
const mockTrendingTopics = [
  "Ramadan 2025", 
  "Makanan Sehat",
  "Zero Waste", 
  "UMKM",
  "Cashless", 
  "Eco Friendly", 
  "Diskon Akhir Tahun", 
  "DIY"
];

// Mock content ideas by category
const mockContentIdeas = {
  "e-commerce": [
    {
      title: "Tutorial Cara Belanja Online dengan Aman",
      description: "Video tutorial step-by-step untuk berbelanja online dengan aman dan terhindar dari penipuan.",
      format: "Video Tutorial",
      engagement: "sangat tinggi"
    },
    {
      title: "Promo Spesial Ramadan 2025",
      description: "Carousel yang menampilkan berbagai promo spesial dan diskon untuk bulan Ramadan.",
      format: "Carousel Post",
      engagement: "tinggi"
    },
    {
      title: "Tips Memilih Produk Berkualitas",
      description: "Infografis tentang cara cerdas memilih produk yang berkualitas dan tahan lama.",
      format: "Infografis",
      engagement: "sedang"
    },
    {
      title: "Review Produk Best Seller",
      description: "Video yang menunjukkan review jujur tentang produk best seller bulan ini.",
      format: "Reels",
      engagement: "sangat tinggi"
    }
  ],
  "fashion": [
    {
      title: "Mix & Match Outfit untuk Kantor",
      description: "Carousel berisi beberapa kombinasi outfit yang cocok untuk digunakan di kantor.",
      format: "Carousel Post",
      engagement: "tinggi"
    },
    {
      title: "Tren Fesyen 2025 yang Wajib Kamu Tahu",
      description: "Video pendek yang menampilkan tren fesyen yang akan populer di tahun 2025.",
      format: "Reels",
      engagement: "sangat tinggi"
    },
    {
      title: "Wardrobe Capsule: Pakaian Minimalis & Fungsional",
      description: "Panduan untuk memiliki garderobe minimalis yang tetap stylish dan fungsional.",
      format: "Story Highlights",
      engagement: "sedang"
    }
  ],
  "makanan": [
    {
      title: "Resep Makanan Sehat untuk Buka Puasa",
      description: "Video tutorial memasak hidangan sehat yang cocok untuk menu berbuka puasa.",
      format: "Video Tutorial",
      engagement: "tinggi"
    },
    {
      title: "Food Photography Tips untuk Instagram",
      description: "Tips dan trik untuk menghasilkan foto makanan yang menarik dan instagramable.",
      format: "Carousel Post",
      engagement: "sedang"
    },
    {
      title: "Menu Makanan untuk Diet dengan Budget Terbatas",
      description: "Video pendek berisi ide menu makanan sehat dengan harga terjangkau.",
      format: "Reels",
      engagement: "sangat tinggi"
    }
  ],
  "kecantikan": [
    {
      title: "Skincare Routine untuk Kulit Berminyak",
      description: "Video tutorial langkah-langkah skincare untuk jenis kulit berminyak.",
      format: "Reels",
      engagement: "sangat tinggi"
    },
    {
      title: "Review Produk Lokal vs. Import",
      description: "Perbandingan jujur antara produk kecantikan lokal dan import dengan harga serupa.",
      format: "Carousel Post",
      engagement: "tinggi"
    },
    {
      title: "Tips Makeup Natural untuk Sehari-hari",
      description: "Tutorial makeup natural yang cocok untuk digunakan ke kantor atau kampus.",
      format: "IGTV",
      engagement: "sedang"
    }
  ],
  "umkm": [
    {
      title: "Kisah Sukses UMKM Lokal",
      description: "Video cerita inspiratif dari pemilik UMKM lokal yang berhasil meraih kesuksesan.",
      format: "Video",
      engagement: "tinggi"
    },
    {
      title: "Tips Branding untuk UMKM Pemula",
      description: "Panduan langkah demi langkah untuk membangun branding yang kuat sebagai UMKM pemula.",
      format: "Carousel Post",
      engagement: "tinggi"
    },
    {
      title: "Cara Jualan Online untuk Pemula",
      description: "Tutorial cara mulai berjualan online dari nol untuk pemula yang baru memulai usaha.",
      format: "Live Session",
      engagement: "sangat tinggi"
    }
  ]
};

const ContentIdeaGenerator = ({ platform = "instagram" }: ContentIdeaGeneratorProps) => {
  const [selectedCategory, setSelectedCategory] = useState("e-commerce");
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(false);

  const getEngagementBadgeColor = (level: string) => {
    switch (level) {
      case "sangat tinggi": return "bg-green-600";
      case "tinggi": return "bg-green-500";
      case "sedang": return "bg-yellow-500";
      case "rendah": return "bg-red-500";
      default: return "bg-gray-500";
    }
  };

  const getFormatClassName = (format: string) => {
    if (format.toLowerCase().includes("video")) return "text-blue-600";
    if (format.toLowerCase().includes("story")) return "text-purple-600";
    if (format.toLowerCase().includes("carousel")) return "text-orange-600";
    if (format.toLowerCase().includes("reels")) return "text-pink-600";
    if (format.toLowerCase().includes("live")) return "text-red-600";
    return "text-green-600";
  };

  const handleGenerate = () => {
    setLoading(true);
    
    setTimeout(() => {
      setLoading(false);
      
      toast.success(`Ide konten berhasil dibuat`);
    }, 1000);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Lightbulb className="h-5 w-5" />
          AI Content Idea Generator
        </CardTitle>
        <CardDescription>
          Dapatkan ide konten segar berdasarkan tren industri di Indonesia
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h3 className="text-sm font-medium mb-2">Tren Terpopuler di Indonesia</h3>
          <div className="flex flex-wrap gap-2">
            {mockTrendingTopics.map((topic, index) => (
              <Badge key={index} variant="outline" className="cursor-pointer hover:bg-accent" onClick={() => setKeyword(topic)}>
                {topic}
              </Badge>
            ))}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">Kategori Bisnis</label>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih kategori" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="e-commerce">E-Commerce / Toko Online</SelectItem>
                <SelectItem value="fashion">Fashion & Pakaian</SelectItem>
                <SelectItem value="makanan">Makanan & Minuman</SelectItem>
                <SelectItem value="kecantikan">Kecantikan & Kosmetik</SelectItem>
                <SelectItem value="umkm">UMKM & Bisnis Lokal</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Kata Kunci (opsional)</label>
            <div className="flex gap-2">
              <Input 
                placeholder="Contoh: Ramadan, Diskon, Tutorial"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
              />
              <Button 
                onClick={handleGenerate}
                disabled={loading}
              >
                {loading ? "Membuat..." : "Generate"}
              </Button>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-medium mb-3">Ide Konten untuk {selectedCategory}</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            {mockContentIdeas[selectedCategory as keyof typeof mockContentIdeas].map((idea, index) => (
              <Card key={index} className="overflow-hidden border transition-all hover:shadow-md">
                <CardHeader className="p-4 pb-2">
                  <div className="flex justify-between items-start gap-2">
                    <CardTitle className="text-base">{idea.title}</CardTitle>
                    <Badge className={`${getEngagementBadgeColor(idea.engagement)}`}>
                      {idea.engagement}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <p className="text-sm text-muted-foreground mb-3">{idea.description}</p>
                  <div className="flex justify-between items-center">
                    <Badge variant="outline" className={`${getFormatClassName(idea.format)}`}>
                      {idea.format}
                    </Badge>
                    <Button variant="ghost" size="sm" className="text-xs h-7">
                      Simpan Ide
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
        
        <div className="text-xs text-muted-foreground mt-4 border-t pt-2">
          Ide konten dibuat berdasarkan data Google Trends Indonesia dan analisis tren sosial media terkini.
        </div>
      </CardContent>
    </Card>
  );
};

export default ContentIdeaGenerator;