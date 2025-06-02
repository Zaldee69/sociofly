import { useState } from "react";
import { UseFormReturn } from "react-hook-form";
import { useUploadThing } from "@/lib/utils/uploadthing";
import { PostAction, PostFormValues } from "../schema";
import { submitPostWithApproval } from "../components/approval-workflow-integration";
import { FileWithStablePreview } from "./use-media-files";

interface UsePostSubmitProps {
  form: UseFormReturn<PostFormValues>;
  teamId: string | null;
  selectedFiles: FileWithStablePreview[];
  onSave?: (result: any) => void;
  onClose: () => void;
}

export function usePostSubmit({
  form,
  teamId,
  selectedFiles,
  onSave,
  onClose,
}: UsePostSubmitProps) {
  const [isUploading, setIsUploading] = useState(false);

  // Setup UploadThing hook
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

      // Find media items that need to be uploaded (blob URLs)
      const mediaToUpload = values.mediaUrls.filter(
        (media) => media.preview.startsWith("blob:") && !media.uploadedUrl
      );

      // If we have files to upload
      if (mediaToUpload.length > 0) {
        setIsUploading(true);

        // Find the actual File objects that need uploading
        const filesToUpload = mediaToUpload
          .map((media) => {
            return selectedFiles.find((file) => file.stableId === media.fileId);
          })
          .filter(Boolean) as FileWithStablePreview[];

        if (filesToUpload.length > 0) {
          try {
            // Upload files to UploadThing
            const uploadResult = await startUpload(
              filesToUpload.map((f) => f as unknown as File),
              { teamId }
            );

            if (uploadResult) {
              // Update the media URLs with the uploaded URLs
              const updatedMediaUrls = [...values.mediaUrls];

              // Match uploaded files with their entries in mediaUrls
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

              // Update form values with uploaded URLs
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

      // Handle post with approval request
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
        // Handle regular post submission
        // Here you would typically call your API to save the post
        // For now, just resetting the form and closing
        form.reset();
        onClose();
      }
    } catch (error) {
      console.error("Error submitting post:", error);
    }
  };

  return {
    isUploading,
    handleSubmit,
  };
}
