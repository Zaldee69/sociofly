import { NextResponse } from "next/server";
import { FacebookAdsApi, Page } from "facebook-nodejs-business-sdk";
import { createClient } from "@/lib/utils/supabase/server";

export async function POST(req: Request) {
  const { user_id, content, scheduled_time, media_ids } = await req.json();

  const supabase = await createClient();

  try {
    // 1. Ambil Facebook token dari database
    const { data, error } = await supabase
      .from("social_accounts")
      .select("access_token, platform_user_id")
      .eq("user_id", user_id)
      .eq("platform", "facebook")
      .single();

    if (error || !data) {
      throw new Error("Facebook not connected");
    }

    // Validasi input
    if (!content || !scheduled_time) {
      return NextResponse.json(
        { error: "Content and scheduled_time are required" },
        { status: 400 }
      );
    }

    // Validasi content tidak kosong
    if (content.trim().length === 0) {
      return NextResponse.json(
        { error: "Content cannot be empty" },
        { status: 400 }
      );
    }

    // Validasi waktu (minimal 10 menit dari sekarang)
    const minScheduleTime = new Date(Date.now() + 10 * 60 * 1000);
    if (new Date(scheduled_time) < minScheduleTime) {
      return NextResponse.json(
        { error: "Scheduled time must be at least 10 minutes from now" },
        { status: 400 }
      );
    }

    // 2. Konfigurasi Facebook SDK
    FacebookAdsApi.init(data.access_token);
    const page = new Page(data.platform_user_id);

    // 3. Buat scheduled post di database
    const { data: post, error: postError } = await supabase
      .from("scheduled_posts")
      .insert({
        user_id,
        platform: "facebook",
        content,
        scheduled_time,
        status: "scheduled",
      })
      .select("id")
      .single();

    if (postError || !post) {
      throw new Error("Failed to create scheduled post");
    }

    if (media_ids?.length > 0) {
      // Validasi UUID format
      const isValidUUID = (id: string) => {
        const uuidRegex =
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        return uuidRegex.test(id);
      };

      if (!media_ids.every(isValidUUID)) {
        return NextResponse.json(
          { error: "Invalid media ID format" },
          { status: 400 }
        );
      }

      // Ambil data media
      const { data: mediaData, error: mediaError } = await supabase
        .from("media")
        .select("*")
        .in("id", media_ids);

      if (mediaError) {
        throw new Error("Failed to fetch media data");
      }

      // Simpan ke scheduled_post_media
      for (const [index, mediaId] of media_ids.entries()) {
        await supabase.from("scheduled_post_media").insert({
          scheduled_post_id: post.id,
          media_id: mediaId,
          position: index,
        });
      }

      // Upload media ke Facebook dan dapatkan media IDs
      const mediaIds = [];
      for (const media of mediaData) {
        if (media.type.startsWith("image/")) {
          const response = await fetch(
            `https://graph.facebook.com/v18.0/${data.platform_user_id}/photos`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                url: media.url,
                published: false,
                access_token: data.access_token,
              }),
            }
          );

          const result = await response.json();
          if (result && result.id) {
            mediaIds.push({ media_fbid: result.id });
          }
        }
      }

      // Buat post dengan semua media
      if (mediaIds.length > 0) {
        const response = await fetch(
          `https://graph.facebook.com/v18.0/${data.platform_user_id}/feed`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              message: content.trim(),
              attached_media: mediaIds,
              published: false,
              scheduled_publish_time: Math.floor(
                new Date(scheduled_time).getTime() / 1000
              ),
              access_token: data.access_token,
            }),
          }
        );

        const result = await response.json();

        // Update external_id untuk post dengan media
        if (result && result.id) {
          await supabase
            .from("scheduled_posts")
            .update({ external_id: result.id })
            .eq("id", post.id);
        }
      }
    } else {
      // Posting tanpa media
      const response = await fetch(
        `https://graph.facebook.com/v18.0/${data.platform_user_id}/feed`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: content.trim(),
            published: false,
            scheduled_publish_time: Math.floor(
              new Date(scheduled_time).getTime() / 1000
            ),
            access_token: data.access_token,
          }),
        }
      );

      const result = await response.json();

      // Update external_id untuk post tanpa media
      if (result && result.id) {
        await supabase
          .from("scheduled_posts")
          .update({ external_id: result.id })
          .eq("id", post.id);
      }
    }

    return NextResponse.json({ success: true, post_id: post.id });
  } catch (error: any) {
    console.log(error.headers);
    
    // Check for unauthorized error
    if (error.message?.includes("OAuth") || error.message?.includes("unauthorized")) {
      return NextResponse.json(
        { error: "Unauthorized", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: error.message || "Failed to schedule post" },
      { status: 500 }
    );
  }
}

async function handleVideoUpload(
  accessToken: string,
  pageId: string,
  videoUrl: string,
  caption: string,
  scheduledTime: string
) {
  // Facebook video upload memerlukan 3 tahap:
  // 1. Init upload, 2. Upload chunk, 3. Confirm
  // Lihat: https://developers.facebook.com/docs/graph-api/video-uploads
  throw new Error("Video upload not implemented in this example");
}
