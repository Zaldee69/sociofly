"use client";

import React, { useMemo } from "react";
import {
  addHours,
  areIntervalsOverlapping,
  differenceInMinutes,
  eachDayOfInterval,
  eachHourOfInterval,
  endOfWeek,
  format,
  getHours,
  getMinutes,
  isSameDay,
  isToday,
  startOfDay,
  startOfWeek,
  addMinutes,
} from "date-fns";

import { CalendarPost } from "./types";
import { DroppableCell } from "./droppable-cell";
import { PostItem } from "./post-item";
import { DraggablePost } from "./draggable-post";

import { StartHour, EndHour, WeekCellsHeight } from "./constants";
import { cn } from "@/lib/utils";

import { useCurrentTimeIndicator } from "../hooks/use-current-time-indicator";

interface WeekViewProps {
  currentDate: Date;
  posts: CalendarPost[];
  onPostSelect: (post: CalendarPost) => void;
  onPostCreate: (startTime: Date) => void;
}

interface PositionedPost {
  post: CalendarPost;
  top: number;
  height: number;
  left: number;
  width: number;
  zIndex: number;
}

// Default duration for posts in minutes
const DEFAULT_POST_DURATION = 30;

export function WeekView({
  currentDate,
  posts,
  onPostSelect,
  onPostCreate,
}: WeekViewProps) {
  const days = useMemo(() => {
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
    const weekEnd = endOfWeek(currentDate, { weekStartsOn: 0 });
    return eachDayOfInterval({ start: weekStart, end: weekEnd });
  }, [currentDate]);

  const weekStart = useMemo(
    () => startOfWeek(currentDate, { weekStartsOn: 0 }),
    [currentDate]
  );

  const hours = useMemo(() => {
    const dayStart = startOfDay(currentDate);
    return eachHourOfInterval({
      start: addHours(dayStart, StartHour),
      end: addHours(dayStart, EndHour - 1),
    });
  }, [currentDate]);

  // Process events for each day to calculate positions
  const processedDayEvents = useMemo(() => {
    const result = days.map((day) => {
      // Get events for this day
      const dayPosts = posts.filter((post) => {
        if (!post || !post.scheduledAt) return false;
        const postStart = new Date(post.scheduledAt);
        return isSameDay(day, postStart);
      });

      // Sort events by start time
      const sortedPosts = [...dayPosts].sort((a, b) => {
        const aStart = new Date(a.scheduledAt);
        const bStart = new Date(b.scheduledAt);
        return aStart.getTime() - bStart.getTime();
      });

      // Calculate positions for each event
      const positionedPosts: PositionedPost[] = [];
      const dayStart = startOfDay(day);

      // Track columns for overlapping events
      const columns: { post: CalendarPost; end: Date }[][] = [];

      sortedPosts.forEach((post) => {
        const postStart = new Date(post.scheduledAt);
        const postEnd = addMinutes(postStart, DEFAULT_POST_DURATION);

        // Calculate top position and height based on time
        const startHour = getHours(postStart) + getMinutes(postStart) / 60;
        const endHour = getHours(postEnd) + getMinutes(postEnd) / 60;

        // Make sure we don't go below the start hour of the grid
        const adjustedStartHour = Math.max(startHour, StartHour);
        // Make sure we don't go beyond the end hour of the grid
        const adjustedEndHour = Math.min(endHour, EndHour);

        // Calculate top position relative to the grid's start hour
        const top = Math.max(
          0,
          (adjustedStartHour - StartHour) * WeekCellsHeight
        );
        // Calculate height based on the time span
        const height = Math.max(
          30,
          (adjustedEndHour - adjustedStartHour) * WeekCellsHeight
        );

        // Find a column for this event
        let columnIndex = 0;
        let placed = false;

        while (!placed) {
          const col = columns[columnIndex] || [];
          if (col.length === 0) {
            columns[columnIndex] = col;
            placed = true;
          } else {
            const overlaps = col.some((c) =>
              areIntervalsOverlapping(
                { start: postStart, end: postEnd },
                {
                  start: new Date(c.post.scheduledAt),
                  end: addMinutes(
                    new Date(c.post.scheduledAt),
                    DEFAULT_POST_DURATION
                  ),
                }
              )
            );
            if (!overlaps) {
              placed = true;
            } else {
              columnIndex++;
            }
          }
        }

        // Ensure column is initialized before pushing
        const currentColumn = columns[columnIndex] || [];
        columns[columnIndex] = currentColumn;
        currentColumn.push({ post, end: postEnd });

        // Calculate width and left position based on number of columns
        const width = columnIndex === 0 ? 1 : 0.9;
        const left = columnIndex === 0 ? 0 : columnIndex * 0.1;

        positionedPosts.push({
          post,
          top,
          height,
          left,
          width,
          zIndex: 10 + columnIndex, // Higher columns get higher z-index
        });
      });

      return positionedPosts;
    });

    return result;
  }, [days, posts]);

  const handlePostClick = (post: CalendarPost, e: React.MouseEvent) => {
    e.stopPropagation();
    onPostSelect(post);
  };

  const { currentTimePosition, currentTimeVisible } = useCurrentTimeIndicator(
    currentDate,
    "week"
  );

  return (
    <div data-slot="week-view" className="flex h-full flex-col">
      <div className="bg-background/80 border-border/70 sticky top-0 z-30 grid grid-cols-8 border-y backdrop-blur-md uppercase">
        <div className="text-muted-foreground/70 py-2 text-center text-xs">
          <span className="max-[479px]:sr-only">{format(new Date(), "O")}</span>
        </div>
        {days.map((day) => (
          <div
            key={day.toString()}
            className="data-today:text-foreground text-muted-foreground/70 py-2 text-center text-xs data-today:font-medium"
            data-today={isToday(day) || undefined}
          >
            <span className="sm:hidden" aria-hidden="true">
              {format(day, "E")[0]} {format(day, "d")}
            </span>
            <span className="max-sm:hidden">{format(day, "EEE dd")}</span>
          </div>
        ))}
      </div>

      <div className="grid flex-1 grid-cols-8 overflow-auto max-h-[calc(100vh-10rem)]">
        <div className="border-border/70 border-r grid auto-cols-fr sticky left-0 bg-background/80 z-10">
          {hours.map((hour) => (
            <div
              key={hour.toString()}
              className="border-border/70 relative min-h-[var(--week-cells-height)] border-b last:border-b-0"
            >
              <span className="bg-background text-muted-foreground/70 absolute -top-3 left-0 flex h-6 w-16 max-w-full items-center justify-end pe-2 text-[10px] sm:pe-4 sm:text-xs">
                {format(hour, "HH:00")}
              </span>
            </div>
          ))}
        </div>

        {days.map((day, dayIndex) => (
          <div
            key={day.toString()}
            className="border-border/70 relative border-r last:border-r-0 grid auto-cols-fr"
            data-today={isToday(day) || undefined}
          >
            {/* Positioned events */}
            {(processedDayEvents[dayIndex] ?? []).map((positionedEvent) => (
              <div
                key={positionedEvent.post.id}
                className="absolute z-10 px-0.5"
                style={{
                  top: `${positionedEvent.top}px`,
                  height: `${positionedEvent.height}px`,
                  left: `${positionedEvent.left * 100}%`,
                  width: `${positionedEvent.width * 100}%`,
                  zIndex: positionedEvent.zIndex,
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="h-full w-full">
                  <DraggablePost
                    post={positionedEvent.post}
                    view="week"
                    onClick={(e) => handlePostClick(positionedEvent.post, e)}
                    showTime
                    height={positionedEvent.height}
                  />
                </div>
              </div>
            ))}

            {/* Current time indicator - only show for today's column */}
            {currentTimeVisible && isToday(day) && (
              <div
                className="pointer-events-none absolute right-0 left-0 z-20"
                style={{ top: `${currentTimePosition}%` }}
              >
                <div className="relative flex items-center">
                  <div className="bg-red-500 absolute -left-1 h-2 w-2 rounded-full"></div>
                  <div className="bg-red-500 h-[2px] w-full"></div>
                </div>
              </div>
            )}
            {hours.map((hour) => {
              const hourValue = getHours(hour);
              return (
                <div
                  key={hour.toString()}
                  className="border-border/70 relative min-h-[var(--week-cells-height)] border-b last:border-b-0"
                >
                  {/* Quarter-hour intervals */}
                  {[0, 1, 2, 3].map((quarter) => {
                    const quarterHourTime = hourValue + quarter * 0.25;
                    return (
                      <DroppableCell
                        key={`${hour.toString()}-${quarter}`}
                        id={`week-cell-${day.toISOString()}-${quarterHourTime}`}
                        date={day}
                        time={quarterHourTime}
                        className={cn(
                          "absolute h-[calc(var(--week-cells-height)/4)] w-full",
                          quarter === 0 && "top-0",
                          quarter === 1 &&
                            "top-[calc(var(--week-cells-height)/4)]",
                          quarter === 2 &&
                            "top-[calc(var(--week-cells-height)/4*2)]",
                          quarter === 3 &&
                            "top-[calc(var(--week-cells-height)/4*3)]"
                        )}
                        onClick={() => {
                          const startTime = new Date(day);
                          startTime.setHours(hourValue);
                          startTime.setMinutes(quarter * 15);
                          onPostCreate(startTime);
                        }}
                      />
                    );
                  })}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
