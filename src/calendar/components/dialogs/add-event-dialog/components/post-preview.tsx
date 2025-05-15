"use client";

import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Earth, MoreHorizontal, Share2 } from "lucide-react";
import {
  FacebookLikeIcon,
  FacebookMessageIcon,
} from "@/components/icons/facebook-native-icon";
import { cn } from "@/lib/utils";
import { FileWithPreview, SocialAccount } from "../types";

interface PostPreviewProps {
  description: string;
  selectedFiles: FileWithPreview[];
  accountPostPreview: SocialAccount | undefined;
}

export function PostPreview({
  description,
  selectedFiles,
  accountPostPreview,
}: PostPreviewProps) {
  const formatHashtags = (input: string) => {
    const escaped = input
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\n/g, "<br />");

    return escaped.replace(/(#\w+)/g, `<span class="hashtag">$1</span>`);
  };

  return (
    <ScrollArea className="h-[450px]">
      <div className="w-full max-w-[340px] mx-auto h-full">
        <div className="bg-white rounded-lg shadow-sm mb-4 overflow-hidden">
          <div className="p-2 border-b">
            <div className="flex items-center gap-1">
              <div className="relative h-10 w-10 overflow-hidden">
                <Avatar>
                  <AvatarImage
                    className="w-full"
                    src={accountPostPreview?.profilePicture || undefined}
                  />
                  <AvatarFallback>
                    {accountPostPreview?.name?.[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </div>
              <div>
                <div className="font-medium">{accountPostPreview?.name}</div>
                <div className="text-sm text-muted-foreground flex gap-1.5 items-center">
                  {format(new Date(), "d MMM")}
                  <p>·</p>
                  <Earth className="w-4 h-4 text-black" />
                </div>
              </div>
              <Button
                size="icon"
                variant="ghost"
                className="ml-auto rounded-full"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="p-2">
            <p
              dangerouslySetInnerHTML={{
                __html: formatHashtags(description) + "<br />",
              }}
              className="text-sm"
            />
          </div>

          {selectedFiles.length > 0 && (
            <div
              className={cn(
                "grid gap-1",
                selectedFiles.length === 1 ? "grid-cols-1" : "grid-cols-2"
              )}
            >
              {selectedFiles.slice(0, 4).map((file, index) => (
                <div
                  key={index}
                  className={cn(
                    "relative",
                    selectedFiles.length === 1
                      ? "aspect-[4/3]"
                      : "aspect-square",
                    selectedFiles.length === 3 && index === 0
                      ? "col-span-2"
                      : ""
                  )}
                >
                  <img
                    src={file.preview}
                    alt={file.name}
                    className="w-full h-full object-cover"
                  />
                  {index === 3 && selectedFiles.length > 4 && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                      <span className="text-white text-2xl font-medium">
                        +{selectedFiles.length - 4}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="border-t mt-1">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-1 px-5 py-2">
                <FacebookLikeIcon height={20} width={20} />
                <p className="text-sm text-[#65686c]">Like</p>
              </div>
              <div className="flex items-center gap-1 px-5">
                <FacebookMessageIcon height={20} width={20} />
                <p className="text-sm text-[#65686c]">Comment</p>
              </div>
              <div className="flex items-center gap-1 px-5">
                <Share2 className="text-[#65686c]" size={20} />
                <p className="text-sm text-[#65686c]">Share</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ScrollArea>
  );
}
