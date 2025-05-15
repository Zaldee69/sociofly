"use client";

import { Upload } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FileWithPreview } from "../types";

interface MediaUploaderProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onFileSelect: (files: FileWithPreview[]) => void;
}

export function MediaUploader({
  isOpen,
  onOpenChange,
  onFileSelect,
}: MediaUploaderProps) {
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter((file) => {
      const isValid = file.type.startsWith("image/");
      const isValidSize = file.size <= 10 * 1024 * 1024; // 10MB
      return isValid && isValidSize;
    });

    const filesWithPreview = validFiles.map((file) =>
      Object.assign(file, {
        preview: URL.createObjectURL(file),
      })
    ) as FileWithPreview[];

    onFileSelect(filesWithPreview);
    onOpenChange(false);
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const files = Array.from(e.dataTransfer.files);
    const validFiles = files.filter((file) => {
      const isValid = file.type.startsWith("image/");
      const isValidSize = file.size <= 10 * 1024 * 1024; // 10MB
      return isValid && isValidSize;
    });

    const filesWithPreview = validFiles.map((file) =>
      Object.assign(file, {
        preview: URL.createObjectURL(file),
      })
    ) as FileWithPreview[];

    onFileSelect(filesWithPreview);
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl min-w-[600px]">
        <DialogHeader>
          <DialogTitle>Upload Media</DialogTitle>
          <DialogDescription>
            Upload media to include in your post. You can upload multiple files
            at once.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4">
          <div
            className="border-2 border-dashed border-input rounded-lg p-8 text-center"
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onDrop={handleFileDrop}
          >
            <label>
              <div className="flex flex-col items-center gap-2">
                <Upload className="h-10 w-10 text-muted-foreground" />
                <div className="text-sm text-muted-foreground">
                  <span className="font-medium">Click to upload</span> or drag
                  and drop
                </div>
                <div className="text-xs text-muted-foreground">
                  PNG, JPG, GIF up to 10MB
                </div>
              </div>
              <input
                type="file"
                className="hidden"
                multiple
                accept="image/*"
                onChange={handleFileSelect}
              />
            </label>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
