"use client";

import { useMemo } from "react";
import type { DraggableAttributes } from "@dnd-kit/core";
import type { SyntheticListenerMap } from "@dnd-kit/core/dist/hooks/utilities";
import {
  differenceInMinutes,
  format,
  getMinutes,
  isPast,
  addMinutes,
  isValid,
} from "date-fns";

import { cn } from "@/lib/utils";

import { CalendarPost } from "./types";
import { getPostColorClasses } from "./utils";
import {
  FacebookIcon,
  InstagramIcon,
} from "@/components/icons/social-media-icons";

// Default duration for posts in minutes
const DEFAULT_POST_DURATION = 30;

// Using date-fns format with custom formatting for 24-hour format:
// 'HH' - hours (00-23)
// ':mm' - minutes with leading zero
const formatTimeWithOptionalMinutes = (date: Date) => {
  // Safety check to ensure date is valid
  if (!date || !isValid(date)) {
    return "--:--";
  }

  try {
    return format(date, getMinutes(date) === 0 ? "HH:00" : "HH:mm");
  } catch (error) {
    console.error("Error formatting time:", error);
    return "--:--";
  }
};

interface PostWrapperProps {
  post: CalendarPost;
  isDragging?: boolean;
  onClick?: (e: React.MouseEvent) => void;
  className?: string;
  children: React.ReactNode;
  currentTime?: Date;
  dndListeners?: SyntheticListenerMap;
  dndAttributes?: DraggableAttributes;
  onMouseDown?: (e: React.MouseEvent) => void;
  onTouchStart?: (e: React.TouchEvent) => void;
}

// Shared wrapper component for event styling
function PostWrapper({
  post,
  isDragging,
  onClick,
  className,
  children,
  currentTime,
  dndListeners,
  dndAttributes,
  onMouseDown,
  onTouchStart,
}: PostWrapperProps) {
  // Always use the currentTime (if provided) to determine if the event is in the past
  const displayEnd = currentTime ? currentTime : new Date(post.scheduledAt);

  const isEventInPast = isPast(displayEnd);

  return (
    <button
      className={cn(
        "focus-visible:border-ring focus-visible:ring-ring/50 flex h-full w-full overflow-hidden px-1 text-left font-medium backdrop-blur-md transition outline-none select-none focus-visible:ring-[3px] data-dragging:cursor-grabbing data-dragging:shadow-lg data-past-event:line-through sm:px-2 rounded",
        getPostColorClasses("blue"),
        className
      )}
      data-dragging={isDragging || undefined}
      data-past-event={isEventInPast || undefined}
      onClick={onClick}
      onMouseDown={onMouseDown}
      onTouchStart={onTouchStart}
      {...dndListeners}
      {...dndAttributes}
    >
      {children}
    </button>
  );
}

interface PostItemProps {
  post: CalendarPost;
  view: "month" | "week" | "day" | "agenda";
  isDragging?: boolean;
  onClick?: (e: React.MouseEvent) => void;
  showTime?: boolean;
  currentTime?: Date; // For updating time during drag
  children?: React.ReactNode;
  className?: string;
  dndListeners?: SyntheticListenerMap;
  dndAttributes?: DraggableAttributes;
  onMouseDown?: (e: React.MouseEvent) => void;
  onTouchStart?: (e: React.TouchEvent) => void;
}

export function PostItem({
  post,
  view,
  isDragging,
  onClick,
  showTime,
  currentTime,
  children,
  className,
  dndListeners,
  dndAttributes,
  onMouseDown,
  onTouchStart,
}: PostItemProps) {
  // Use the provided currentTime (for dragging) or the event's actual time
  const displayStart = useMemo(() => {
    if (!post || !post.scheduledAt) return new Date();
    return currentTime || new Date(post.scheduledAt);
  }, [currentTime, post?.scheduledAt]);

  const displayEnd = useMemo(() => {
    if (!post || !post.scheduledAt) return new Date();

    if (currentTime) {
      // If dragging, maintain the duration from the original post
      const originalStart = new Date(post.scheduledAt);
      const originalEnd = addMinutes(originalStart, DEFAULT_POST_DURATION);
      const durationMinutes = differenceInMinutes(originalEnd, originalStart);
      return addMinutes(currentTime, durationMinutes);
    }
    return addMinutes(new Date(post.scheduledAt), DEFAULT_POST_DURATION);
  }, [currentTime, post?.scheduledAt]);

  // Calculate event duration in minutes
  const durationMinutes = useMemo(() => {
    return differenceInMinutes(displayEnd, displayStart);
  }, [displayStart, displayEnd]);

  const getEventTime = () => {
    if (view !== "agenda") {
      return formatTimeWithOptionalMinutes(displayStart);
    }
    return `${formatTimeWithOptionalMinutes(displayStart)} - ${formatTimeWithOptionalMinutes(displayEnd)}`;
  };

  if (view === "month") {
    return (
      <PostWrapper
        post={post}
        isDragging={isDragging}
        onClick={onClick}
        className={cn(
          "mt-[var(--event-gap)] h-[var(--event-height)] items-center text-[10px] sm:text-[13px]",
          className
        )}
        currentTime={currentTime}
        dndListeners={dndListeners}
        dndAttributes={dndAttributes}
        onMouseDown={onMouseDown}
        onTouchStart={onTouchStart}
      >
        {children || (
          <div className="flex items-center justify-between w-full">
            <div className="truncate">
              <span className="truncate sm:text-xs font-normal opacity-70 uppercase">
                {formatTimeWithOptionalMinutes(displayStart)}{" "}
              </span>
              {post.content}
            </div>
            {(post.postSocialAccounts || []).map((account) => {
              if (!account || !account.socialAccount) return null;
              switch (account.socialAccount.platform) {
                case "INSTAGRAM":
                  return (
                    <div key={account.id} className="ml-1 flex-shrink-0">
                      <InstagramIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                    </div>
                  );
                case "FACEBOOK":
                  return (
                    <div key={account.id} className="ml-1 flex-shrink-0">
                      <FacebookIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                    </div>
                  );
                default:
                  return null;
              }
            })}
          </div>
        )}
      </PostWrapper>
    );
  }

  if (view === "week" || view === "day") {
    return (
      <PostWrapper
        post={post}
        isDragging={isDragging}
        onClick={onClick}
        className={cn(
          "py-1",
          durationMinutes < 45 ? "items-center" : "flex-col",
          view === "week" ? "text-[10px] sm:text-[13px]" : "text-[13px]",
          className
        )}
        currentTime={currentTime}
        dndListeners={dndListeners}
        dndAttributes={dndAttributes}
        onMouseDown={onMouseDown}
        onTouchStart={onTouchStart}
      >
        {durationMinutes < 45 ? (
          <div className="truncate flex items-center justify-between w-full">
            <div className="truncate">
              {post.content}{" "}
              {showTime && (
                <span className="opacity-70">
                  {formatTimeWithOptionalMinutes(displayStart)}
                </span>
              )}
            </div>
            <div className="flex items-center ml-1">
              {(post.postSocialAccounts || []).map((account) => {
                if (!account || !account.socialAccount) return null;
                switch (account.socialAccount.platform) {
                  case "INSTAGRAM":
                    return (
                      <div key={account.id} className="ml-1 flex-shrink-0">
                        <InstagramIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                      </div>
                    );
                  case "FACEBOOK":
                    return (
                      <div key={account.id} className="ml-1 flex-shrink-0">
                        <FacebookIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                      </div>
                    );
                  default:
                    return null;
                }
              })}
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between w-full">
              <div className="truncate font-medium">{post.content}</div>
              <div className="flex items-center ml-1">
                {(post.postSocialAccounts || []).map((account) => {
                  if (!account || !account.socialAccount) return null;
                  switch (account.socialAccount.platform) {
                    case "INSTAGRAM":
                      return (
                        <div key={account.id} className="ml-1 flex-shrink-0">
                          <InstagramIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                        </div>
                      );
                    case "FACEBOOK":
                      return (
                        <div key={account.id} className="ml-1 flex-shrink-0">
                          <FacebookIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                        </div>
                      );
                    default:
                      return null;
                  }
                })}
              </div>
            </div>
            {showTime && (
              <div className="truncate font-normal opacity-70 sm:text-xs uppercase">
                {getEventTime()}
              </div>
            )}
          </>
        )}
      </PostWrapper>
    );
  }

  // Agenda view - kept separate since it's significantly different
  return (
    <button
      className={cn(
        "focus-visible:border-ring focus-visible:ring-ring/50 flex w-full flex-col gap-1 rounded p-2 text-left transition outline-none focus-visible:ring-[3px] data-past-event:line-through data-past-event:opacity-90",
        getPostColorClasses("blue"),
        className
      )}
      data-past-event={isPast(new Date(post.scheduledAt)) || undefined}
      onClick={onClick}
      onMouseDown={onMouseDown}
      onTouchStart={onTouchStart}
      {...dndListeners}
      {...dndAttributes}
    >
      <div className="flex items-center justify-between w-full">
        <div className="text-sm font-medium truncate">{post.content}</div>
        <div className="flex items-center ml-1">
          {(post.postSocialAccounts || []).map((account) => {
            if (!account || !account.socialAccount) return null;
            switch (account.socialAccount.platform) {
              case "INSTAGRAM":
                return (
                  <div key={account.id} className="ml-1 flex-shrink-0">
                    <InstagramIcon className="w-4 h-4" />
                  </div>
                );
              case "FACEBOOK":
                return (
                  <div key={account.id} className="ml-1 flex-shrink-0">
                    <FacebookIcon className="w-4 h-4" />
                  </div>
                );
              default:
                return null;
            }
          })}
        </div>
      </div>
      <div className="text-xs opacity-70">
        <span className="uppercase">{getEventTime()}</span>
      </div>
    </button>
  );
}
