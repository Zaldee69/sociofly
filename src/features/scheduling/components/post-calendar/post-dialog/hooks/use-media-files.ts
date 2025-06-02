import { useState, useEffect } from "react";
import { UseFormReturn } from "react-hook-form";
import { MediaItem, PostFormValues } from "../schema";

export interface FileWithStablePreview extends File {
  preview: string;
  stableId: string;
}

export function useMediaFiles(form: UseFormReturn<PostFormValues>) {
  const [selectedFiles, setSelectedFiles] = useState<FileWithStablePreview[]>(
    []
  );
  const mediaUrls = form.watch("mediaUrls");

  // Sync between form's mediaUrls and selectedFiles
  useEffect(() => {
    // Only run if mediaUrls exist and selectedFiles is empty
    if (mediaUrls && mediaUrls.length > 0 && selectedFiles.length === 0) {
      // Create file-like objects from mediaItems
      const filesFromMedia = mediaUrls.map((item) => {
        return {
          name: item.name,
          size: item.size,
          type: item.type,
          preview: item.preview,
          stableId: item.fileId || crypto.randomUUID(),
        } as FileWithStablePreview;
      });

      setSelectedFiles(filesFromMedia);
    }
  }, [mediaUrls, selectedFiles.length]);

  // Cleanup function to revoke object URLs
  useEffect(() => {
    return () => {
      // Cleanup preview URLs when component unmounts
      selectedFiles.forEach((file) => {
        if (file.preview && file.preview.startsWith("blob:")) {
          URL.revokeObjectURL(file.preview);
        }
      });
    };
  }, [selectedFiles]);

  const handleFileSelect = (files: File[] | FileWithStablePreview[]) => {
    // Check if files already have preview & stableId (from MediaUploader)
    if (files.length > 0 && "preview" in files[0]) {
      const newFiles = files as FileWithStablePreview[];
      setSelectedFiles((prev) => [...prev, ...newFiles]);

      // Update mediaUrls in form with full metadata
      const currentMediaUrls = form.getValues("mediaUrls") || [];
      const newMediaItems: MediaItem[] = newFiles.map((file) => ({
        preview: file.preview,
        name: file.name,
        size: file.size,
        type: file.type,
        fileId: file.stableId,
      }));

      form.setValue("mediaUrls", [...currentMediaUrls, ...newMediaItems], {
        shouldDirty: true,
        shouldValidate: true,
      });
      return;
    }

    // Handle files from regular file upload
    const filesWithPreview = (files as File[]).map((file) => {
      const preview = URL.createObjectURL(file);
      const stableId = crypto.randomUUID();
      return Object.assign(file, {
        preview,
        stableId,
      }) as FileWithStablePreview;
    });

    setSelectedFiles((prev) => [...prev, ...filesWithPreview]);

    // Update mediaUrls in form with full metadata
    const currentMediaUrls = form.getValues("mediaUrls") || [];
    const newMediaItems: MediaItem[] = filesWithPreview.map((file) => ({
      preview: file.preview,
      name: file.name,
      size: file.size,
      type: file.type,
      fileId: file.stableId,
    }));

    form.setValue("mediaUrls", [...currentMediaUrls, ...newMediaItems], {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  const removeFile = (fileToRemove: FileWithStablePreview) => {
    if (fileToRemove.preview.startsWith("blob:")) {
      URL.revokeObjectURL(fileToRemove.preview);
    }

    // Remove from selectedFiles
    setSelectedFiles((files) =>
      files.filter((file) => file.stableId !== fileToRemove.stableId)
    );

    // Remove from mediaUrls in form
    const currentMediaUrls = form.getValues("mediaUrls") || [];
    const newMediaUrls = currentMediaUrls.filter(
      (item) => item.fileId !== fileToRemove.stableId
    );
    form.setValue("mediaUrls", newMediaUrls, {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  const reorderFiles = (newFiles: FileWithStablePreview[]) => {
    setSelectedFiles(newFiles);

    // Update mediaUrls in form to match the new order while preserving metadata
    const currentMediaUrls = form.getValues("mediaUrls") || [];
    const newMediaUrls = newFiles.map((file) => {
      // Find existing item or create new one
      const existingItem = currentMediaUrls.find(
        (item) => item.fileId === file.stableId
      );
      if (existingItem) return existingItem;

      // Create new item if not found
      return {
        preview: file.preview,
        name: file.name,
        size: file.size,
        type: file.type,
        fileId: file.stableId,
      };
    });

    form.setValue("mediaUrls", newMediaUrls, {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  return {
    selectedFiles,
    handleFileSelect,
    removeFile,
    reorderFiles,
  };
}
