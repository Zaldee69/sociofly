import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { SortableImage } from "./sortable-image";
import { MediaItem } from "../schema";

interface FileWithStablePreview extends File {
  preview: string;
  stableId: string;
}

interface MediaFileListProps {
  files: FileWithStablePreview[];
  onRemoveFile: (file: FileWithStablePreview) => void;
  onReorderFiles: (newFiles: FileWithStablePreview[]) => void;
}

export function MediaFileList({
  files,
  onRemoveFile,
  onReorderFiles,
}: MediaFileListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = files.findIndex((file) => file.stableId === active.id);
      const newIndex = files.findIndex((file) => file.stableId === over.id);

      // Use arrayMove to reorder the files array
      const newFiles = arrayMove([...files], oldIndex, newIndex);

      // Notify parent component about reordering
      onReorderFiles(newFiles);
    }
  };

  if (files.length === 0) return null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={files.map((f) => f.stableId)}
        strategy={rectSortingStrategy}
      >
        <div className="flex flex-wrap gap-2 aspect-auto">
          {files.map((file, index) => (
            <SortableImage
              key={file.stableId}
              file={file}
              index={index}
              onRemove={onRemoveFile}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
