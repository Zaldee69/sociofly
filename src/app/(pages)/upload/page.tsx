"use client";

import { useState } from "react";
import { UploadButton } from "@/components/ui/upload-button";
import { useTeamContext } from "@/lib/contexts/team-context";
import { toast } from "sonner";

export default function UploadPage() {
  const [uploadedUrls, setUploadedUrls] = useState<string[]>([]);
  const { currentTeamId } = useTeamContext();

  return (
    <div className="container py-10">
      <div className="max-w-2xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold">Upload Media</h1>
          <p className="text-muted-foreground mt-2">
            Upload your images and videos. Maximum file size: 16MB for images,
            64MB for videos.
          </p>
        </div>

        <UploadButton
          endpoint="mediaUploader"
          teamId={currentTeamId!}
          onUploadComplete={(urls) => {
            setUploadedUrls(urls);
            toast.success(`${urls.length} file(s) berhasil diupload`);
          }}
        />

        {uploadedUrls.length > 0 && (
          <div className="space-y-4 mt-8">
            <h2 className="text-xl font-semibold">Uploaded Media</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {uploadedUrls.map((url, i) => (
                <div
                  key={i}
                  className="overflow-hidden rounded-md border aspect-square relative"
                >
                  {url.match(/\.(jpeg|jpg|gif|png)$/i) ? (
                    <img
                      src={url}
                      alt={`Uploaded media ${i + 1}`}
                      className="object-cover w-full h-full"
                    />
                  ) : (
                    <video
                      src={url}
                      controls
                      className="object-cover w-full h-full"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
