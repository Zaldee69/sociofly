// app/api/cron/publish/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/utils/supabase/server";
import { SocialPublishingService } from "@/lib/social-publisher";

export async function GET() {
  const supabase = await createClient();
  const service = new SocialPublishingService(supabase);

  try {
    // Get due posts (using your scheduled_posts table)
    const now = new Date().toISOString();
    const { data: posts } = await supabase
      .from('scheduled_posts')
      .select('id, platform')
      .eq('status', 'scheduled')
      .lte('scheduled_time', now)
      .order('scheduled_time', { ascending: true });

    if (!posts || posts.length === 0) {
      return NextResponse.json({
        message: 'No posts to publish',
        total: 0,
        succeeded: 0,
        failed: 0
      });
    }

    // Process each post
    const results = await Promise.allSettled(
      posts.map(post => service.publish(post.id))
    );

    // Generate report
    const report = {
      total: posts.length,
      succeeded: results.filter(r => r.status === 'fulfilled').length,
      failed: results.filter(r => r.status === 'rejected').length,
      errors: results
        .filter(r => r.status === 'rejected')
        .map(r => (r as PromiseRejectedResult).reason.message)
    };

    return NextResponse.json(report);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Cron job failed' },
      { status: 500 }
    );
  }
}