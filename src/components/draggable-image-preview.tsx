import { useDrag } from "react-dnd";
import { fileToBase64 } from "@/lib/utils";
import { useState, useEffect } from "react";

interface DraggableImagePreviewProps {
  files: File[];
}

function DraggableImagePreview({ files }: DraggableImagePreviewProps) {
  const [previews, setPreviews] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    const loadPreviews = async () => {
      const newPreviews: { [key: string]: string } = {};
      for (const file of files) {
        newPreviews[file.name] = await fileToBase64(file);
      }
      setPreviews(newPreviews);
    };
    loadPreviews();
  }, [files]);

  return (
    <div className="grid grid-cols-4 gap-2">
      {files?.map((file) => (
        <DraggableImage
          key={file.name}
          file={file}
          preview={previews[file.name]}
        />
      ))}
    </div>
  );
}

interface DraggableImageProps {
  file: File;
  preview: string;
}

function DraggableImage({ file, preview }: DraggableImageProps) {
  const [{ isDragging }, drag, dragPreview] = useDrag(() => ({
    type: "Dra",
    item: { file },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }));

  return (
    <div
      ref={dragPreview as unknown as React.RefObject<HTMLDivElement>}
      className={`transition-all duration-200 ease-in-out transform ${
        isDragging ? "opacity-50 scale-105 shadow-lg" : "opacity-100 scale-100"
      }`}
    >
      <div
        ref={drag as unknown as React.RefObject<HTMLDivElement>}
        className="cursor-move hover:shadow-md transition-shadow duration-200"
      >
        <img
          src={preview}
          alt="Preview"
          className="w-full h-32 object-cover rounded-md transition-transform duration-200 hover:scale-105"
        />
      </div>
    </div>
  );
}

export default DraggableImagePreview;
