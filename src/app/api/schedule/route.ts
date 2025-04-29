// app/api/schedule/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/utils/supabase/server";
import { SocialPublishingService } from "@/lib/social-publisher";

export async function POST(req: Request) {
  const {
    user_id,
    platform,
    platform_user_id,
    content,
    scheduled_time,
    media_ids,
  } = await req.json();

  const supabase = await createClient();
  const publishingService = new SocialPublishingService(supabase);

  try {
    // Validate platform (using your existing social_accounts table)
    const { data: account, error: accountError } = await supabase
      .from("social_accounts")
      .select("id")
      .eq("user_id", user_id)
      .eq("platform", platform)
      .eq("platform_user_id", platform_user_id)
      .single();

    if (accountError || !account) {
      return NextResponse.json(
        { error: `${platform} account not connected` },
        { status: 400 }
      );
    }

    // Validate content
    if (!content || content.trim().length === 0) {
      return NextResponse.json(
        { error: "Content cannot be empty" },
        { status: 400 }
      );
    }

    // Validate scheduled time (min 10 minutes in future)
    const minTime = new Date(Date.now() + 10 * 60 * 1000);
    if (new Date(scheduled_time) < minTime) {
      return NextResponse.json(
        { error: "Scheduled time must be at least 10 minutes from now" },
        { status: 400 }
      );
    }

    // Create scheduled post
    const { data: post, error: postError } = await supabase
      .from("scheduled_posts")
      .insert({
        user_id,
        platform,
        content,
        scheduled_time,
        status: "scheduled",
        external_id: null,
        attempts: 0,
      })
      .select("id")
      .single();

    if (postError || !post) {
      throw new Error("Failed to create scheduled post");
    }

    // Handle media
    if (media_ids?.length > 0) {
      const mediaInserts = media_ids.map((mediaId: string, index: number) => ({
        scheduled_post_id: post.id,
        media_id: mediaId,
        position: index,
      }));

      const { error: mediaError } = await supabase
        .from("scheduled_post_media")
        .insert(mediaInserts);

      if (mediaError) {
        throw new Error("Failed to attach media to post");
      }
    }

    // Use the publishing service to handle the post
    try {
      const result = await publishingService.publish(post.id);
      return NextResponse.json({
        success: true,
        post_id: post.id,
        publish_result: result,
      });
    } catch (publishError: any) {
      // If publishing fails, update the post status to failed
      await supabase
        .from("scheduled_posts")
        .update({
          status: "failed",
          attempts: supabase.rpc("increment", { val: 1 }),
        })
        .eq("id", post.id);

      throw new Error(`Failed to publish post: ${publishError.message}`);
    }
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to schedule post" },
      { status: 500 }
    );
  }
}
