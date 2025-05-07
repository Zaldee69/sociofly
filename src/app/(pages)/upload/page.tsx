"use client";

import { useState } from "react";
import { UploadButton } from "@/components/ui/upload-button";

export default function UploadPage() {
  const [uploadedUrls, setUploadedUrls] = useState<string[]>([]);

  return (
    <div className="container py-10">
      <div className="max-w-2xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold">Upload Media</h1>
          <p className="text-muted-foreground mt-2">
            Upload your images and videos. Maximum file size: 8MB for images,
            64MB for videos.
          </p>
        </div>

        <UploadButton
          endpoint="mediaUploader"
          onUploadComplete={(urls) => {
            setUploadedUrls(urls);
            console.log("Upload complete", urls);
          }}
        />

        {uploadedUrls.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Preview</h2>
            <div className="grid grid-cols-2 gap-4">
              {uploadedUrls.map((url, idx) => {
                const isImage = url.match(/\.(jpg|jpeg|png|gif|webp)$/i);
                const isVideo = url.match(/\.(mp4|webm|ogg)$/i);

                if (isImage) {
                  return (
                    <img
                      key={idx}
                      src={url}
                      alt={`Upload ${idx + 1}`}
                      className="w-full h-48 object-cover rounded-lg"
                    />
                  );
                }

                if (isVideo) {
                  return (
                    <video
                      key={idx}
                      src={url}
                      controls
                      className="w-full h-48 object-cover rounded-lg"
                    />
                  );
                }

                return (
                  <div
                    key={idx}
                    className="flex items-center justify-center h-48 bg-muted rounded-lg"
                  >
                    <p className="text-sm text-muted-foreground break-all px-4">
                      {url}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
