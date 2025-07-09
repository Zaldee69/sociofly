import { NotificationType } from "@prisma/client";

export interface Notification {
  id: string;
  userId: string;
  teamId?: string | null;
  title: string;
  body: string;
  type: NotificationType;
  isRead: boolean;
  link?: string | null;
  metadata?: Record<string, any> | null;
  createdAt: Date;
  readAt?: Date | null;
  expiresAt?: Date | null;
}
