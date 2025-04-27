// components/draggable-media.tsx
"use client";

import { useDrag, useDrop } from "react-dnd";
import { motion } from "framer-motion";
import { X, CheckCircle2, XCircle } from "lucide-react";
import { useRef } from "react";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";

type DraggableMediaProps = {
  file: {
    id: string;
    name: string;
    type: string;
    preview?: string;
    size: number;
    file?: File;
    isUploaded?: boolean;
    url?: string;
    isSelected?: boolean;
  };
  index: number;
  moveFile: (fromIndex: number, toIndex: number) => void;
  removeFile: (id: string) => void;
  isUploaded?: boolean;
  onPreview: (file: DraggableMediaProps["file"]) => void;
  uploadProgress?: number;
  onCancelUpload?: () => void;
  isDraggable?: boolean;
  isSelected?: boolean;
  onSelect?: () => void;
};

export function DraggableMedia({
  file,
  index,
  moveFile,
  removeFile,
  isUploaded,
  onPreview,
  uploadProgress,
  onCancelUpload,
  isDraggable = true,
  isSelected = false,
  onSelect,
}: DraggableMediaProps) {
  const ref = useRef<HTMLDivElement>(null);

  // Only use drag and drop hooks if isDraggable is true
  const [{ isDragging }, drag] = useDrag(
    () => ({
      type: "MEDIA",
      item: { index },
      collect: (monitor) => ({
        isDragging: monitor.isDragging(),
      }),
      canDrag: isDraggable,
    }),
    [index, isDraggable]
  );

  const [, drop] = useDrop(
    () => ({
      accept: "MEDIA",
      hover: (item: { index: number }, monitor) => {
        if (!ref.current || !isDraggable) return;
        const dragIndex = item.index;
        const hoverIndex = index;

        if (dragIndex === hoverIndex) return;

        const hoverBoundingRect = ref.current.getBoundingClientRect();
        const hoverMiddleX =
          (hoverBoundingRect.right - hoverBoundingRect.left) / 2;
        const clientOffset = monitor.getClientOffset();
        const hoverClientX = clientOffset!.x - hoverBoundingRect.left;

        if (dragIndex < hoverIndex && hoverClientX < hoverMiddleX) return;
        if (dragIndex > hoverIndex && hoverClientX > hoverMiddleX) return;

        moveFile(dragIndex, hoverIndex);
        item.index = hoverIndex;
      },
    }),
    [index, isDraggable, moveFile]
  );

  // Apply drag and drop functionality
  drag(drop(ref));

  const isImage = file.type.startsWith("image/");
  const isVideo = file.type.startsWith("video/");
  const imageUrl = file.url || file.preview;
  const isUploading =
    typeof uploadProgress === "number" && uploadProgress < 100;

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: isDragging ? 0.5 : 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.2 }}
      whileHover={{ scale: isDraggable ? 1.03 : 1 }}
      style={{ opacity: isDragging ? 0.5 : 1 }}
      className={`relative group ${
        isDraggable ? "cursor-pointer" : "cursor-default"
      }`}
      onClick={(e) => {
        e.stopPropagation();
        onPreview(file);
      }}
    >
      {isImage && imageUrl && (
        <img
          src={imageUrl}
          alt={file.name}
          className="h-32 w-32 object-cover rounded-md shadow-sm border border-gray-200"
        />
      )}
      {isVideo && imageUrl && (
        <div className="h-32 w-32 bg-gray-100 rounded-md shadow-sm border border-gray-200 flex items-center justify-center">
          <video className="h-full w-full object-cover rounded-md">
            <source src={imageUrl} type={file.type} />
          </video>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-10 h-10 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="white"
                className="w-6 h-6 ml-1"
              >
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          </div>
        </div>
      )}

      {/* Upload Progress */}
      {isUploading && (
        <div className="absolute inset-0 bg-black/50 rounded-md flex items-center justify-center">
          <div className="w-full px-2">
            <Progress value={uploadProgress} className="h-1" />
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="absolute -top-2 -right-2 flex gap-1">
        {isUploading ? (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onCancelUpload?.();
            }}
            className="bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-red-600"
          >
            <XCircle className="w-3 h-3" />
          </button>
        ) : (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (!isUploaded) {
                removeFile(file.id);
              }
            }}
            className={`${
              isUploaded ? "bg-green-500" : "bg-red-500"
            } text-white rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:${
              isUploaded ? "bg-green-600" : "bg-red-600"
            }`}
          >
            {isUploaded ? (
              <CheckCircle2 className="w-3 h-3" />
            ) : (
              <X className="w-3 h-3" />
            )}
          </button>
        )}
      </div>

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

      <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-1 text-center rounded-b-md truncate">
        {file.name}
        {isUploaded && <span className="ml-1 text-green-400">✓</span>}
      </div>
    </motion.div>
  );
}
