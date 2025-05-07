import { createUploadthing, type FileRouter } from "uploadthing/next";
import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma/client"; // Note: default import
import { MediaType } from "@prisma/client";

const f = createUploadthing();

export const ourFileRouter = {
  mediaUploader: f({
    image: { maxFileSize: "16MB", maxFileCount: 5 },
    video: { maxFileSize: "64MB", maxFileCount: 2 },
  })
    .middleware(async ({ req }) => {
      const clerkUser = await currentUser();

      if (!clerkUser) throw new Error("Unauthorized");

      // Get organizationId from request headers
      const organizationId = req.headers.get("x-organization-id");
      if (!organizationId) throw new Error("Organization ID is required");

      try {
        const user = await prisma.user.findUnique({
          where: {
            clerkId: clerkUser.id,
          },
          include: {
            memberships: {
              where: {
                organizationId,
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

        return { userId: user.id, organizationId };
      } catch (error) {
        console.error("Error finding user:", error);
        throw error;
      }
    })
    .onUploadComplete(async ({ metadata, file }) => {
      try {
        const media = await prisma.media.create({
          data: {
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
