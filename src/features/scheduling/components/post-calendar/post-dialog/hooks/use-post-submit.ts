import { useState } from "react";
import { UseFormReturn } from "react-hook-form";
import { useUploadThing } from "@/lib/utils/uploadthing";
import { trpc } from "@/lib/trpc/client";
import { PostAction, PostFormValues } from "../schema";
import { submitPostWithApproval } from "../components/approval-workflow-integration";
import { FileWithStablePreview } from "./use-media-files";
import { CalendarPost } from "../../types";
import { toast } from "sonner";

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
      onSave?.(result);
      form.reset();
      onClose();
    },
    onError: (error) => {
      console.error("Error updating post:", error);
    },
  });

  // Add resubmit mutation
  const resubmitPostMutation = trpc.approvalRequest.resubmitPost.useMutation({
    onSuccess: () => {
      toast.success("Post resubmitted for review!");
      onSave?.(null);
      form.reset();
      onClose();
    },
    onError: (error) => {
      toast.error(`Failed to resubmit: ${error.message}`);
    },
  });

  // Add submit for approval mutation
  const submitForApprovalMutation =
    trpc.approvalRequest.submitForApproval.useMutation({
      onSuccess: () => {
        toast.success("Post submitted for review!");
        onSave?.(null);
        form.reset();
        onClose();
      },
      onError: (error) => {
        toast.error(`Failed to submit for review: ${error.message}`);
      },
    });

  // Add regular post creation mutation
  const createPostMutation = trpc.post.create.useMutation({
    onSuccess: (result) => {
      console.log("Post created successfully:", result);
      toast.success("Post created successfully!");
      onSave?.(result);
      form.reset();
      onClose();
    },
    onError: (error) => {
      console.error("Error creating post:", error);
      toast.error(`Failed to create post: ${error.message}`);
    },
  });

  // Add publish now mutation
  const publishNowMutation = trpc.post.publishNow.useMutation({
    onSuccess: (result) => {
      console.log("Post published successfully:", result);

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
      toast.error(`Failed to publish post: ${error.message}`);
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

      const mediaToUpload = values.mediaUrls.filter(
        (media) => media.preview.startsWith("blob:") && !media.uploadedUrl
      );

      if (mediaToUpload.length > 0) {
        setIsUploading(true);

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
            throw new Error("Failed to upload media");
          } finally {
            setIsUploading(false);
          }
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
          scheduledAt: values.scheduledAt,
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
            scheduledAt: values.scheduledAt,
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
            scheduledAt: values.scheduledAt,
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
            scheduledAt: values.scheduledAt,
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
              scheduledAt: values.scheduledAt,
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
              scheduledAt: values.scheduledAt,
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
    }
  };

  return {
    isUploading:
      isUploading ||
      updatePostMutation.isPending ||
      resubmitPostMutation.isPending ||
      submitForApprovalMutation.isPending ||
      createPostMutation.isPending ||
      publishNowMutation.isPending,
    handleSubmit,
  };
}
