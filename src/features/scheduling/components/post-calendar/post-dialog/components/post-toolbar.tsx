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
import { HashtagBrowser } from "@/features/social/components/HashtagBrowser";
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
      <Dialog open={isAIChatOpen} onOpenChange={setIsAIChatOpen}>
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
