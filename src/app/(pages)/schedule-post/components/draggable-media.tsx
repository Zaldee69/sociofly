// components/draggable-media.tsx
"use client";

import { useDrag, useDrop } from "react-dnd";
import { motion } from "framer-motion";
import { X, CheckCircle2, Loader2 } from "lucide-react";
import { useRef } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { FileWithPreview } from "../types";

interface DraggableMediaProps {
  file: FileWithPreview;
  index: number;
  moveFile: (fromIndex: number, toIndex: number) => void;
  removeFile: (id: string) => void;
  isUploaded?: boolean;
  isUploading?: boolean;
  uploadProgress?: number;
  onPreview: (file: FileWithPreview) => void;
  isDraggable: boolean;
  isSelected?: boolean;
  onSelect?: () => void;
}

export const DraggableMedia = ({
  file,
  index,
  moveFile,
  removeFile,
  isUploaded,
  isUploading,
  onPreview,
  isDraggable,
  isSelected = false,
  onSelect,
}: DraggableMediaProps) => {
  const ref = useRef<HTMLDivElement>(null);

  const [{ isDragging }, drag] = useDrag({
    type: "MEDIA",
    item: { index },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
    canDrag: isDraggable,
  });

  const [, drop] = useDrop({
    accept: "MEDIA",
    hover: (item: { index: number }) => {
      if (item.index !== index) {
        moveFile(item.index, index);
        item.index = index;
      }
    },
  });

  // Combine drag and drop refs
  drag(drop(ref));

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      className={`relative group ${isDragging ? "opacity-50" : ""}`}
    >
      <div
        className="relative w-32 h-32 rounded-lg overflow-hidden cursor-pointer"
        onClick={(e) => {
          e.stopPropagation();
          onPreview(file);
        }}
      >
        {file.type.startsWith("image/") && file.preview && (
          <img
            src={file.preview}
            alt={file.name}
            className="w-full h-full object-cover"
          />
        )}
        {file.type.startsWith("video/") && file.preview && (
          <video src={file.preview} className="w-full h-full object-cover" />
        )}

        {/* Loading Overlay */}
        {isUploading && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-white animate-spin" />
          </div>
        )}

        {/* Success Overlay */}
        {isUploaded && (
          <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6 text-green-500" />
          </div>
        )}
      </div>

      {/* Remove Button - Only show if file is not uploaded and not uploading */}
      {!isUploading && !isUploaded && (
        <Button
          variant="destructive"
          size="icon"
          className="absolute -top-2 -right-2 w-6 h-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            removeFile(file.id);
          }}
        >
          <X className="w-4 h-4" />
        </Button>
      )}

      {/* Selection Checkbox */}
      {isUploaded && onSelect && (
        <div className="absolute top-2 left-2 z-10">
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => {
              onSelect();
            }}
            className="bg-white/80 hover:bg-white"
          />
        </div>
      )}

      {/* File Name */}
      <div className="mt-1 text-xs text-center truncate max-w-[128px]">
        {file.name}
      </div>
    </motion.div>
  );
};
