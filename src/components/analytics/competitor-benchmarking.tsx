"use client";
import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search } from "lucide-react";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import { toast } from "sonner";

interface CompetitorBenchmarkingProps {
  platform?: string;
}

// Mock data for competitors
const mockCompetitorData = [
  {
    username: "@yourbrand",
    followers: 12500,
    engagement: 4.2,
    posts: 543,
    followersGrowth: [
      { date: "1 Mar", followers: 11200 },
      { date: "8 Mar", followers: 11600 },
      { date: "15 Mar", followers: 12000 },
      { date: "22 Mar", followers: 12300 },
      { date: "29 Mar", followers: 12500 },
    ],
  },
  {
    username: "@competitor1",
    followers: 18700,
    engagement: 3.8,
    posts: 762,
    followersGrowth: [
      { date: "1 Mar", followers: 17200 },
      { date: "8 Mar", followers: 17600 },
      { date: "15 Mar", followers: 18100 },
      { date: "22 Mar", followers: 18400 },
      { date: "29 Mar", followers: 18700 },
    ],
  },
  {
    username: "@competitor2",
    followers: 9200,
    engagement: 5.1,
    posts: 320,
    followersGrowth: [
      { date: "1 Mar", followers: 8000 },
      { date: "8 Mar", followers: 8400 },
      { date: "15 Mar", followers: 8700 },
      { date: "22 Mar", followers: 9000 },
      { date: "29 Mar", followers: 9200 },
    ],
  },
];

// Generate comparison data for the chart
const comparisonData = [
  {
    date: "1 Mar",
    "@yourbrand": 11200,
    "@competitor1": 17200,
    "@competitor2": 8000,
  },
  {
    date: "8 Mar",
    "@yourbrand": 11600,
    "@competitor1": 17600,
    "@competitor2": 8400,
  },
  {
    date: "15 Mar",
    "@yourbrand": 12000,
    "@competitor1": 18100,
    "@competitor2": 8700,
  },
  {
    date: "22 Mar",
    "@yourbrand": 12300,
    "@competitor1": 18400,
    "@competitor2": 9000,
  },
  {
    date: "29 Mar",
    "@yourbrand": 12500,
    "@competitor1": 18700,
    "@competitor2": 9200,
  },
];

const CompetitorBenchmarking = ({
  platform = "instagram",
}: CompetitorBenchmarkingProps) => {
  const [username, setUsername] = useState("");
  const [competitors, setCompetitors] = useState(mockCompetitorData);
  const [isLoading, setIsLoading] = useState(false);

  const handleAddCompetitor = () => {
    if (!username.trim()) {
      toast.error("Mohon masukkan username kompetitor");
      return;
    }

    setIsLoading(true);

    // In a real implementation, this would call an API to fetch competitor data
    setTimeout(() => {
      const existingCompetitor = competitors.find(
        (c) => c.username.toLowerCase() === username.toLowerCase()
      );

      if (existingCompetitor) {
        toast.error(`Kompetitor ${username} sudah ada dalam daftar`);
      } else {
        // Generate mock data for the new competitor
        const newCompetitor = {
          username: username.startsWith("@") ? username : `@${username}`,
          followers: Math.floor(Math.random() * 50000) + 5000,
          engagement: +(Math.random() * 5 + 1).toFixed(1),
          posts: Math.floor(Math.random() * 1000) + 100,
          followersGrowth: [
            {
              date: "1 Mar",
              followers: Math.floor(Math.random() * 50000) + 5000,
            },
            {
              date: "8 Mar",
              followers: Math.floor(Math.random() * 50000) + 5000,
            },
            {
              date: "15 Mar",
              followers: Math.floor(Math.random() * 50000) + 5000,
            },
            {
              date: "22 Mar",
              followers: Math.floor(Math.random() * 50000) + 5000,
            },
            {
              date: "29 Mar",
              followers: Math.floor(Math.random() * 50000) + 5000,
            },
          ],
        };

        setCompetitors([...competitors, newCompetitor]);
        toast.success(`Kompetitor ${username} berhasil ditambahkan`);
      }

      setUsername("");
      setIsLoading(false);
    }, 1500);
  };

  const chartConfig = competitors.reduce((config, competitor) => {
    return {
      ...config,
      [competitor.username]: {
        label: competitor.username,
        theme: {
          light:
            competitor.username === "@yourbrand"
              ? "#0ea5e9"
              : ["#f97316", "#84cc16", "#8b5cf6"][
                  Math.floor(Math.random() * 3)
                ],
          dark:
            competitor.username === "@yourbrand"
              ? "#0ea5e9"
              : ["#f97316", "#84cc16", "#8b5cf6"][
                  Math.floor(Math.random() * 3)
                ],
        },
      },
    };
  }, {});

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Competitor Benchmarking</CardTitle>
          <CardDescription>
            Bandingkan performa akun Anda dengan kompetitor
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2 mb-6">
            <div className="grow">
              <Input
                placeholder="Masukkan username kompetitor (contoh: @kompetitor)"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <Button
              onClick={handleAddCompetitor}
              disabled={isLoading}
              className="flex gap-2"
            >
              <Search className="h-4 w-4" />
              {isLoading ? "Mencari..." : "Tambah Kompetitor"}
            </Button>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Username</TableHead>
                <TableHead className="text-right">Followers</TableHead>
                <TableHead className="text-right">Engagement Rate</TableHead>
                <TableHead className="text-right">Total Posts</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {competitors.map((competitor) => (
                <TableRow
                  key={competitor.username}
                  className={
                    competitor.username === "@yourbrand" ? "bg-muted/30" : ""
                  }
                >
                  <TableCell className="font-medium">
                    {competitor.username}
                  </TableCell>
                  <TableCell className="text-right">
                    {competitor.followers.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right">
                    {competitor.engagement}%
                  </TableCell>
                  <TableCell className="text-right">
                    {competitor.posts}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pertumbuhan Followers</CardTitle>
          <CardDescription>
            Bandingkan pertumbuhan followers dengan kompetitor
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer>
            <ChartContainer config={chartConfig}>
              <LineChart data={comparisonData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                {competitors.map((competitor) => (
                  <Line
                    key={competitor.username}
                    type="monotone"
                    dataKey={competitor.username}
                    name={competitor.username}
                    stroke={`var(--color-${competitor.username})`}
                    strokeWidth={competitor.username === "@yourbrand" ? 3 : 2}
                    dot={{ fill: `var(--color-${competitor.username})` }}
                  />
                ))}
              </LineChart>
            </ChartContainer>
          </ResponsiveContainer>
        </CardContent>
        <CardFooter className="text-xs text-muted-foreground">
          Data yang ditampilkan adalah data simulasi. Dalam produk sebenarnya,
          data akan diambil dari API Instagram/Facebook.
        </CardFooter>
      </Card>
    </div>
  );
};

export default CompetitorBenchmarking;
