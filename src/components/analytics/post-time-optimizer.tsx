import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Clock,
  Users,
  TrendingUp,
  Calendar,
  BarChart3,
  Info,
  X,
  AlertCircle,
} from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { format } from "date-fns";
import { id } from "date-fns/locale";

interface PostTimeOptimizerProps {
  socialAccountId: string;
  teamId: string;
}

interface DailyRecommendation {
  day: string;
  time: string | null;
  engagement: string;
  score: number;
}

interface HeatmapHour {
  hour: number;
  score: number;
  formattedHour: string;
}

interface HeatmapDay {
  day: string;
  hours: HeatmapHour[];
}

const dayNames = [
  "Minggu",
  "Senin",
  "Selasa",
  "Rabu",
  "Kamis",
  "Jumat",
  "Sabtu",
];

const formatHour = (hour: number) => {
  return `${hour.toString().padStart(2, "0")}:00`;
};

// Initialize 2D array for heatmap (7 days × 24 hours)
const createEmptyHeatmap = () =>
  Array(7)
    .fill(null)
    .map(() =>
      Array(24)
        .fill(0)
        .map(() => ({
          score: 0,
          count: 0,
        }))
    );

const PostTimeOptimizer: React.FC<PostTimeOptimizerProps> = ({
  socialAccountId,
  teamId,
}) => {
  const [showHeatmap, setShowHeatmap] = React.useState(false);

  // Fetch hotspot data using tRPC
  const { data: hotspots, isLoading } = trpc.hotspots.getHotspots.useQuery({
    teamId,
    socialAccountId,
  });

  // Fetch last analysis time
  const { data: lastAnalysis } = trpc.hotspots.getLastAnalysis.useQuery({
    socialAccountId,
  });

  // Process hotspots into daily recommendations
  const dailyRecommendations = React.useMemo(() => {
    if (!hotspots) return [] as DailyRecommendation[];

    return dayNames.map((day, dayIndex) => {
      // Get all hotspots for this day
      const dayHotspots = hotspots.filter((h) => h.dayOfWeek === dayIndex);

      // If no data for this day, return default values
      if (dayHotspots.length === 0) {
        return {
          day,
          time: null,
          engagement: "no_data",
          score: 0,
        };
      }

      // Sort by score to find peak hours
      const sortedHours = dayHotspots.sort((a, b) => b.score - a.score);

      // Find best time period
      const peakPeriod = findPeakPeriod(sortedHours);

      // Use the PEAK hour score instead of average for better representation
      const peakScore = sortedHours[0]?.score || 0;

      return {
        day,
        time: `${formatHour(peakPeriod.start)} - ${formatHour(peakPeriod.end)}`,
        engagement: getEngagementLevel(peakScore),
        score: Math.round(peakScore * 10) / 10, // Round to 1 decimal place like heatmap
      };
    });
  }, [hotspots]);

  // Render a single cell in the heatmap
  const renderHeatmapCell = (score: number) => {
    // Calculate color intensity based on engagement rate thresholds
    const maxER = 5; // 5% is considered very high engagement
    const intensity = Math.min(Math.max(score / maxER, 0), 1);

    // Use a green gradient with better visibility
    const color = `rgba(34, 197, 94, ${intensity * 0.9 + 0.1})`; // Minimum opacity of 0.1
    const textColor = intensity > 0.5 ? "text-white" : "text-gray-700";

    return (
      <div
        className={`h-12 flex items-center justify-center ${textColor} transition-colors duration-200`}
        style={{ backgroundColor: color, minWidth: "64px" }}
      >
        <span className="text-sm font-medium tabular-nums">
          {score > 0 ? `${score}%` : "-"}
        </span>
      </div>
    );
  };

  // Generate optimized heatmap data
  const heatmapData = React.useMemo(() => {
    if (!hotspots) return [];

    // Initialize 2D array for heatmap
    const heatmap = createEmptyHeatmap();

    // Populate heatmap with scores
    hotspots.forEach((spot) => {
      heatmap[spot.dayOfWeek][spot.hourOfDay].score = spot.score;
      heatmap[spot.dayOfWeek][spot.hourOfDay].count++;
    });

    // Convert to format needed for visualization
    return dayNames.map((day, dayIndex) => ({
      day,
      hours: Array.from({ length: 24 }, (_, hour) => ({
        hour,
        score: Math.round(heatmap[dayIndex][hour].score * 10) / 10, // Round to 1 decimal
        formattedHour: formatHour(hour),
      })),
    }));
  }, [hotspots]);

  // Find the best day (only consider days with actual data)
  const bestTimeSlot = React.useMemo(() => {
    if (!dailyRecommendations.length) return null;
    const validRecommendations = dailyRecommendations.filter(
      (rec) => rec.score > 0
    );
    if (!validRecommendations.length) return null;

    return validRecommendations.reduce<DailyRecommendation>(
      (best, current) => (current.score > best.score ? current : best),
      validRecommendations[0]
    );
  }, [dailyRecommendations]);

  // Calculate average engagement and difference
  const averageEngagement = React.useMemo(
    () => calculateAverageEngagement(hotspots),
    [hotspots]
  );

  const engagementDifference = React.useMemo(() => {
    if (!bestTimeSlot || bestTimeSlot.score === 0) return 0;
    // Only calculate difference if we have meaningful data
    if (bestTimeSlot.score < 1 || averageEngagement < 1) return 0;
    return calculateEngagementDifference(bestTimeSlot.score, averageEngagement);
  }, [bestTimeSlot, averageEngagement]);

  const renderTimeSlot = (rec: DailyRecommendation) => {
    const isActive = rec.score > 0;
    const isNoData = rec.engagement === "no_data";

    return (
      <div
        key={rec.day}
        className={`
          group relative flex items-center p-4 rounded-xl transition-all duration-200
          ${
            isNoData
              ? "border border-dashed bg-muted/10"
              : isActive
                ? "border bg-card hover:border-primary/20 hover:bg-primary/5"
                : "border border-dashed bg-muted/30"
          }
        `}
      >
        {/* Day Column */}
        <div className="flex items-center w-[180px]">
          <div className="flex flex-col">
            <span className="font-medium">{rec.day}</span>
            <span className="text-xs text-muted-foreground">
              {isNoData ? "Belum ada data" : "Waktu optimal"}
            </span>
          </div>
        </div>

        {/* Time Column */}
        <div className="flex-1 flex justify-center min-w-[200px]">
          {isNoData ? (
            <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-muted/50">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">Menunggu analisis</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/5">
              <Clock className="w-4 h-4 text-primary" />
              <span className="text-primary font-medium">{rec.time}</span>
            </div>
          )}
        </div>

        {/* Metrics Column */}
        <div className="flex items-center gap-4 w-[280px] justify-end">
          {isNoData ? (
            <Badge
              variant="outline"
              className="font-normal text-muted-foreground min-w-[100px] justify-center"
            >
              Belum tersedia
            </Badge>
          ) : (
            <Badge
              variant={isActive ? "default" : "outline"}
              className={`
                capitalize font-normal min-w-[100px] justify-center
                ${getEngagementBadgeClass(rec.engagement)}
              `}
            >
              {rec.engagement}
            </Badge>
          )}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1 min-w-[100px] justify-end text-muted-foreground cursor-help">
                  <Users className="w-4 h-4" />
                  <span className="tabular-nums">
                    {isNoData ? "-" : `${rec.score}%`}
                  </span>
                  <Info className="w-3 h-3 opacity-50 ml-1" />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-sm">
                  {isNoData
                    ? "Belum ada data untuk hari ini"
                    : `Peak engagement rate untuk ${rec.time} pada hari ${rec.day}`}
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Hover Info */}
        {isActive && !isNoData && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button variant="ghost" size="sm" className="h-8">
              Detail
            </Button>
          </div>
        )}
      </div>
    );
  };

  // Heatmap Modal Content
  const renderHeatmapModal = () => (
    <Dialog open={showHeatmap} onOpenChange={setShowHeatmap}>
      <DialogContent className="min-w-[90vw] w-full max-h-[85vh] p-6 overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Detail Heatmap Engagement Audience</DialogTitle>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Persentase audience yang aktif berdasarkan hari dan jam spesifik
            </p>
            <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-blue-800">
                <p className="font-medium mb-1">Perbedaan Data:</p>
                <p className="mb-1">
                  • <strong>Daftar hari:</strong> Menampilkan peak engagement
                  rate (jam terbaik) untuk setiap hari
                </p>
                <p>
                  • <strong>Heatmap:</strong> Menampilkan engagement rate
                  spesifik untuk setiap jam pada setiap hari
                </p>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="mt-4 flex-1 min-h-0">
          <div className="relative rounded-lg border shadow overflow-hidden">
            <div className="overflow-x-auto">
              <div className="inline-block min-w-full">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th
                        scope="col"
                        className="sticky left-0 z-20 bg-gray-50 py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 w-32 border-r"
                      >
                        Hari
                      </th>
                      <th
                        scope="col"
                        className="w-[calc(100%-8rem)] bg-gray-50"
                      >
                        <div className="flex">
                          {Array.from({ length: 24 }, (_, i) => (
                            <div
                              key={i}
                              className="w-16 p-0 text-center text-sm font-semibold text-gray-900"
                            >
                              <div className="px-2 py-3.5 tabular-nums">
                                {formatHour(i)}
                              </div>
                            </div>
                          ))}
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {heatmapData.map((dayData: HeatmapDay) => (
                      <tr key={dayData.day}>
                        <td className="sticky left-0 z-10 bg-white whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 w-32 border-r">
                          {dayData.day}
                        </td>
                        <td className="p-0">
                          <div className="flex">
                            {dayData.hours.map((hour: HeatmapHour) => (
                              <div key={hour.hour} className="w-16">
                                {renderHeatmapCell(hour.score)}
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t flex-shrink-0">
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <span className="font-medium">Engagement Level:</span>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 bg-green-100 rounded"></div>
                <span>{"< 2.5%"}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 bg-green-300 rounded"></div>
                <span>{"2.5-3.5%"}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 bg-green-500 rounded"></div>
                <span>{"> 3.5%"}</span>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center h-20">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (!hotspots?.length) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold">
            Waktu Optimal untuk Posting
          </h2>
          <p className="text-muted-foreground">
            Waktu terbaik untuk posting di instagram berdasarkan engagement
            audience
          </p>
        </div>

        <Card className="bg-yellow-50/50 border-yellow-100">
          <CardContent className="p-8">
            <div className="text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center mx-auto">
                <AlertCircle className="w-6 h-6 text-yellow-600" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-yellow-800">
                  Menunggu Analisis Data
                </h3>
                <p className="text-sm text-yellow-600 mt-1 max-w-md mx-auto">
                  Data engagement Anda sedang dianalisis. Proses ini dilakukan
                  secara otomatis setiap hari.
                </p>
              </div>
              {lastAnalysis?.lastAnalyzed && (
                <div className="text-sm text-yellow-700 flex items-center justify-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span>
                    Analisis terakhir:{" "}
                    {format(
                      new Date(lastAnalysis.lastAnalyzed),
                      "d MMMM yyyy, HH:mm",
                      { locale: id }
                    )}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Alert variant="default" className="bg-blue-50 border-blue-100">
          <AlertCircle className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-700 ml-2">
            Analisis berikutnya akan dilakukan secara otomatis dalam 24 jam ke
            depan.
          </AlertDescription>
        </Alert>

        <div className="space-y-3">
          {dailyRecommendations.map(renderTimeSlot)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Waktu Optimal untuk Posting</h2>
        <p className="text-muted-foreground">
          Waktu terbaik untuk posting di instagram berdasarkan engagement
          audience
        </p>
        {lastAnalysis?.lastAnalyzed && (
          <div className="mt-2 text-sm text-muted-foreground flex items-center gap-2">
            <Clock className="w-4 h-4" />
            <span>
              Diperbarui:{" "}
              {format(
                new Date(lastAnalysis.lastAnalyzed),
                "d MMMM yyyy, HH:mm",
                { locale: id }
              )}
            </span>
          </div>
        )}
      </div>

      {/* Best Time Card */}
      {bestTimeSlot && (
        <Card className="bg-gradient-to-br from-green-50 to-emerald-50/50 border-green-100">
          <CardContent className="p-6">
            <div className="flex flex-col gap-6">
              {/* Header Section */}
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg text-gray-900">
                      Waktu Optimal Tertinggi
                    </h3>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      Berdasarkan data 30 hari terakhir
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 bg-green-100/50 px-3 py-1.5 rounded-full">
                  <Users className="w-4 h-4 text-green-700" />
                  <span className="text-sm font-medium text-green-700">
                    {bestTimeSlot.score}% Audience Aktif
                  </span>
                </div>
              </div>

              {/* Time Display */}
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="text-3xl font-bold tracking-tight text-gray-900">
                    {bestTimeSlot.time}
                  </div>
                  <div className="text-lg font-medium text-gray-600">
                    {bestTimeSlot.day}
                  </div>
                </div>
                <div className="flex flex-col items-end">
                  <div className="flex items-center gap-2 text-green-700">
                    <TrendingUp className="w-4 h-4" />
                    <span className="text-sm font-medium">
                      {engagementDifference > 0
                        ? `+${engagementDifference}%`
                        : `${engagementDifference}%`}{" "}
                      Engagement Rate
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    dibanding rata-rata waktu lain
                  </p>
                </div>
              </div>

              {/* Action Section */}
              <div className="flex items-center gap-4">
                <Button
                  className="bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-sm flex-1 max-w-[240px]"
                  size="lg"
                >
                  Jadwalkan Post
                </Button>

                {/* Tips */}
                <div className="flex items-start gap-2 flex-1">
                  <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-green-700 text-sm">💡</span>
                  </div>
                  <p className="text-sm text-green-800">
                    Posting di waktu ini memiliki potensi engagement tertinggi
                    berdasarkan aktivitas followers Anda.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Daily Schedule */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              Peak engagement rate per hari (jam terbaik)
            </span>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="w-3 h-3 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-sm max-w-xs">
                    Menampilkan engagement rate tertinggi untuk setiap hari.
                    Klik "Lihat Detail Heatmap" untuk melihat breakdown per jam.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="text-xs"
            onClick={() => setShowHeatmap(true)}
          >
            <Clock className="w-3 h-3 mr-1" />
            Lihat Detail Heatmap
          </Button>
        </div>

        <div className="space-y-3">
          {dailyRecommendations.map(renderTimeSlot)}
        </div>
      </div>

      {/* Render heatmap modal */}
      {renderHeatmapModal()}
    </div>
  );
};

// Helper function to find the optimal posting period
function findPeakPeriod(
  sortedHours: Array<{ hourOfDay: number; score: number }>
) {
  if (sortedHours.length === 0) {
    return { start: 0, end: 0 };
  }

  let bestStart = sortedHours[0].hourOfDay;
  let bestEnd = sortedHours[0].hourOfDay + 1;
  let bestScore = sortedHours[0].score;

  for (let i = 1; i < sortedHours.length; i++) {
    if (sortedHours[i].score > bestScore * 0.8) {
      if (sortedHours[i].hourOfDay === bestEnd) {
        bestEnd = sortedHours[i].hourOfDay + 1;
      }
    }
  }

  return { start: bestStart, end: bestEnd };
}

// Helper function to determine engagement level based on industry standards
function getEngagementLevel(score: number): string {
  if (score === 0) return "no_data";
  // Instagram average engagement rates:
  // Micro (< 10k): 3.86%
  // Small (10k-50k): 3.48%
  // Medium (50k-100k): 2.71%
  // Large (100k-1m): 2.37%
  // Mega (1m+): 1.97%
  if (score >= 5) return "sangat tinggi"; // Well above average
  if (score >= 3.5) return "tinggi"; // Above average
  if (score >= 2.5) return "sedang"; // Average
  return "rendah"; // Below average
}

// Helper function to get badge class based on engagement level
function getEngagementBadgeClass(engagement: string): string {
  switch (engagement) {
    case "sangat tinggi":
      return "bg-green-100 text-green-800 border-green-200";
    case "tinggi":
      return "bg-emerald-100 text-emerald-800 border-emerald-200";
    case "sedang":
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case "no_data":
      return "bg-gray-50 text-gray-600 border-gray-200";
    default:
      return "bg-red-50 text-red-800 border-red-100";
  }
}

// Helper function to calculate average engagement rate
function calculateAverageEngagement(
  hotspots: Array<{ score: number }> | undefined
): number {
  if (!hotspots || hotspots.length === 0) return 0;

  // Filter out zero scores to get a more accurate average
  const validHotspots = hotspots.filter((h) => h.score > 0);
  if (validHotspots.length === 0) return 0;

  // Calculate average engagement rate
  const totalER = validHotspots.reduce((sum, h) => sum + h.score, 0);
  return totalER / validHotspots.length;
}

// Helper function to calculate engagement rate difference
function calculateEngagementDifference(
  bestScore: number,
  avgScore: number
): number {
  if (avgScore === 0 || bestScore === 0) return 0;

  // Calculate percentage improvement in engagement rate
  // Example: if best ER is 7.4% and avg ER is 3.7%
  // improvement = (7.4 / 3.7 - 1) * 100 = 100% improvement
  const improvement = (bestScore / avgScore - 1) * 100;

  // Keep the improvement percentage within realistic bounds
  // Most social media posts see 20-80% improvement in optimal times
  // We'll cap at 100% to be conservative and realistic
  return Math.min(Math.max(Math.round(improvement), 0), 100);
}

export default PostTimeOptimizer;
