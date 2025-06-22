import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function verifyMediaUrls() {
  console.log("🔍 Verifying media URLs in database...\n");

  try {
    // Get total post count
    const totalPosts = await prisma.post.count();
    console.log(`📊 Total posts: ${totalPosts}`);

    // Get posts with media URLs
    const postsWithMedia = await prisma.post.count({
      where: {
        mediaUrls: {
          isEmpty: false,
        },
      },
    });
    console.log(`📸 Posts with media URLs: ${postsWithMedia}`);

    // Get posts without media URLs
    const postsWithoutMedia = await prisma.post.count({
      where: {
        mediaUrls: {
          isEmpty: true,
        },
      },
    });
    console.log(`📝 Posts without media URLs: ${postsWithoutMedia}`);

    // Get some sample posts with media URLs
    const samplePosts = await prisma.post.findMany({
      where: {
        mediaUrls: {
          isEmpty: false,
        },
      },
      select: {
        id: true,
        content: true,
        mediaUrls: true,
        publishedAt: true,
        platform: true,
      },
      orderBy: {
        publishedAt: "desc",
      },
      take: 3,
    });

    console.log("\n📋 Sample posts with media URLs:");
    samplePosts.forEach((post, index) => {
      console.log(`\n${index + 1}. Post ID: ${post.id}`);
      console.log(`   Platform: ${post.platform}`);
      console.log(
        `   Published: ${post.publishedAt?.toISOString().split("T")[0]}`
      );
      console.log(`   Content: ${post.content?.substring(0, 80)}...`);
      console.log(`   Media URLs (${post.mediaUrls.length}):`);
      post.mediaUrls.forEach((url, urlIndex) => {
        console.log(`     ${urlIndex + 1}. ${url.substring(0, 80)}...`);
      });
    });

    console.log(`\n✅ Media URLs verification completed!`);
    console.log(
      `📊 Coverage: ${postsWithMedia}/${totalPosts} posts have media URLs (${Math.round((postsWithMedia / totalPosts) * 100)}%)`
    );
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyMediaUrls();
