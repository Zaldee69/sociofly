import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, TrendingUp, Users, X, AlertCircle } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { format } from "date-fns";
import { id } from "date-fns/locale";

interface PostTimeOptimizerProps {
  socialAccountId: string;
  teamId: string;
}

interface DailyRecommendation {
  day: string;
  time: string;
  engagement: string;
  score: number;
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

const PostTimeOptimizer: React.FC<PostTimeOptimizerProps> = ({
  socialAccountId,
  teamId,
}) => {
  const [showHeatmap, setShowHeatmap] = React.useState(false);
  const [selectedDay, setSelectedDay] = React.useState<string | null>(null);

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
          time: "00:00 - 01:00",
          engagement: "rendah",
          score: 0,
        };
      }

      // Sort by score to find peak hours
      const sortedHours = dayHotspots.sort((a, b) => b.score - a.score);

      // Find best time period
      const peakPeriod = findPeakPeriod(sortedHours);

      // Calculate average engagement
      const totalScore = dayHotspots.reduce(
        (sum, h) => sum + (h.score || 0),
        0
      );
      const avgEngagement =
        dayHotspots.length > 0 ? totalScore / dayHotspots.length : 0;

      return {
        day,
        time: `${formatHour(peakPeriod.start)} - ${formatHour(peakPeriod.end)}`,
        engagement: getEngagementLevel(avgEngagement),
        score: Math.round(avgEngagement),
      };
    });
  }, [hotspots]);

  // Generate heatmap data
  const heatmapData = React.useMemo(() => {
    if (!hotspots) return [];

    return dayNames.map((day, dayIndex) => {
      const dayHotspots = hotspots.filter((h) => h.dayOfWeek === dayIndex);
      const hours = Array.from({ length: 24 }, (_, hour) => {
        const hotspot = dayHotspots.find((h) => h.hourOfDay === hour);
        return {
          hour,
          score: hotspot?.score || 0,
        };
      });

      return {
        day,
        hours,
      };
    });
  }, [hotspots]);

  const renderHeatmapCell = (score: number) => {
    const intensity = Math.min(Math.max(score / 100, 0), 1);
    const color = `rgba(34, 197, 94, ${intensity})`;
    const textColor = intensity > 0.5 ? "text-white" : "text-foreground";

    return (
      <div
        className={`h-12 flex items-center justify-center ${textColor}`}
        style={{ backgroundColor: color, minWidth: "64px" }}
      >
        <span className="text-sm tabular-nums">
          {score > 0 ? `${Math.round(score)}%` : "-"}
        </span>
      </div>
    );
  };

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

  // Check if we have any valid data
  const hasValidData = React.useMemo(() => {
    return dailyRecommendations.some((rec) => rec.score > 0);
  }, [dailyRecommendations]);

  const renderTimeSlot = (rec: DailyRecommendation) => {
    const isActive = rec.score > 0;
    const hasCustomTime = rec.time !== "00:00 - 01:00";

    return (
      <div
        key={rec.day}
        className={`
          group relative flex items-center justify-between p-4 rounded-xl transition-all duration-200
          ${
            isActive
              ? "border bg-card hover:border-primary/20 hover:bg-primary/5"
              : "border border-dashed bg-muted/30"
          }
        `}
      >
        {/* Day Column */}
        <div className="flex items-center gap-3">
          <div className="flex flex-col">
            <span className="font-medium">{rec.day}</span>
            <span className="text-xs text-muted-foreground">
              {isActive ? "Waktu optimal" : "Belum ada data"}
            </span>
          </div>
        </div>

        {/* Time Column */}
        <div className="flex-1 flex justify-center">
          <div
            className={`
            flex items-center gap-2 px-4 py-1.5 rounded-full
            ${hasCustomTime ? "bg-primary/5" : "bg-muted"}
          `}
          >
            <Clock
              className={`w-4 h-4 ${hasCustomTime ? "text-primary" : "text-muted-foreground"}`}
            />
            <span
              className={
                hasCustomTime
                  ? "text-primary font-medium"
                  : "text-muted-foreground"
              }
            >
              {rec.time}
            </span>
          </div>
        </div>

        {/* Metrics Column */}
        <div className="flex items-center gap-4">
          <Badge
            variant={isActive ? "default" : "outline"}
            className={`
              capitalize font-normal
              ${getEngagementBadgeClass(rec.engagement)}
            `}
          >
            {rec.engagement}
          </Badge>
          <div
            className={`
            flex items-center gap-2 min-w-[80px] justify-end
            ${isActive ? "text-foreground" : "text-muted-foreground"}
          `}
          >
            <Users className="w-4 h-4" />
            <span>{isActive ? `${rec.score}%` : "-"}</span>
          </div>
        </div>

        {/* Hover Info */}
        {isActive && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button variant="ghost" size="sm" className="h-8">
              Detail
            </Button>
          </div>
        )}
      </div>
    );
  };

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
                      +30% Engagement Rate
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
              Persentase audience aktif per hari
            </span>
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

      {/* Heatmap Modal */}
      <Dialog open={showHeatmap} onOpenChange={setShowHeatmap}>
        <DialogContent className="min-w-[90vw] w-full max-h-[85vh] p-6 overflow-hidden flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>Detail Heatmap Engagement Audience</DialogTitle>
          </DialogHeader>

          <div className="mt-4 flex-1 min-h-0">
            <div className="relative rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <div className="inline-block min-w-full">
                  <table className="min-w-full divide-y divide-gray-300">
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
                      {heatmapData.map((dayData) => (
                        <tr key={dayData.day}>
                          <td className="sticky left-0 z-10 bg-white whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 w-32 border-r">
                            {dayData.day}
                          </td>
                          <td className="p-0">
                            <div className="flex">
                              {dayData.hours.map((hour, i) => (
                                <div key={i} className="w-16">
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
                  <span>Rendah</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 bg-green-300 rounded"></div>
                  <span>Sedang</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 bg-green-500 rounded"></div>
                  <span>Tinggi</span>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
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

// Helper function to determine engagement level
function getEngagementLevel(score: number): string {
  if (score >= 75) return "sangat tinggi";
  if (score >= 60) return "tinggi";
  if (score >= 40) return "sedang";
  return "rendah";
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
    default:
      return "bg-red-50 text-red-800 border-red-100";
  }
}

export default PostTimeOptimizer;
