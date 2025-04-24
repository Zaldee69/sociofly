import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Wand } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

type CaptionStyle = "formal" | "casual" | "promotional";
type Language = "id" | "en";

interface GeneratedContent {
  caption: string;
  hashtags: string[];
}

const AICaptionGenerator = () => {
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [style, setStyle] = useState<CaptionStyle>("casual");
  const [language, setLanguage] = useState<Language>("id");
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent | null>(null);

  // Mock content for different styles and languages
  const mockContent = {
    id: {
      formal: {
        caption: "Mempersembahkan produk terbaru kami untuk memenuhi kebutuhan Anda. Kualitas terjamin dengan material premium dan hasil yang memuaskan.",
        hashtags: [
          "#ProdukBerkualitas", 
          "#KualitasTerbaik", 
          "#ProdukIndonesia", 
          "#BelanjaCerdas", 
          "#UMKMIndonesia"
        ],
      },
      casual: {
        caption: "Hai Sobat! 😍 Udah coba produk baru kita belum nih? Dijamin bikin kamu happy dan puas banget! Yuk cobain sekarang~ ✨",
        hashtags: [
          "#JajanSkuy", 
          "#RecommendedBanget", 
          "#MustHave", 
          "#TokoOnlineIndonesia", 
          "#UMKMJogja"
        ],
      },
      promotional: {
        caption: "🔥 PROMO SPESIAL! 🔥 Dapatkan diskon 30% untuk pembelian pertama! Stok terbatas, jangan sampai kehabisan. Berlaku sampai akhir bulan ini saja! ⏰",
        hashtags: [
          "#Promo30Persen", 
          "#DiskonSpesial", 
          "#JanganSampaiKehabisan", 
          "#BelanjaPintar", 
          "#PromoTerbatas"
        ],
      },
    },
    en: {
      formal: {
        caption: "Introducing our latest product to meet your needs. Quality is guaranteed with premium materials and satisfactory results.",
        hashtags: [
          "#QualityProducts", 
          "#BestQuality", 
          "#IndonesianProducts", 
          "#SmartShopping", 
          "#IndonesianSME"
        ],
      },
      casual: {
        caption: "Hey there! 😍 Have you tried our new product yet? Guaranteed to make you happy and totally satisfied! Come try it now~ ✨",
        hashtags: [
          "#ShopNow", 
          "#HighlyRecommended", 
          "#MustHave", 
          "#IndonesianOnlineShop", 
          "#JogjaSmallBusiness"
        ],
      },
      promotional: {
        caption: "🔥 SPECIAL PROMO! 🔥 Get 30% off for your first purchase! Limited stock, don't miss out. Valid until the end of this month only! ⏰",
        hashtags: [
          "#30PercentPromo", 
          "#SpecialDiscount", 
          "#DontMissOut", 
          "#SmartShopping", 
          "#LimitedOffer"
        ],
      },
    },
  };

  const generateCaption = async () => {
    if (!prompt.trim()) {
      toast.error(language === "id" ? "Silakan masukkan deskripsi untuk postingan Anda" : "Please enter a description for your post");
      return;
    }

    setIsGenerating(true);
    
    // TODO: Replace with actual OpenAI API integration
    // This is a mock response for demonstration
    setTimeout(() => {
      setGeneratedContent(mockContent[language][style]);
      setIsGenerating(false);
      
      toast.success(language === "id" ? "Berhasil!" : "Success!");
    }, 1500);
  };

  return (
    <div className="w-full flex gap-4 flex-col">
        <div className="flex items-center justify-between gap-4 mb-2">
          <Select
            value={language}
            onValueChange={(value: any) => setLanguage(value)}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select Language" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="id">Bahasa Indonesia</SelectItem>
              <SelectItem value="en">English</SelectItem>
            </SelectContent>
          </Select>
          
          <Tabs value={style} onValueChange={(value: any) => setStyle(value)} className="w-auto">
            <TabsList>
              <TabsTrigger value="casual">
                {language === "id" ? "Kasual" : "Casual"}
              </TabsTrigger>
              <TabsTrigger value="formal">
                {language === "id" ? "Formal" : "Formal"}
              </TabsTrigger>
              <TabsTrigger value="promotional">
                {language === "id" ? "Promosi" : "Promotional"}
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        
        <div>
          <Textarea
            placeholder={language === "id" 
              ? "Deskripsikan konten postingan Anda (contoh: 'Foto produk baju batik terbaru untuk koleksi musim panas')"
              : "Describe your post content (e.g., 'New batik clothing product photo for summer collection')"
            }
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="min-h-[100px]"
          />
        </div>
        
        <Button 
          onClick={generateCaption} 
          disabled={isGenerating}
          className="w-full"
        >
          {isGenerating 
            ? (language === "id" ? "Menghasilkan..." : "Generating...") 
            : (language === "id" ? "Buat Caption & Hashtags" : "Generate Caption & Hashtags")
          }
        </Button>

        {generatedContent && (
          <div className="space-y-4 pt-4 border-t">
            <div>
              <h3 className="font-medium mb-2">
                {language === "id" ? "Caption yang Dihasilkan:" : "Generated Caption:"}
              </h3>
              <p className="text-muted-foreground">{generatedContent.caption}</p>
            </div>
            <div>
              <h3 className="font-medium mb-2">
                {language === "id" ? "Hashtag yang Disarankan:" : "Suggested Hashtags:"}
              </h3>
              <div className="flex flex-wrap gap-2">
                {generatedContent.hashtags.map((tag) => (
                  <Badge key={tag} variant="secondary">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        )}
   </div>
  );
};

export default AICaptionGenerator;