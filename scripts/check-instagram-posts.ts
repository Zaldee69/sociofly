import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function checkInstagramPosts() {
  console.log("🔍 Checking Instagram posts with media URLs...\n");

  try {
    // Get posts that have PostSocialAccount (meaning they were synced from social media)
    const instagramPosts = await prisma.postSocialAccount.findMany({
      where: {
        socialAccount: {
          platform: "INSTAGRAM",
        },
      },
      include: {
        post: {
          select: {
            id: true,
            content: true,
            mediaUrls: true,
            publishedAt: true,
            platform: true,
          },
        },
        socialAccount: {
          select: {
            platform: true,
            name: true,
          },
        },
      },
      orderBy: {
        publishedAt: "desc",
      },
      take: 10,
    });

    console.log(`📊 Found ${instagramPosts.length} Instagram posts from sync`);

    // Count posts with and without media URLs
    const postsWithMedia = instagramPosts.filter(
      (psa) => psa.post.mediaUrls && psa.post.mediaUrls.length > 0
    );
    const postsWithoutMedia = instagramPosts.filter(
      (psa) => !psa.post.mediaUrls || psa.post.mediaUrls.length === 0
    );

    console.log(`📸 Instagram posts with media URLs: ${postsWithMedia.length}`);
    console.log(
      `📝 Instagram posts without media URLs: ${postsWithoutMedia.length}`
    );

    if (postsWithMedia.length > 0) {
      console.log("\n📋 Sample Instagram posts with media URLs:");
      postsWithMedia.slice(0, 5).forEach((psa, index) => {
        console.log(`\n${index + 1}. Post ID: ${psa.post.id}`);
        console.log(`   Platform Post ID: ${psa.platformPostId}`);
        console.log(`   Account: ${psa.socialAccount.name}`);
        console.log(
          `   Published: ${psa.post.publishedAt?.toISOString().split("T")[0]}`
        );
        console.log(`   Content: ${psa.post.content?.substring(0, 80)}...`);
        console.log(`   Media URLs (${psa.post.mediaUrls?.length || 0}):`);
        psa.post.mediaUrls?.forEach((url, urlIndex) => {
          console.log(`     ${urlIndex + 1}. ${url.substring(0, 100)}...`);
        });
      });
    }

    if (postsWithoutMedia.length > 0) {
      console.log("\n📝 Sample Instagram posts WITHOUT media URLs:");
      postsWithoutMedia.slice(0, 3).forEach((psa, index) => {
        console.log(`\n${index + 1}. Post ID: ${psa.post.id}`);
        console.log(`   Platform Post ID: ${psa.platformPostId}`);
        console.log(`   Account: ${psa.socialAccount.name}`);
        console.log(
          `   Published: ${psa.post.publishedAt?.toISOString().split("T")[0]}`
        );
        console.log(`   Content: ${psa.post.content?.substring(0, 80)}...`);
      });
    }

    console.log(`\n✅ Instagram posts verification completed!`);
    console.log(
      `📊 Coverage: ${postsWithMedia.length}/${instagramPosts.length} Instagram posts have media URLs (${Math.round((postsWithMedia.length / instagramPosts.length) * 100)}%)`
    );
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

checkInstagramPosts();
