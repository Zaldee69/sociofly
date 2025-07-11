import { useState } from "react";
import { UseFormReturn } from "react-hook-form";
import { useUploadThing } from "@/lib/utils/uploadthing";
import { trpc } from "@/lib/trpc/client";
import { PostAction, PostFormValues } from "../schema";
import { submitPostWithApproval } from "../components/approval-workflow-integration";
import { FileWithStablePreview } from "./use-media-files";
import { CalendarPost } from "../../types";
import { toast } from "sonner";
import { addMinutes } from "date-fns";

interface UsePostSubmitProps {
  form: UseFormReturn<PostFormValues>;
  teamId: string | null;
  selectedFiles: FileWithStablePreview[];
  onSave?: (result: any) => void;
  onClose: () => void;
  post?: CalendarPost | null;
}

export function usePostSubmit({
  form,
  teamId,
  selectedFiles,
  onSave,
  onClose,
  post,
}: UsePostSubmitProps) {
  const [isUploading, setIsUploading] = useState(false);

  // Check if post is rejected
  const { data: approvalInstances } = trpc.post.getApprovalInstances.useQuery(
    { postId: post?.id || "" },
    { enabled: !!post?.id }
  );

  const isRejectedPost = approvalInstances?.[0]?.status === "REJECTED";

  const updatePostMutation = trpc.post.update.useMutation({
    onSuccess: (result) => {
      console.log("Post updated successfully:", result);
      setIsUploading(false);
      onSave?.(result);
      form.reset();
      onClose();
    },
    onError: (error) => {
      console.error("Error updating post:", error);
      setIsUploading(false);
    },
  });

  // Add resubmit mutation
  const resubmitPostMutation = trpc.approvalRequest.resubmitPost.useMutation({
    onSuccess: () => {
      setIsUploading(false);
      toast.success("Post resubmitted for review!");
      onSave?.(null);
      form.reset();
      onClose();
    },
    onError: (error) => {
      setIsUploading(false);
      toast.error(`Failed to resubmit: ${error.message}`);
    },
  });

  // Add submit for approval mutation
  const submitForApprovalMutation =
    trpc.approvalRequest.submitForApproval.useMutation({
      onSuccess: () => {
        setIsUploading(false);
        toast.success("Post submitted for review!");
        onSave?.(null);
        form.reset();
        onClose();
      },
      onError: (error) => {
        setIsUploading(false);
        toast.error(`Failed to submit for review: ${error.message}`);
      },
    });

  // Add regular post creation mutation
  const createPostMutation = trpc.post.create.useMutation({
    onSuccess: (result) => {
      console.log("Post created successfully:", result);
      setIsUploading(false);
      toast.success("Post created successfully!");
      onSave?.(result);
      form.reset();
      onClose();
    },
    onError: (error) => {
      console.error("Error creating post:", error);
      setIsUploading(false);
      toast.error(`Failed to create post: ${error.message}`);
    },
  });

  // Add publish now mutation
  const publishNowMutation = trpc.post.publishNow.useMutation({
    onSuccess: (result) => {
      console.log("Post published successfully:", result);
      setIsUploading(false);

      // Check publishing results
      const allSuccessful = result.results.every(
        (publishResult: any) => publishResult.success
      );

      if (allSuccessful) {
        toast.success("Post published successfully to all platforms!");
      } else {
        const failedPlatforms = result.results
          .filter((publishResult: any) => !publishResult.success)
          .map((publishResult: any) => publishResult.platform)
          .join(", ");
        toast.warning(`Post published but failed on: ${failedPlatforms}`);
      }

      onSave?.(result.post);
      form.reset();
      onClose();
    },
    onError: (error) => {
      console.error("Error publishing post:", error);
      setIsUploading(false);
      toast.error(`Failed to publish post: ${error.message}`);
    },
  });

  // Add delete mutation
  const deletePostMutation = trpc.post.delete.useMutation({
    onSuccess: () => {
      console.log("Post deleted successfully");
      setIsUploading(false);
      toast.success("Post deleted successfully!");
      // Signal to parent to refresh data by calling onSave with null
      // This will trigger the calendar to refresh its data
      onSave?.(null);
      form.reset();
      onClose();
    },
    onError: (error) => {
      console.error("Error deleting post:", error);
      setIsUploading(false);
      toast.error(`Failed to delete post: ${error.message}`);
    },
  });

  const { startUpload } = useUploadThing("mediaUploader", {
    onClientUploadComplete: (res) => {
      if (!res) return;
      console.log("Upload completed:", res);
      setIsUploading(false);
    },
    onUploadError: (error) => {
      console.error("Error uploading:", error);
      setIsUploading(false);
    },
  });

  const handleSubmit = async (values: PostFormValues) => {
    console.log(form.getValues());
    try {
      if (!teamId) {
        throw new Error("No team selected");
      }

      // Set loading state immediately when form is submitted
      setIsUploading(true);

      // Determine the final scheduled time based on post action
        let finalScheduledAt: Date;
        
        if (values.postAction === PostAction.PUBLISH_NOW) {
          finalScheduledAt = new Date(); // Use current time for immediate publishing
        } else if (values.postAction === PostAction.SAVE_AS_DRAFT) {
          finalScheduledAt = values.scheduledAt || new Date(); // Use current time as default for drafts
        } else if (values.postAction === PostAction.SCHEDULE || values.postAction === PostAction.REQUEST_REVIEW) {
          // For scheduling and review, use provided time or default to 5 minutes from now
          finalScheduledAt = values.scheduledAt || addMinutes(new Date(), 5);
        } else {
          // Fallback to current time for any other action
          finalScheduledAt = values.scheduledAt || new Date();
        }

      const mediaToUpload = values.mediaUrls.filter(
        (media) => media.preview.startsWith("blob:") && !media.uploadedUrl
      );

      if (mediaToUpload.length > 0) {
        const filesToUpload = mediaToUpload
          .map((media) => {
            return selectedFiles.find((file) => file.stableId === media.fileId);
          })
          .filter(Boolean) as FileWithStablePreview[];

        if (filesToUpload.length > 0) {
          try {
            const uploadResult = await startUpload(
              filesToUpload.map((f) => f as unknown as File),
              { teamId }
            );

            if (uploadResult) {
              const updatedMediaUrls = [...values.mediaUrls];

              uploadResult.forEach((result, index) => {
                if (result) {
                  const fileId = filesToUpload[index].stableId;
                  const mediaIndex = updatedMediaUrls.findIndex(
                    (m) => m.fileId === fileId
                  );

                  if (mediaIndex !== -1) {
                    updatedMediaUrls[mediaIndex] = {
                      ...updatedMediaUrls[mediaIndex],
                      uploadedUrl: result.url,
                    };
                  }
                }
              });

              values.mediaUrls = updatedMediaUrls;
            }
          } catch (error) {
            console.error("Error uploading media:", error);
            setIsUploading(false);
            throw new Error("Failed to upload media");
          }
          // Note: Don't reset isUploading here as mutations will handle it
        }
      }

      // Handle resubmission for rejected posts
      if (
        post?.id &&
        isRejectedPost &&
        values.postAction === PostAction.REQUEST_REVIEW
      ) {
        // First update the post content, then resubmit
        const mediaUrls = values.mediaUrls.map(
          (media) => media.uploadedUrl || media.preview
        );

        await updatePostMutation.mutateAsync({
          id: post.id,
          content: values.content,
          mediaUrls,
          scheduledAt: finalScheduledAt,
          status: "DRAFT",
          socialAccountIds: values.socialAccounts,
        });

        // Then resubmit for approval
        await resubmitPostMutation.mutateAsync({
          postId: post.id,
          restartFromBeginning: false,
        });

        return;
      }

      // Handle regular post updates
      if (post?.id) {
        const mediaUrls = values.mediaUrls.map(
          (media) => media.uploadedUrl || media.preview
        );

        // Handle REQUEST_REVIEW for existing posts
        if (values.postAction === PostAction.REQUEST_REVIEW) {
          // First update the post content, then submit for approval
          await updatePostMutation.mutateAsync({
            id: post.id,
            content: values.content,
            mediaUrls,
            scheduledAt: finalScheduledAt,
            status: "DRAFT", // Keep as DRAFT until approved
            socialAccountIds: values.socialAccounts,
          });

          // Then submit for approval
          await submitForApprovalMutation.mutateAsync({
            postId: post.id,
          });

          return;
        }

        // Handle other post actions
        let status = values.status;
        if (values.postAction === PostAction.PUBLISH_NOW) {
          // For PUBLISH_NOW, update to DRAFT first, then publish
          await updatePostMutation.mutateAsync({
            id: post.id,
            content: values.content,
            mediaUrls,
            scheduledAt: finalScheduledAt,
            status: "DRAFT", // Update to DRAFT first
            socialAccountIds: values.socialAccounts,
          });

          // Then immediately publish using publishNowMutation
          await publishNowMutation.mutateAsync({
            id: post.id,
          });
        } else {
          // Handle other actions normally
          if (values.postAction === PostAction.SCHEDULE) {
            status = "SCHEDULED";
          } else if (values.postAction === PostAction.SAVE_AS_DRAFT) {
            status = "DRAFT";
          }

          await updatePostMutation.mutateAsync({
            id: post.id,
            content: values.content,
            mediaUrls,
            scheduledAt: finalScheduledAt,
            status,
            socialAccountIds: values.socialAccounts,
          });
        }
      }

      // Handle new post creation (only for new posts, not existing ones)
      if (!post?.id) {
        if (values.postAction === PostAction.REQUEST_REVIEW) {
          console.log(values);

          values.needsApproval = true;
          values.approvalWorkflowId = "cmazrs8yb0020vx9edn5yibnt";

          const result = await submitPostWithApproval(values, teamId);
          if (result) {
            onSave?.(result);
            form.reset();
            onClose();
          }
        } else {
          // Handle regular post creation for other actions
          const mediaUrls = values.mediaUrls.map(
            (media) => media.uploadedUrl || media.preview
          );

          // For PUBLISH_NOW, create as DRAFT first, then publish immediately
          if (values.postAction === PostAction.PUBLISH_NOW) {
            // Create post as DRAFT first
            const createdPost = await createPostMutation.mutateAsync({
              content: values.content,
              mediaUrls,
              scheduledAt: finalScheduledAt,
              platform: "ALL", // This is determined by social accounts selection
              teamId: teamId!,
              socialAccountIds: values.socialAccounts,
              postStatus: "DRAFT", // Create as DRAFT first
            });

            // Then immediately publish using publishNowMutation
            await publishNowMutation.mutateAsync({
              id: createdPost.id,
            });
          } else {
            // For other actions, determine status normally
            let status = values.status;
            if (values.postAction === PostAction.SCHEDULE) {
              status = "SCHEDULED";
            } else if (values.postAction === PostAction.SAVE_AS_DRAFT) {
              status = "DRAFT";
            }

            await createPostMutation.mutateAsync({
              content: values.content,
              mediaUrls,
              scheduledAt: finalScheduledAt,
              platform: "ALL", // This is determined by social accounts selection
              teamId: teamId!,
              socialAccountIds: values.socialAccounts,
              postStatus: status,
            });
          }
        }
      }
    } catch (error) {
      console.error("Error submitting post:", error);
      setIsUploading(false);
      // Show error toast if it's not handled by mutations
      if (error instanceof Error) {
        toast.error(`Failed to submit post: ${error.message}`);
      }
    }
  };

  const handleDelete = async (postId: string) => {
    try {
      await deletePostMutation.mutateAsync({ id: postId });
    } catch (error) {
      console.error("Error deleting post:", error);
    }
  };

  return {
    isUploading:
      isUploading ||
      updatePostMutation.isPending ||
      resubmitPostMutation.isPending ||
      submitForApprovalMutation.isPending ||
      createPostMutation.isPending ||
      publishNowMutation.isPending ||
      deletePostMutation.isPending,
    handleSubmit,
    handleDelete,
  };
}
