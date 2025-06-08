import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Instagram, Facebook, Twitter, MoreHorizontal } from "lucide-react";

const mockPosts = [
  {
    id: 1,
    platform: "instagram",
    preview: "Summer collection launch...",
    date: "2024-01-15",
    reach: "12.5K",
    engagement: "8.2%",
    clicks: 324,
  },
  {
    id: 2,
    platform: "facebook",
    preview: "Behind the scenes video...",
    date: "2024-01-14",
    reach: "8.9K",
    engagement: "6.1%",
    clicks: 186,
  },
  {
    id: 3,
    platform: "twitter",
    preview: "Breaking: New product announcement...",
    date: "2024-01-13",
    reach: "15.2K",
    engagement: "12.4%",
    clicks: 892,
  },
];

const renderPlatformIcon = (platform: string) => {
  switch (platform) {
    case "instagram":
      return <Instagram className="h-4 w-4 text-[#E1306C]" />;
    case "facebook":
      return <Facebook className="h-4 w-4 text-[#4267B2]" />;
    case "twitter":
      return <Twitter className="h-4 w-4 text-[#1DA1F2]" />;
    default:
      return <Instagram className="h-4 w-4" />;
  }
};

const PostPerformanceSection: React.FC = () => {
  return (
    <section id="post-performance" className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Post Performance</h2>
        <p className="text-muted-foreground">
          Detailed analytics for your recent posts
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Top Performing Posts</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Platform</TableHead>
                <TableHead>Post Preview</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Reach</TableHead>
                <TableHead>Engagement</TableHead>
                <TableHead>Clicks</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockPosts.map((post) => (
                <TableRow key={post.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {renderPlatformIcon(post.platform)}
                      <span className="capitalize">{post.platform}</span>
                    </div>
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate">
                    {post.preview}
                  </TableCell>
                  <TableCell>{post.date}</TableCell>
                  <TableCell>{post.reach}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{post.engagement}</Badge>
                  </TableCell>
                  <TableCell>{post.clicks}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </section>
  );
};

export default PostPerformanceSection;
