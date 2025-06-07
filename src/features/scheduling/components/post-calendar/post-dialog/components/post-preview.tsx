"use client";

import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Image from "next/image";
import {
  BookmarkIcon,
  Earth,
  Ellipsis,
  Heart,
  HeartIcon,
  MessageCircle,
  MoreHorizontal,
  Send,
  Share2,
} from "lucide-react";
import {
  FacebookLikeIcon,
  FacebookMessageIcon,
} from "@/components/icons/facebook-native-icon";
import { cn } from "@/lib/utils";

import {
  Fragment,
  useEffect,
  useState,
  memo,
  useRef,
  useCallback,
  useMemo,
  Suspense,
  lazy,
} from "react";

import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";

import { type CarouselApi } from "@/components/ui/carousel";
import { SocialAccount } from "../types";
import { FileWithStablePreview } from "../types";
import React from "react";

const formatHashtags = (input: string) => {
  const escaped = input
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br />");

  return escaped.replace(/(#\w+)/g, `<span class="hashtag">$1</span>`);
};

// Enhanced image optimization with Instagram-specific handling
const createOptimizedInstagramUrl = (url: string) => {
  if (url.startsWith("blob:") || url.startsWith("data:")) return url;

  try {
    const urlObj = new URL(url);
    urlObj.searchParams.set("width", "1080");
    urlObj.searchParams.set("q", "85");
    return urlObj.toString();
  } catch {
    return url;
  }
};

interface PostPreviewProps {
  description: string;
  selectedFiles: FileWithStablePreview[];
  accountPostPreview: SocialAccount | undefined;
}

// Lazy load components that are not immediately visible
const Description = lazy(() =>
  Promise.resolve({
    default: memo(({ text, username }: { text: string; username: string }) => (
      <p
        dangerouslySetInnerHTML={{
          __html:
            `<span class="font-bold">${username}</span> ${formatHashtags(text)}` +
            "<br />",
        }}
        className="text-sm"
      />
    )),
  })
);

// Modify InstagramCarousel to use Instagram-specific optimization
const InstagramCarousel = memo(
  ({ files }: { files: FileWithStablePreview[] }) => {
    const [api, setApi] = useState<CarouselApi>();
    const [current, setCurrent] = useState(1);
    const [count, setCount] = useState(0);

    useEffect(() => {
      // Update the count whenever files change
      if (files.length !== count) {
        setCount(files.length);
      }
    }, [files, count]);

    useEffect(() => {
      if (!api) return;

      // Set initial values
      setCount(api.scrollSnapList().length);
      setCurrent(api.selectedScrollSnap() + 1);

      const onSelect = () => {
        setCurrent(api.selectedScrollSnap() + 1);
      };

      api.on("select", onSelect);
      return () => {
        api.off("select", onSelect);
      };
    }, [api]);

    // Force carousel to re-initialize when files change
    useEffect(() => {
      if (api) {
        api.scrollTo(0);
        setCount(api.scrollSnapList().length);
        setCurrent(1);
      }
    }, [files.length, api]);

    if (files.length === 0) return null;

    return (
      <Carousel
        setApi={setApi}
        className="w-full relative"
        key={`carousel-${files.length}`}
      >
        {count > 0 && count !== 1 && (
          <div className="absolute top-4 right-4 z-10 bg-black/60 text-white px-2 py-1 rounded-full text-xs">
            {current}/{count}
          </div>
        )}
        <CarouselContent>
          {files.map((file, index) => {
            return (
              <CarouselItem key={file.stableId}>
                <div className="w-full aspect-square relative">
                  <Image
                    src={createOptimizedInstagramUrl(file.preview)}
                    alt={file.name}
                    fill
                    sizes="(max-width: 600px) 100vw, 600px"
                    className="object-cover"
                    priority={index === 0}
                    quality={85}
                    unoptimized={
                      file.preview.startsWith("blob:") ||
                      file.preview.startsWith("data:")
                    }
                  />
                </div>
              </CarouselItem>
            );
          })}
        </CarouselContent>
      </Carousel>
    );
  }
);

// Modify FacebookPreview to use optimized image sizing
const FacebookPreview = memo(
  ({ description, selectedFiles, accountPostPreview }: PostPreviewProps) => {
    return (
      <Fragment>
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

        {description.length > 0 && (
          <div className="p-2">
            <p
              dangerouslySetInnerHTML={{
                __html: formatHashtags(description) + "<br />",
              }}
              className="text-sm"
            />
          </div>
        )}

        {selectedFiles.length > 0 && (
          <div
            className={cn(
              "grid gap-1",
              selectedFiles.length === 1 ? "grid-cols-1" : "grid-cols-2"
            )}
          >
            {selectedFiles.slice(0, 4).map((file, index) => (
              <div
                key={file.stableId}
                className={cn(
                  "relative",
                  selectedFiles.length === 1 ? "aspect-[4/3]" : "aspect-square",
                  selectedFiles.length === 3 && index === 0 ? "col-span-2" : ""
                )}
              >
                <Image
                  src={createOptimizedInstagramUrl(file.preview)}
                  alt={file.name}
                  fill
                  sizes={
                    selectedFiles.length === 1
                      ? "(max-width: 600px) 100vw, 600px"
                      : selectedFiles.length === 3 && index === 0
                        ? "(max-width: 600px) 100vw, 400px"
                        : "(max-width: 600px) 50vw, 300px"
                  }
                  className="object-cover"
                  priority={index === 0}
                  quality={85}
                  unoptimized={
                    file.preview.startsWith("blob:") ||
                    file.preview.startsWith("data:")
                  }
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
      </Fragment>
    );
  }
);

FacebookPreview.displayName = "FacebookPreview";

const InstagramPreview = memo(
  ({ description, selectedFiles, accountPostPreview }: PostPreviewProps) => {
    return (
      <div className="p-2">
        <div className="flex items-center justify-between pb-2">
          <div className="flex items-center gap-2">
            <div>
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
            <div className="font-medium text-sm">
              {accountPostPreview?.name}
            </div>
          </div>
          <Ellipsis />
        </div>

        <InstagramCarousel files={selectedFiles} />

        <div className="pt-1">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 py-2">
              <HeartIcon height={20} width={20} />

              <MessageCircle
                className="rotate-[260deg]"
                height={20}
                width={20}
              />

              <Send width={20} height={20} />
            </div>
            <div className="flex items-center gap-1">
              <BookmarkIcon size={20} />
            </div>
          </div>
        </div>

        <div className="pt-2">
          <Description
            text={description}
            username={accountPostPreview?.name || ""}
          />
        </div>
      </div>
    );
  }
);

InstagramPreview.displayName = "InstagramPreview";

// Modify the main PostPreview component
export const PostPreview = memo(
  ({ description, selectedFiles, accountPostPreview }: PostPreviewProps) => {
    const preview = useMemo(() => {
      if (accountPostPreview?.platform === "FACEBOOK") {
        return (
          <FacebookPreview
            description={description}
            selectedFiles={selectedFiles}
            accountPostPreview={accountPostPreview}
          />
        );
      }
      if (accountPostPreview?.platform === "INSTAGRAM") {
        return (
          <InstagramPreview
            description={description}
            selectedFiles={selectedFiles}
            accountPostPreview={accountPostPreview}
          />
        );
      }
      return null;
    }, [description, selectedFiles, accountPostPreview]);

    return (
      <div className="w-full max-w-[340px] mx-auto">
        <div className="bg-white rounded-lg shadow-sm mb-4 overflow-hidden">
          <Suspense
            fallback={
              <div className="p-4 animate-pulse">Loading preview...</div>
            }
          >
            {preview}
          </Suspense>
        </div>
      </div>
    );
  }
);

PostPreview.displayName = "PostPreview";
