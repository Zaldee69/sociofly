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

interface PostTimeOptimizerProps {
  platform?: string;
}

// Mock data untuk waktu posting optimal berdasarkan platform
const mockOptimalTimes = {
  instagram: [
    {
      day: "Senin",
      time: "19:00 - 21:00",
      engagement: "tinggi",
      audience: "74%",
      hourlyBreakdown: [
        { hour: "17:00", percentage: 45 },
        { hour: "18:00", percentage: 58 },
        { hour: "19:00", percentage: 67 },
        { hour: "20:00", percentage: 74 },
        { hour: "21:00", percentage: 65 },
        { hour: "22:00", percentage: 48 },
      ],
    },
    {
      day: "Selasa",
      time: "18:00 - 20:00",
      engagement: "sedang",
      audience: "61%",
      hourlyBreakdown: [
        { hour: "17:00", percentage: 40 },
        { hour: "18:00", percentage: 55 },
        { hour: "19:00", percentage: 61 },
        { hour: "20:00", percentage: 57 },
        { hour: "21:00", percentage: 49 },
        { hour: "22:00", percentage: 38 },
      ],
    },
    {
      day: "Rabu",
      time: "12:00 - 13:00",
      engagement: "tinggi",
      audience: "72%",
      hourlyBreakdown: [
        { hour: "11:00", percentage: 52 },
        { hour: "12:00", percentage: 72 },
        { hour: "13:00", percentage: 67 },
        { hour: "14:00", percentage: 50 },
      ],
    },
    {
      day: "Kamis",
      time: "17:00 - 19:00",
      engagement: "sedang",
      audience: "58%",
      hourlyBreakdown: [
        { hour: "16:00", percentage: 42 },
        { hour: "17:00", percentage: 51 },
        { hour: "18:00", percentage: 58 },
        { hour: "19:00", percentage: 55 },
        { hour: "20:00", percentage: 47 },
      ],
    },
    {
      day: "Jumat",
      time: "20:00 - 22:00",
      engagement: "sangat tinggi",
      audience: "81%",
      hourlyBreakdown: [
        { hour: "19:00", percentage: 65 },
        { hour: "20:00", percentage: 75 },
        { hour: "21:00", percentage: 81 },
        { hour: "22:00", percentage: 72 },
      ],
    },
    {
      day: "Sabtu",
      time: "14:00 - 16:00",
      engagement: "tinggi",
      audience: "76%",
      hourlyBreakdown: [
        { hour: "13:00", percentage: 60 },
        { hour: "14:00", percentage: 70 },
        { hour: "15:00", percentage: 76 },
        { hour: "16:00", percentage: 68 },
        { hour: "17:00", percentage: 55 },
      ],
    },
    {
      day: "Minggu",
      time: "15:00 - 18:00",
      engagement: "sangat tinggi",
      audience: "85%",
      hourlyBreakdown: [
        { hour: "14:00", percentage: 65 },
        { hour: "15:00", percentage: 75 },
        { hour: "16:00", percentage: 85 },
        { hour: "17:00", percentage: 81 },
        { hour: "18:00", percentage: 72 },
      ],
    },
  ],
  facebook: [
    {
      day: "Senin",
      time: "13:00 - 15:00",
      engagement: "sedang",
      audience: "55%",
      hourlyBreakdown: [
        { hour: "12:00", percentage: 42 },
        { hour: "13:00", percentage: 50 },
        { hour: "14:00", percentage: 55 },
        { hour: "15:00", percentage: 48 },
      ],
    },
    {
      day: "Selasa",
      time: "12:00 - 14:00",
      engagement: "sedang",
      audience: "58%",
      hourlyBreakdown: [
        { hour: "11:00", percentage: 45 },
        { hour: "12:00", percentage: 52 },
        { hour: "13:00", percentage: 58 },
        { hour: "14:00", percentage: 50 },
      ],
    },
    {
      day: "Rabu",
      time: "15:00 - 17:00",
      engagement: "tinggi",
      audience: "67%",
      hourlyBreakdown: [
        { hour: "14:00", percentage: 53 },
        { hour: "15:00", percentage: 61 },
        { hour: "16:00", percentage: 67 },
        { hour: "17:00", percentage: 60 },
      ],
    },
    {
      day: "Kamis",
      time: "10:00 - 12:00",
      engagement: "sedang",
      audience: "52%",
      hourlyBreakdown: [
        { hour: "09:00", percentage: 38 },
        { hour: "10:00", percentage: 46 },
        { hour: "11:00", percentage: 52 },
        { hour: "12:00", percentage: 47 },
      ],
    },
    {
      day: "Jumat",
      time: "14:00 - 16:00",
      engagement: "tinggi",
      audience: "72%",
      hourlyBreakdown: [
        { hour: "13:00", percentage: 58 },
        { hour: "14:00", percentage: 65 },
        { hour: "15:00", percentage: 72 },
        { hour: "16:00", percentage: 63 },
      ],
    },
    {
      day: "Sabtu",
      time: "12:00 - 15:00",
      engagement: "sangat tinggi",
      audience: "75%",
      hourlyBreakdown: [
        { hour: "11:00", percentage: 60 },
        { hour: "12:00", percentage: 68 },
        { hour: "13:00", percentage: 75 },
        { hour: "14:00", percentage: 72 },
        { hour: "15:00", percentage: 65 },
      ],
    },
    {
      day: "Minggu",
      time: "13:00 - 16:00",
      engagement: "tinggi",
      audience: "69%",
      hourlyBreakdown: [
        { hour: "12:00", percentage: 55 },
        { hour: "13:00", percentage: 63 },
        { hour: "14:00", percentage: 69 },
        { hour: "15:00", percentage: 67 },
        { hour: "16:00", percentage: 58 },
      ],
    },
  ],
  twitter: [
    {
      day: "Senin",
      time: "14:00 - 16:00",
      engagement: "tinggi",
      audience: "65%",
      hourlyBreakdown: [
        { hour: "13:00", percentage: 50 },
        { hour: "14:00", percentage: 59 },
        { hour: "15:00", percentage: 65 },
        { hour: "16:00", percentage: 57 },
      ],
    },
    {
      day: "Selasa",
      time: "09:00 - 11:00",
      engagement: "sedang",
      audience: "53%",
      hourlyBreakdown: [
        { hour: "08:00", percentage: 42 },
        { hour: "09:00", percentage: 48 },
        { hour: "10:00", percentage: 53 },
        { hour: "11:00", percentage: 45 },
      ],
    },
    {
      day: "Rabu",
      time: "16:00 - 18:00",
      engagement: "tinggi",
      audience: "68%",
      hourlyBreakdown: [
        { hour: "15:00", percentage: 52 },
        { hour: "16:00", percentage: 63 },
        { hour: "17:00", percentage: 68 },
        { hour: "18:00", percentage: 60 },
      ],
    },
    {
      day: "Kamis",
      time: "12:00 - 14:00",
      engagement: "sedang",
      audience: "59%",
      hourlyBreakdown: [
        { hour: "11:00", percentage: 48 },
        { hour: "12:00", percentage: 55 },
        { hour: "13:00", percentage: 59 },
        { hour: "14:00", percentage: 53 },
      ],
    },
    {
      day: "Jumat",
      time: "16:00 - 18:00",
      engagement: "tinggi",
      audience: "70%",
      hourlyBreakdown: [
        { hour: "15:00", percentage: 58 },
        { hour: "16:00", percentage: 65 },
        { hour: "17:00", percentage: 70 },
        { hour: "18:00", percentage: 62 },
      ],
    },
    {
      day: "Sabtu",
      time: "10:00 - 12:00",
      engagement: "rendah",
      audience: "45%",
      hourlyBreakdown: [
        { hour: "09:00", percentage: 32 },
        { hour: "10:00", percentage: 38 },
        { hour: "11:00", percentage: 45 },
        { hour: "12:00", percentage: 40 },
      ],
    },
    {
      day: "Minggu",
      time: "17:00 - 19:00",
      engagement: "tinggi",
      audience: "63%",
      hourlyBreakdown: [
        { hour: "16:00", percentage: 50 },
        { hour: "17:00", percentage: 58 },
        { hour: "18:00", percentage: 63 },
        { hour: "19:00", percentage: 55 },
      ],
    },
  ],
};

// Menentukan waktu terbaik secara keseluruhan untuk setiap platform
const bestTimes = {
  instagram: { day: "Minggu", time: "16:00", audience: "85%" },
  facebook: { day: "Sabtu", time: "13:00", audience: "75%" },
  twitter: { day: "Jumat", time: "17:00", audience: "70%" },
};

// Saran strategi khusus per platform
const platformStrategies = {
  instagram: [
    "Posting konten visual berkualitas tinggi pada pukul 20:00-21:00 di hari Jumat",
    "Memanfaatkan fitur Stories untuk engagement pada pukul 16:00-18:00 di hari Minggu",
    "Menggunakan minimum 9 hashtag relevan untuk meningkatkan jangkauan",
  ],
  facebook: [
    "Posting konten video pendek (kurang dari 2 menit) pada pukul 13:00-14:00 di hari Sabtu",
    "Menggunakan format polling/pertanyaan untuk meningkatkan interaksi",
    "Memanfaatkan konten carousel untuk engagement yang lebih tinggi",
  ],
  twitter: [
    "Posting thread berisi insight industri pada pukul 16:00-17:00 di hari Jumat",
    "Berpartisipasi dalam trending topic yang relevan dengan brand",
    "Menggunakan maksimal 2 hashtag per tweet untuk engagement optimal",
  ],
};

const PostTimeOptimizer = ({
  platform = "instagram",
}: PostTimeOptimizerProps) => {
  const [optimalTimes, setOptimalTimes] = useState(
    mockOptimalTimes[platform as keyof typeof mockOptimalTimes]
  );
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [bestTime, setBestTime] = useState(
    bestTimes[platform as keyof typeof bestTimes]
  );
  const [strategies, setStrategies] = useState(
    platformStrategies[platform as keyof typeof platformStrategies]
  );

  useEffect(() => {
    setOptimalTimes(
      mockOptimalTimes[platform as keyof typeof mockOptimalTimes]
    );
    setBestTime(bestTimes[platform as keyof typeof bestTimes]);
    setStrategies(
      platformStrategies[platform as keyof typeof platformStrategies]
    );
    setSelectedDay(null);
  }, [platform]);

  const getEngagementBadge = (engagement: string) => {
    switch (engagement) {
      case "sangat tinggi":
        return "bg-green-600 text-white";
      case "tinggi":
        return "bg-green-500 text-white";
      case "sedang":
        return "bg-yellow-500 text-white";
      case "rendah":
        return "bg-red-500 text-white";
      default:
        return "bg-gray-500 text-white";
    }
  };

  const scheduleToOptimalTime = () => {
    toast.success(
      `Post berhasil dijadwalkan pada waktu optimal: ${bestTime.day} pukul ${bestTime.time}`
    );
  };

  const handleDaySelect = (day: string) => {
    if (selectedDay === day) {
      setSelectedDay(null);
    } else {
      setSelectedDay(day);
    }
  };

  // Mencari jam dengan audience tertinggi dalam semua hari
  const findPeakHour = () => {
    let maxPercentage = 0;
    let peakHour = "";
    let peakDay = "";

    optimalTimes.forEach((dayData) => {
      dayData.hourlyBreakdown.forEach((hourData) => {
        if (hourData.percentage > maxPercentage) {
          maxPercentage = hourData.percentage;
          peakHour = hourData.hour;
          peakDay = dayData.day;
        }
      });
    });

    return { peakDay, peakHour, percentage: maxPercentage };
  };

  const peakTimeData = findPeakHour();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Waktu Optimal untuk Posting</CardTitle>
          <CardDescription>
            Waktu terbaik untuk posting di {platform} berdasarkan engagement
            audience
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Highlight Waktu Terbaik */}
            <Card className="bg-green-50 border-green-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="bg-green-100 p-2 rounded-full">
                      <TrendingUp className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <h3 className="font-medium">Waktu Optimal Tertinggi</h3>
                      <p className="text-sm text-muted-foreground">
                        Berdasarkan data 30 hari terakhir
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold">
                      {peakTimeData.peakDay}, {peakTimeData.peakHour}
                    </div>
                    <div className="text-sm text-green-700">
                      {peakTimeData.percentage}% Audience Aktif
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="bg-green-100 py-2 px-4 flex justify-between">
                <span className="text-sm text-green-800">
                  Dapat meningkatkan engagement hingga 30%
                </span>
                <Button size="sm" onClick={scheduleToOptimalTime}>
                  Jadwalkan Post
                </Button>
              </CardFooter>
            </Card>

            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <Users className="h-4 w-4" />
              <span>
                Menampilkan persentase audience yang aktif pada waktu-waktu
                tertentu
              </span>
            </div>

            <div className="grid gap-3">
              {optimalTimes.map((timeSlot, index) => (
                <div key={index} className="border rounded-md overflow-hidden">
                  <div
                    className={`flex items-center justify-between p-3 cursor-pointer hover:bg-slate-50 ${selectedDay === timeSlot.day ? "bg-slate-50" : ""}`}
                    onClick={() => handleDaySelect(timeSlot.day)}
                  >
                    <div className="flex items-center gap-4">
                      <div className="text-center w-16">
                        <div className="text-sm font-medium">
                          {timeSlot.day}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{timeSlot.time}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge
                        className={getEngagementBadge(timeSlot.engagement)}
                      >
                        {timeSlot.engagement}
                      </Badge>
                      <div className="flex items-center gap-1 text-sm">
                        <Users className="h-3 w-3" />
                        <span>{timeSlot.audience}</span>
                      </div>
                    </div>
                  </div>

                  {selectedDay === timeSlot.day && (
                    <div className="bg-slate-50 p-3 border-t">
                      <h4 className="text-sm font-medium mb-2">
                        Breakdown per jam:
                      </h4>
                      <div className="grid grid-cols-3 gap-2">
                        {timeSlot.hourlyBreakdown.map((hourData, hIdx) => (
                          <div
                            key={hIdx}
                            className="bg-white p-2 rounded border text-center"
                          >
                            <div className="text-sm font-medium">
                              {hourData.hour}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {hourData.percentage}% aktif
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Strategi per Platform */}
            <div className="mt-6 pt-4 border-t">
              <h3 className="font-medium mb-3">Strategi untuk {platform}</h3>
              <div className="space-y-2">
                {strategies.map((strategy, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <div className="mt-1 bg-blue-100 text-blue-600 rounded-full h-5 w-5 flex items-center justify-center text-xs font-medium">
                      {idx + 1}
                    </div>
                    <p className="text-sm">{strategy}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between text-xs text-muted-foreground border-t pt-4">
          <div>
            Data didasarkan pada aktivitas audience dari akun {platform} Anda
            dalam 30 hari terakhir.
          </div>
          <Button variant="outline" size="sm" onClick={scheduleToOptimalTime}>
            Jadwalkan Post
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default PostTimeOptimizer;
