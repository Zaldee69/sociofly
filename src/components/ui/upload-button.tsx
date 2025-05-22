"use client";

import { useState } from "react";
import { UploadDropzone } from "@uploadthing/react";
import { OurFileRouter } from "@/app/api/uploadthing/core";
import { Upload, Link, X } from "lucide-react";
import { Button } from "./button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./dialog";
import { Input } from "./input";
import { toast } from "sonner";
import { useTeamContext } from "@/lib/contexts/team-context";

interface UploadButtonProps {
  onUploadComplete?: (urls: string[]) => void;
  endpoint: keyof OurFileRouter;
  maxFiles?: number;
  teamId?: string;
}

export function UploadButton({
  onUploadComplete,
  endpoint,
  maxFiles = 5,
  teamId,
}: UploadButtonProps) {
  const { currentTeamId } = useTeamContext();
  const [isUrlDialogOpen, setIsUrlDialogOpen] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);

  const currentTeam = teamId || currentTeamId;

  const handleUrlSubmit = () => {
    if (urlInput && onUploadComplete) {
      setUploadedFiles((prev) => [...prev, urlInput]);
      onUploadComplete([...uploadedFiles, urlInput]);
      setUrlInput("");
      setIsUrlDialogOpen(false);
    }
  };

  const removeFile = (index: number) => {
    const newFiles = uploadedFiles.filter((_, i) => i !== index);
    setUploadedFiles(newFiles);
    if (onUploadComplete) {
      onUploadComplete(newFiles);
    }
  };

  if (!currentTeam) {
    return (
      <div className="p-4 bg-yellow-50 text-yellow-800 rounded-md">
        Silakan pilih team terlebih dahulu untuk mengupload file.
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      <UploadDropzone<OurFileRouter, keyof OurFileRouter>
        endpoint={endpoint}
        input={{ teamId: currentTeam }}
        onClientUploadComplete={(res) => {
          if (!res) return;

          // Check for error in the server response data
          const hasError = res.some(
            (file) =>
              "serverData" in file &&
              file.serverData &&
              typeof file.serverData === "object" &&
              "error" in file.serverData
          );
          if (hasError) {
            const errorFile = res.find(
              (file) =>
                "serverData" in file &&
                file.serverData &&
                typeof file.serverData === "object" &&
                "error" in file.serverData
            );
            const serverData = errorFile?.serverData as
              | Record<string, unknown>
              | undefined;
            const errorMessage = serverData?.error
              ? String(serverData.error)
              : "Upload gagal";
            toast.error(errorMessage);
            return;
          }

          const urls = res.map((r) => r.url);
          setUploadedFiles((prev) => [...prev, ...urls]);
          if (onUploadComplete) {
            onUploadComplete([...uploadedFiles, ...urls]);
          }

          toast.success("Upload berhasil");
        }}
        onUploadError={(error: Error) => {
          console.error("Upload error:", error.message);
          toast.error(error.message || "Gagal mengupload file");
        }}
        config={{ mode: "auto" }}
        appearance={{
          container:
            "flex flex-col items-center justify-center w-full min-h-[300px] border-2 border-dashed border-primary/50 rounded-lg bg-muted/50 hover:bg-muted transition-colors duration-200",
          label: "text-2xl font-semibold mb-4",
          allowedContent: "text-sm text-muted-foreground mb-8",
          button: "hidden",
        }}
      />

      <div className="flex justify-center gap-4">
        <Button variant="outline" className="flex items-center gap-2">
          <Upload className="w-4 h-4" />
          From Computer
        </Button>
        <Button
          variant="outline"
          className="flex items-center gap-2"
          onClick={() => setIsUrlDialogOpen(true)}
        >
          <Link className="w-4 h-4" />
          From URL
        </Button>
      </div>

      {uploadedFiles.length > 0 && (
        <div className="mt-4 space-y-2">
          <h3 className="font-medium">Uploaded Files</h3>
          <div className="grid gap-2">
            {uploadedFiles.map((file, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-2 bg-muted rounded-md"
              >
                <span className="text-sm truncate flex-1">{file}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeFile(index)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      <Dialog open={isUrlDialogOpen} onOpenChange={setIsUrlDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add media from URL</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Input
              placeholder="Enter media URL..."
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setIsUrlDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleUrlSubmit}>Add</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
