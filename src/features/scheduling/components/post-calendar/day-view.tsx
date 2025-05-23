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
  addMinutes,
} from "date-fns";

import { StartHour, EndHour, WeekCellsHeight } from "./constants";
import { cn } from "@/lib/utils";

import { PostItem } from "./post-item";
import { DraggablePost } from "./draggable-post";
import { DroppableCell } from "./droppable-cell";
import { CalendarPost } from "./types";
import { useCurrentTimeIndicator } from "../hooks/use-current-time-indicator";

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

// Default duration for posts in minutes
const DEFAULT_POST_DURATION = 30;

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
        if (!post || !post.scheduledAt) return false;
        const postStart = new Date(post.scheduledAt);
        return isSameDay(currentDate, postStart);
      })
      .sort(
        (a, b) =>
          new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
      );
  }, [currentDate, posts]);

  // Process events to calculate positions
  const positionedPosts = useMemo(() => {
    const result: PositionedPost[] = [];
    const dayStart = startOfDay(currentDate);

    // Sort events by start time
    const sortedPosts = [...dayPosts].sort((a, b) => {
      const aStart = new Date(a.scheduledAt);
      const bStart = new Date(b.scheduledAt);
      return aStart.getTime() - bStart.getTime();
    });

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
  }, [currentDate, dayPosts]);

  const handlePostClick = (post: CalendarPost, e: React.MouseEvent) => {
    e.stopPropagation();
    onPostSelect(post);
  };

  const { currentTimePosition, currentTimeVisible } = useCurrentTimeIndicator(
    currentDate,
    "day"
  );

  return (
    <div data-slot="day-view" className="contents">
      <div className="border-border/70 grid flex-1 grid-cols-[3rem_1fr] border-t sm:grid-cols-[4rem_1fr] overflow-auto max-h-[calc(100vh-10rem)]">
        <div className="sticky left-0 bg-background/80 z-10">
          {hours.map((hour) => (
            <div
              key={hour.toString()}
              className="border-border/70 relative h-[var(--week-cells-height)] border-b last:border-b-0"
            >
              <span className="bg-background text-muted-foreground/70 absolute -top-3 left-0 flex h-6 w-16 max-w-full items-center justify-end pe-2 text-[10px] sm:pe-4 sm:text-xs">
                {format(hour, "HH:00")}
              </span>
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
