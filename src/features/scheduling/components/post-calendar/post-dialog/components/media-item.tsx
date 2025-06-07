import { format } from "date-fns";
import { PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MediaThumbnail } from "@/app/(pages)/media/components/media-thumbnail";
import { FileWithStablePreview } from "../types";
import { toast } from "sonner";
import { memo } from "react";

interface MediaItemProps {
  item: {
    id: string;
    name: string;
    url: string;
    type: any;
    createdAt: Date | string;
    size?: number;
  };
  onMediaSelect: (file: FileWithStablePreview) => void;
}

// Helper function to format file size
const formatBytes = (bytes: number, decimals = 2): string => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
};

export const MediaItem = memo(function MediaItem({
  item,
  onMediaSelect,
}: MediaItemProps) {
  const handleClick = () => {
    const file = new File([item.name], item.name, {
      type: item.type,
    });
    const fileWithPreview = Object.assign(file, {
      preview: item.url || "",
      stableId: crypto.randomUUID(),
    }) as FileWithStablePreview;
    onMediaSelect(fileWithPreview);
    toast.success("Media added to post");
  };

  return (
    <div
      onClick={handleClick}
      className="group relative cursor-pointer rounded-md overflow-hidden border max-w-40"
    >
      <div className="aspect-square">
        <MediaThumbnail item={item} />
      </div>
      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
        <Button
          variant="outline"
          size="icon"
          className="bg-white/80 hover:bg-white"
        >
          <PlusCircle size={18} />
        </Button>
      </div>
      <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white p-2">
        <div className="text-sm truncate">{item.name}</div>
        <div className="text-xs opacity-80 flex justify-between">
          <span>{format(new Date(item.createdAt), "MMM d, yyyy")}</span>
          <span>{item.size ? formatBytes(item.size) : "Unknown"}</span>
        </div>
      </div>
    </div>
  );
});
