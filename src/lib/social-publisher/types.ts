export type Platform = 'facebook' | 'instagram' | 'linkedin' | 'tiktok';

export interface PublishResult {
  success: boolean;
  post_id: string;
  external_id?: string;
  message?: string;
}

export interface SocialAccount {
  id: string;
  user_id: string;
  platform: Platform;
  platform_user_id: string;
  username: string;
  access_token: string;
  expires_at: string | null;
}

export interface ScheduledPost {
  id: string;
  user_id: string;
  platform: Platform;
  content: string;
  scheduled_time: string;
  status: string;
  external_id: string | null;
  attempts: number;
}

export interface PostMedia {
  id: string;
  url: string;
  type: string;
  position: number;
}