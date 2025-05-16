"use client";

import { UploadCloud } from "lucide-react";
import { useDropzone } from "react-dropzone";
import { useCallback } from "react";

import {
  Dialog,
  DialogHeader,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FileWithStablePreview } from "../types";

interface MediaUploaderProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onFileSelect: (files: FileWithStablePreview[]) => void;
}

export function MediaUploader({
  isOpen,
  onOpenChange,
  onFileSelect,
}: MediaUploaderProps) {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const filesWithPreview = acceptedFiles.map(
        (file) =>
          Object.assign(file, {
            preview: URL.createObjectURL(file),
            stableId: crypto.randomUUID(),
          }) as FileWithStablePreview
      );
      onFileSelect(filesWithPreview);
      onOpenChange(false);
    },
    [onFileSelect, onOpenChange]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [],
    },
    maxSize: 1024 * 1024 * 5, // 5MB
  });

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload Media</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-6">
          <div
            {...getRootProps()}
            className="border-2 border-dashed p-6 rounded-lg cursor-pointer bg-muted/20 flex flex-col items-center justify-center gap-4 text-center min-h-[200px]"
          >
            <input {...getInputProps()} />
            <UploadCloud className="w-12 h-12 text-primary" />
            {isDragActive ? (
              <p>Drop the files here...</p>
            ) : (
              <p>Drag and drop images here, or click to select files</p>
            )}
            <p className="text-xs text-muted-foreground">
              Supported formats: JPG, PNG, GIF, WebP
              <br />
              Max file size: 5MB
            </p>
            <Button>Select Files</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
