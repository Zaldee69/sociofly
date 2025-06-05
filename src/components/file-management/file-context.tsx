"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from "react";
import { DndContext, closestCenter, DragEndEvent } from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import { FileWithPreview } from "./types";

type FileContextType = {
  files: FileWithPreview[];
  setFiles: (
    files: FileWithPreview[] | ((prev: FileWithPreview[]) => FileWithPreview[])
  ) => void;
  addFiles: (newFiles: FileWithPreview[]) => void;
  removeFile: (id: string) => void;
  moveFile: (fromIndex: number, toIndex: number) => void;
  toggleFileSelection: (fileId: string) => void;
  updateFile: (id: string, updates: Partial<FileWithPreview>) => void;
};

const FileContext = createContext<FileContextType | undefined>(undefined);

export function FileProvider({ children }: { children: ReactNode }) {
  const [files, setFiles] = useState<FileWithPreview[]>([]);

  const addFiles = useCallback((newFiles: FileWithPreview[]) => {
    setFiles((prev) => [...prev, ...newFiles]);
  }, []);

  const removeFile = useCallback((id: string) => {
    setFiles((prevFiles) => {
      const fileToRemove = prevFiles.find((f) => f.id === id);
      if (fileToRemove?.preview) {
        URL.revokeObjectURL(fileToRemove.preview);
      }
      return prevFiles.filter((f) => f.id !== id);
    });
  }, []);

  const moveFile = useCallback((fromIndex: number, toIndex: number) => {
    setFiles((prevFiles) => {
      const updatedFiles = [...prevFiles];
      const [movedFile] = updatedFiles.splice(fromIndex, 1);

      if (movedFile.preview) {
        URL.revokeObjectURL(movedFile.preview);
      }

      if (
        movedFile.file?.type.startsWith("image/") ||
        movedFile.file?.type.startsWith("video/")
      ) {
        movedFile.preview = URL.createObjectURL(movedFile.file);
      }

      updatedFiles.splice(toIndex, 0, movedFile);
      return updatedFiles;
    });
  }, []);

  const toggleFileSelection = useCallback((fileId: string) => {
    setFiles((prevFiles) =>
      prevFiles.map((file) =>
        file.id === fileId ? { ...file, isSelected: !file.isSelected } : file
      )
    );
  }, []);

  const updateFile = useCallback(
    (id: string, updates: Partial<FileWithPreview>) => {
      setFiles((prevFiles) =>
        prevFiles.map((file) =>
          file.id === id ? { ...file, ...updates } : file
        )
      );
    },
    []
  );

  return (
    <FileContext.Provider
      value={{
        files,
        setFiles,
        addFiles,
        removeFile,
        moveFile,
        toggleFileSelection,
        updateFile,
      }}
    >
      {children}
    </FileContext.Provider>
  );
}

export function useFiles() {
  const context = useContext(FileContext);
  if (context === undefined) {
    throw new Error("useFiles must be used within a FileProvider");
  }
  return context;
}
