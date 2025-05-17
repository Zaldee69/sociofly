"use client";

import {
  ImagePlus,
  Hash,
  MapPin,
  WandSparkles,
  Image,
  Video,
  FolderOpen,
  PlusCircle,
} from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarSeparator,
  MenubarShortcut,
  MenubarSubTrigger,
  MenubarSub,
  MenubarTrigger,
  MenubarSubContent,
  MenubarCheckboxItem,
  MenubarRadioGroup,
  MenubarRadioItem,
} from "@/components/ui/menubar";

import { MediaThumbnail } from "@/app/(pages)/media/components/media-thumbnail";
import { FileWithStablePreview } from "../types";
import { toast } from "sonner";
import { HashtagBrowser } from "@/components/hashtag-browser";

interface PostToolbarProps {
  onUploadClick: () => void;
  onMediaSelect: (file: FileWithStablePreview) => void;
  onHashtagSelect?: (hashtag: string) => void;
  media: Array<{
    id: string;
    name: string;
    url: string;
    type: any; // Allow any type from server
    createdAt: Date | string;
    size?: number;
    [key: string]: any; // Allow for additional properties
  }>;
}

// Helper function to format file size
const formatBytes = (bytes: number, decimals = 1) => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
};

export function PostToolbar({
  onUploadClick,
  onMediaSelect,
  onHashtagSelect,
  media,
}: PostToolbarProps) {
  return (
    <Menubar className="border-none shadow-none !p-1">
      <MenubarMenu>
        <MenubarTrigger>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild className="cursor-pointer">
                <ImagePlus size={20} />
              </TooltipTrigger>
              <TooltipContent>
                <p>Add Multimedia</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </MenubarTrigger>
        <MenubarContent>
          <MenubarItem onClick={onUploadClick}>
            <Image className="text-black" /> Add Image
          </MenubarItem>
          <MenubarItem>
            <Video className="text-black" /> Add Video
          </MenubarItem>
          <MenubarSeparator />
          <MenubarSub>
            <MenubarSubTrigger>
              <FolderOpen size={16} className="mr-2" />
              Media Library
            </MenubarSubTrigger>
            <MenubarSubContent
              sideOffset={10}
              className="max-w-[450px] overflow-y-auto mb-10"
            >
              <div className="grid grid-cols-3 gap-4">
                {media.map((item) => (
                  <div
                    onClick={() => {
                      const file = new File([item.name], item.name, {
                        type: item.type,
                      });
                      const fileWithPreview = Object.assign(file, {
                        preview: item.url || "",
                        stableId: crypto.randomUUID(),
                      }) as FileWithStablePreview;
                      onMediaSelect(fileWithPreview);
                      toast.success("Media added to post");
                    }}
                    key={item.id}
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
                        <span>
                          {format(new Date(item.createdAt), "MMM d, yyyy")}
                        </span>
                        <span>
                          {item.size ? formatBytes(item.size) : "Unknown"}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </MenubarSubContent>
          </MenubarSub>
          <MenubarSeparator />
          <MenubarItem>
            Print... <MenubarShortcut>⌘P</MenubarShortcut>
          </MenubarItem>
        </MenubarContent>
      </MenubarMenu>
      <MenubarMenu>
        <MenubarTrigger>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Hash size={20} />
              </TooltipTrigger>
              <TooltipContent>
                <p>Add Hashtag</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </MenubarTrigger>
        <MenubarContent side="top" className="w-[400px] p-0">
          <div className="p-4">
            <HashtagBrowser onHashtagClick={onHashtagSelect} />
          </div>
        </MenubarContent>
      </MenubarMenu>
      <MenubarMenu>
        <MenubarTrigger>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <MapPin size={20} />
              </TooltipTrigger>
              <TooltipContent>
                <p>Add Location</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </MenubarTrigger>
        <MenubarContent>
          <MenubarCheckboxItem>Always Show Bookmarks Bar</MenubarCheckboxItem>
          <MenubarCheckboxItem checked>
            Always Show Full URLs
          </MenubarCheckboxItem>
          <MenubarSeparator />
          <MenubarItem inset>
            Reload <MenubarShortcut>⌘R</MenubarShortcut>
          </MenubarItem>
          <MenubarItem disabled inset>
            Force Reload <MenubarShortcut>⇧⌘R</MenubarShortcut>
          </MenubarItem>
          <MenubarSeparator />
          <MenubarItem inset>Toggle Fullscreen</MenubarItem>
          <MenubarSeparator />
          <MenubarItem inset>Hide Sidebar</MenubarItem>
        </MenubarContent>
      </MenubarMenu>
      <MenubarMenu>
        <MenubarTrigger>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <WandSparkles size={20} />
              </TooltipTrigger>
              <TooltipContent>
                <p>Generate Post With AI</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </MenubarTrigger>
        <MenubarContent>
          <MenubarRadioGroup value="benoit">
            <MenubarRadioItem value="andy">Andy</MenubarRadioItem>
            <MenubarRadioItem value="benoit">Benoit</MenubarRadioItem>
            <MenubarRadioItem value="Luis">Luis</MenubarRadioItem>
          </MenubarRadioGroup>
          <MenubarSeparator />
          <MenubarItem inset>Edit...</MenubarItem>
          <MenubarSeparator />
          <MenubarItem inset>Add Profile...</MenubarItem>
        </MenubarContent>
      </MenubarMenu>
    </Menubar>
  );
}
