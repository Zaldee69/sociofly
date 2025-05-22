// lib/social-publisher/base-publisher.ts
import type {
  Platform,
  PublishResult,
  PostMedia,
  SocialAccount,
  ScheduledPost,
} from "./types";

export abstract class SocialPublisher {
  abstract platform: Platform;

  abstract validatePost(content: string, media: PostMedia[]): Promise<void>;

  abstract publish(
    post: ScheduledPost,
    account: SocialAccount,
    media: PostMedia[]
  ): Promise<PublishResult>;

  async handle(postId: string): Promise<PublishResult> {
    // This would typically fetch the post from the database
    // and perform the actual publication
    return {
      success: true,
      post_id: postId,
      external_id: "mock-id",
      message: `Successfully published to ${this.platform}`,
    };
  }
}
