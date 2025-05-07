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
    .middleware(async () => {
      const clerkUser = await currentUser();

      if (!clerkUser) throw new Error("Unauthorized");

      try {
        const user = await prisma.user.findUnique({
          where: {
            clerkId: clerkUser.id,
          },
        });

        if (!user) throw new Error("User not found");

        return { userId: user.id };
      } catch (error) {
        console.error("Error finding user:", error);
        throw error;
      }
    })
    .onUploadComplete(async ({ metadata, file }) => {
      try {
        const media = await prisma.media.create({
          data: {
            url: file.ufsUrl,
            type: file.type.includes("image") ? "IMAGE" : "VIDEO", // Only "IMAGE" or "VIDEO"
            size: file.size,
            tags: [],
            userId: metadata.userId,
          },
        });

        return { ...file, mediaId: media.id };
      } catch (error) {
        console.error("Error creating media:", error);
        throw error;
      }
    }),
} satisfies FileRouter;
