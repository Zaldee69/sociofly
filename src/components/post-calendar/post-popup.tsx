"use client";

import { useEffect, useMemo, useRef } from "react";
import { format, isSameDay } from "date-fns";
import { XIcon } from "lucide-react";
import { CalendarPost } from "./types";
import { PostItem } from "./post-item";

interface PostsPopupProps {
  date: Date;
  posts: CalendarPost[];
  position: { top: number; left: number };
  onClose: () => void;
  onPostSelect: (post: CalendarPost) => void;
}

export function PostsPopup({
  date,
  posts,
  position,
  onClose,
  onPostSelect,
}: PostsPopupProps) {
  const popupRef = useRef<HTMLDivElement>(null);

  // Handle click outside to close popup
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        popupRef.current &&
        !popupRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [onClose]);

  // Handle escape key to close popup
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscKey);
    return () => {
      document.removeEventListener("keydown", handleEscKey);
    };
  }, [onClose]);

  const handlePostClick = (post: CalendarPost) => {
    onPostSelect(post);
    onClose();
  };

  // Adjust position to ensure popup stays within viewport
  const adjustedPosition = useMemo(() => {
    const positionCopy = { ...position };

    // Check if we need to adjust the position to fit in the viewport
    if (popupRef.current) {
      const rect = popupRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      // Adjust horizontally if needed
      if (positionCopy.left + rect.width > viewportWidth) {
        positionCopy.left = Math.max(0, viewportWidth - rect.width);
      }

      // Adjust vertically if needed
      if (positionCopy.top + rect.height > viewportHeight) {
        positionCopy.top = Math.max(0, viewportHeight - rect.height);
      }
    }

    return positionCopy;
  }, [position]);

  return (
    <div
      ref={popupRef}
      className="bg-background absolute z-50 max-h-96 w-80 overflow-auto rounded-md border shadow-lg"
      style={{
        top: `${adjustedPosition.top}px`,
        left: `${adjustedPosition.left}px`,
      }}
    >
      <div className="bg-background sticky top-0 flex items-center justify-between border-b p-3">
        <h3 className="font-medium">{format(date, "d MMMM yyyy")}</h3>
        <button
          onClick={onClose}
          className="hover:bg-muted rounded-full p-1"
          aria-label="Close"
        >
          <XIcon className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-2 p-3">
        {posts.length === 0 ? (
          <div className="text-muted-foreground py-2 text-sm">No posts</div>
        ) : (
          posts.map((post) => {
            const postStart = new Date(post.start);
            const postEnd = new Date(post.end);
            const isFirstDay = isSameDay(date, postStart);
            const isLastDay = isSameDay(date, postEnd);

            return (
              <div
                key={post.id}
                className="cursor-pointer"
                onClick={() => handlePostClick(post)}
              >
                <PostItem
                  post={post}
                  view="agenda"
                  isFirstDay={isFirstDay}
                  isLastDay={isLastDay}
                />
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
