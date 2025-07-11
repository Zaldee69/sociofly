import * as z from "zod";
import { PostStatus } from "@prisma/client";

export enum PostAction {
  PUBLISH_NOW = "PUBLISH_NOW",
  SCHEDULE = "SCHEDULE",
  SAVE_AS_DRAFT = "SAVE_AS_DRAFT",
  REQUEST_REVIEW = "REQUEST_REVIEW",
}

// Media item type for uploadthing
export const mediaItemSchema = z.object({
  preview: z.string(), // URL preview
  name: z.string(), // Original filename
  size: z.number(), // File size
  type: z.string(), // MIME type
  fileId: z.string().optional(), // For stableId or file identifier
  uploadedUrl: z.string().optional(), // For when file is uploaded to storage
});

export type MediaItem = z.infer<typeof mediaItemSchema>;

export const postSchema = z
  .object({
    content: z.string(),
    mediaUrls: z.array(mediaItemSchema).default([]),
    scheduledAt: z.date().optional(), // Make optional since not all actions need it
    status: z.nativeEnum(PostStatus).default("DRAFT"),
    userId: z.string().optional(),
    teamId: z.string().optional(),
    socialAccounts: z
      .array(z.string())
      .min(1, "Pilih minimal satu akun sosial"),
    postAction: z.nativeEnum(PostAction).default(PostAction.PUBLISH_NOW),
    // New fields for approval workflow
    needsApproval: z.boolean().default(false),
    approvalWorkflowId: z.string().optional(),
  })
  .refine(
    (data) => {
      // Only require scheduledAt for actions that need scheduling
      if (
        data.postAction === PostAction.SCHEDULE ||
        data.postAction === PostAction.REQUEST_REVIEW
      ) {
        if (!data.scheduledAt) {
          return false;
        }
        const now = new Date();
        const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000); // Changed to 5 minutes
        return data.scheduledAt >= fiveMinutesFromNow;
      }
      return true;
    },
    {
      message: "Waktu posting harus minimal 5 menit dari sekarang",
      path: ["scheduledAt"],
    }
  )
  .refine(
    (data) => {
      // Ensure scheduledAt is provided for SCHEDULE and REQUEST_REVIEW
      if (
        data.postAction === PostAction.SCHEDULE ||
        data.postAction === PostAction.REQUEST_REVIEW
      ) {
        return !!data.scheduledAt;
      }
      return true;
    },
    {
      message: "Waktu posting wajib diisi untuk penjadwalan dan pengajuan review",
      path: ["scheduledAt"],
    }
  );

export type PostFormValues = z.infer<typeof postSchema>;
