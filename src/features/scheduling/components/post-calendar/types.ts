import { PostStatus, SocialAccount } from "@prisma/client";

export type CalendarView = "month" | "week" | "day" | "agenda";

export interface CalendarPost {
  id: string;
  postSocialAccounts: {
    id: string;
    socialAccount: SocialAccount;
  }[];
  content: string;
  scheduledAt: Date;
  status: PostStatus;
  mediaUrls: string[];
}

export type PostColor = "blue" | "orange" | "violet" | "rose" | "emerald";
