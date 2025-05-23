import { PostStatus } from "@prisma/client";

export type CalendarView = "month" | "week" | "day" | "agenda";

export interface CalendarPost {
  id: string;
  socialAccounts: {
    id: string;
    name: string;
    platform: string;
  }[];
  content: string;
  scheduledAt: Date;
  status: PostStatus;
}

export type PostColor = "blue" | "orange" | "violet" | "rose" | "emerald";
