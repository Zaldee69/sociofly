'use client'

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Facebook, Instagram, PlusCircle, Twitter, Calendar, CalendarDays, MessageCircle, Plus, MoreHorizontal, Edit, Trash } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";

const mockPosts = [
  {
    id: 1,
    platform: "twitter",
    content:
      "Just launched our new feature! Check it out at example.com #launch #product",
    hasImage: true,
    imageSrc: "https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d",
    scheduledDate: new Date(2025, 3, 25, 10, 30),
    status: "scheduled",
  },
  {
    id: 2,
    platform: "twitter",
    content:
      "Excited to announce our partnership with @partnerCompany! Together we'll bring amazing new features to our users.",
    hasImage: false,
    scheduledDate: new Date(2025, 3, 26, 14, 0),
    status: "sent",
  },
  {
    id: 3,
    platform: "instagram",
    content:
      "Having issues with our service? We're working on fixing them right now. Should be back up in an hour.",
    hasImage: true,
    imageSrc: "https://images.unsplash.com/photo-1493612276216-ee3925520721",
    scheduledDate: new Date(2025, 3, 22, 9, 15),
    status: "failed",
  },
  {
    id: 4,
    platform: "facebook",
    content:
      "Check out our latest blog post about social media management tips!",
    hasImage: false,
    scheduledDate: new Date(2025, 3, 24, 15, 30),
    status: "scheduled",
  },
];

// Mock mentions data
const mockMentions = [
  {
    id: 1,
    platform: "twitter",
    username: "@customer123",
    content:
      "@PostSpark your scheduling tool is amazing! Saved me hours this week.",
    timestamp: new Date(2025, 3, 21, 14, 23),
    profileImage: "https://randomuser.me/api/portraits/men/32.jpg",
  },
  {
    id: 2,
    platform: "twitter",
    username: "@techreviewer",
    content:
      "Been testing @PostSpark for the past week and I'm impressed with how intuitive it is.",
    timestamp: new Date(2025, 3, 22, 10, 15),
    profileImage: "https://randomuser.me/api/portraits/women/44.jpg",
  },
  {
    id: 3,
    platform: "instagram",
    username: "social_media_pro",
    content: "Anyone tried @postspark_app? Looking for a new scheduling tool.",
    timestamp: new Date(2025, 3, 22, 9, 30),
    profileImage: "https://randomuser.me/api/portraits/women/68.jpg",
  },
];

// Mock published posts
const mockPublished = [
  {
    id: 1,
    platform: "twitter",
    content:
      "We're thrilled to announce our latest feature release! Check it out at our website.",
    hasImage: false,
    publishedDate: new Date(2025, 3, 20, 14, 0),
    engagement: {
      likes: 45,
      comments: 12,
      shares: 8,
    },
  },
  {
    id: 2,
    platform: "instagram",
    content: "Behind the scenes at our company retreat last week!",
    hasImage: true,
    imageSrc: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f",
    publishedDate: new Date(2025, 3, 19, 10, 15),
    engagement: {
      likes: 124,
      comments: 23,
      shares: 4,
    },
  },
];

const getPlatformIcon = (platform: string) => {
  switch (platform) {
    case "twitter":
      return <Twitter size={16} className="text-[#1DA1F2]" />;
    case "instagram":
      return <Instagram size={16} className="text-[#E1306C]" />;
    case "facebook":
      return <Facebook size={16} className="text-[#4267B2]" />;
    default:
      return <Twitter size={16} className="text-[#1DA1F2]" />;
  }
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case "scheduled":
      return (
        <Badge className="bg-status-scheduled text-white">Scheduled</Badge>
      );
    case "sent":
      return <Badge className="bg-status-sent text-white">Sent</Badge>;
    case "failed":
      return <Badge className="bg-status-failed text-white">Failed</Badge>;
    default:
      return <Badge>Unknown</Badge>;
  }
};

const Dashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState("all");
  return (
    <div>
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <Button>
          <PlusCircle className="h-4 w-4" />
          Compose
        </Button>
      </div>

      <Tabs onValueChange={setActiveTab} defaultValue="all" className="w-full mt-8">
        <TabsList className="w-full">
          <TabsTrigger value="all" className="cursor-pointer">All Platforms</TabsTrigger>
          <TabsTrigger value="instagram" className="cursor-pointer">Instagram</TabsTrigger>
          <TabsTrigger value="facebook" className="cursor-pointer">Facebook</TabsTrigger>
          <TabsTrigger value="twitter" className="cursor-pointer">Twitter</TabsTrigger>
          {/* <TabsTrigger value="linkedin">LinkedIn</TabsTrigger> */}
        </TabsList>
      </Tabs>

    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
        {/* Stream 1: Scheduled Posts */}
        <Card className="col-span-1">
          <CardHeader className="pb-3 pt-4">
            <CardTitle className="text-lg font-semibold flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Calendar size={18} />
                Scheduled
              </span>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 flex items-center justify-center">
                  <Plus size={16} />
                </Button>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 flex items-center justify-center">
                  <MoreHorizontal size={16} />
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="max-h-[600px] overflow-y-auto pb-2 px-2">
            {mockPosts.filter(post => activeTab === "all" || post.platform === activeTab).map((post) => (
              <div key={post.id} className="mb-3 p-3 hover:bg-muted rounded-md cursor-pointer transition-colors">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    {getPlatformIcon(post.platform)}
                    {getStatusBadge(post.status)}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {format(post.scheduledDate, "MMM d, h:mm a")}
                  </span>
                </div>
                
                <p className="text-sm line-clamp-3 mb-2">{post.content}</p>
                
                {post.hasImage && (
                  <div className="relative mb-2 h-24 bg-muted rounded-md overflow-hidden">
                    <img 
                      src={post.imageSrc} 
                      alt="Post preview" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                
                <div className="flex justify-end gap-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7">
                    <Edit size={14} />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive">
                    <Trash size={14} />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
        
        {/* Stream 2: Published Posts */}
        <Card className="col-span-1">
          <CardHeader className="pb-3 pt-4">
            <CardTitle className="text-lg font-semibold flex items-center justify-between">
              <span className="flex items-center gap-2">
                <CalendarDays size={18} />
                Published
              </span>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 flex items-center justify-center">
                  <Plus size={16} />
                </Button>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 flex items-center justify-center">
                  <MoreHorizontal size={16} />
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="max-h-[600px] overflow-y-auto pb-2 px-2">
            {mockPublished.filter(post => activeTab === "all" || post.platform === activeTab).map((post) => (
              <div key={post.id} className="mb-3 p-3 hover:bg-muted rounded-md cursor-pointer transition-colors">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    {getPlatformIcon(post.platform)}
                    <Badge variant="outline">Published</Badge>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {format(post.publishedDate, "MMM d, h:mm a")}
                  </span>
                </div>
                
                <p className="text-sm line-clamp-3 mb-2">{post.content}</p>
                
                {post.hasImage && (
                  <div className="relative mb-2 h-24 bg-muted rounded-md overflow-hidden">
                    <img 
                      src={post.imageSrc} 
                      alt="Post preview" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                
                <div className="flex justify-between items-center mt-2">
                  <div className="flex gap-3">
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-semibold">{post.engagement.likes}</span>
                      <span className="text-xs text-muted-foreground">likes</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-semibold">{post.engagement.comments}</span>
                      <span className="text-xs text-muted-foreground">comments</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-semibold">{post.engagement.shares}</span>
                      <span className="text-xs text-muted-foreground">shares</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
        
        {/* Stream 3: Mentions */}
        <Card className="col-span-1">
          <CardHeader className="pb-3 pt-4">
            <CardTitle className="text-lg font-semibold flex items-center justify-between">
              <span className="flex items-center gap-2">
                <MessageCircle size={18} />
                Mentions
              </span>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 flex items-center justify-center">
                  <Plus size={16} />
                </Button>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 flex items-center justify-center">
                  <MoreHorizontal size={16} />
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="max-h-[600px] overflow-y-auto pb-2 px-2">
            {mockMentions.filter(mention => activeTab === "all" || mention.platform === activeTab).map((mention) => (
              <div key={mention.id} className="mb-3 p-3 hover:bg-muted rounded-md cursor-pointer transition-colors">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
                    <img 
                      src={mention.profileImage} 
                      alt={mention.username} 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">{mention.username}</span>
                        {getPlatformIcon(mention.platform)}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {format(mention.timestamp, "MMM d, h:mm a")}
                      </span>
                    </div>
                    <p className="text-sm line-clamp-3">{mention.content}</p>
                    
                    <div className="flex justify-end gap-1 mt-2">
                      <Button variant="ghost" size="icon" className="h-7 w-7">
                        <MessageCircle size={14} />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

    </div>
  );
};

export default Dashboard;
