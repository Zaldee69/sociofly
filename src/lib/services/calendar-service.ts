// TODO: Replace with real data fetching logic
// Commented import removed during restructuring
import type { IEvent } from "@/types/calendar";
import type {
  RealtimeChannel,
  RealtimePostgresChangesPayload,
} from "@supabase/supabase-js";

export interface IScheduledPost {
  id: string;
  user_id: string;
  platform: "facebook" | "twitter" | "instagram" | "linkedin";
  content: string;
  scheduled_time: string;
  status: "scheduled" | "published" | "failed" | "draft";
  external_id: string | null;
  created_at: string;
}

type RealtimePayload = RealtimePostgresChangesPayload<{
  id: string;
  user_id: string;
  platform: string;
  content: string;
  scheduled_time: string;
  status: string;
  external_id: string | null;
  created_at: string;
}>;

function isScheduledPost(post: any): post is IScheduledPost {
  return (
    post && typeof post.id === "string" && typeof post.user_id === "string"
  );
}

export class CalendarService {
  // TODO: Replace with real data fetching logic
  // private supabase = createClient();
  private subscription: RealtimeChannel | null = null;
  private initialData: IScheduledPost[] = [];
  private retryCount = 0;
  private maxRetries = 3;
  private retryTimeout: NodeJS.Timeout | null = null;
  private isInitialLoad = true;

  async getScheduledPosts(filters?: {
    startDate?: Date;
    endDate?: Date;
    userId?: string;
    status?: IScheduledPost["status"];
  }) {
    // TODO: Replace with real data fetching logic
    // let query = this.supabase
    //   .from('scheduled_posts')
    //   .select('*');

    // if (filters?.startDate) {
    //   query = query.gte('scheduled_time', filters.startDate.toISOString());
    // }

    // if (filters?.endDate) {
    //   query = query.lte('scheduled_time', filters.endDate.toISOString());
    // }

    // if (filters?.userId) {
    //   query = query.eq('user_id', filters.userId);
    // }

    // if (filters?.status) {
    //   query = query.eq('status', filters.status);
    // }

    // const { data, error } = await query;

    // if (error) throw error;

    // console.log('Fetched posts:', data);

    // Only update initial data on first load
    if (this.isInitialLoad) {
      this.initialData = [];
      this.isInitialLoad = false;
    }

    return [];
  }

  async createScheduledPost(event: IEvent): Promise<IEvent> {
    const scheduledPost: Omit<IScheduledPost, "id" | "created_at"> = {
      user_id: event.user.id,
      platform: "facebook", // Default platform, can be made configurable
      content: event.description,
      scheduled_time: event.startDate,
      status: "scheduled",
      external_id: null,
    };

    // TODO: Replace with real data fetching logic
    // const { data, error } = await this.supabase
    //   .from('scheduled_posts')
    //   .insert(scheduledPost)
    //   .select()
    //   .single();

    // if (error) throw error;

    // Mock ID and created_at for the scheduled post
    const mockPost: IScheduledPost = {
      ...scheduledPost,
      id: Math.random().toString(36).substring(2, 15),
      created_at: new Date().toISOString(),
    };

    return this.mapScheduledPostToEvent(mockPost);
  }

  async updateScheduledPost(event: IEvent): Promise<IEvent> {
    // TODO: Replace with real data fetching logic
    // const { data, error } = await this.supabase
    //   .from('scheduled_posts')
    //   .update({
    //     content: event.description,
    //     scheduled_time: event.startDate,
    //     status: 'scheduled',
    //   })
    //   .eq('id', event.id)
    //   .select()
    //   .single();

    // if (error) throw error;

    // Create a mock scheduled post from the event for mapping
    const mockPost: IScheduledPost = {
      id: event.id,
      user_id: event.user.id,
      platform: "facebook",
      content: event.description,
      scheduled_time: event.startDate,
      status: "scheduled",
      external_id: null,
      created_at: new Date().toISOString(),
    };

    return this.mapScheduledPostToEvent(mockPost);
  }

  async deleteScheduledPost(id: string): Promise<void> {
    // TODO: Replace with real data fetching logic
    // const { error } = await this.supabase
    //   .from('scheduled_posts')
    //   .delete()
    //   .eq('id', id);
    // if (error) throw error;
  }

  mapScheduledPostToEvent(post: IScheduledPost): IEvent {
    console.log("Mapping post to event:", post);
    return {
      id: post.id,
      startDate: post.scheduled_time,
      endDate: new Date(
        new Date(post.scheduled_time).getTime() + 3600000
      ).toISOString(), // Default 1 hour duration
      title: post.content.split("\n")[0], // First line as title
      color: "blue", // Default color, can be made configurable
      description: post.content,
      user: {
        id: post.user_id,
        name: "", // This should be fetched from users table
        picturePath: null,
      },
    };
  }

  private async setupSubscription(
    callback: (payload: RealtimePayload) => void
  ) {
    try {
      // Cleanup any existing subscription
      if (this.subscription) {
        this.subscription.unsubscribe();
        this.subscription = null;
      }

      // Create new subscription
      // TODO: Replace with real subscription logic
      // this.subscription = this.supabase
      //   .channel('scheduled_posts_changes')
      //   .on(
      //     'postgres_changes',
      //     {
      //       event: '*',
      //       schema: 'public',
      //       table: 'scheduled_posts',
      //     },
      //     (payload: RealtimePayload) => {
      //       console.log('Received real-time update:', payload);
      //       try {
      //         // Check if the event is in our initial data
      //         const isInitialData = this.initialData.some(post => {
      //           const newPost = payload.new && isScheduledPost(payload.new) ? payload.new : null;
      //           const oldPost = payload.old && isScheduledPost(payload.old) ? payload.old : null;
      //           return (newPost && post.id === newPost.id) || (oldPost && post.id === oldPost.id);
      //         });
      //
      //         // Only process if it's not from initial data
      //         if (!isInitialData) {
      //           callback(payload);
      //         }
      //       } catch (error) {
      //         console.error('Error handling real-time update:', error);
      //       }
      //     }
      //   )
      //   .subscribe((status) => {
      //     if (status === 'SUBSCRIBED') {
      //       console.log('Successfully subscribed to real-time updates');
      //       this.retryCount = 0; // Reset retry count on successful subscription
      //     } else {
      //       console.error('Failed to subscribe to real-time updates:', status);
      //       this.handleSubscriptionError(callback);
      //     }
      //   });
    } catch (error) {
      console.error("Error setting up subscription:", error);
      this.handleSubscriptionError(callback);
    }
  }

  private handleSubscriptionError(
    callback: (payload: RealtimePayload) => void
  ) {
    if (this.retryCount < this.maxRetries) {
      this.retryCount++;
      const delay = Math.min(1000 * Math.pow(2, this.retryCount), 10000); // Exponential backoff with max 10s
      console.log(
        `Retrying subscription in ${delay}ms (attempt ${this.retryCount}/${this.maxRetries})`
      );

      if (this.retryTimeout) {
        clearTimeout(this.retryTimeout);
      }

      this.retryTimeout = setTimeout(() => {
        this.setupSubscription(callback);
      }, delay);
    } else {
      console.error(
        "Max retry attempts reached. Please check your connection and try again."
      );
    }
  }

  subscribeToChanges(callback: (payload: RealtimePayload) => void) {
    this.setupSubscription(callback);

    return {
      unsubscribe: () => {
        if (this.retryTimeout) {
          clearTimeout(this.retryTimeout);
          this.retryTimeout = null;
        }
        if (this.subscription) {
          this.subscription.unsubscribe();
          this.subscription = null;
        }
        this.retryCount = 0;
      },
    };
  }
}
