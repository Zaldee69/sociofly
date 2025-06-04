import { memo } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";

interface FileWithStablePreview extends File {
  preview: string;
  stableId: string;
}

interface SortableImageProps {
  file: FileWithStablePreview;
  index: number;
  onRemove?: (file: FileWithStablePreview) => void;
  disabled?: boolean;
}

export const SortableImage = memo(
  ({ file, index, onRemove, disabled = false }: SortableImageProps) => {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({
      id: file.stableId,
      disabled,
    });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      zIndex: isDragging ? 1 : 0,
      opacity: isDragging ? 0.5 : disabled ? 0.6 : 1,
      touchAction: "none",
    };

    return (
      <div className="relative group">
        <div
          ref={setNodeRef}
          style={style}
          className={cn(
            "border rounded-md w-fit",
            disabled ? "cursor-not-allowed" : "cursor-move"
          )}
          {...(disabled ? {} : { ...attributes, ...listeners })}
        >
          <img
            src={file.preview}
            alt={file.name}
            className="w-20 h-20 object-cover rounded-lg"
            draggable={false}
          />
        </div>
        {onRemove && !disabled && (
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
        )}
      </div>
    );
  },
  (prevProps, nextProps) => {
    // Return true if props are the same (no re-render needed)
    return (
      prevProps.file.stableId === nextProps.file.stableId &&
      prevProps.file.preview === nextProps.file.preview &&
      prevProps.index === nextProps.index &&
      prevProps.disabled === nextProps.disabled &&
      prevProps.onRemove === nextProps.onRemove
    );
  }
);

SortableImage.displayName = "SortableImage";
