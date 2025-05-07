import { createUploadthing, type FileRouter } from "uploadthing/next";
import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma/client"; // Note: default import
import { MediaType } from "@prisma/client";
import { z } from "zod";

const f = createUploadthing();

export const ourFileRouter = {
  mediaUploader: f({
    image: { maxFileSize: "16MB", maxFileCount: 5 },
    video: { maxFileSize: "64MB", maxFileCount: 2 },
  })
    .input(
      z.object({
        organizationId: z.string(),
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
          include: {
            memberships: {
              where: {
                organizationId: input.organizationId,
                role: {
                  in: ["ADMIN", "EDITOR"],
                },
              },
            },
          },
        });

        if (!user) throw new Error("User not found");
        if (user.memberships.length === 0)
          throw new Error(
            "Not authorized to upload media in this organization"
          );

        return { userId: user.id, organizationId: input.organizationId };
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
            organizationId: metadata.organizationId,
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
