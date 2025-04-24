// components/file-upload-area.tsx
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { isDragActive, motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { DraggableMedia } from "./draggable-media";
import { X, CheckCircle2 } from "lucide-react";
import { UploadDropzone, useUploadThing } from "@/lib/utils/uploadthing";
import { generateClientDropzoneAccept } from "@uploadthing/shared";
import { generatePermittedFileTypes } from "uploadthing/client";
import { useDropzone } from "@uploadthing/react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type FileWithPreview = {
  id: string;
  name: string;
  type: string;
  size: number;
  preview?: string;
  file: File;
  isUploaded?: boolean;
};

export function FileUploadArea() {
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [previewFile, setPreviewFile] = useState<FileWithPreview | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const { startUpload, isUploading } = useUploadThing("imageUploader", {
    onClientUploadComplete: (res) => {
      // Mark files as uploaded instead of clearing them
      console.log("res", res);
      toast.success("File berhasil diupload");
      setFiles((prevFiles) =>
        prevFiles.map((file) => ({
          ...file,
          isUploaded: true,
        }))
      );
      // You might want to add a toast notification here
    },
    onUploadError: (error) => {
      console.error("Upload error:", error);
      toast.error("Gagal mengupload file");
      // Handle error (show toast, etc.)
    },
    onUploadBegin: (file) => {
      console.log("upload has begun for", file);
    },
  });

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const filesWithPreview = acceptedFiles.map((file) => ({
      id: Math.random().toString(36).substring(2, 9),
      name: file.name,
      type: file.type,
      size: file.size,
      preview:
        file.type.startsWith("image/") || file.type.startsWith("video/")
          ? URL.createObjectURL(file)
          : undefined,
      file,
      isUploaded: false,
    }));

    setFiles((prev) => [...prev, ...filesWithPreview]);
  }, []);

  const { routeConfig } = useUploadThing("imageUploader", {
    onClientUploadComplete: () => {
      alert("uploaded successfully!");
    },
    onUploadError: () => {
      alert("error occurred while uploading");
    },
    onUploadBegin: (file) => {
      console.log("upload has begun for", file);
    },
  });

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: generateClientDropzoneAccept(
      generatePermittedFileTypes(routeConfig).fileTypes
    ),
  });

  const moveFile = useCallback((fromIndex: number, toIndex: number) => {
    setFiles((prevFiles) => {
      const updatedFiles = [...prevFiles];
      const [movedFile] = updatedFiles.splice(fromIndex, 1);

      // Revoke old preview URL
      if (movedFile.preview) {
        URL.revokeObjectURL(movedFile.preview);
      }

      // Create new preview URL
      if (
        movedFile.file.type.startsWith("image/") ||
        movedFile.file.type.startsWith("video/")
      ) {
        movedFile.preview = URL.createObjectURL(movedFile.file);
      }

      updatedFiles.splice(toIndex, 0, movedFile);
      return updatedFiles;
    });
  }, []);

  const removeFile = useCallback((id: string) => {
    setFiles((prevFiles) => {
      const fileToRemove = prevFiles.find((f) => f.id === id);
      // Prevent removing uploaded files
      if (fileToRemove?.isUploaded) {
        toast.error("File yang sudah diupload tidak dapat dihapus");
        return prevFiles;
      }
      if (fileToRemove?.preview) {
        URL.revokeObjectURL(fileToRemove.preview);
      }
      return prevFiles.filter((f) => f.id !== id);
    });
  }, []);

  const handlePreview = (file: FileWithPreview) => {
    // Create new preview URL for dialog
    const previewUrl = URL.createObjectURL(file.file);
    setPreviewFile({
      ...file,
      preview: previewUrl,
    });
    setIsPreviewOpen(true);
  };

  // Clean up object URLs when component unmounts or dialog closes
  useEffect(() => {
    return () => {
      files.forEach((file) => {
        if (file.preview) {
          URL.revokeObjectURL(file.preview);
        }
      });
      // Clean up dialog preview URL
      if (previewFile?.preview) {
        URL.revokeObjectURL(previewFile.preview);
      }
    };
  }, [files, previewFile]);

  // Clean up dialog preview URL when dialog closes
  useEffect(() => {
    if (!isPreviewOpen && previewFile?.preview) {
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
          className="text-center p-6 h-full flex flex-col cursor-pointer"
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
            <DndProvider backend={HTML5Backend}>
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
                      onPreview={handlePreview}
                    />
                  ))}
                </div>
              </motion.div>
            </DndProvider>
          )}
        </div>
      </div>

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
              <div className="flex items-center gap-2 text-green-500">
                <CheckCircle2 className="w-4 h-4" />
                <span className="text-sm">Uploaded</span>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <div className="flex justify-end mt-4 gap-2">
        {files.length > 0 && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  const input = document.querySelector(
                    'input[type="file"]'
                  ) as HTMLInputElement;
                  input?.click();
                }}
                disabled={isUploading}
              >
                Add Files
              </Button>
            </motion.div>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <Button
                onClick={() => {
                  // Only upload files that haven't been uploaded yet
                  const filesToUpload = files
                    .filter((f) => !f.isUploaded)
                    .map((f) => f.file);
                  if (filesToUpload.length > 0) {
                    startUpload(filesToUpload);
                  }
                }}
                disabled={isUploading || files.every((f) => f.isUploaded)}
              >
                {isUploading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Uploading...
                  </span>
                ) : (
                  "Upload"
                )}
              </Button>
            </motion.div>
          </>
        )}
      </div>
    </>
  );
}
