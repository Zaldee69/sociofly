// lib/social-publisher/index.ts
import { createClient } from "@/lib/utils/supabase/server";
import { FacebookPublisher } from "./facebook-publisher";
// import { InstagramPublisher } from "./instagram-publisher";
// import { LinkedInPublisher } from "./linkedin-publisher";
// import { TiktokPublisher } from "./tiktok-publisher";
import type { Platform } from "./types";
import { SocialPublisher } from "./base-publisher";

export class SocialPublishingService {
  private publishers: Record<string, SocialPublisher>;
  protected supabase: Awaited<ReturnType<typeof createClient>>;

  constructor(supabase: Awaited<ReturnType<typeof createClient>>) {
    this.supabase = supabase;
    this.publishers = {
      facebook: new FacebookPublisher(supabase),
    //   instagram: new InstagramPublisher(supabase),
    //   linkedin: new LinkedInPublisher(supabase),
    //   tiktok: new TiktokPublisher(supabase)
    };
  }

  async publish(postId: string) {
    // Get post to determine platform
    const { data: post, error } = await this.supabase
      .from('scheduled_posts')
      .select('platform')
      .eq('id', postId)
      .single();

    if (error || !post) {
      throw new Error('Post not found');
    }

    const publisher = this.publishers[post.platform as Platform];
    if (!publisher) {
      throw new Error(`No publisher for platform: ${post.platform}`);
    }

    return publisher.handle(postId);
  }

  getPublisher(platform: Platform): SocialPublisher {
    const publisher = this.publishers[platform];
    if (!publisher) {
      throw new Error(`Unsupported platform: ${platform}`);
    }
    return publisher;
  }
}