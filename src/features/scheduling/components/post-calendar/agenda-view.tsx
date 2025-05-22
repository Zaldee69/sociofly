"use client";

import { useMemo } from "react";
import { addDays, format, isToday } from "date-fns";
import { AgendaDaysToShow } from "@/config/constants";
import { CalendarPost } from "./types";
import { getAgendaPostsForDay } from "./utils";
import { Calendar } from "lucide-react";
import { PostItem } from "./post-item";

interface AgendaViewProps {
  currentDate: Date;
  posts: CalendarPost[];
  onPostSelect: (post: CalendarPost) => void;
}

export function AgendaView({
  currentDate,
  posts,
  onPostSelect,
}: AgendaViewProps) {
  // Show events for the next days based on constant
  const days = useMemo(() => {
    console.log("Agenda view updating with date:", currentDate.toISOString());
    return Array.from({ length: AgendaDaysToShow }, (_, i) =>
      addDays(new Date(currentDate), i)
    );
  }, [currentDate]);

  const handlePostClick = (post: CalendarPost, e: React.MouseEvent) => {
    e.stopPropagation();
    console.log("Agenda view post clicked:", post);
    onPostSelect(post);
  };

  // Check if there are any days with events
  const hasPosts = days.some(
    (day) => getAgendaPostsForDay(posts, day).length > 0
  );

  return (
    <div className="border-border/70 border-t ps-4">
      {!hasPosts ? (
        <div className="flex min-h-[70svh] flex-col items-center justify-center py-16 text-center">
          <Calendar size={32} className="text-muted-foreground/50 mb-2" />
          <h3 className="text-lg font-medium">No events found</h3>
          <p className="text-muted-foreground">
            There are no events scheduled for this time period.
          </p>
        </div>
      ) : (
        days.map((day) => {
          const dayPosts = getAgendaPostsForDay(posts, day);

          if (dayPosts.length === 0) return null;

          return (
            <div
              key={day.toString()}
              className="border-border/70 relative my-12 border-t"
            >
              <span
                className="bg-background absolute -top-3 left-0 flex h-6 items-center pe-4 text-[10px] uppercase data-today:font-medium sm:pe-4 sm:text-xs"
                data-today={isToday(day) || undefined}
              >
                {format(day, "d MMM, EEEE")}
              </span>
              <div className="mt-6 space-y-2">
                {dayPosts.map((post) => (
                  <PostItem
                    key={post.id}
                    post={post}
                    view="agenda"
                    onClick={(e) => handlePostClick(post, e)}
                  />
                ))}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
