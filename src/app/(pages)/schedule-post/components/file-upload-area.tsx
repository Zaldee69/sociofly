"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { DraggableMedia } from "./draggable-media";
import { CheckCircle2 } from "lucide-react";
import { useUploadThing } from "@/lib/utils/uploadthing";
import { useDropzone } from "@uploadthing/react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { useFiles } from "../contexts/file-context";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc/client";
import { FileWithPreview } from "../types";
import { useOrganization } from "@/contexts/organization-context";

interface FileUploadAreaProps {
  onUploadStart?: () => void;
  onUploadComplete?: () => void;
  onUploadError?: () => void;
}

export const FileUploadArea = ({
  onUploadStart,
  onUploadComplete,
  onUploadError,
}: FileUploadAreaProps) => {
  const { selectedOrganization } = useOrganization();
  const {
    files,
    setFiles,
    addFiles,
    removeFile,
    moveFile,
    toggleFileSelection,
  } = useFiles();
  const utils = trpc.useUtils();
  const [previewFile, setPreviewFile] = useState<FileWithPreview | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<Set<string>>(new Set());
  const [previewFadeOut, setPreviewFadeOut] = useState(false);

  const { startUpload } = useUploadThing("mediaUploader", {
    onClientUploadComplete: async (res) => {
      if (!res) return;

      // Check for error in the server response data
      const hasError = res.some(
        (file) =>
          "serverData" in file &&
          file.serverData &&
          typeof file.serverData === "object"
      );
      if (hasError) {
        const errorFile = res.find(
          (file) =>
            "serverData" in file &&
            file.serverData &&
            typeof file.serverData === "object"
        );
        const serverData = errorFile?.serverData as
          | Record<string, unknown>
          | undefined;
        const errorMessage = serverData?.error
          ? String(serverData.error)
          : "Upload gagal";

        setFiles((prevFiles) =>
          prevFiles.map((file) => ({
            ...file,
            isUploading: false,
          }))
        );
        setIsUploading(false);
        setUploadingFiles(new Set());

        toast.error(errorMessage);
        onUploadError?.();
        return;
      }

      // Update files with upload status
      setFiles((prevFiles) =>
        prevFiles.map((file) => ({
          ...file,
          isUploaded: true,
          isUploading: false,
        }))
      );

      // Clear upload states
      setIsUploading(false);
      setUploadingFiles(new Set());

      toast.success("File berhasil diupload");
      utils.media.getAll.invalidate({
        organizationId: selectedOrganization?.id,
      });
      onUploadComplete?.();
    },
    onUploadError: (error) => {
      setFiles((prevFiles) =>
        prevFiles.map((file) => ({
          ...file,
          isUploading: false,
        }))
      );
      setIsUploading(false);
      setUploadingFiles(new Set());

      console.error("Upload error:", error);

      // Tampilkan pesan error yang lebih spesifik
      if (error.message?.includes("Not authorized")) {
        toast.error(
          "Anda tidak memiliki izin untuk mengupload media di organisasi ini"
        );
      } else if (error.message?.includes("Failed to run middleware")) {
        toast.error(
          "Gagal menjalankan proses upload. Periksa koneksi atau izin Anda"
        );
      } else {
        toast.error(
          `Gagal mengupload file: ${error.message || "Unknown error"}`
        );
      }

      onUploadError?.();
    },
    onUploadBegin: (fileName: string) => {
      setIsUploading(true);
      onUploadStart?.();

      setUploadingFiles((prev) => {
        const newSet = new Set(prev);
        newSet.add(fileName);
        return newSet;
      });

      setFiles((prevFiles) =>
        prevFiles.map((file) =>
          file.name === fileName ? { ...file, isUploading: true } : file
        )
      );
    },
    onUploadProgress: () => {
      // We don't need to track progress anymore
    },
  });

  const handleFileSelect = useCallback(
    (acceptedFiles: File[]) => {
      // Validate files
      const validFiles = acceptedFiles.filter((file) => {
        const isValidType =
          file.type.startsWith("image/") || file.type.startsWith("video/");
        const isValidSize = file.size <= 10 * 1024 * 1024; // 10MB limit

        if (!isValidType) {
          toast.error(`${file.name} bukan file gambar atau video yang valid`);
          return false;
        }
        if (!isValidSize) {
          toast.error(`${file.name} terlalu besar (max 10MB)`);
          return false;
        }
        return true;
      });

      // Create previews and add to state
      const filesWithPreview: FileWithPreview[] = validFiles.map((file) => ({
        id: Math.random().toString(36).substring(2, 9),
        name: file.name,
        type: file.type,
        size: file.size,
        preview: URL.createObjectURL(file),
        file,
        isUploaded: false,
        isUploading: false,
        uploadProgress: 0,
        isSelected: false,
      }));

      addFiles(filesWithPreview);
    },
    [addFiles]
  );

  const handleUpload = useCallback(async () => {
    if (!selectedOrganization) {
      toast.error("Silakan pilih organisasi terlebih dahulu");
      return;
    }

    const filesToUpload = files.filter((f) => !f.isUploaded && f.file);
    if (filesToUpload.length === 0) return;

    try {
      await startUpload(
        filesToUpload.map((f) => f.file!),
        { organizationId: selectedOrganization.id }
      );
    } catch (error: any) {
      console.error("Upload failed:", error);

      // Tampilkan pesan error yang lebih spesifik
      if (error.message?.includes("Not authorized")) {
        toast.error(
          "Anda tidak memiliki izin untuk mengupload media di organisasi ini"
        );
      } else if (error.message?.includes("Failed to run middleware")) {
        toast.error(
          "Gagal menjalankan proses upload. Periksa koneksi atau izin Anda"
        );
      } else {
        toast.error(
          `Gagal mengupload file: ${error.message || "Unknown error"}`
        );
      }

      onUploadError?.();
    }
  }, [files, startUpload, selectedOrganization, onUploadError]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: handleFileSelect,
    accept: {
      "image/*": [".png", ".jpg", ".jpeg", ".gif"],
      "video/*": [".mp4", ".mov", ".avi"],
    },
    maxSize: 10 * 1024 * 1024, // 10MB
  });

  const handlePreview = (file: FileWithPreview) => {
    const previewUrl =
      file.url || (file.file ? URL.createObjectURL(file.file) : undefined);
    if (previewUrl) {
      setPreviewFile({
        ...file,
        preview: previewUrl,
      });
      setIsPreviewOpen(true);
    }
  };

  useEffect(() => {
    return () => {
      files.forEach((file) => {
        if (file.preview && !file.url) {
          URL.revokeObjectURL(file.preview);
        }
      });
      if (previewFile?.preview && !previewFile.url) {
        URL.revokeObjectURL(previewFile.preview);
      }
    };
  }, [files, previewFile]);

  useEffect(() => {
    if (!isPreviewOpen && previewFile?.preview && !previewFile.url) {
      URL.revokeObjectURL(previewFile.preview);
    }
  }, [isPreviewOpen, previewFile]);

  return (
    <>
      <div
        className={`border-2 border-dashed rounded-md transition-colors min-h-[300px] flex justify-center items-center mt-4 ${
          isDragActive
            ? "border-primary/50 bg-primary/10"
            : "hover:border-primary/50"
        } ${
          files.length > 0
            ? "justify-start items-start"
            : "justify-center items-center"
        }`}
      >
        <div
          {...getRootProps()}
          className={cn(
            "text-center p-6 h-full flex flex-col cursor-pointer w-full",
            {
              "justify-start items-start": files.length > 0,
              "justify-center items-center": files.length === 0,
            }
          )}
        >
          <input {...getInputProps()} />

          {files.length === 0 ? (
            <div className="flex flex-col items-center gap-2">
              <div className="p-3 rounded-full bg-secondary">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-6 h-6"
                >
                  <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7" />
                  <line x1="16" y1="5" x2="22" y2="5" />
                  <line x1="19" y1="2" x2="19" y2="8" />
                  <circle cx="9" cy="9" r="2" />
                  <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                </svg>
              </div>
              <span className="text-sm font-medium">
                {isDragActive
                  ? "Drop files here"
                  : "Click to upload image/video"}
              </span>
              <span className="text-xs text-muted-foreground">
                PNG, JPG, MP4 up to 10MB
              </span>
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full"
            >
              <div className="flex flex-wrap gap-4">
                {files.map((file, index) => (
                  <DraggableMedia
                    key={file.id}
                    file={file}
                    index={index}
                    moveFile={moveFile}
                    removeFile={removeFile}
                    isUploaded={file.isUploaded}
                    isUploading={file.isUploading}
                    uploadProgress={file.uploadProgress}
                    onPreview={handlePreview}
                    isDraggable={!file.isUploaded && !file.isUploading}
                  />
                ))}
              </div>
              <div className="mt-2 text-sm text-muted-foreground">
                {files.some((f) => !f.isUploaded)
                  ? "Drag and drop files to reorder them before uploading"
                  : "Select files to post to Facebook"}
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {files.some((f) => !f.isUploaded) && (
        <div className="mt-4 flex justify-end">
          <Button type="button" onClick={handleUpload} disabled={isUploading}>
            {isUploading ? "Uploading..." : "Upload"}
          </Button>
        </div>
      )}

      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent
          className="max-w-4xl"
          onClick={(e) => e.stopPropagation()}
        >
          <DialogHeader>
            <DialogTitle>{previewFile?.name}</DialogTitle>
          </DialogHeader>
          <div className="relative w-full aspect-video">
            {previewFile?.type.startsWith("image/") && previewFile.preview && (
              <img
                src={previewFile.preview}
                alt={previewFile.name}
                className="w-full h-full object-contain rounded-lg"
              />
            )}
            {previewFile?.type.startsWith("video/") && previewFile.preview && (
              <video
                src={previewFile.preview}
                controls
                className="w-full h-full object-contain rounded-lg"
              />
            )}
          </div>
          <div className="flex justify-between items-center mt-4">
            <div className="text-sm text-muted-foreground">
              {previewFile?.type} •{" "}
              {(previewFile?.size! / 1024 / 1024).toFixed(2)} MB
            </div>
            {previewFile?.isUploaded && (
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-green-500">
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="text-sm">Uploaded</span>
                </div>
                <Checkbox
                  checked={previewFile.isSelected}
                  onCheckedChange={() => {
                    if (previewFile.id) {
                      toggleFileSelection(previewFile.id);
                    }
                  }}
                  className="ml-2"
                />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
