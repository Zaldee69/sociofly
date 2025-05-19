import { NextResponse } from "next/server";
import { PostStatus, Post } from "@prisma/client";
import { PostPublisherService } from "@/lib/services/post-publisher";
import { prisma } from "@/lib/prisma/client";

interface PublishResult {
  postId: string;
  success: boolean;
  results?: any[];
  error?: string;
}

// Fungsi ini akan dipanggil oleh cron job untuk mempublikasikan post terjadwal
export async function GET(req: Request) {
  try {
    // Dapatkan API key dari query params
    const url = new URL(req.url);
    const apiKey = url.searchParams.get("apiKey");

    // Validasi API key (harus sesuai dengan environment variable)
    if (apiKey !== process.env.CRON_API_KEY) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Dapatkan posting yang dijadwalkan untuk dipublikasikan sekarang
    const now = new Date();
    const scheduledPosts = await prisma.post.findMany({
      where: {
        status: PostStatus.SCHEDULED,
        scheduledAt: {
          lte: now, // Kurang dari atau sama dengan waktu saat ini
        },
      },
      select: {
        id: true,
      },
    });

    // Log untuk tracking
    await prisma.cronLog.create({
      data: {
        name: "publish-scheduler",
        status: "running",
        message: `Found ${scheduledPosts.length} posts to publish`,
      },
    });

    // Publikasikan setiap post yang dijadwalkan
    const results: PublishResult[] = await Promise.all(
      scheduledPosts.map(async (post: { id: string }) => {
        try {
          const publishResults =
            await PostPublisherService.publishToAllPlatforms(post.id);
          return {
            postId: post.id,
            success: publishResults.some((result) => result.success),
            results: publishResults,
          };
        } catch (error) {
          console.error(`Error publishing post ${post.id}:`, error);
          return {
            postId: post.id,
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
          };
        }
      })
    );

    // Buat log setelah selesai
    await prisma.cronLog.create({
      data: {
        name: "publish-scheduler",
        status: "completed",
        message: `Published ${results.filter((r) => r.success).length} of ${results.length} scheduled posts`,
      },
    });

    return NextResponse.json({
      success: true,
      publishedCount: results.filter((r) => r.success).length,
      failedCount: results.filter((r) => !r.success).length,
      totalScheduled: scheduledPosts.length,
    });
  } catch (error) {
    console.error("Error in publish scheduler:", error);

    // Log error
    await prisma.cronLog.create({
      data: {
        name: "publish-scheduler",
        status: "error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
    });

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// Hanya izinkan metode GET
export async function POST() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}

export async function PUT() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}

export async function DELETE() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
