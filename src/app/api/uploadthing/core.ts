import { createClient } from "@/lib/utils/supabase/server";
import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";

const f = createUploadthing();

// FileRouter for your app, can contain multiple FileRoutes
export const ourFileRouter = {
  // Define as many FileRoutes as you like, each with a unique routeSlug
  imageUploader: f({
    image: {
      /**
       * For full list of options and defaults, see the File Route API reference
       * @see https://docs.uploadthing.com/file-routes#route-config
       */
      maxFileSize: "16MB",
      maxFileCount: 5,
    },
    video: {
      maxFileSize: "16MB",
      maxFileCount: 5,
    },
  })
    .middleware(async ({ req }) => {
      const supabase = await createClient();
      const { data: { user }, error } = await supabase.auth.getUser();

      if (error || !user) {
        throw new UploadThingError("Unauthorized");
      }

      return { userId: user.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      const supabase = await createClient();

      try {
        // Insert and get back the inserted row data
        const { data, error } = await supabase.from("media").insert({
          name: file.name,
          url: file.ufsUrl,
          user_id: metadata.userId,
          type: file.type,
          size: file.size,
          format: file.type.split("/")[1],
          uploadthing_key: file.key // Add this field to store UploadThing's file key
        })
        .select()
        .single();

        if (error) throw error;
        if (!data) throw new Error("Failed to get inserted media data");

        // Return both IDs for reference
        return { 
          uploadedBy: metadata.userId,
          mediaId: data.id,
          uploadthingKey: file.key 
        };
      } catch (error) {
        console.error("Error inserting media record:", error);
        throw new UploadThingError("Failed to save media information to database");
      }
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;



