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
import { HashtagBrowser } from "@/features/social/components/hashtag-browser";
import { CustomChat, ChatState } from "@/components/ai-chatbot";
import {
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Dialog } from "@/components/ui/dialog";
import { useState, useCallback, useRef } from "react";
import { useFormContext } from "react-hook-form";
import { MediaItem } from "./media-item";
import { FixedSizeGrid as Grid, GridChildComponentProps } from "react-window";
import AutoSizer from "react-virtualized-auto-sizer";

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
  disabled?: boolean;
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

export function PostToolbar({
  onUploadClick,
  onMediaSelect,
  onHashtagSelect,
  media,
  disabled = false,
}: PostToolbarProps) {
  const [isAIChatOpen, setIsAIChatOpen] = useState(false);
  const [initialContext, setInitialContext] = useState("");
  const [chatState, setChatState] = useState<ChatState | null>(null);

  // Add a reference to track when updates should be processed
  const lastUpdateTimeRef = useRef<number>(0);
  // Add a reference to store the latest state
  const latestChatStateRef = useRef<ChatState | null>(null);

  const form = useFormContext();

  const handleAIButtonClick = () => {
    if (disabled) return;

    const content = form?.getValues("content");

    if (!content || content.trim() === "") {
      toast.warning(
        "Harap buat konten awal terlebih dahulu sebelum menggunakan AI generator."
      );
      return;
    }

    setInitialContext(content);
    setIsAIChatOpen(true);
  };

  // Fungsi untuk menerapkan hasil AI ke textarea
  const handleAIResult = useCallback(
    (result: string) => {
      if (result && form) {
        form.setValue("content", result, { shouldDirty: true });
        toast.success("Konten AI telah diterapkan ke post");
        setIsAIChatOpen(false);
      }
    },
    [form]
  );

  // Optimized chat state handler with throttling
  const handleChatStateChange = useCallback((newState: ChatState) => {
    // Always update the ref with the latest state
    latestChatStateRef.current = newState;

    // Get current time
    const now = Date.now();

    // Only update state if sufficient time has passed since last update (throttling)
    if (now - lastUpdateTimeRef.current > 1000) {
      // 1 second throttle
      setChatState(newState);
      lastUpdateTimeRef.current = now;
    } else {
      // Schedule an update if we're throttling
      setTimeout(() => {
        // Only update if the ref hasn't been updated since
        if (latestChatStateRef.current === newState) {
          setChatState(latestChatStateRef.current);
          lastUpdateTimeRef.current = Date.now();
        }
      }, 1000);
    }
  }, []);

  return (
    <Menubar className="border-none shadow-none !p-1">
      <Dialog open={isAIChatOpen && !disabled} onOpenChange={setIsAIChatOpen}>
        <DialogContent className="min-w-5xl min-h-[70vh] max-h-[74vh] overflow-hidden w-full">
          <DialogHeader>
            <DialogTitle>Enhance Your Post with FlyBot</DialogTitle>
            <DialogDescription>
              FlyBot akan membantu meningkatkan konten Anda dengan berbagai gaya
              dan format
            </DialogDescription>
          </DialogHeader>

          <CustomChat
            initialContext={initialContext}
            onApplyResult={handleAIResult}
            chatState={chatState}
            onChatStateChange={handleChatStateChange}
          />
        </DialogContent>
      </Dialog>

      <MenubarMenu>
        <MenubarTrigger disabled={disabled}>
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
          <MenubarItem onClick={disabled ? undefined : onUploadClick}>
            <Image className="text-black" /> Add Image
          </MenubarItem>
          <MenubarItem disabled={disabled}>
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
              className="w-[600px] h-[400px] overflow-hidden mb-10"
            >
              <AutoSizer>
                {({ height, width }: { height: number; width: number }) => {
                  const columnCount = 3;
                  const rowCount = Math.ceil(media.length / columnCount);
                  const columnWidth = width / columnCount;
                  const rowHeight = columnWidth; // Square aspect ratio

                  return (
                    <Grid
                      columnCount={columnCount}
                      columnWidth={columnWidth}
                      height={height}
                      rowCount={rowCount}
                      rowHeight={rowHeight}
                      width={width}
                      itemData={{
                        media,
                        columnCount,
                        onMediaSelect,
                      }}
                    >
                      {({
                        columnIndex,
                        rowIndex,
                        style,
                        data,
                      }: GridChildComponentProps<{
                        media: typeof media;
                        columnCount: number;
                        onMediaSelect: typeof onMediaSelect;
                      }>) => {
                        const index = rowIndex * data.columnCount + columnIndex;
                        const item = data.media[index];

                        if (!item) return null;

                        return (
                          <div style={style}>
                            <MediaItem
                              key={item.id}
                              item={item}
                              onMediaSelect={data.onMediaSelect}
                            />
                          </div>
                        );
                      }}
                    </Grid>
                  );
                }}
              </AutoSizer>
            </MenubarSubContent>
          </MenubarSub>
          <MenubarSeparator />
          <MenubarItem>
            Print... <MenubarShortcut>⌘P</MenubarShortcut>
          </MenubarItem>
        </MenubarContent>
      </MenubarMenu>
      <MenubarMenu>
        <MenubarTrigger disabled={disabled}>
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
        <MenubarTrigger onClick={handleAIButtonClick}>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <WandSparkles size={20} />
              </TooltipTrigger>
              <TooltipContent>
                <p>Enhance Your Post with FlyBot</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </MenubarTrigger>
      </MenubarMenu>
    </Menubar>
  );
}
