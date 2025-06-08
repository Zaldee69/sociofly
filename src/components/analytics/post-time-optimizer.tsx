import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Users, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { trpc } from "@/lib/trpc/client";

interface PostTimeOptimizerProps {
  socialAccountId: string;
  teamId: string;
}

interface HotspotData {
  dayOfWeek: number;
  hourOfDay: number;
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
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  // Fetch hotspot data using tRPC
  const { data: hotspots, isLoading } = trpc.hotspots.getHotspots.useQuery(
    {
      teamId,
      socialAccountId,
    }
    // {
    //   enabled: !!teamId && !!socialAccountId,
    // }
  );

  // Process hotspots into daily recommendations
  const dailyRecommendations = React.useMemo(() => {
    if (!hotspots) return [];

    const recommendations = dayNames.map((day, dayIndex) => {
      // Get all hotspots for this day
      const dayHotspots = hotspots.filter((h) => h.dayOfWeek === dayIndex);

      // Sort by score to find peak hours
      const sortedHours = dayHotspots.sort((a, b) => b.score - a.score);

      // Find the peak period (consecutive hours with high scores)
      const peakPeriod = findPeakPeriod(sortedHours);

      // Calculate average engagement for the day
      const avgEngagement =
        dayHotspots.reduce((sum, h) => sum + h.score, 0) / dayHotspots.length;

      return {
        day,
        time: `${formatHour(peakPeriod.start)} - ${formatHour(peakPeriod.end)}`,
        engagement: getEngagementLevel(avgEngagement),
        audience: `${Math.round(avgEngagement)}%`,
        hourlyBreakdown: dayHotspots.map((h) => ({
          hour: formatHour(h.hourOfDay),
          percentage: Math.round(h.score),
        })),
      };
    });

    return recommendations;
  }, [hotspots]);

  const getEngagementBadge = (engagement: string) => {
    const variants: { [key: string]: string } = {
      "sangat tinggi": "bg-green-100 text-green-800",
      tinggi: "bg-blue-100 text-blue-800",
      sedang: "bg-yellow-100 text-yellow-800",
      rendah: "bg-red-100 text-red-800",
    };
    return variants[engagement] || "bg-gray-100 text-gray-800";
  };

  const scheduleToOptimalTime = () => {
    // This would be integrated with your scheduling system
    toast.success("Waktu posting berhasil diatur ke waktu optimal");
  };

  const handleDaySelect = (day: string) => {
    setSelectedDay(day === selectedDay ? null : day);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <section id="post-time-optimizer" className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Waktu Posting Optimal</h2>
        <p className="text-muted-foreground">
          Rekomendasi waktu terbaik untuk memposting konten berdasarkan analisis
          AI
        </p>
      </div>

      <div className="grid gap-4">
        {dailyRecommendations.map((rec) => (
          <Card key={rec.day} className="overflow-hidden">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  <CardTitle className="text-lg">{rec.day}</CardTitle>
                </div>
                <Badge
                  variant="secondary"
                  className={getEngagementBadge(rec.engagement)}
                >
                  {rec.engagement}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>{rec.time}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span>Audience aktif: {rec.audience}</span>
                  </div>
                </div>

                {selectedDay === rec.day && (
                  <div className="pt-4">
                    <div className="text-sm font-medium mb-2">
                      Breakdown per jam:
                    </div>
                    <div className="grid grid-cols-6 gap-2">
                      {rec.hourlyBreakdown.map((hour) => (
                        <div
                          key={hour.hour}
                          className="flex flex-col items-center p-2 bg-muted rounded-lg"
                        >
                          <span className="text-xs text-muted-foreground">
                            {hour.hour}
                          </span>
                          <span className="font-medium">
                            {hour.percentage}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
            <CardFooter className="flex justify-between items-center bg-muted/50 px-6 py-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDaySelect(rec.day)}
              >
                {selectedDay === rec.day
                  ? "Sembunyikan detail"
                  : "Lihat detail"}
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={scheduleToOptimalTime}
              >
                Jadwalkan ke waktu ini
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </section>
  );
};

// Helper function to find the optimal posting period
function findPeakPeriod(sortedHours: HotspotData[]) {
  if (sortedHours.length === 0) {
    return { start: 0, end: 0 };
  }

  // Find the highest scoring consecutive hours
  let bestStart = sortedHours[0].hourOfDay;
  let bestEnd = sortedHours[0].hourOfDay + 1;
  let bestScore = sortedHours[0].score;

  for (let i = 1; i < sortedHours.length; i++) {
    if (sortedHours[i].score > bestScore * 0.8) {
      // Within 80% of the best score
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

export default PostTimeOptimizer;
