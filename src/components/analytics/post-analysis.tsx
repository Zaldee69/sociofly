import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BarChart,
  ResponsiveContainer,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

interface Post {
  id: string;
  content: string;
  imageUrl?: string;
  date: string;
  likes: number;
  shares?: number;
  retweets?: number;
  replies?: number;
  comments?: number;
  engagement: number;
  reach: number;
  clicks: number;
  impressions: number;
}

interface PostAnalysisProps {
  platform: string;
  customPost: Post;
}

const PostAnalysis: React.FC<PostAnalysisProps> = ({
  platform,
  customPost,
}) => {
  const engagementData = [
    { name: "Likes", value: customPost.likes || 0 },
    { name: "Comments", value: customPost.comments || 0 },
    { name: "Shares", value: customPost.shares || customPost.retweets || 0 },
    { name: "Replies", value: customPost.replies || 0 },
  ].filter((item) => item.value > 0);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("id-ID", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Post Analysis - {platform}
            <Badge variant="outline">{formatDate(customPost.date)}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">Content</h4>
              <p className="text-sm text-muted-foreground">
                {customPost.content}
              </p>
            </div>

            {customPost.imageUrl && (
              <div>
                <h4 className="font-medium mb-2">Image</h4>
                <img
                  src={customPost.imageUrl}
                  alt="Post content"
                  className="rounded-lg max-w-xs h-auto"
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Engagement Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{customPost.engagement}%</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Reach</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {customPost.reach.toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Clicks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{customPost.clicks}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Impressions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {customPost.impressions.toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Engagement Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={engagementData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PostAnalysis;
