import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { TrendingUp } from "lucide-react";

// Mock data for the chart - using static values to prevent hydration mismatch
const chartData = [
  { name: "Jan", total: 3245 },
  { name: "Feb", total: 2156 },
  { name: "Mar", total: 4321 },
  { name: "Apr", total: 1876 },
  { name: "May", total: 5432 },
  { name: "Jun", total: 2987 },
];

const PerformanceChart = () => {
  const maxValue = Math.max(...chartData.map((d) => d.total));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp size={18} />
          Performance Overview
        </CardTitle>
        <CardDescription>
          Your engagement over the last 6 months.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="w-full h-64 flex items-end justify-around gap-2 p-4 bg-slate-50 rounded-lg">
          {chartData.map((data) => (
            <div
              key={data.name}
              className="flex flex-col items-center gap-2 w-full"
            >
              <div
                className="w-full bg-indigo-400 hover:bg-indigo-500 rounded-t-md transition-all"
                style={{ height: `${(data.total / maxValue) * 100}%` }}
              ></div>
              <span className="text-xs font-medium text-slate-600">
                {data.name}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default PerformanceChart;
