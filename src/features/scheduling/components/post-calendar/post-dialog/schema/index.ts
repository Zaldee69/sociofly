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
    scheduledAt: z.date(),
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
      // Only validate future date when scheduling posts
      if (
        data.postAction === PostAction.SCHEDULE ||
        data.postAction === PostAction.REQUEST_REVIEW
      ) {
        const now = new Date();
        const oneMinuteFromNow = new Date(now.getTime() + 60 * 1000); // Add 1 minute
        return data.scheduledAt >= oneMinuteFromNow;
      }
      return true;
    },
    {
      message: "Waktu posting harus minimal 1 menit dari sekarang",
      path: ["scheduledAt"], // This will show the error on the scheduledAt field
    }
  );

export type PostFormValues = z.infer<typeof postSchema>;
