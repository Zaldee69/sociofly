// lib/social-publisher/base-publisher.ts
import { createClient } from "@/lib/utils/supabase/server";
import type {
  Platform,
  PublishResult,
  SocialAccount,
  ScheduledPost,
  PostMedia
} from "./types";

export abstract class SocialPublisher {
  abstract platform: Platform;
  protected supabase: Awaited<ReturnType<typeof createClient>>;
  
  constructor(supabase: Awaited<ReturnType<typeof createClient>>) {
    this.supabase = supabase;
  }

  abstract validatePost(content: string, media: PostMedia[]): Promise<void>;
  abstract publish(
    post: ScheduledPost,
    account: SocialAccount,
    media: PostMedia[]
  ): Promise<PublishResult>;
  
  async handle(postId: string) {
    const { post, account, media } = await this.getPostData(postId);
    
    try {
      await this.validatePost(post.content, media);
      const result = await this.publish(post, account, media);
      await this.recordSuccess(postId, result);
      return result;
    } catch (error: any) {
      await this.recordFailure(postId, error);
      throw error;
    }
  }

  protected async getPostData(postId: string) {
    // Get post data
    const { data: post, error: postError } = await this.supabase
      .from('scheduled_posts')
      .select('*')
      .eq('id', postId)
      .single();

    if (postError || !post) {
      throw new Error('Post not found');
    }

    // Get social account
    const { data: account, error: accountError } = await this.supabase
      .from('social_accounts')
      .select('*')
      .eq('user_id', post.user_id)
      .eq('platform', post.platform)
      .single();

    if (accountError || !account) {
      throw new Error(`${post.platform} account not found`);
    }

    // Get media if exists
    let media: PostMedia[] = [];
    const { data: postMedia, error: mediaError } = await this.supabase
      .from('scheduled_post_media')
      .select('media_id, position')
      .eq('scheduled_post_id', postId)
      .order('position', { ascending: true });

    if (!mediaError && postMedia?.length) {
      const { data: mediaItems } = await this.supabase
        .from('media')
        .select('id, url, type')
        .in('id', postMedia.map(m => m.media_id));

      if (mediaItems) {
        media = postMedia.map(pm => {
          const item = mediaItems.find(m => m.id === pm.media_id);
          return {
            id: pm.media_id,
            url: item?.url || '',
            type: item?.type || 'image',
            position: pm.position
          };
        });
      }
    }

    return { post, account, media };
  }

  protected async recordSuccess(postId: string, result: PublishResult) {
    await this.supabase
      .from('scheduled_posts')
      .update({ 
        status: 'published',
        external_id: result.external_id,
        published_at: new Date().toISOString(),
        attempts: this.supabase.rpc('increment', { val: 1 })
      })
      .eq('id', postId);

    await this.supabase.from('published_posts_log').insert({
      scheduled_post_id: postId,
      user_id: (await this.getPostData(postId)).post.user_id,
      platform: this.platform,
      content: (await this.getPostData(postId)).post.content,
      external_id: result.external_id,
      status: 'success',
      published_at: new Date().toISOString()
    });
  }

  protected async recordFailure(postId: string, error: Error) {
    const { post } = await this.getPostData(postId);
    
    await this.supabase
      .from('scheduled_posts')
      .update({ 
        status: 'failed',
        attempts: this.supabase.rpc('increment', { val: 1 })
      })
      .eq('id', postId);

    await this.supabase.from('published_posts_log').insert({
      scheduled_post_id: postId,
      user_id: post.user_id,
      platform: this.platform,
      content: post.content,
      status: 'failed',
      error_message: error.message,
      published_at: new Date().toISOString()
    });
  }
}