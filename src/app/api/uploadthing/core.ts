import { createUploadthing, type FileRouter } from "uploadthing/next";
import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma/client"; // Note: default import
import { MediaType, Role } from "@prisma/client";
import { z } from "zod";
import { can } from "@/server/permissions/helpers";

const f = createUploadthing();

// Helper function to check if user has permission
async function hasPermission(
  userId: string,
  teamId: string,
  permissionCode: string
): Promise<boolean> {
  // Use the can helper from permissions module that checks grants/denies
  return can(userId, teamId, permissionCode);
}

export const ourFileRouter = {
  mediaUploader: f({
    image: { maxFileSize: "16MB", maxFileCount: 5 },
    video: { maxFileSize: "64MB", maxFileCount: 2 },
  })
    .input(
      z.object({
        teamId: z.string(),
      })
    )
    .middleware(async ({ input }) => {
      const clerkUser = await currentUser();

      if (!clerkUser) throw new Error("Unauthorized");

      try {
        const user = await prisma.user.findUnique({
          where: {
            clerkId: clerkUser.id,
          },
        });

        if (!user) throw new Error("User not found");

        // Check for media.upload permission
        const canUpload = await hasPermission(
          user.id,
          input.teamId,
          "media.upload"
        );

        if (!canUpload) {
          throw new Error("Not authorized to upload media in this team");
        }

        return { userId: user.id, teamId: input.teamId };
      } catch (error) {
        console.error("Error finding user:", error);
        throw error;
      }
    })
    .onUploadComplete(async ({ metadata, file }) => {
      try {
        const media = await prisma.media.create({
          data: {
            name: file.name,
            url: file.url,
            type: file.type.includes("image")
              ? MediaType.IMAGE
              : MediaType.VIDEO,
            size: file.size,
            tags: [],
            userId: metadata.userId,
            teamId: metadata.teamId,
            usageCount: 0,
          },
        });

        return { ...file, mediaId: media.id };
      } catch (error) {
        console.error("Error creating media:", error);
        throw error;
      }
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
