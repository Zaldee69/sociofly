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
    socialAccounts:
      post.socialAccounts?.map((sa: any) => ({
        id: sa.id || sa.socialAccount?.id || String(Math.random()),
        name: sa.name || sa.socialAccount?.name || "Unknown",
        platform: sa.platform || sa.socialAccount?.platform || "Unknown",
      })) || [],
    content: post.content || "",
    scheduledAt: post.scheduledAt ? new Date(post.scheduledAt) : new Date(),
    status: post.status || "DRAFT",
  }));
};

export default function Component() {
  const { isColorVisible } = useCalendarContext();

  const { data: posts } = api.post.getAll.useQuery({
    teamId: "cmaz4ieo30002vxoghd7052c0",
  });

  // Filter events based on visible colors
  const visiblePosts = useMemo(() => {
    if (!posts || !posts.posts) return [];
    return mapToCalendarPosts(posts.posts);
  }, [posts]);

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
