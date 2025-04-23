"use client";
import React, { useState } from "react";
import {
  FileText,
  Edit,
  Trash2,
  Instagram,
  Twitter,
  Facebook,
  Search,
  Plus,
  RefreshCw,
  Calendar,
  ExternalLink,
  MessageCircle,
  Share2,
  Eye,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

// Enhanced dummy posts
const dummyPosts = [
  {
    id: "1",
    status: "Scheduled",
    platform: "Twitter",
    content:
      "Yuk, jadwalkan post-mu dengan PostSpark 🚀 #socialmedia #scheduling",
    image:
      "https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?w=120&q=80",
    scheduledAt: "2025-04-23 09:00",
    engagement: { likes: 0, comments: 0, shares: 0 },
  },
  {
    id: "2",
    status: "Sent",
    platform: "Instagram",
    content: "Cek fitur Media Library terbaru! 📸 #update #postspark",
    image:
      "https://images.unsplash.com/photo-1493612276216-ee3925520721?w=120&q=80",
    scheduledAt: "2025-04-20 12:00",
    engagement: { likes: 45, comments: 12, shares: 5 },
  },
  {
    id: "3",
    status: "Failed",
    platform: "Twitter",
    content:
      "Oops! Post sebelumnya gagal dikirim. Coba lagi nanti! #troubleshooting",
    image: "",
    scheduledAt: "2025-04-18 18:30",
    engagement: { likes: 0, comments: 0, shares: 0 },
  },
  {
    id: "4",
    status: "Sent",
    platform: "Facebook",
    content:
      "Apa strategi konten sosial media favorit Anda? Bagikan di komentar! #strategy #socialmedia",
    image: "",
    scheduledAt: "2025-04-15 10:00",
    engagement: { likes: 28, comments: 15, shares: 3 },
  },
  {
    id: "5",
    status: "Scheduled",
    platform: "Instagram",
    content:
      "Coming soon: fitur analitik yang lebih lengkap! Stay tuned! #analytics #update",
    image:
      "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=120&q=80",
    scheduledAt: "2025-04-25 14:30",
    engagement: { likes: 0, comments: 0, shares: 0 },
  },
];

const statusColor: Record<string, string> = {
  Scheduled: "bg-sky-100 text-sky-800",
  Sent: "bg-green-100 text-green-800",
  Failed: "bg-red-100 text-red-800",
};

const platformIcon: Record<string, React.ReactNode> = {
  Twitter: <Twitter className="w-4 h-4 text-sky-500" />,
  Instagram: <Instagram className="w-4 h-4 text-pink-500" />,
  Facebook: <Facebook className="w-4 h-4 text-blue-500" />,
};

const statuses = ["All", "Scheduled", "Sent", "Failed"] as const;
const platforms = ["All", "Twitter", "Instagram", "Facebook"] as const;

const PostsPage = () => {
  const [statusFilter, setStatusFilter] =
    useState<(typeof statuses)[number]>("All");
  const [platformFilter, setPlatformFilter] =
    useState<(typeof platforms)[number]>("All");
  const [viewType, setViewType] = useState<"list" | "grid">("list");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPost, setSelectedPost] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  // Filter posts based on filters
  const filteredPosts = dummyPosts.filter((post) => {
    const matchesStatus =
      statusFilter === "All" || post.status === statusFilter;
    const matchesPlatform =
      platformFilter === "All" || post.platform === platformFilter;
    const matchesSearch =
      searchTerm === "" ||
      post.content.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesStatus && matchesPlatform && matchesSearch;
  });

  const selectedPostDetails = selectedPost
    ? dummyPosts.find((p) => p.id === selectedPost)
    : null;

  return (
    <Card>
      <CardHeader className="border-b pb-4">
        <div className="flex justify-between items-center">
          <CardTitle>
            <span className="inline-flex items-center gap-2">
              <FileText className="w-6 h-6 text-primary" />
              Post Management
            </span>
          </CardTitle>
          <Button>
            <Plus size={16} className="mr-1" />
            Schedule Post
          </Button>
        </div>

        <div className="mt-6 flex flex-wrap gap-4 justify-between items-center">
          <div className="flex flex-1 max-w-md relative">
            <Input
              placeholder="Search posts..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          </div>

          <div className="flex items-center gap-2">
            <Select
              value={platformFilter}
              onValueChange={(value) =>
                setPlatformFilter(value as (typeof platforms)[number])
              }
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Platform" />
              </SelectTrigger>
              <SelectContent>
                {platforms.map((platform) => (
                  <SelectItem key={platform} value={platform}>
                    {platform}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={statusFilter}
              onValueChange={(value) =>
                setStatusFilter(value as (typeof statuses)[number])
              }
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                {statuses.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button variant="ghost" size="icon">
              <RefreshCw size={16} />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="flex">
          {/* Posts list */}
          <div className={`w-full min-h-[500px]`}>
            {filteredPosts.length === 0 ? (
              <div className="text-muted-foreground text-center py-12">
                <div className="text-lg font-semibold mb-2">
                  Belum ada post terjadwal
                </div>
                <div>
                  Klik <span className="font-semibold">+ Schedule Post</span>{" "}
                  untuk mulai menjadwalkan konten!
                </div>
              </div>
            ) : viewType === "list" ? (
              <div className="overflow-x-auto">
                <table className="min-w-full table-auto border-collapse">
                  <thead>
                    <tr className="bg-muted">
                      <th className="p-3 text-left text-sm font-medium">
                        Status
                      </th>
                      <th className="p-3 text-left text-sm font-medium">
                        Platform
                      </th>
                      <th className="p-3 text-left text-sm font-medium">
                        Content
                      </th>
                      <th className="p-3 text-left text-sm font-medium">
                        Scheduled At
                      </th>
                      <th className="p-3 text-left text-sm font-medium">
                        Engagement
                      </th>
                      <th className="p-3 text-center text-sm font-medium">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPosts.map((post) => (
                      <tr
                        key={post.id}
                        className={`border-b last:border-b-0 hover:bg-muted/50 cursor-pointer ${
                          selectedPost === post.id ? "bg-primary/5" : ""
                        }`}
                        onClick={() => {
                          setSelectedPost(post.id)
                          setOpen(true)
                        }}
                      >
                        <td className="px-3 py-2">
                          <span
                            className={
                              "inline-block px-2 py-1 rounded text-xs font-semibold " +
                              (statusColor[post.status] || "")
                            }
                          >
                            {post.status}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <div className="inline-flex items-center gap-1">
                            {platformIcon[post.platform] || null}
                            <span className="text-xs">{post.platform}</span>
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex gap-2 items-center max-w-[250px]">
                            {post.image && (
                              <img
                                src={post.image}
                                alt=""
                                className="w-10 h-10 rounded object-cover border"
                              />
                            )}
                            <span className="truncate">{post.content}</span>
                          </div>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-xs text-muted-foreground">
                          {post.scheduledAt}
                        </td>
                        <td className="px-3 py-2">
                          {post.status === "Sent" && (
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span>{post.engagement.likes} likes</span>
                              <span>{post.engagement.comments} comments</span>
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-2 text-center">
                          <div className="flex justify-center gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label="Edit"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 p-4 gap-4">
                {filteredPosts.map((post) => (
                  <Card
                    key={post.id}
                    className={`overflow-hidden cursor-pointer ${
                      selectedPost === post.id ? "ring-2 ring-primary" : ""
                    }`}
                    onClick={() => {
                      setSelectedPost(post.id)
                      setOpen(true)
                    }}
                  >
                    <CardContent className="p-0">
                      {post.image && (
                        <div className="h-40 w-full">
                          <img
                            src={post.image}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        </div>
                      )}
                      <div className="p-4">
                        <div className="flex justify-between items-center mb-2">
                          <div className="flex items-center gap-2">
                            {platformIcon[post.platform]}
                            <span
                              className={
                                "inline-block px-2 py-0.5 rounded-full text-xs font-medium " +
                                (statusColor[post.status] || "")
                              }
                            >
                              {post.status}
                            </span>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {post.scheduledAt}
                          </span>
                        </div>
                        <p className="text-sm mb-3 line-clamp-3">
                          {post.content}
                        </p>

                        <div className="flex justify-between items-center">
                          {post.status === "Sent" ? (
                            <div className="flex gap-2 text-xs text-muted-foreground">
                              <span>{post.engagement.likes} likes</span>
                              <span>•</span>
                              <span>{post.engagement.comments} comments</span>
                            </div>
                          ) : (
                            <div></div>
                          )}
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Content Details</DialogTitle>
              </DialogHeader>
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      {platformIcon[selectedPostDetails?.platform || ""]}
                      <span
                        className={
                          "inline-block px-2 py-0.5 rounded text-xs font-semibold " +
                          (statusColor[selectedPostDetails?.status || ""] || "")
                        }
                      >
                        {selectedPostDetails?.status}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {selectedPostDetails?.scheduledAt}
                    </span>
                  </div>

                  <div className="mb-4">
                    <p className="text-sm whitespace-pre-line">
                      {selectedPostDetails?.content}
                    </p>
                  </div>

                  {selectedPostDetails?.image && (
                    <div className="mb-4 rounded-md overflow-hidden border">
                      <img
                        src={selectedPostDetails?.image}
                        alt=""
                        className="w-full h-auto max-h-[200px] object-cover"
                      />
                    </div>
                  )}

                  {selectedPostDetails?.status === "Sent" && (
                    <div className="mb-4 p-3 bg-muted rounded-md">
                      <h4 className="text-sm font-medium mb-2">Performance</h4>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="p-2 bg-white rounded shadow-sm">
                          <div className="font-semibold">
                            {selectedPostDetails?.engagement.likes}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Likes
                          </div>
                        </div>
                        <div className="p-2 bg-white rounded shadow-sm">
                          <div className="font-semibold">
                            {selectedPostDetails?.engagement.comments}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Comments
                          </div>
                        </div>
                        <div className="p-2 bg-white rounded shadow-sm">
                          <div className="font-semibold">
                            {selectedPostDetails?.engagement.shares}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Shares
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col gap-2 mt-6">
                    {selectedPostDetails?.status === "Scheduled" && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full justify-start"
                        >
                          <Calendar size={14} className="mr-2" />
                          Reschedule
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full justify-start"
                        >
                          <Share2 size={14} className="mr-2" />
                          Publish Now
                        </Button>
                      </>
                    )}

                    {selectedPostDetails?.status === "Sent" && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full justify-start"
                        >
                          <Eye size={14} className="mr-2" />
                          View on {selectedPostDetails?.platform}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full justify-start"
                        >
                          <MessageCircle size={14} className="mr-2" />
                          View Comments
                        </Button>
                      </>
                    )}

                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-start"
                    >
                      <Edit size={14} className="mr-2" />
                      Edit Post
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-start"
                    >
                      <ExternalLink size={14} className="mr-2" />
                      Duplicate
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-start text-destructive"
                    >
                      <Trash2 size={14} className="mr-2" />
                      Delete
                    </Button>
                  </div>
                </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardContent>
    </Card>
  );
};

export default PostsPage;
