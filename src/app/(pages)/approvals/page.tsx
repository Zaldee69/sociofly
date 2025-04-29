"use client";
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Check, Filter, Image as ImageIcon, Loader2, X } from "lucide-react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

interface Post {
  id: string;
  content: string;
  media?: {
    url: string;
    type: "image" | "video";
  }[];
  platform: "facebook" | "twitter" | "instagram";
  scheduledFor?: string;
  author: {
    id: string;
    name: string;
    avatar?: string;
  };
  team: {
    id: string;
    name: string;
  };
  createdAt: string;
  status: "pending" | "approved" | "rejected";
}

interface ApprovalsProps {
  userRole?: "admin" | "supervisor";
}

export default function Approvals({ userRole = "supervisor" }: ApprovalsProps) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState({
    team: "all",
    platform: "all",
  });
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [isRejectionOpen, setIsRejectionOpen] = useState(false);

  // Sample data for demonstration
  const samplePosts: Post[] = [
    {
      id: "1",
      content:
        "Excited to announce our new product launch! Stay tuned for more updates. #NewProduct #Launch",
      media: [
        {
          url: "https://images.unsplash.com/photo-1531297484001-80022131f5a1?auto=format&w=500&h=500",
          type: "image",
        },
      ],
      platform: "twitter",
      scheduledFor: "2025-05-01T10:00:00Z",
      author: {
        id: "u1",
        name: "Jane Smith",
      },
      team: {
        id: "t1",
        name: "Marketing",
      },
      createdAt: "2025-04-28T14:35:00Z",
      status: "pending",
    },
    {
      id: "2",
      content:
        "Check out our exclusive summer collection now available on our website. Limited stock available!",
      media: [
        {
          url: "https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?auto=format&w=500&h=500",
          type: "image",
        },
      ],
      platform: "facebook",
      scheduledFor: "2025-05-02T15:30:00Z",
      author: {
        id: "u2",
        name: "Mark Johnson",
      },
      team: {
        id: "t2",
        name: "Sales",
      },
      createdAt: "2025-04-29T09:20:00Z",
      status: "pending",
    },
    {
      id: "3",
      content:
        "Behind the scenes look at our latest photoshoot. Coming to your feed next week!",
      media: [
        {
          url: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&w=500&h=500",
          type: "image",
        },
      ],
      platform: "instagram",
      scheduledFor: "2025-05-03T12:00:00Z",
      author: {
        id: "u3",
        name: "Emma Williams",
      },
      team: {
        id: "t1",
        name: "Marketing",
      },
      createdAt: "2025-04-28T16:45:00Z",
      status: "pending",
    },
  ];

  // Simulate loading posts on component mount
  React.useEffect(() => {
    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      setPosts(samplePosts);
      setLoading(false);
    }, 1000);
  }, []);

  // Format date
  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
    });
  };

  // Handle post approval
  const handleApprove = (post: Post) => {
    setLoading(true);

    // Simulate API call
    setTimeout(() => {
      setPosts((currentPosts) =>
        currentPosts.map((p) =>
          p.id === post.id ? { ...p, status: "approved" } : p
        )
      );

      toast.success(`The post by ${post.author.name} has been approved`);

      setLoading(false);
    }, 1000);
  };

  // Open rejection dialog
  const openReject = (post: Post) => {
    setSelectedPost(post);
    setRejectionReason("");
    setIsRejectionOpen(true);
  };

  // Handle post rejection
  const handleReject = () => {
    if (!selectedPost) return;

    setLoading(true);
    setIsRejectionOpen(false);

    // Simulate API call
    setTimeout(() => {
      setPosts((currentPosts) =>
        currentPosts.map((p) =>
          p.id === selectedPost.id ? { ...p, status: "rejected" } : p
        )
      );

      toast.error(`The post by ${selectedPost.author.name} has been rejected`);

      setLoading(false);
      setSelectedPost(null);
    }, 1000);
  };

  // Filter posts
  const filteredPosts = posts.filter((post) => {
    if (filter.team !== "all" && post.team.id !== filter.team) return false;
    if (filter.platform !== "all" && post.platform !== filter.platform)
      return false;
    return true;
  });

  // Get unique teams and platforms for filters
  const teams = Array.from(new Set(posts.map((p) => p.team.id))).map((id) => ({
    id,
    name: posts.find((p) => p.team.id === id)?.team.name || "",
  }));

  const platforms = Array.from(new Set(posts.map((p) => p.platform)));

  // Get platform color
  const getPlatformColor = (platform: string) => {
    switch (platform) {
      case "facebook":
        return "bg-blue-500 hover:bg-blue-600";
      case "twitter":
        return "bg-sky-500 hover:bg-sky-600";
      case "instagram":
        return "bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 hover:from-purple-600 hover:via-pink-600 hover:to-orange-600";
      default:
        return "bg-gray-500 hover:bg-gray-600";
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-1">Content Approvals</h1>
          <p className="text-gray-500 text-sm md:text-base">
            Review and manage content awaiting your approval
          </p>
        </div>

        <div className="flex flex-wrap gap-3 bg-gray-50 dark:bg-gray-900 p-3 rounded-xl shadow-sm">
          <Select
            value={filter.team}
            onValueChange={(value) => setFilter({ ...filter, team: value })}
          >
            <SelectTrigger className="w-[180px] bg-white dark:bg-gray-800 border-0 shadow-sm">
              <SelectValue placeholder="Filter by team" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Teams</SelectLabel>
                <SelectItem value="all">All Teams</SelectItem>
                {teams.map((team) => (
                  <SelectItem key={team.id} value={team.id}>
                    {team.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>

          <Select
            value={filter.platform}
            onValueChange={(value) =>
              setFilter({ ...filter, platform: value as any })
            }
          >
            <SelectTrigger className="w-[180px] bg-white dark:bg-gray-800 border-0 shadow-sm">
              <SelectValue placeholder="Filter by platform" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Platforms</SelectLabel>
                <SelectItem value="all">All Platforms</SelectItem>
                {platforms.map((platform) => (
                  <SelectItem key={platform} value={platform}>
                    {platform.charAt(0).toUpperCase() + platform.slice(1)}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16 bg-white dark:bg-gray-800 rounded-xl shadow-sm">
          <div className="flex flex-col items-center">
            <Loader2 className="h-10 w-10 animate-spin text-primary mb-3" />
            <p className="text-sm text-gray-500">
              Loading approval requests...
            </p>
          </div>
        </div>
      ) : filteredPosts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 bg-white dark:bg-gray-800 rounded-xl shadow-sm">
          <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
            <Check className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium mb-1">All caught up!</h3>
          <p className="text-gray-500 text-center max-w-md">
            No posts found matching your current filters. Try adjusting your
            filters or check back later.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {filteredPosts.map((post) => (
            <Card
              key={post.id}
              className="overflow-hidden transition-all hover:shadow-md border-opacity-50"
            >
              <div className={`h-1 ${getPlatformColor(post.platform)}`} />
              <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center font-medium text-gray-600">
                    {post.author.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">
                      {post.author.name}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span>{post.team.name}</span>
                      <span className="inline-block w-1 h-1 rounded-full bg-gray-300"></span>
                      <span>{formatDate(post.createdAt)}</span>
                    </div>
                  </div>
                  <Badge
                    className={`${getPlatformColor(
                      post.platform
                    )} border-0 text-white`}
                  >
                    {post.platform}
                  </Badge>
                </div>

                <div className="mb-4">
                  <p className="text-sm whitespace-pre-wrap">{post.content}</p>
                </div>

                {post.media && post.media.length > 0 && (
                  <div className="grid gap-2 mb-4 grid-cols-1 sm:grid-cols-2">
                    {post.media.map((media, index) => (
                      <div
                        key={index}
                        className="relative aspect-square bg-gray-50 dark:bg-gray-800 rounded-md overflow-hidden"
                      >
                        {media.type === "image" ? (
                          <img
                            src={media.url}
                            alt={`Post media ${index + 1}`}
                            className="w-full h-full object-cover hover:scale-105 transition-transform"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ImageIcon className="h-10 w-10 text-gray-400" />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex flex-col gap-3">
                  {post.scheduledFor && (
                    <div className="text-xs text-gray-500 flex items-center">
                      <div className="w-2 h-2 rounded-full bg-primary mr-2"></div>
                      Scheduled for {formatDate(post.scheduledFor)}
                    </div>
                  )}

                  <div className="flex gap-3 mt-1">
                    <Button
                      className="flex-1 bg-primary hover:bg-primary/90 text-white"
                      onClick={() => handleApprove(post)}
                      disabled={loading}
                    >
                      <Check className="h-4 w-4 mr-2" />
                      Approve
                    </Button>

                    <Button
                      variant="outline"
                      className="flex-1 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                      onClick={() => openReject(post)}
                      disabled={loading}
                    >
                      <X className="h-4 w-4 mr-2" />
                      Reject
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isRejectionOpen} onOpenChange={setIsRejectionOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reject Post</DialogTitle>
            <DialogDescription>
              Provide feedback to explain why this post is being rejected.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            <div className="space-y-2">
              <Label htmlFor="reason" className="font-medium">
                Rejection Reason
              </Label>
              <Textarea
                id="reason"
                placeholder="Please explain why this post is being rejected..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="min-h-[120px] resize-none"
              />
            </div>
          </div>

          <DialogFooter className="sm:justify-end">
            <Button
              variant="outline"
              onClick={() => setIsRejectionOpen(false)}
              className="md:w-auto"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={!rejectionReason.trim()}
              className="md:w-auto"
            >
              Reject Post
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
