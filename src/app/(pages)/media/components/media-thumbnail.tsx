import { useState } from "react";
import { Video, Image as ImageIcon } from "lucide-react";
import ReactPlayer from "react-player/lazy";
import { cn } from "@/lib/utils";


interface MediaThumbnailProps {
  item: {
    id: string;
    url: string;
    name: string;
    type: string;
    thumbnailUrl?: string;
  };
  showControls?: boolean;
  className?: string;
}

export const MediaThumbnail = ({
  item,
  showControls = false,
  className,
}: MediaThumbnailProps) => {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const isVideo = item.type.includes("VIDEO") || item.type.startsWith("video/");

  if (isVideo) {
    return hasError ? (
      <div className="flex flex-col items-center justify-center w-full h-full min-h-[200px] bg-muted rounded-lg p-4">
        <Video className="w-12 h-12 text-muted-foreground mb-3" />
        <span className="text-sm text-destructive font-medium">
          Failed to load video
        </span>
      </div>
    ) : (
      <div>
        <video
          className="w-full h-full object-cover"
          src={item.url}
          onError={() => setHasError(true)}
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "group relative w-full bg-muted rounded-lg overflow-hidden",
        showControls ? "min-h-[200px]" : "aspect-square",
        className
      )}
    >
      {hasError ? (
        <div className="flex flex-col items-center justify-center w-full h-full p-4">
          <ImageIcon className="w-12 h-12 text-muted-foreground mb-3" />
          <span className="text-sm text-destructive font-medium">
            Failed to load image
          </span>
        </div>
      ) : (
        <>
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-muted">
              <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          )}
          <img
            src={item.url}
            alt={item.name || `Media ${item.id}`}
            className={cn(
              "w-full h-full transition-all duration-300",
              showControls ? "object-contain" : "object-cover",
              !showControls && "group-hover:scale-105",
              isLoading && "opacity-0"
            )}
            onLoad={() => setIsLoading(false)}
            onError={() => {
              setHasError(true);
              setIsLoading(false);
            }}
          />
        </>
      )}
    </div>
  );
};
