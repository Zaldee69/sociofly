"use client";

import { useEffect, useMemo, useState } from "react";
import { useCalendarContext } from "./calendar-context";
import {
  addDays,
  addMonths,
  addWeeks,
  endOfWeek,
  format,
  isSameMonth,
  startOfWeek,
  subMonths,
  subWeeks,
} from "date-fns";
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "lucide-react";
import { toast } from "sonner";
import { PostStatus } from "@prisma/client";

import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Participants from "@/components/participants";
import {
  addHoursToDate,
  AgendaView,
  CalendarDndProvider,
  CalendarView,
  DayView,
  MonthView,
  WeekView,
} from ".";

import { CalendarPost } from "./types";
import { AddPostDialog } from "./post-dialog";
import {
  AgendaDaysToShow,
  WeekCellsHeight,
  EventGap,
  EventHeight,
} from "./constants";

export interface PostCalendarProps {
  posts?: CalendarPost[];
  onPostAdd?: (post: CalendarPost) => void;
  onPostUpdate?: (post: CalendarPost) => void;
  onPostDelete?: (postId: string) => void;
  className?: string;
  initialView?: CalendarView;
}

export function PostCalendar({
  posts = [],
  onPostAdd,
  onPostUpdate,
  onPostDelete,
  className,
  initialView = "month",
}: PostCalendarProps) {
  // Use the shared calendar context instead of local state
  const { currentDate, setCurrentDate } = useCalendarContext();
  const [view, setView] = useState<CalendarView>(initialView);
  const [isPostDialogOpen, setIsPostDialogOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState<CalendarPost | null>(null);

  // Add keyboard shortcuts for view switching
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip if user is typing in an input, textarea or contentEditable element
      // or if the event dialog is open
      if (
        isPostDialogOpen ||
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target instanceof HTMLElement && e.target.isContentEditable)
      ) {
        return;
      }

      switch (e.key.toLowerCase()) {
        case "m":
          setView("month");
          break;
        case "w":
          setView("week");
          break;
        case "d":
          setView("day");
          break;
        case "a":
          setView("agenda");
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isPostDialogOpen]);

  const handlePrevious = () => {
    if (view === "month") {
      setCurrentDate(subMonths(currentDate, 1));
    } else if (view === "week") {
      setCurrentDate(subWeeks(currentDate, 1));
    } else if (view === "day") {
      setCurrentDate(addDays(currentDate, -1));
    } else if (view === "agenda") {
      // For agenda view, go back 30 days (a full month)
      setCurrentDate(addDays(currentDate, -AgendaDaysToShow));
    }
  };

  const handleNext = () => {
    if (view === "month") {
      setCurrentDate(addMonths(currentDate, 1));
    } else if (view === "week") {
      setCurrentDate(addWeeks(currentDate, 1));
    } else if (view === "day") {
      setCurrentDate(addDays(currentDate, 1));
    } else if (view === "agenda") {
      // For agenda view, go forward 30 days (a full month)
      setCurrentDate(addDays(currentDate, AgendaDaysToShow));
    }
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const handlePostSelect = (post: CalendarPost) => {
    console.log("Post selected:", post); // Debug log
    setSelectedPost(post);
    setIsPostDialogOpen(true);
  };

  const handlePostCreate = (startTime: Date) => {
    setIsPostDialogOpen(true);
  };

  const handlePostSave = (post: CalendarPost) => {
    if (post.id) {
      onPostUpdate?.(post);
      // Show toast notification when an event is updated
      toast(`Event "${post.content}" updated`, {
        description: format(new Date(post.scheduledAt), "MMM d, yyyy"),
        position: "bottom-left",
      });
    } else {
      onPostAdd?.({
        ...post,
        id: Math.random().toString(36).substring(2, 11),
      });
      // Show toast notification when an event is added
      toast(`Event "${post.content}" added`, {
        description: format(new Date(post.scheduledAt), "MMM d, yyyy"),
        position: "bottom-left",
      });
    }
    setIsPostDialogOpen(false);
    setSelectedPost(null);
  };

  const handlePostDelete = (postId: string) => {
    const deletedPost = posts.find((p) => p.id === postId);
    onPostDelete?.(postId);
    setIsPostDialogOpen(false);
    setSelectedPost(null);

    // Show toast notification when an event is deleted
    if (deletedPost) {
      toast(`Event "${deletedPost.content}" deleted`, {
        description: format(new Date(deletedPost.scheduledAt), "MMM d, yyyy"),
        position: "bottom-left",
      });
    }
  };

  const handlePostUpdate = (updatedPost: CalendarPost) => {
    onPostUpdate?.(updatedPost);

    // Show toast notification when an event is updated via drag and drop
    toast(`Event "${updatedPost.content}" moved`, {
      description: format(new Date(updatedPost.scheduledAt), "MMM d, yyyy"),
      position: "bottom-left",
    });
  };

  const viewTitle = useMemo(() => {
    if (view === "month") {
      return format(currentDate, "MMMM yyyy");
    } else if (view === "week") {
      const start = startOfWeek(currentDate, { weekStartsOn: 0 });
      const end = endOfWeek(currentDate, { weekStartsOn: 0 });
      if (isSameMonth(start, end)) {
        return format(start, "MMMM yyyy");
      } else {
        return `${format(start, "MMM")} - ${format(end, "MMM yyyy")}`;
      }
    } else if (view === "day") {
      return (
        <>
          <span className="min-sm:hidden" aria-hidden="true">
            {format(currentDate, "MMM d, yyyy")}
          </span>
          <span className="max-sm:hidden min-md:hidden" aria-hidden="true">
            {format(currentDate, "MMMM d, yyyy")}
          </span>
          <span className="max-md:hidden">
            {format(currentDate, "EEE MMMM d, yyyy")}
          </span>
        </>
      );
    } else if (view === "agenda") {
      // Show the month range for agenda view
      const start = currentDate;
      const end = addDays(currentDate, AgendaDaysToShow - 1);

      if (isSameMonth(start, end)) {
        return format(start, "MMMM yyyy");
      } else {
        return `${format(start, "MMM")} - ${format(end, "MMM yyyy")}`;
      }
    } else {
      return format(currentDate, "MMMM yyyy");
    }
  }, [currentDate, view]);

  return (
    <div
      className="flex has-data-[slot=month-view]:flex-1 flex-col rounded-lg"
      style={
        {
          "--event-height": `${EventHeight}px`,
          "--event-gap": `${EventGap}px`,
          "--week-cells-height": `${WeekCellsHeight}px`,
        } as React.CSSProperties
      }
    >
      <CalendarDndProvider onPostUpdate={handlePostUpdate}>
        <div
          className={cn(
            "flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-5 sm:px-4",
            className
          )}
        >
          <div className="flex sm:flex-col max-sm:items-center justify-between gap-1.5">
            <div className="flex items-center gap-1.5">
              <h2 className="font-semibold text-xl lg:peer-data-[state=invisible]:-translate-x-7.5 transition-transform ease-in-out duration-300">
                {viewTitle}
              </h2>
            </div>
            <Participants />
          </div>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center sm:gap-2 max-sm:order-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="max-sm:size-8"
                  onClick={handlePrevious}
                  aria-label="Previous"
                >
                  <ChevronLeftIcon size={16} aria-hidden="true" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="max-sm:size-8"
                  onClick={handleNext}
                  aria-label="Next"
                >
                  <ChevronRightIcon size={16} aria-hidden="true" />
                </Button>
              </div>
              <Button
                className="max-sm:h-8 max-sm:px-2.5!"
                onClick={handleToday}
              >
                Today
              </Button>
            </div>
            <div className="flex items-center justify-between gap-2">
              <Button
                variant="outline"
                className="max-sm:h-8 max-sm:px-2.5!"
                onClick={() => {
                  // Create a new post with proper structure
                  const newPost: CalendarPost = {
                    id: `temp-${Date.now()}`,
                    content: "",
                    scheduledAt: new Date(),
                    status: "DRAFT" as PostStatus,
                    postSocialAccounts: [],
                    mediaUrls: [],
                  };
                  setSelectedPost(newPost);
                  setIsPostDialogOpen(true);
                }}
              >
                New Event
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="gap-1.5 max-sm:h-8 max-sm:px-2! max-sm:gap-1"
                  >
                    <span className="capitalize">{view}</span>
                    <ChevronDownIcon
                      className="-me-1 opacity-60"
                      size={16}
                      aria-hidden="true"
                    />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-32">
                  <DropdownMenuItem onClick={() => setView("month")}>
                    Month <DropdownMenuShortcut>M</DropdownMenuShortcut>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setView("week")}>
                    Week <DropdownMenuShortcut>W</DropdownMenuShortcut>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setView("day")}>
                    Day <DropdownMenuShortcut>D</DropdownMenuShortcut>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setView("agenda")}>
                    Agenda <DropdownMenuShortcut>A</DropdownMenuShortcut>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              {/* <ThemeToggle /> */}
            </div>
          </div>
        </div>

        <div className="flex flex-1 flex-col">
          {view === "month" && (
            <MonthView
              currentDate={currentDate}
              posts={posts}
              onPostSelect={handlePostSelect}
              onPostCreate={handlePostCreate}
            />
          )}
          {view === "week" && (
            <WeekView
              currentDate={currentDate}
              posts={posts}
              onPostSelect={handlePostSelect}
              onPostCreate={handlePostCreate}
            />
          )}
          {view === "day" && (
            <DayView
              currentDate={currentDate}
              posts={posts}
              onPostSelect={handlePostSelect}
              onPostCreate={handlePostCreate}
            />
          )}
          {view === "agenda" && (
            <AgendaView
              currentDate={currentDate}
              posts={posts}
              onPostSelect={handlePostSelect}
            />
          )}
        </div>

        <AddPostDialog
          post={selectedPost}
          isOpen={isPostDialogOpen}
          onClose={() => {
            setIsPostDialogOpen(false);
            setSelectedPost(null);
          }}
          onSave={handlePostSave}
          onDelete={handlePostDelete}
        />
      </CalendarDndProvider>
    </div>
  );
}
