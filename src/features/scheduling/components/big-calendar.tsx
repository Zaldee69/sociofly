"use client";

import { useState, useMemo } from "react";
import { addDays, setHours, setMinutes, getDay } from "date-fns";
import { useCalendarContext } from "@/features/scheduling/components/post-calendar/calendar-context";
import {
  CalendarPost,
  PostColor,
} from "@/features/scheduling/components/post-calendar/types";
import { PostCalendar } from "@/features/scheduling/components/post-calendar";
import { api } from "@/lib/utils/api";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

// Etiquettes data for calendar filtering
export const etiquettes = [
  {
    id: "my-events",
    name: "My Events",
    color: "emerald" as PostColor,
    isActive: true,
  },
  {
    id: "marketing-team",
    name: "Marketing Team",
    color: "orange" as PostColor,
    isActive: true,
  },
  {
    id: "interviews",
    name: "Interviews",
    color: "violet" as PostColor,
    isActive: true,
  },
  {
    id: "events-planning",
    name: "Events Planning",
    color: "blue" as PostColor,
    isActive: true,
  },
  {
    id: "holidays",
    name: "Holidays",
    color: "rose" as PostColor,
    isActive: true,
  },
];

// Function to calculate days until next Sunday
const getDaysUntilNextSunday = (date: Date) => {
  const day = getDay(date); // 0 is Sunday, 6 is Saturday
  return day === 0 ? 0 : 7 - day; // If today is Sunday, return 0, otherwise calculate days until Sunday
};

// Store the current date to avoid repeated new Date() calls
const currentDate = new Date();

// Calculate the offset once to avoid repeated calculations
const daysUntilNextSunday = getDaysUntilNextSunday(currentDate);

// Function to map API posts to CalendarPost structure
const mapToCalendarPosts = (apiPosts: any[] | undefined): CalendarPost[] => {
  if (!apiPosts) return [];

  return apiPosts.map((post) => ({
    id: post.id || String(Math.random()),
    postSocialAccounts:
      post.postSocialAccounts?.map((psa: any) => ({
        id: psa.id,
        socialAccount: {
          id: psa.socialAccount.id,
          name: psa.socialAccount.name,
          platform: psa.socialAccount.platform,
          profilePicture: psa.socialAccount.profilePicture,
        },
      })) ?? [],
    content: post.content || "",
    scheduledAt: post.scheduledAt,
    status: post.status || "DRAFT",
    mediaUrls: post.mediaUrls || [],
  }));
};

export default function Component() {
  const { isColorVisible } = useCalendarContext();

  const { data: posts, isLoading: isPostsLoading } = api.post.getAll.useQuery({
    teamId: "cmbem1h0o001avxptiy3xxnre",
  });

  // Filter events based on visible colors
  const visiblePosts = useMemo(() => {
    if (!posts || !posts.posts) return [];
    return mapToCalendarPosts(posts.posts);
  }, [posts]);

  // Show loading skeleton while data is being fetched
  if (isPostsLoading) {
    return (
      <div className="flex flex-col rounded-lg space-y-4">
        {/* Header skeleton */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-5 sm:px-4">
          <div className="flex sm:flex-col max-sm:items-center justify-between gap-1.5">
            <div className="flex items-center gap-1.5">
              <Skeleton className="h-7 w-48" />
            </div>
            <Skeleton className="h-6 w-32" />
          </div>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center sm:gap-2 max-sm:order-1">
                <Skeleton className="h-8 w-8 rounded" />
                <Skeleton className="h-8 w-8 rounded" />
              </div>
              <Skeleton className="h-8 w-16" />
            </div>
            <div className="flex items-center justify-between gap-2">
              <Skeleton className="h-8 w-24" />
              <Skeleton className="h-8 w-20" />
            </div>
          </div>
        </div>

        {/* Calendar skeleton */}
        <div className="border border-border/70 rounded-lg overflow-hidden">
          {/* Weekdays header skeleton */}
          <div className="grid grid-cols-7 gap-px bg-border/70">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day, i) => (
              <div key={i} className="bg-background p-3 text-center">
                <Skeleton className="h-4 w-8 mx-auto" />
              </div>
            ))}
          </div>

          {/* Calendar grid skeleton - 6 weeks */}
          <div className="grid grid-cols-7 gap-px bg-border/70">
            {Array.from({ length: 42 }).map((_, i) => {
              // Use deterministic values instead of Math.random() to avoid hydration mismatch
              const hasEvents = i % 5 === 0; // Every 5th day has events
              const eventCount = hasEvents ? (i % 3) + 1 : 0; // Consistent event count

              return (
                <div
                  key={i}
                  className="bg-background p-2 min-h-[120px] flex flex-col"
                >
                  <div className="flex justify-between items-center mb-2">
                    <Skeleton className="h-4 w-6" />
                  </div>
                  <div className="space-y-1 flex-1">
                    {Array.from({ length: eventCount }).map((_, eventIndex) => {
                      // Use deterministic widths instead of random
                      const widthClass =
                        eventIndex === 0
                          ? "w-full"
                          : eventIndex === 1
                            ? "w-4/5"
                            : "w-3/4";
                      return (
                        <Skeleton
                          key={eventIndex}
                          className={`h-5 ${widthClass} rounded animate-pulse`}
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Loading message */}
        <div className="text-center text-sm text-muted-foreground">
          Loading your calendar...
        </div>
      </div>
    );
  }

  const handlePostAdd = (post: CalendarPost) => {
    // setPosts([...posts, post]);
  };

  const handlePostUpdate = (updatedPost: CalendarPost) => {
    // setPosts(
    //   posts.map((post) => (post.id === updatedPost.id ? updatedPost : post))
    // );
  };

  const handlePostDelete = (postId: string) => {
    // setPosts(posts.filter((post) => post.id !== postId));
  };

  return (
    <PostCalendar
      posts={visiblePosts}
      onPostAdd={handlePostAdd}
      onPostUpdate={handlePostUpdate}
      onPostDelete={handlePostDelete}
      initialView="month"
    />
  );
}
