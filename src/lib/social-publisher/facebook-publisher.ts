// lib/social-publisher/facebook-publisher.ts
import { SocialPublisher } from "./base-publisher";
import type { PublishResult, PostMedia, SocialAccount, ScheduledPost } from "./types";

export class FacebookPublisher extends SocialPublisher {
  platform = "facebook" as const;

  async validatePost(content: string, media: PostMedia[]) {
    if (content.length > 63206) {
      throw new Error(
        "Facebook post exceeds maximum length (63,206 characters)"
      );
    }

    if (media.length > 4) {
      throw new Error("Facebook allows maximum 4 images per post");
    }
  }

  async publish(
    post: ScheduledPost,
    account: SocialAccount,
    media: PostMedia[]
  ): Promise<PublishResult> {
    let endpoint = `https://graph.facebook.com/v18.0/${account.platform_user_id}/feed`;
    const payload: any = {
      message: post.content,
      access_token: account.access_token,
    };

    // Handle media if exists
    if (media.length > 0) {
      if (media.length === 1) {
        // Single image
        endpoint = `https://graph.facebook.com/v18.0/${account.platform_user_id}/photos`;
        payload.url = media[0].url;
      } else {
        // Multiple images (requires different approach)
        throw new Error("Multi-image posts not implemented yet");
      }
    }

    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    if (data.error) {
      throw new Error(data.error.message || "Facebook API error");
    }

    return {
      success: true,
      post_id: post.id,
      external_id: data.id || data.post_id,
      message: "Successfully published to Facebook",
    };
  }
}
