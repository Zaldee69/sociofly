import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  ThumbsUp,
  Share2,
  MousePointerClick,
  BarChart,
  TrendingUp,
} from "lucide-react";

interface PostAnalysisProps {
  platform: string;
  customPost?: any; // Optional custom post data
}

// Bentuk data tiap sosmed berbeda, jadi kita definisikan asumsi data minimum.
type InstagramPost = {
  id: number | string;
  image?: string;
  imageUrl?: string;
  content?: string;
  caption?: string;
  likes: number;
  shares: number;
  clicks: number;
  impressions: number;
  engagement_rate?: number;
  engagement?: number;
  best_time_posted?: string;
  top_location?: string;
  audience_age?: string;
  reach: number;
  saves?: number;
};
type FacebookPost = {
  id: number | string;
  image?: string;
  imageUrl?: string;
  content?: string;
  caption?: string;
  likes: number;
  shares: number;
  clicks: number;
  impressions: number;
  engagement_rate?: number;
  engagement?: number;
  best_time_posted?: string;
  top_location?: string;
  audience_age?: string;
  reach: number;
  reactions?: {
    like: number;
    love: number;
    haha: number;
    wow: number;
  };
};
type TwitterPost = {
  id: number | string;
  content: string;
  likes: number;
  retweets?: number;
  shares?: number;
  clicks: number;
  impressions: number;
  engagement_rate?: number;
  engagement?: number;
  best_time_posted?: string;
  top_location?: string;
  reach: number;
  replies?: number;
};

const mockPostData = {
  instagram: {
    posts: [
      {
        id: 1,
        image: "https://picsum.photos/200",
        caption: "Produk terbaru kami! 🌟 #NewProduct #UMKM",
        likes: 245,
        shares: 23,
        clicks: 89,
        impressions: 2890,
        engagement_rate: 4.8,
        best_time_posted: "19:30 WIB",
        top_location: "Jakarta",
        audience_age: "25-34",
        reach: 1890,
        saves: 45,
      },
    ],
  },
  facebook: {
    posts: [
      {
        id: 1,
        image: "https://picsum.photos/200",
        caption: "Check out our latest product! 🌟",
        likes: 156,
        shares: 34,
        clicks: 67,
        impressions: 2100,
        engagement_rate: 3.9,
        best_time_posted: "20:00 WIB",
        top_location: "Bandung",
        audience_age: "18-24",
        reach: 1560,
        reactions: {
          like: 120,
          love: 25,
          haha: 8,
          wow: 3,
        },
      },
    ],
  },
  twitter: {
    posts: [
      {
        id: 1,
        content: "Exciting news! Our latest product is here! 🌟",
        likes: 89,
        retweets: 12,
        clicks: 45,
        impressions: 1670,
        engagement_rate: 3.2,
        best_time_posted: "18:30 WIB",
        top_location: "Surabaya",
        reach: 980,
        replies: 15,
      },
    ],
  },
};

const PostAnalysis: React.FC<PostAnalysisProps> = ({
  platform,
  customPost,
}) => {
  let post: InstagramPost | FacebookPost | TwitterPost;
  let isTwitter = platform === "twitter";
  let isInstagram = platform === "instagram";
  let isFacebook = platform === "facebook";

  // Use customPost if provided, otherwise use mockPostData
  if (customPost) {
    post = customPost;
  } else {
    if (isInstagram) {
      post = mockPostData.instagram.posts[0] as InstagramPost;
    } else if (isFacebook) {
      post = mockPostData.facebook.posts[0] as FacebookPost;
    } else {
      post = mockPostData.twitter.posts[0] as TwitterPost;
    }
  }

  // Helper function to get engagement rate, with fallback
  const getEngagementRate = () => {
    return post.engagement_rate || post.engagement || 4.2;
  };

  // Helper function to determine post content
  const getPostContent = () => {
    if (isTwitter) {
      return (post as TwitterPost).content;
    }
    return (
      (post as InstagramPost | FacebookPost).caption ||
      (post as any).content ||
      "No content available"
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Performance Analysis</CardTitle>
          <CardDescription>
            Detailed metrics for your {platform} post
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Post Preview */}
          <div className="border rounded-lg p-4 space-y-4">
            {!isTwitter && ((post as any).imageUrl || (post as any).image) && (
              <div className="aspect-square w-full max-w-sm mx-auto bg-gray-100 rounded-lg overflow-hidden">
                {(post as any).imageUrl && (
                  <img
                    src={(post as any).imageUrl}
                    alt="Post image"
                    className="w-full h-full object-cover"
                  />
                )}
                {!(post as any).imageUrl && (post as any).image && (
                  <img
                    src={(post as any).image}
                    alt="Post image"
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
            )}
            <p className="text-sm text-gray-600">{getPostContent()}</p>
          </div>

          {/* Engagement Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ThumbsUp className="h-4 w-4 text-blue-500" />
                    <span className="text-sm font-medium">Likes</span>
                  </div>
                  <span className="text-2xl font-bold">{post.likes}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Share2 className="h-4 w-4 text-green-500" />
                    <span className="text-sm font-medium">
                      {isTwitter ? "Retweets" : "Shares"}
                    </span>
                  </div>
                  <span className="text-2xl font-bold">
                    {isTwitter
                      ? (post as TwitterPost).retweets || 0
                      : (post as InstagramPost | FacebookPost).shares || 0}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MousePointerClick className="h-4 w-4 text-orange-500" />
                    <span className="text-sm font-medium">Clicks</span>
                  </div>
                  <span className="text-2xl font-bold">{post.clicks}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Advanced Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Engagement Overview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Engagement Rate</span>
                    <span className="font-medium">{getEngagementRate()}%</span>
                  </div>
                  <Progress value={getEngagementRate() * 10} className="h-2" />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Reach</span>
                    <span className="font-medium">
                      {post.reach.toLocaleString()}
                    </span>
                  </div>
                  <Progress
                    value={(post.reach / post.impressions) * 100}
                    className="h-2"
                  />
                </div>

                <div className="pt-4">
                  <Badge variant="outline" className="bg-green-50">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    {getEngagementRate() > 3 ? "Above Average" : "Average"}{" "}
                    Performance
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Audience Insights</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Top Location</span>
                  <Badge variant="secondary">
                    {post.top_location || "Jakarta"}
                  </Badge>
                </div>

                {/* facebook/instagram audience_age */}
                {(isInstagram || isFacebook) && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Primary Age Group</span>
                    <Badge variant="secondary">
                      {(post as InstagramPost | FacebookPost).audience_age ||
                        "25-34"}
                    </Badge>
                  </div>
                )}

                <div className="flex justify-between items-center">
                  <span className="text-sm">Best Time Posted</span>
                  <Badge variant="secondary">
                    {post.best_time_posted || "19:30 WIB"}
                  </Badge>
                </div>

                {/* Only Instagram: saves */}
                {isInstagram && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Saves</span>
                    <Badge variant="secondary">
                      {(post as InstagramPost).saves || 0}
                    </Badge>
                  </div>
                )}

                {/* Only Twitter: replies */}
                {isTwitter && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Replies</span>
                    <Badge variant="secondary">
                      {(post as TwitterPost).replies || 0}
                    </Badge>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PostAnalysis;
