import { NextResponse } from "next/server";
import { SocialPublishingService } from "@/lib/social-publisher";

export async function GET() {
  const service = new SocialPublishingService();

  const posts: any[] = [];

  if (!posts || posts.length === 0) {
    return NextResponse.json({
      message: "No posts to publish",
      total: 0,
      succeeded: 0,
      failed: 0,
    });
  }

  try {
    // Process each post
    const results = await Promise.allSettled(
      posts.map((post) => service.publish(post.id))
    );

    // Generate report
    const report = {
      total: posts.length,
      succeeded: results.filter((r) => r.status === "fulfilled").length,
      failed: results.filter((r) => r.status === "rejected").length,
      errors: results
        .filter((r) => r.status === "rejected")
        .map((r) => (r as PromiseRejectedResult).reason.message),
    };

    return NextResponse.json(report);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Cron job failed" },
      { status: 500 }
    );
  }
}
