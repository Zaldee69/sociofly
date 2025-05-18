"use client";

import React, { useMemo } from "react";
import {
  addHours,
  areIntervalsOverlapping,
  differenceInMinutes,
  eachHourOfInterval,
  format,
  getHours,
  getMinutes,
  isSameDay,
  startOfDay,
} from "date-fns";

import {
  StartHour,
  EndHour,
  WeekCellsHeight,
} from "@/components/post-calendar/constants";
import { cn } from "@/lib/utils";

import { isMultiDayPost } from "./utils";
import { useCurrentTimeIndicator } from "./hooks/use-current-time-indicator";
import { PostItem } from "./post-item";
import { DraggablePost } from "./draggable-post";
import { DroppableCell } from "./droppable-cell";
import { CalendarPost } from "./types";

interface DayViewProps {
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

export function DayView({
  currentDate,
  posts,
  onPostSelect,
  onPostCreate,
}: DayViewProps) {
  const hours = useMemo(() => {
    const dayStart = startOfDay(currentDate);
    return eachHourOfInterval({
      start: addHours(dayStart, StartHour),
      end: addHours(dayStart, EndHour - 1),
    });
  }, [currentDate]);

  const dayPosts = useMemo(() => {
    return posts
      .filter((post) => {
        const postStart = new Date(post.start);
        const postEnd = new Date(post.end);
        return (
          isSameDay(currentDate, postStart) ||
          isSameDay(currentDate, postEnd) ||
          (currentDate > postStart && currentDate < postEnd)
        );
      })
      .sort(
        (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()
      );
  }, [currentDate, posts]);

  // Filter all-day events
  const allDayPosts = useMemo(() => {
    return dayPosts.filter((post) => {
      // Include explicitly marked all-day events or multi-day events
      return post.allDay || isMultiDayPost(post);
    });
  }, [dayPosts]);

  // Get only single-day time-based events
  const timePosts = useMemo(() => {
    return dayPosts.filter((post) => {
      // Exclude all-day events and multi-day events
      return !post.allDay && !isMultiDayPost(post);
    });
  }, [dayPosts]);

  // Process events to calculate positions
  const positionedPosts = useMemo(() => {
    const result: PositionedPost[] = [];
    const dayStart = startOfDay(currentDate);

    // Sort events by start time and duration
    const sortedPosts = [...timePosts].sort((a, b) => {
      const aStart = new Date(a.start);
      const bStart = new Date(b.start);
      const aEnd = new Date(a.end);
      const bEnd = new Date(b.end);

      // First sort by start time
      if (aStart < bStart) return -1;
      if (aStart > bStart) return 1;

      // If start times are equal, sort by duration (longer events first)
      const aDuration = differenceInMinutes(aEnd, aStart);
      const bDuration = differenceInMinutes(bEnd, bStart);
      return bDuration - aDuration;
    });

    // Track columns for overlapping events
    const columns: { post: CalendarPost; end: Date }[][] = [];

    sortedPosts.forEach((post) => {
      const postStart = new Date(post.start);
      const postEnd = new Date(post.end);

      // Adjust start and end times if they're outside this day
      const adjustedStart = isSameDay(currentDate, postStart)
        ? postStart
        : dayStart;
      const adjustedEnd = isSameDay(currentDate, postEnd)
        ? postEnd
        : addHours(dayStart, 24);

      // Calculate top position and height
      const startHour =
        getHours(adjustedStart) + getMinutes(adjustedStart) / 60;
      const endHour = getHours(adjustedEnd) + getMinutes(adjustedEnd) / 60;
      const top = (startHour - StartHour) * WeekCellsHeight;
      const height = (endHour - startHour) * WeekCellsHeight;

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
              { start: adjustedStart, end: adjustedEnd },
              { start: new Date(c.post.start), end: new Date(c.post.end) }
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
      currentColumn.push({ post, end: adjustedEnd });

      // First column takes full width, others are indented by 10% and take 90% width
      const width = columnIndex === 0 ? 1 : 0.9;
      const left = columnIndex === 0 ? 0 : columnIndex * 0.1;

      result.push({
        post,
        top,
        height,
        left,
        width,
        zIndex: 10 + columnIndex, // Higher columns get higher z-index
      });
    });

    return result;
  }, [currentDate, timePosts]);

  const handlePostClick = (post: CalendarPost, e: React.MouseEvent) => {
    e.stopPropagation();
    onPostSelect(post);
  };

  const showAllDaySection = allDayPosts.length > 0;
  const { currentTimePosition, currentTimeVisible } = useCurrentTimeIndicator(
    currentDate,
    "day"
  );

  return (
    <div data-slot="day-view" className="contents">
      {showAllDaySection && (
        <div className="border-border/70 bg-muted/50 border-t">
          <div className="grid grid-cols-[3rem_1fr] sm:grid-cols-[4rem_1fr]">
            <div className="relative">
              <span className="text-muted-foreground/70 absolute bottom-0 left-0 h-6 w-16 max-w-full pe-2 text-right text-[10px] sm:pe-4 sm:text-xs">
                All day
              </span>
            </div>
            <div className="border-border/70 relative border-r p-1 last:border-r-0">
              {allDayPosts.map((post) => {
                const postStart = new Date(post.start);
                const postEnd = new Date(post.end);
                const isFirstDay = isSameDay(currentDate, postStart);
                const isLastDay = isSameDay(currentDate, postEnd);

                return (
                  <PostItem
                    key={`spanning-${post.id}`}
                    onClick={(e) => handlePostClick(post, e)}
                    post={post}
                    view="month"
                    isFirstDay={isFirstDay}
                    isLastDay={isLastDay}
                  >
                    {/* Always show the title in day view for better usability */}
                    <div>{post.title}</div>
                  </PostItem>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <div className="border-border/70 grid flex-1 grid-cols-[3rem_1fr] border-t sm:grid-cols-[4rem_1fr] overflow-hidden">
        <div>
          {hours.map((hour, index) => (
            <div
              key={hour.toString()}
              className="border-border/70 relative h-[var(--week-cells-height)] border-b last:border-b-0"
            >
              {index > 0 && (
                <span className="bg-background text-muted-foreground/70 absolute -top-3 left-0 flex h-6 w-16 max-w-full items-center justify-end pe-2 text-[10px] sm:pe-4 sm:text-xs">
                  {format(hour, "h a")}
                </span>
              )}
            </div>
          ))}
        </div>

        <div className="relative">
          {/* Positioned events */}
          {positionedPosts.map((positionedPost) => (
            <div
              key={positionedPost.post.id}
              className="absolute z-10 px-0.5"
              style={{
                top: `${positionedPost.top}px`,
                height: `${positionedPost.height}px`,
                left: `${positionedPost.left * 100}%`,
                width: `${positionedPost.width * 100}%`,
                zIndex: positionedPost.zIndex,
              }}
            >
              <div className="h-full w-full">
                <DraggablePost
                  post={positionedPost.post}
                  view="day"
                  onClick={(e) => handlePostClick(positionedPost.post, e)}
                  showTime
                  height={positionedPost.height}
                />
              </div>
            </div>
          ))}

          {/* Current time indicator */}
          {currentTimeVisible && (
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

          {/* Time grid */}
          {hours.map((hour) => {
            const hourValue = getHours(hour);
            return (
              <div
                key={hour.toString()}
                className="border-border/70 relative h-[var(--week-cells-height)] border-b last:border-b-0"
              >
                {/* Quarter-hour intervals */}
                {[0, 1, 2, 3].map((quarter) => {
                  const quarterHourTime = hourValue + quarter * 0.25;
                  return (
                    <DroppableCell
                      key={`${hour.toString()}-${quarter}`}
                      id={`day-cell-${currentDate.toISOString()}-${quarterHourTime}`}
                      date={currentDate}
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
                        const startTime = new Date(currentDate);
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
      </div>
    </div>
  );
}
