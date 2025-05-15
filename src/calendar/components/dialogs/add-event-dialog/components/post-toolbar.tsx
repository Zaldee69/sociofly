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
import { MediaThumbnail } from "../../../media-thumbnail";
import { FileWithPreview } from "../types";

interface PostToolbarProps {
  onUploadClick: () => void;
  onMediaSelect: (file: FileWithPreview) => void;
  media: any[];
}

export function PostToolbar({
  onUploadClick,
  onMediaSelect,
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
                      }) as FileWithPreview;
                      onMediaSelect(fileWithPreview);
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
                        <span>{(item.size / 1024 / 1024).toFixed(1)} MB</span>
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
        <MenubarContent>
          <MenubarItem>
            Undo <MenubarShortcut>⌘Z</MenubarShortcut>
          </MenubarItem>
          <MenubarItem>
            Redo <MenubarShortcut>⇧⌘Z</MenubarShortcut>
          </MenubarItem>
          <MenubarSeparator />
          <MenubarSub>
            <MenubarSubTrigger>Find</MenubarSubTrigger>
            <MenubarSubContent>
              <MenubarItem>Search the web</MenubarItem>
              <MenubarSeparator />
              <MenubarItem>Find...</MenubarItem>
              <MenubarItem>Find Next</MenubarItem>
              <MenubarItem>Find Previous</MenubarItem>
            </MenubarSubContent>
          </MenubarSub>
          <MenubarSeparator />
          <MenubarItem>Cut</MenubarItem>
          <MenubarItem>Copy</MenubarItem>
          <MenubarItem>Paste</MenubarItem>
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
