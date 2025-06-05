#!/usr/bin/env tsx

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function debugPosts() {
  try {
    console.log("🔍 Debugging published posts data...\n");

    // Cek semua post yang sudah published
    const allPublishedPosts = await prisma.postSocialAccount.findMany({
      where: {
        status: "PUBLISHED",
      },
      include: {
        post: {
          select: {
            id: true,
            content: true,
          },
        },
        socialAccount: {
          select: {
            name: true,
            platform: true,
          },
        },
      },
    });

    console.log(`📊 Total published posts: ${allPublishedPosts.length}\n`);

    allPublishedPosts.forEach((psa, index) => {
      console.log(
        `${index + 1}. Post: ${psa.post.content.substring(0, 50)}...`
      );
      console.log(
        `   Platform: ${psa.socialAccount.platform} (${psa.socialAccount.name})`
      );
      console.log(`   Status: ${psa.status}`);
      console.log(`   Published At: ${psa.publishedAt}`);
      console.log(`   Platform Post ID: ${psa.platformPostId || "NULL"}`);
      console.log(`   Post ID: ${psa.postId}`);
      console.log(`   PSA ID: ${psa.id}\n`);
    });

    // Cek kriteria yang digunakan collection script
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    console.log(`🔍 Checking collection script criteria:`);
    console.log(
      `   Looking for posts published after: ${sevenDaysAgo.toISOString()}`
    );
    console.log(`   Status: PUBLISHED`);
    console.log(`   Platform Post ID: not null\n`);

    const matchingPosts = await prisma.postSocialAccount.findMany({
      where: {
        status: "PUBLISHED",
        publishedAt: {
          gte: sevenDaysAgo,
        },
        platformPostId: {
          not: null,
        },
      },
    });

    console.log(
      `📈 Posts matching collection criteria: ${matchingPosts.length}`
    );

    if (matchingPosts.length === 0) {
      console.log(`\n❌ Reason why no posts found:`);

      // Check posts without platformPostId
      const postsWithoutPlatformId = await prisma.postSocialAccount.findMany({
        where: {
          status: "PUBLISHED",
          publishedAt: {
            gte: sevenDaysAgo,
          },
          platformPostId: null,
        },
      });

      console.log(
        `   - ${postsWithoutPlatformId.length} posts don't have platformPostId`
      );

      // Check posts published before 7 days
      const oldPublishedPosts = await prisma.postSocialAccount.findMany({
        where: {
          status: "PUBLISHED",
          publishedAt: {
            lt: sevenDaysAgo,
          },
        },
      });

      console.log(
        `   - ${oldPublishedPosts.length} posts were published more than 7 days ago`
      );
    }
  } catch (error: any) {
    console.error("💥 Error debugging posts:", error);
  } finally {
    await prisma.$disconnect();
  }
}

debugPosts();
