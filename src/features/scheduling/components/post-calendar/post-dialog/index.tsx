"use client";

import { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Instagram, Twitter, Facebook } from "lucide-react";
import { PostStatus } from "@prisma/client";

import { useTeamContext } from "@/lib/contexts/team-context";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { DateTimePicker24hForm } from "@/components/ui/date-time-picker";
import { Form, FormField, FormControl, FormItem } from "@/components/ui/form";
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

import { MediaUploader } from "./components/media-uploader";
import { PostPreview } from "./components/post-preview";
import { PostToolbar } from "./components/post-toolbar";
import { MediaFileList } from "./components/media-file-list";
import { PostActionSelector } from "./components/post-action-selector";
import { SocialAccountPreview } from "./components/social-account-preview";
import { useMediaFiles } from "./hooks/use-media-files";
import { usePostSubmit } from "./hooks/use-post-submit";
import type { AddPostDialogProps, SocialAccount } from "./types";
import { PostAction, PostFormValues, postSchema } from "./schema";
import { SocialAccountSelect } from "../../../../../components/social-account-select";

export function AddPostDialog({
  startDate,
  startTime,
  isOpen,
  onClose,
  onSave,
  onDelete,
  post,
}: AddPostDialogProps) {
  const { currentTeamId } = useTeamContext();
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);

  // Social account state
  const [localSelectedAccounts, setLocalSelectedAccounts] = useState<string[]>(
    post?.postSocialAccounts.map((acc) => acc.id) || []
  );
  const [accountPostPreview, setAccountPostPreview] = useState<
    SocialAccount | undefined
  >(undefined);

  // Initialize form
  const form = useForm<PostFormValues>({
    resolver: zodResolver(postSchema) as any,
    defaultValues: {
      content: post?.content || "",
      mediaUrls: post?.mediaUrls
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
      scheduledAt: post?.scheduledAt
        ? new Date(post.scheduledAt)
        : startDate || new Date(),
      status: post?.status || "DRAFT",
      postAction: post
        ? post.status === "SCHEDULED"
          ? PostAction.SCHEDULE
          : post.status === "DRAFT"
            ? PostAction.SAVE_AS_DRAFT
            : PostAction.PUBLISH_NOW
        : PostAction.PUBLISH_NOW,
      socialAccounts: post?.postSocialAccounts?.length
        ? (post.postSocialAccounts
            .map((acc) => acc.socialAccount?.id)
            .filter(Boolean) as string[])
        : ["placeholder"],
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
  const { isUploading, handleSubmit } = usePostSubmit({
    form,
    teamId: currentTeamId,
    selectedFiles,
    onSave,
    onClose,
  });

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

  // Update form and local state when post data changes
  useEffect(() => {
    if (post?.postSocialAccounts?.length) {
      const accountIds = post.postSocialAccounts.map((acc) => acc.id);
      setLocalSelectedAccounts(accountIds);

      // Set first account as preview
      const firstAccount = post
        .postSocialAccounts[0] as unknown as SocialAccount;
      if (firstAccount) {
        setAccountPostPreview(firstAccount);
      }

      // Update form values
      form.setValue("socialAccounts", accountIds, {
        shouldDirty: true,
        shouldValidate: true,
      });
      form.setValue("content", post.content);

      if (post.mediaUrls?.length) {
        const mediaItems = post.mediaUrls.map((url) => ({
          name: url.split("/").pop() || "file",
          preview: url,
          size: 0,
          type: url.match(/\.(jpg|jpeg|png|gif)$/i)
            ? `image/${url.match(/\.([^.]+)$/)?.[1] || "jpeg"}`
            : "image/jpeg",
          fileId: crypto.randomUUID(),
          uploadedUrl: url,
        }));

        form.setValue("mediaUrls", mediaItems, {
          shouldDirty: true,
          shouldValidate: true,
        });
      }

      form.setValue("scheduledAt", post.scheduledAt, {
        shouldDirty: true,
        shouldValidate: true,
      });

      form.setValue("status", post.status, {
        shouldDirty: true,
        shouldValidate: true,
      });

      // Map PostStatus to PostAction
      const actionMap: Record<PostStatus, PostAction> = {
        SCHEDULED: PostAction.SCHEDULE,
        PUBLISHED: PostAction.PUBLISH_NOW,
        DRAFT: PostAction.SAVE_AS_DRAFT,
        FAILED: PostAction.SAVE_AS_DRAFT,
      };

      form.setValue(
        "postAction",
        actionMap[post.status] || PostAction.SAVE_AS_DRAFT,
        {
          shouldDirty: true,
          shouldValidate: true,
        }
      );
    }
  }, [post, form]);

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
          <DialogTitle>Buat Post</DialogTitle>
          <DialogDescription>
            Buat post untuk akun yang dipilih
          </DialogDescription>
        </DialogHeader>

        <div className="block xl:flex gap-4 h-full max-h-[90vh] overflow-hidden pr-2 xl:pr-0">
          {/* Left panel - Post editor */}
          <div className="w-full xl:w-7/12 pl-2.5 py-2.5 overflow-y-auto">
            <h1 className="text-2xl font-bold mb-4">
              {post?.id ? "Edit Post" : "Buat Post"}
            </h1>

            {/* Social account selector */}
            <SocialAccountSelect
              placeholder="Pilih Akun"
              options={accountOptions}
              defaultValue={localSelectedAccounts}
              onChange={handleAccountChange}
            />

            {/* Media uploader dialog */}
            <MediaUploader
              isOpen={isUploadDialogOpen}
              onOpenChange={setIsUploadDialogOpen}
              onFileSelect={handleFileSelect}
            />

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
                            placeholder="What's on your mind?"
                            className="resize-none border-none active:border-none focus-visible:border-none focus-visible:ring-0 shadow-none p-0 min-h-[150px] max-h-[250px]"
                            rows={10}
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
                        onRemoveFile={removeFile}
                        onReorderFiles={reorderFiles}
                      />
                    </div>

                    {/* Post toolbar */}
                    <div className="mt-4">
                      <PostToolbar
                        onUploadClick={() => setIsUploadDialogOpen(true)}
                        onMediaSelect={(file) => handleFileSelect([file])}
                        media={mediaData?.items || []}
                        onHashtagSelect={handleHashtagSelect}
                      />
                    </div>
                  </div>
                </div>

                {/* Form footer with actions */}
                <DialogFooter className="mt-4 !justify-between">
                  <DialogClose asChild>
                    <Button type="button" variant="outline">
                      Cancel
                    </Button>
                  </DialogClose>

                  <div className="flex gap-2">
                    <DateTimePicker24hForm />

                    <PostActionSelector
                      currentAction={postAction}
                      isUploading={isUploading}
                      onActionChange={(action) =>
                        form.setValue("postAction", action, {
                          shouldDirty: true,
                          shouldValidate: true,
                        })
                      }
                    />
                  </div>
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
      </DialogContent>
    </Dialog>
  );
}
