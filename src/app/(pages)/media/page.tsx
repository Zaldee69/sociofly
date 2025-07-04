"use client";

import React, { Fragment, useState, useEffect, useCallback } from "react";
import {
  Image as ImageIcon,
  UploadCloud,
  Grid2x2,
  List,
  Search,
  PlusCircle,
  Loader2,
  ShieldOff,
} from "lucide-react";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { FileUploadArea } from "@/components/file-management/file-upload-area";
import { useFiles } from "@/components/file-management/file-context";
import { MediaThumbnail } from "./components/media-thumbnail";
import Link from "next/link";
import { MediaTable } from "./components/media-table";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { cn } from "@/lib/utils";

import { useTeam } from "@/lib/hooks/use-teams";
import { useTeamContext } from "@/lib/contexts/team-context";
import { useIsMobile } from "@/lib/hooks";
import { useTeamFeatureFlag } from "@/lib/hooks/use-team-feature-flag";
import { Feature } from "@/config/feature-flags";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const Media = () => {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState<"all" | "images" | "videos">("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  const [isUploading, setIsUploading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const isMobile = useIsMobile();

  const { currentTeamId, isLoading: isLoadingTeam } = useTeamContext();
  const { team } = useTeam(currentTeamId || "");

  const { hasFeature } = useTeamFeatureFlag(currentTeamId || undefined);
  const canAccessBasicMediaStorage = hasFeature(Feature.MEDIA_STORAGE_BASIC);
  const canAccessProMediaStorage = hasFeature(Feature.MEDIA_STORAGE_PRO);
  const canAccessUnlimitedMediaStorage = hasFeature(
    Feature.MEDIA_STORAGE_UNLIMITED
  );

  const { setFiles } = useFiles();
  const utils = trpc.useUtils();

  const { data: mediaData, isLoading: isLoadingMedia } =
    trpc.media.getAll.useQuery(
      {
        filter,
        search: searchTerm,
        teamId: currentTeamId!,
        page: currentPage,
        limit: itemsPerPage,
      },
      {
        enabled: !!currentTeamId,
        refetchOnWindowFocus: false,
        staleTime: 1000 * 30, // Cache for 30 seconds
      }
    );

  const media = mediaData?.items || [];
  const totalPages = mediaData?.totalPages || 1;

  const isLoading = isLoadingTeam || isLoadingMedia;

  // Mutations
  const { mutate: deleteMedia } = trpc.media.delete.useMutation({
    onSuccess: () => {
      toast.success("Media deleted successfully");
      utils.media.getAll.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const { mutate: updateTags } = trpc.media.updateTags.useMutation({
    onSuccess: () => {
      toast.success("Tags updated successfully");
      utils.media.getAll.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const { mutate: copyToTeam } = trpc.media.copyToTeam.useMutation({
    onSuccess: () => {
      toast.success("Media copied successfully");
      utils.media.getAll.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Handlers
  const handleDelete = useCallback(
    (id: string) => {
      if (!currentTeamId) return;
      deleteMedia({ id, teamId: currentTeamId });
    },
    [deleteMedia, currentTeamId]
  );

  const handleAddTag = useCallback(
    (mediaId: string, currentTags: string[]) => {
      if (!currentTeamId) return;
      const tag = prompt("Enter new tag:");
      if (tag && !currentTags.includes(tag)) {
        updateTags({
          id: mediaId,
          tags: [...currentTags, tag],
          teamId: currentTeamId,
        });
      }
    },
    [updateTags, currentTeamId]
  );

  return (
    <Fragment>
      {!canAccessBasicMediaStorage && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Feature Not Available</AlertTitle>
          <AlertDescription>
            Your current plan does not support media storage. Please upgrade
            your subscription to access this feature.
          </AlertDescription>
        </Alert>
      )}
      <Card className="min-h-[80vh]">
        <CardHeader className="border-b pb-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            <CardTitle>
              <span className="inline-flex items-center gap-2">
                <ImageIcon className="w-6 h-6 text-primary" />
                Media Library
              </span>
            </CardTitle>

            {/* Team Selector and Upload Button */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
              <Dialog
                open={isDialogOpen}
                onOpenChange={(open) => {
                  // Prevent closing during upload
                  if (!open && isUploading) {
                    toast.error("Please wait until the upload is complete");
                    return;
                  }
                  setIsDialogOpen(open);
                  if (!open) {
                    setFiles([]);
                  }
                }}
              >
                <DialogTrigger className="w-fit" asChild>
                  <Button
                    disabled={!currentTeamId || !canAccessBasicMediaStorage}
                    onClick={() => setIsDialogOpen(true)}
                  >
                    <UploadCloud className="w-4 h-4 mr-2" />
                    Upload Media
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-5xl min-w-[600px]">
                  <DialogHeader>
                    <DialogTitle>Upload Media</DialogTitle>
                    <DialogDescription asChild>
                      <div className="space-y-2">
                        <p className="text-muted-foreground text-sm">
                          Upload media to your library. You can upload multiple
                          files at once.
                        </p>
                        {isUploading && (
                          <p className="text-sm text-yellow-600">
                            Please wait until the upload is complete...
                          </p>
                        )}
                      </div>
                    </DialogDescription>
                  </DialogHeader>
                  {currentTeamId && canAccessBasicMediaStorage ? (
                    <FileUploadArea
                      onUploadStart={() => setIsUploading(true)}
                      onUploadComplete={() => {
                        setIsUploading(false);
                        setIsDialogOpen(false);
                      }}
                      onUploadError={() => setIsUploading(false)}
                    />
                  ) : (
                    <div className="flex items-center justify-center h-[300px] border-2 border-dashed rounded-lg">
                      <div className="text-center text-muted-foreground">
                        <UploadCloud className="w-12 h-12 mx-auto mb-2" />
                        <div>
                          {currentTeamId
                            ? "Your current plan does not support media uploads."
                            : "Select a team to upload media"}
                        </div>
                      </div>
                    </div>
                  )}
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Search and Filter */}
          <div className="mt-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            <div className="flex-1 max-w-md relative">
              <Input
                placeholder="Search media..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                disabled={!canAccessBasicMediaStorage}
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            </div>

            <div className="flex items-center gap-2">
              <Select
                value={filter}
                onValueChange={(value: "all" | "images" | "videos") =>
                  setFilter(value)
                }
                disabled={!canAccessBasicMediaStorage}
              >
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="images">Images</SelectItem>
                  <SelectItem value="videos">Videos</SelectItem>
                </SelectContent>
              </Select>

              <div className="border rounded items-center hidden sm:flex">
                <Button
                  variant="ghost"
                  size="icon"
                  className={viewMode === "grid" ? "bg-accent" : ""}
                  onClick={() => setViewMode("grid")}
                  disabled={!canAccessBasicMediaStorage}
                >
                  <Grid2x2 size={16} />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className={viewMode === "list" ? "bg-accent" : ""}
                  onClick={() => setViewMode("list")}
                  disabled={!canAccessBasicMediaStorage}
                >
                  <List size={16} />
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading || !canAccessBasicMediaStorage ? (
            <div className="flex items-center justify-center min-h-[420px] p-8 flex-1">
              {isLoading ? (
                <div className="animate-spin">
                  <Loader2 className="w-8 h-8 text-muted-foreground" />
                </div>
              ) : (
                <div className="text-center text-muted-foreground">
                  <ShieldOff className="w-12 h-12 mx-auto mb-2" />
                  <p>Media library not available on your current plan.</p>
                </div>
              )}
            </div>
          ) : media.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-[220px] p-8 flex-1">
              <div className="mb-6 flex flex-col items-center gap-2">
                <UploadCloud className="w-12 h-12 text-muted-foreground" />
                <span className="text-lg font-medium">No media found</span>
                <p className="text-muted-foreground text-center text-sm">
                  Try adjusting your filters or upload new media
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Media Grid/List */}
              <div className="min-h-[500px] p-4 overflow-y-auto">
                {viewMode === "grid" || isMobile ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {media.map((item) => (
                      <Link href={item.url} key={item.id} target="_blank">
                        <div
                          className={`group relative cursor-pointer rounded-md overflow-hidden border`}
                        >
                          <div className="aspect-square">
                            <MediaThumbnail item={item} />
                          </div>
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Button
                              variant="outline"
                              size="icon"
                              className="bg-white/80 hover:bg-white"
                            >
                              <PlusCircle size={18} />
                            </Button>
                          </div>
                          <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white p-2">
                            <div className="text-sm truncate">{item.name}</div>
                            <div className="text-xs opacity-80 flex justify-between">
                              <span>
                                {format(
                                  new Date(item.createdAt),
                                  "MMM d, yyyy"
                                )}
                              </span>
                              <span>
                                {(item.size / 1024 / 1024).toFixed(1)} MB
                              </span>
                            </div>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <MediaTable
                    items={media}
                    onDelete={handleDelete}
                    onAddTag={handleAddTag}
                  />
                )}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="py-4 border-t hidden md:block">
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          onClick={() =>
                            setCurrentPage((p) => Math.max(1, p - 1))
                          }
                          className={cn(
                            "cursor-pointer",
                            currentPage === 1 &&
                              "pointer-events-none opacity-50"
                          )}
                        />
                      </PaginationItem>
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                        (page) => (
                          <PaginationItem key={page}>
                            <PaginationLink
                              onClick={() => setCurrentPage(page)}
                              isActive={currentPage === page}
                              className="cursor-pointer"
                            >
                              {page}
                            </PaginationLink>
                          </PaginationItem>
                        )
                      )}
                      <PaginationItem>
                        <PaginationNext
                          onClick={() =>
                            setCurrentPage((p) => Math.min(totalPages, p + 1))
                          }
                          className={cn(
                            "cursor-pointer",
                            currentPage === totalPages &&
                              "pointer-events-none opacity-50"
                          )}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </Fragment>
  );
};

export default Media;
