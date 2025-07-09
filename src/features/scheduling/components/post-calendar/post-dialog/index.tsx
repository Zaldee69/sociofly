"use client";

import { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Instagram,
  Twitter,
  Facebook,
  ExternalLink,
  AlertTriangle,
  Trash2,
} from "lucide-react";
import { PostStatus } from "@prisma/client";
import { useRouter } from "next/navigation";
import { addMinutes } from "date-fns";

import { useTeamContext } from "@/lib/contexts/team-context";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { DateTimePicker24hForm } from "@/components/ui/date-time-picker";
import {
  Form,
  FormField,
  FormControl,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogHeader,
  DialogClose,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";

import { MediaUploader } from "./components/media-uploader";
import { PostPreview } from "./components/post-preview";
import { PostToolbar } from "./components/post-toolbar";
import { MediaFileList } from "./components/media-file-list";
import { PostActionSelector } from "./components/post-action-selector";
import { SocialAccountPreview } from "./components/social-account-preview";
import { ApprovalStatusDisplay } from "./components/approval-status";
import { useMediaFiles } from "./hooks/use-media-files";
import { usePostSubmit } from "./hooks/use-post-submit";
import type { AddPostDialogProps, SocialAccount } from "./types";
import { PostAction, PostFormValues, postSchema } from "./schema";
import { SocialAccountSelect } from "../../../../../components/social-account-select";
import { usePostApprovalStatus } from "./components/approval-status";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { InstagramOptimizationTips } from "./components/instagram-optimization-tips";

export function AddPostDialog({
  startDate,
  startTime,
  isOpen,
  onClose,
  onSave,
  onDelete,
  post,
  hideViewDetailsButton = false,
}: AddPostDialogProps) {
  const { currentTeamId } = useTeamContext();
  const router = useRouter();
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);

  // Check if post is published (read-only mode)
  const isPublished = post?.status === "PUBLISHED";
  const isReadOnly = isPublished;

  // Social account state
  const [localSelectedAccounts, setLocalSelectedAccounts] = useState<string[]>(
    []
  );
  const [accountPostPreview, setAccountPostPreview] = useState<
    SocialAccount | undefined
  >(undefined);

  // Initialize form
  const form = useForm<PostFormValues>({
    resolver: zodResolver(postSchema) as any,
    defaultValues: {
      content: "",
      mediaUrls: [],
      scheduledAt: addMinutes(startDate || new Date(), 1),
      status: "DRAFT",
      postAction: PostAction.PUBLISH_NOW,
      socialAccounts: ["placeholder"],
      userId: undefined,
      teamId: currentTeamId || undefined,
      needsApproval: false,
      approvalWorkflowId: undefined,
    },
  });

  // Form field watchers
  const content = form.watch("content");
  const selectedAccounts = form.watch("socialAccounts");
  const postAction = form.watch("postAction");

  // Custom hooks
  const { selectedFiles, handleFileSelect, removeFile, reorderFiles } =
    useMediaFiles(form);
  const { isUploading, handleSubmit, handleDelete } = usePostSubmit({
    form,
    teamId: currentTeamId,
    selectedFiles,
    onSave,
    onClose,
    post,
  });

  // Add approval status check
  const { isRejected, isApproved, isInProgress } = usePostApprovalStatus(
    post?.id || ""
  );

  console.log(selectedAccounts);

  // Fetch social accounts
  const { data: socialAccounts } = trpc.onboarding.getSocialAccounts.useQuery(
    { teamId: currentTeamId! },
    {
      enabled: !!currentTeamId,
      refetchOnWindowFocus: false,
    }
  );

  // Fetch media
  const { data: mediaData } = trpc.media.getAll.useQuery(
    {
      filter: "all",
      search: "",
      teamId: currentTeamId!,
      page: 1,
      limit: 10,
    },
    {
      enabled: !!currentTeamId,
      refetchOnWindowFocus: false,
      staleTime: 1000 * 30,
    }
  );

  // Update form and local state when post data changes or dialog opens
  useEffect(() => {
    if (isOpen) {
      if (post?.postSocialAccounts?.length) {
        // Get the correct social account IDs
        const socialAccountIds = post.postSocialAccounts
          .map((psa) => psa.socialAccount?.id)
          .filter(Boolean) as string[];

        setLocalSelectedAccounts(socialAccountIds);

        // Set first social account as preview
        const firstSocialAccount = post.postSocialAccounts[0]?.socialAccount;
        if (firstSocialAccount) {
          setAccountPostPreview(firstSocialAccount as SocialAccount);
        }

        // Update form values with post data
        form.reset({
          content: post.content,
          mediaUrls: post.mediaUrls?.length
            ? post.mediaUrls.map((url) => ({
                name: url.split("/").pop() || "file",
                preview: url,
                size: 0,
                type: url.match(/\.(jpg|jpeg|png|gif)$/i)
                  ? `image/${url.match(/\.([^.]+)$/)?.[1] || "jpeg"}`
                  : "image/jpeg",
                fileId: crypto.randomUUID(),
                uploadedUrl: url,
              }))
            : [],
          scheduledAt: new Date(post.scheduledAt),
          status: post.status,
          postAction: (() => {
            const actionMap: Record<PostStatus, PostAction> = {
              SCHEDULED: PostAction.SCHEDULE,
              PUBLISHED: PostAction.PUBLISH_NOW,
              DRAFT: PostAction.SAVE_AS_DRAFT,
              FAILED: PostAction.SAVE_AS_DRAFT,
            };
            return actionMap[post.status] || PostAction.SAVE_AS_DRAFT;
          })(),
          socialAccounts: socialAccountIds,
          userId: undefined,
          teamId: currentTeamId || undefined,
          needsApproval: false,
          approvalWorkflowId: undefined,
        });
      } else {
        // Reset form for new post
        form.reset({
          content: "",
          mediaUrls: [],
          scheduledAt: addMinutes(startDate || new Date(), 1),
          status: "DRAFT",
          postAction: PostAction.PUBLISH_NOW,
          socialAccounts: ["placeholder"],
          userId: undefined,
          teamId: currentTeamId || undefined,
          needsApproval: false,
          approvalWorkflowId: undefined,
        });
        setLocalSelectedAccounts([]);
        setAccountPostPreview(undefined);
      }
    }
  }, [post, form, isOpen, startDate, currentTeamId, socialAccounts]);

  // Group accounts by platform
  const groupedAccounts = useMemo(() => {
    if (!socialAccounts) return {};

    return socialAccounts.reduce(
      (acc: Record<string, typeof socialAccounts>, account) => {
        const platform = account.platform;
        if (!acc[platform]) {
          acc[platform] = [];
        }
        acc[platform].push(account);
        return acc;
      },
      {} as Record<string, typeof socialAccounts>
    );
  }, [socialAccounts]);

  // Prepare account options for dropdown
  const accountOptions = useMemo(() => {
    if (!socialAccounts) return [];

    return Object.entries(groupedAccounts || {}).map(([platform, accounts]) => {
      const IconComponent =
        platform === "INSTAGRAM"
          ? Instagram
          : platform === "TWITTER"
            ? Twitter
            : platform === "FACEBOOK"
              ? Facebook
              : undefined;

      return {
        label:
          platform.charAt(0).toUpperCase() + platform.slice(1).toLowerCase(),
        value: platform,
        icon: IconComponent,
        group: true,
        children: (
          accounts as Array<{
            name: string;
            platform: string;
            id: string;
            profilePicture: string;
          }>
        ).map((account) => ({
          label: account.name,
          value: account.id,
          icon: IconComponent,
          profile_picture_url: account.profilePicture,
        })),
      };
    });
  }, [socialAccounts, groupedAccounts]);

  // Handle account selection change
  const handleAccountChange = (values: string[]) => {
    // Update local state
    setLocalSelectedAccounts(values);

    // Update form value
    form.setValue("socialAccounts", values, {
      shouldDirty: true,
      shouldValidate: true,
    });

    // Set preview account if it's the first selection or current preview is no longer selected
    if (
      values.length === 1 ||
      (accountPostPreview && !values.includes(accountPostPreview.id))
    ) {
      if (values[0]) {
        const account = socialAccounts?.find(
          (acc: SocialAccount) => acc.id === values[0]
        );

        if (account) {
          setAccountPostPreview(account);
        }
      } else {
        setAccountPostPreview(undefined);
      }
    }
  };

  // Handle hashtag selection
  const handleHashtagSelect = (hashtag: string) => {
    const currentDescription = form.getValues("content");
    const newDescription = currentDescription
      ? `${currentDescription}${currentDescription.endsWith(" ") ? "" : " "}#${hashtag}`
      : `#${hashtag}`;

    form.setValue("content", newDescription, {
      shouldDirty: true,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="xl:min-w-7xl w-full p-0 max-h-[90vh] overflow-hidden">
        <DialogHeader className="hidden">
          <DialogTitle>{post?.id ? "Edit Post" : "Buat Post"}</DialogTitle>
          <DialogDescription>
            {isPublished
              ? "View published post details"
              : "Buat post untuk akun yang dipilih"}
          </DialogDescription>
        </DialogHeader>

        {/* Loading overlay */}
        {isUploading && (
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <LoadingSpinner className="h-8 w-8" />
              <p className="text-sm font-medium text-muted-foreground">
                Processing your post...
              </p>
            </div>
          </div>
        )}

        <div className="block xl:flex gap-4 h-full max-h-[90vh] overflow-hidden pr-2 xl:pr-0">
          {/* Left panel - Post editor */}
          <div className="w-full xl:w-7/12 pl-2.5 py-2.5 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-2xl font-bold">
                {post?.id
                  ? isPublished
                    ? "View Post"
                    : "Edit Post"
                  : "Buat Post"}
              </h1>

              {/* Navigation to post detail page when editing - only show if not hidden */}
              {post?.id && !hideViewDetailsButton && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    router.push(`/posts/${post.id}`);
                    onClose();
                  }}
                  className="flex items-center gap-2"
                >
                  <ExternalLink className="w-4 h-4" />
                  View Details
                </Button>
              )}
            </div>

            {/* Published post warning */}
            {isPublished && (
              <Alert className="mb-4 border-orange-200 bg-orange-50">
                <AlertTriangle className="h-4 w-4 text-orange-600" />
                <AlertDescription className="text-orange-800">
                  <strong>Post sudah dipublish:</strong> Post ini sudah
                  dipublikasikan ke platform sosial media. Editing dibatasi
                  untuk menjaga konsistensi dengan konten yang sudah live.
                </AlertDescription>
              </Alert>
            )}

            {/* Social account selector */}
            <SocialAccountSelect
              placeholder="Pilih Akun"
              options={accountOptions}
              value={localSelectedAccounts}
              onChange={handleAccountChange}
              disabled={isUploading || isReadOnly}
            />

            {/* Media uploader dialog */}
            {!isReadOnly && (
              <MediaUploader
                isOpen={isUploadDialogOpen}
                onOpenChange={setIsUploadDialogOpen}
                onFileSelect={handleFileSelect}
              />
            )}

            {/* Post form */}
            <Form {...form}>
              <form
                id="event-form"
                onSubmit={form.handleSubmit(handleSubmit)}
                className="contents"
              >
                <div className="mt-4 border border-input rounded-md p-2 min-h-80 flex flex-col">
                  {/* Content textarea */}
                  <FormField
                    control={form.control}
                    name="content"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Textarea
                            placeholder={
                              isReadOnly
                                ? "Post content..."
                                : "What's on your mind?"
                            }
                            className="resize-none border-none active:border-none focus-visible:border-none focus-visible:ring-0 shadow-none p-0 min-h-[150px] max-h-[250px]"
                            rows={10}
                            disabled={isUploading || isReadOnly}
                            readOnly={isReadOnly}
                            {...field}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <div className="flex flex-col justify-end flex-1">
                    {/* Media file list */}
                    <div className="mt-5">
                      <MediaFileList
                        files={selectedFiles}
                        onRemoveFile={isReadOnly ? () => {} : removeFile}
                        onReorderFiles={isReadOnly ? () => {} : reorderFiles}
                        disabled={isUploading || isReadOnly}
                      />
                    </div>

                    {/* Post toolbar */}
                    {!isReadOnly && (
                      <div className="mt-4">
                        <PostToolbar
                          onUploadClick={() => setIsUploadDialogOpen(true)}
                          onMediaSelect={(file) => handleFileSelect([file])}
                          media={mediaData?.items || []}
                          onHashtagSelect={handleHashtagSelect}
                          disabled={isUploading || isReadOnly}
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Show Instagram image requirement message if Instagram account is selected */}

                {!isReadOnly &&
                  localSelectedAccounts.some(
                    (id) =>
                      socialAccounts?.find((acc) => acc.id === id)?.platform ===
                      "INSTAGRAM"
                  ) && (
                    <InstagramOptimizationTips
                      files={selectedFiles}
                      showImageRequirement={selectedFiles.length === 0}
                      className="mt-4"
                    />
                  )}

                <DialogFooter className="mt-4 !justify-between">
                  <div className="flex gap-2">
                    <DialogClose asChild>
                      <Button
                        type="button"
                        variant="outline"
                        disabled={isUploading}
                      >
                        {isReadOnly ? "Close" : "Cancel"}
                      </Button>
                    </DialogClose>

                    {/* Delete button - only show for existing posts */}
                    {post?.id && isReadOnly && (
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        disabled={isUploading}
                        onClick={() => {
                          if (
                            confirm(
                              "Are you sure you want to delete this post?"
                            )
                          ) {
                            handleDelete(post.id);
                          }
                        }}
                        className="flex items-center gap-2"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </Button>
                    )}
                  </div>

                  {!isReadOnly && (
                    <div className="flex gap-2">
                      <FormField
                        control={form.control}
                        name="scheduledAt"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <DateTimePicker24hForm
                                disabled={isUploading || isReadOnly}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <PostActionSelector
                        currentAction={postAction}
                        isUploading={isUploading}
                        postId={post?.id}
                        postStatus={post?.status}
                        teamId={currentTeamId || ""}
                        onActionChange={(action) => {
                          form.setValue("postAction", action, {
                            shouldDirty: true,
                            shouldValidate: true,
                          });
                          // Trigger validation for scheduledAt when action changes to SCHEDULE or REQUEST_REVIEW
                          if (
                            action === PostAction.SCHEDULE ||
                            action === PostAction.REQUEST_REVIEW
                          ) {
                            form.trigger("scheduledAt");
                          }
                        }}
                      />
                    </div>
                  )}
                </DialogFooter>
              </form>
            </Form>
          </div>

          {/* Right panel - Post preview */}
          <div className="w-5/12 bg-[#f7fafc] rounded-r-lg relative hidden xl:block h-full overflow-hidden">
            <SocialAccountPreview
              accounts={selectedAccounts || []}
              allAccounts={socialAccounts}
              currentPreviewAccount={accountPostPreview}
              onSelectPreviewAccount={setAccountPostPreview}
            />

            <div
              className="container overflow-auto"
              style={{ maxHeight: "calc(90vh - 120px)" }}
            >
              <PostPreview
                description={content || ""}
                selectedFiles={selectedFiles}
                accountPostPreview={accountPostPreview}
              />
            </div>
          </div>
        </div>

        {post?.id && (
          <div className="mb-6">
            <ApprovalStatusDisplay postId={post.id} />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
