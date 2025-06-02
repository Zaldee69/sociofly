import { memo } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface FileWithStablePreview extends File {
  preview: string;
  stableId: string;
}

interface SortableImageProps {
  file: FileWithStablePreview;
  index: number;
  onRemove: (file: FileWithStablePreview) => void;
}

export const SortableImage = memo(
  ({ file, index, onRemove }: SortableImageProps) => {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({
      id: file.stableId,
    });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      zIndex: isDragging ? 1 : 0,
      opacity: isDragging ? 0.5 : 1,
      touchAction: "none",
    };

    return (
      <div className="relative group">
        <div
          ref={setNodeRef}
          style={style}
          className="border rounded-md w-fit cursor-move"
          {...attributes}
          {...listeners}
        >
          <img
            src={file.preview}
            alt={file.name}
            className="w-20 h-20 object-cover rounded-lg"
            draggable={false}
          />
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onRemove(file);
          }}
          className="absolute -top-2 -right-2 h-5 w-5 bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 z-50 rounded-full text-sm font-medium hover:cursor-pointer"
        >
          ×
        </button>
      </div>
    );
  },
  (prevProps, nextProps) => {
    // Return true if props are the same (no re-render needed)
    return (
      prevProps.file.stableId === nextProps.file.stableId &&
      prevProps.file.preview === nextProps.file.preview &&
      prevProps.index === nextProps.index
    );
  }
);

SortableImage.displayName = "SortableImage";
