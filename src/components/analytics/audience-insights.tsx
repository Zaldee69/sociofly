import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Users,
  MapPin,
  Clock,
  Calendar,
  TrendingUp,
  Globe,
  User,
  UserCheck,
  Instagram,
  Facebook,
  BarChart3,
  AlertTriangle,
  Construction,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc/client";

interface AudienceInsightsProps {
  socialAccountId?: string;
  teamId?: string;
}

interface DemographicData {
  ageGroup: string;
  percentage: number;
  gender?: {
    male: number;
    female: number;
    other?: number;
  };
}

interface LocationData {
  country: string;
  city?: string;
  percentage: number;
  userCount: number;
}

interface ActiveTimeData {
  hour: number;
  percentage: number;
  dayOfWeek?: number; // 0-6, Sunday to Saturday
}

interface AudienceMetrics {
  totalFollowers: number;
  newFollowers: number;
  unfollowCount: number;
  retentionRate: number;
  demographics: DemographicData[];
  topLocations: LocationData[];
  activeHours: ActiveTimeData[];
  activeDays: { day: string; percentage: number }[];
  genderDistribution: {
    male: number;
    female: number;
    other: number;
  };
  platform: "INSTAGRAM" | "FACEBOOK";
}

const AudienceInsightsSection: React.FC<AudienceInsightsProps> = ({
  socialAccountId,
  teamId,
}) => {
  const [selectedPlatform, setSelectedPlatform] = useState<string>("all");
  const [dateRange, setDateRange] = useState<string>("30d");

  // Fetch audience data (commented out until tRPC router is implemented)
  // const { data: audienceData, isLoading } = trpc.analytics.getAudienceInsights.useQuery({
  //   socialAccountId: socialAccountId || "",
  //   teamId: teamId || "",
  //   platform: selectedPlatform !== "all" ? selectedPlatform : undefined,
  //   dateRange: dateRange as "7d" | "30d" | "90d"
  // }, {
  //   enabled: !!socialAccountId && !!teamId
  // });

  const isLoading = false;

  // Mock data for demonstration
  const mockAudienceData: AudienceMetrics = {
    totalFollowers: 12500,
    newFollowers: 340,
    unfollowCount: 45,
    retentionRate: 94.2,
    demographics: [
      { ageGroup: "18-24", percentage: 35.2, gender: { male: 45, female: 55 } },
      { ageGroup: "25-34", percentage: 42.8, gender: { male: 52, female: 48 } },
      { ageGroup: "35-44", percentage: 16.5, gender: { male: 48, female: 52 } },
      { ageGroup: "45-54", percentage: 4.2, gender: { male: 50, female: 50 } },
      { ageGroup: "55+", percentage: 1.3, gender: { male: 60, female: 40 } },
    ],
    topLocations: [
      {
        country: "Indonesia",
        city: "Jakarta",
        percentage: 45.2,
        userCount: 5650,
      },
      {
        country: "Indonesia",
        city: "Surabaya",
        percentage: 12.8,
        userCount: 1600,
      },
      {
        country: "Indonesia",
        city: "Bandung",
        percentage: 8.4,
        userCount: 1050,
      },
      {
        country: "Malaysia",
        city: "Kuala Lumpur",
        percentage: 6.2,
        userCount: 775,
      },
      { country: "Singapore", percentage: 4.8, userCount: 600 },
      { country: "Indonesia", city: "Medan", percentage: 3.9, userCount: 488 },
      { country: "Thailand", city: "Bangkok", percentage: 2.8, userCount: 350 },
    ],
    activeHours: [
      { hour: 0, percentage: 2.1 },
      { hour: 1, percentage: 1.8 },
      { hour: 2, percentage: 1.5 },
      { hour: 3, percentage: 1.2 },
      { hour: 4, percentage: 1.0 },
      { hour: 5, percentage: 1.8 },
      { hour: 6, percentage: 4.2 },
      { hour: 7, percentage: 8.5 },
      { hour: 8, percentage: 12.3 },
      { hour: 9, percentage: 15.2 },
      { hour: 10, percentage: 18.7 },
      { hour: 11, percentage: 16.8 },
      { hour: 12, percentage: 14.5 },
      { hour: 13, percentage: 12.1 },
      { hour: 14, percentage: 10.8 },
      { hour: 15, percentage: 9.5 },
      { hour: 16, percentage: 8.2 },
      { hour: 17, percentage: 7.8 },
      { hour: 18, percentage: 9.1 },
      { hour: 19, percentage: 11.4 },
      { hour: 20, percentage: 13.7 },
      { hour: 21, percentage: 15.2 },
      { hour: 22, percentage: 12.8 },
      { hour: 23, percentage: 6.5 },
    ],
    activeDays: [
      { day: "Minggu", percentage: 12.5 },
      { day: "Senin", percentage: 15.8 },
      { day: "Selasa", percentage: 16.2 },
      { day: "Rabu", percentage: 15.1 },
      { day: "Kamis", percentage: 14.8 },
      { day: "Jumat", percentage: 13.9 },
      { day: "Sabtu", percentage: 11.7 },
    ],
    genderDistribution: {
      male: 48.5,
      female: 49.8,
      other: 1.7,
    },
    platform: "INSTAGRAM",
  };

  const data = mockAudienceData;

  const renderPlatformIcon = (platform: string) => {
    switch (platform) {
      case "INSTAGRAM":
        return <Instagram className="h-4 w-4 text-[#E1306C]" />;
      case "FACEBOOK":
        return <Facebook className="h-4 w-4 text-[#4267B2]" />;
      default:
        return <Instagram className="h-4 w-4" />;
    }
  };

  const formatHour = (hour: number) => {
    return `${hour.toString().padStart(2, "0")}:00`;
  };

  const getAgeGroupColor = (ageGroup: string) => {
    const colors = {
      "18-24": "bg-blue-500",
      "25-34": "bg-green-500",
      "35-44": "bg-purple-500",
      "45-54": "bg-orange-500",
      "55+": "bg-red-500",
    };
    return colors[ageGroup as keyof typeof colors] || "bg-gray-500";
  };

  const getPeakHours = () => {
    const sorted = [...data.activeHours].sort(
      (a, b) => b.percentage - a.percentage
    );
    return sorted.slice(0, 3);
  };

  if (isLoading) {
    return (
      <section id="audience-insights" className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">Audience Insights</h2>
          <p className="text-muted-foreground">Loading audience analytics...</p>
        </div>
        <div className="space-y-4">
          <Skeleton className="h-[60px] w-full" />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-[120px] w-full" />
            ))}
          </div>
          <Skeleton className="h-[400px] w-full" />
        </div>
      </section>
    );
  }

  return (
    <section id="audience-insights" className="space-y-6">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <h2 className="text-2xl font-bold">Audience Insights</h2>
          <Badge
            variant="outline"
            className="text-orange-600 border-orange-300"
          >
            <AlertTriangle className="h-3 w-3 mr-1" />
            Demo Data
          </Badge>
        </div>
        <p className="text-muted-foreground">
          Comprehensive audience demographics and behavioral patterns
        </p>
      </div>

      {/* Data Status Alert */}
      <Alert className="border-orange-200 bg-orange-50">
        <AlertTriangle className="h-4 w-4 text-orange-600" />
        <AlertDescription className="text-orange-800">
          <strong>Demo Mode:</strong> This data is for demonstration purposes
          only. Real audience insights from Meta API will be integrated in a
          future update.
        </AlertDescription>
      </Alert>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 p-4 border rounded-lg bg-muted/5">
        <Select value={selectedPlatform} onValueChange={setSelectedPlatform}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Platform" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Platforms</SelectItem>
            <SelectItem value="INSTAGRAM">Instagram</SelectItem>
            <SelectItem value="FACEBOOK">Facebook</SelectItem>
          </SelectContent>
        </Select>

        <Select value={dateRange} onValueChange={setDateRange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Date Range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="90d">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Overview Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Followers
            </CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.totalFollowers.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              +{data.newFollowers} this month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Retention Rate
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.retentionRate}%</div>
            <p className="text-xs text-muted-foreground">
              -{data.unfollowCount} unfollows
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Top Location</CardTitle>
            <MapPin className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.topLocations[0].city}
            </div>
            <p className="text-xs text-muted-foreground">
              {data.topLocations[0].percentage}% of audience
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Peak Activity</CardTitle>
            <Clock className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatHour(getPeakHours()[0].hour)}
            </div>
            <p className="text-xs text-muted-foreground">
              {getPeakHours()[0].percentage.toFixed(1)}% active
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics Tabs */}
      <Tabs defaultValue="demographics" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="demographics">Demographics</TabsTrigger>
          <TabsTrigger value="location">Location</TabsTrigger>
          <TabsTrigger value="activity">Activity Times</TabsTrigger>
          <TabsTrigger value="behavior" className="relative">
            Behavior
            <Badge variant="secondary" className="ml-2 text-xs px-1 py-0">
              Beta
            </Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="demographics" className="space-y-4">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Age Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Age Distribution</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {data.demographics.map((demo) => (
                  <div key={demo.ageGroup} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">
                        {demo.ageGroup}
                      </span>
                      <Badge variant="outline">{demo.percentage}%</Badge>
                    </div>
                    <Progress value={demo.percentage} className="h-2" />
                    {demo.gender && (
                      <div className="flex gap-4 text-xs text-muted-foreground">
                        <span>👨 {demo.gender.male}%</span>
                        <span>👩 {demo.gender.female}%</span>
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Gender Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Gender Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium flex items-center gap-2">
                        <User className="h-4 w-4 text-blue-500" />
                        Male
                      </span>
                      <Badge variant="outline">
                        {data.genderDistribution.male}%
                      </Badge>
                    </div>
                    <Progress
                      value={data.genderDistribution.male}
                      className="h-2"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium flex items-center gap-2">
                        <UserCheck className="h-4 w-4 text-pink-500" />
                        Female
                      </span>
                      <Badge variant="outline">
                        {data.genderDistribution.female}%
                      </Badge>
                    </div>
                    <Progress
                      value={data.genderDistribution.female}
                      className="h-2"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium flex items-center gap-2">
                        <Users className="h-4 w-4 text-purple-500" />
                        Other
                      </span>
                      <Badge variant="outline">
                        {data.genderDistribution.other}%
                      </Badge>
                    </div>
                    <Progress
                      value={data.genderDistribution.other}
                      className="h-2"
                    />
                  </div>
                </div>

                <div className="mt-6 p-4 bg-muted/20 rounded-lg">
                  <h4 className="font-medium text-sm mb-2">Key Insights</h4>
                  <div className="space-y-1 text-xs text-muted-foreground">
                    <div>• Fairly balanced gender distribution</div>
                    <div>
                      • Largest age group: 25-34 years (
                      {data.demographics[1].percentage}%)
                    </div>
                    <div>• Young adult focus: 78% under 35 years</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="location" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Top Locations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.topLocations.map((location, index) => (
                  <div
                    key={`${location.country}-${location.city || "general"}`}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-8 h-8 bg-primary/10 rounded-full">
                        <span className="text-sm font-bold">#{index + 1}</span>
                      </div>
                      <div>
                        <div className="font-medium text-sm">
                          {location.city
                            ? `${location.city}, ${location.country}`
                            : location.country}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {location.userCount.toLocaleString()} followers
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">{location.percentage}%</div>
                      <Progress
                        value={location.percentage}
                        className="h-1 w-20"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Hourly Activity */}
            <Card>
              <CardHeader>
                <CardTitle>Active Hours (WIB)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-6 gap-2">
                  {data.activeHours.map((hour) => (
                    <div
                      key={hour.hour}
                      className={`p-2 text-center rounded text-xs ${
                        hour.percentage > 15
                          ? "bg-green-500 text-white"
                          : hour.percentage > 10
                            ? "bg-blue-500 text-white"
                            : hour.percentage > 5
                              ? "bg-yellow-500 text-white"
                              : "bg-muted text-muted-foreground"
                      }`}
                    >
                      <div className="font-medium">{formatHour(hour.hour)}</div>
                      <div>{hour.percentage.toFixed(1)}%</div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 space-y-2">
                  <h4 className="font-medium text-sm">Peak Hours</h4>
                  {getPeakHours().map((hour, index) => (
                    <div
                      key={hour.hour}
                      className="flex justify-between text-sm"
                    >
                      <span>
                        #{index + 1} {formatHour(hour.hour)}
                      </span>
                      <span>{hour.percentage.toFixed(1)}% active</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Daily Activity */}
            <Card>
              <CardHeader>
                <CardTitle>Active Days</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {data.activeDays.map((day) => (
                  <div key={day.day} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">{day.day}</span>
                      <Badge variant="outline">{day.percentage}%</Badge>
                    </div>
                    <Progress value={day.percentage} className="h-2" />
                  </div>
                ))}

                <div className="mt-6 p-4 bg-muted/20 rounded-lg">
                  <h4 className="font-medium text-sm mb-2">
                    Activity Insights
                  </h4>
                  <div className="space-y-1 text-xs text-muted-foreground">
                    <div>
                      • Peak activity: {getPeakHours()[0].percentage.toFixed(1)}
                      % at {formatHour(getPeakHours()[0].hour)}
                    </div>
                    <div>
                      • Most active day:{" "}
                      {
                        data.activeDays.sort(
                          (a, b) => b.percentage - a.percentage
                        )[0].day
                      }
                    </div>
                    <div>
                      • Weekend activity is{" "}
                      {data.activeDays[0].percentage +
                        data.activeDays[6].percentage <
                      30
                        ? "lower"
                        : "higher"}{" "}
                      than weekdays
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="behavior" className="space-y-4">
          {/* Coming Soon Alert */}
          <Alert className="border-blue-200 bg-blue-50">
            <Construction className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              <strong>Coming Soon:</strong> Instagram Stories Analytics,
              Sentiment Analysis, Competitor Benchmarking, and Link & CTA
              Analytics will be available in future updates.
            </AlertDescription>
          </Alert>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="relative">
              <div className="absolute top-4 right-4">
                <Badge variant="secondary" className="text-xs">
                  <Construction className="h-3 w-3 mr-1" />
                  Stories Coming Soon
                </Badge>
              </div>
              <CardHeader>
                <CardTitle>Engagement Patterns</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-muted/20 rounded-lg opacity-60">
                    <div className="text-2xl font-bold text-blue-600">--</div>
                    <div className="text-xs text-muted-foreground">
                      Stories Completion
                    </div>
                    <div className="text-xs text-orange-600 mt-1">
                      Coming Soon
                    </div>
                  </div>
                  <div className="text-center p-4 bg-muted/20 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      4.2%
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Avg Engagement
                    </div>
                  </div>
                  <div className="text-center p-4 bg-muted/20 rounded-lg opacity-60">
                    <div className="text-2xl font-bold text-purple-600">--</div>
                    <div className="text-xs text-muted-foreground">
                      Session Length
                    </div>
                    <div className="text-xs text-orange-600 mt-1">
                      Coming Soon
                    </div>
                  </div>
                  <div className="text-center p-4 bg-muted/20 rounded-lg">
                    <div className="text-2xl font-bold text-orange-600">
                      65%
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Return Rate
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="relative">
              <div className="absolute top-4 right-4">
                <Badge variant="secondary" className="text-xs">
                  <Construction className="h-3 w-3 mr-1" />
                  Enhanced Coming Soon
                </Badge>
              </div>
              <CardHeader>
                <CardTitle>Growth Trends</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">New Followers</span>
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-green-500" />
                      <span className="font-medium">+{data.newFollowers}</span>
                    </div>
                  </div>
                  <Progress value={85} className="h-2" />

                  <div className="flex justify-between items-center">
                    <span className="text-sm">Unfollows</span>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-red-500">
                        -{data.unfollowCount}
                      </span>
                    </div>
                  </div>
                  <Progress value={15} className="h-2" />

                  <div className="flex justify-between items-center">
                    <span className="text-sm">Net Growth</span>
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-green-500" />
                      <span className="font-medium text-green-600">
                        +{data.newFollowers - data.unfollowCount}
                      </span>
                    </div>
                  </div>
                  <Progress value={92} className="h-2" />
                </div>

                {/* Future Features Preview */}
                <div className="mt-4 p-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
                  <h5 className="text-sm font-medium text-blue-800 mb-2">
                    🚀 Coming Soon
                  </h5>
                  <div className="text-xs text-blue-700 space-y-1">
                    <div>• Competitor Benchmarking</div>
                    <div>• Sentiment Analysis</div>
                    <div>• Link & CTA Performance</div>
                    <div>• Advanced Audience Segmentation</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </section>
  );
};

export default AudienceInsightsSection;
