#!/usr/bin/env tsx

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function checkDraftPosts() {
  try {
    const draftPosts = await prisma.post.findMany({
      where: { status: "DRAFT" },
      include: {
        postSocialAccounts: {
          include: {
            socialAccount: {
              select: { name: true, platform: true },
            },
          },
        },
      },
      take: 5,
    });

    console.log("🧪 Available draft posts for testing:");
    if (draftPosts.length === 0) {
      console.log("❌ No draft posts found");
      console.log("💡 Create a draft post in the UI first, then run the test");
    } else {
      draftPosts.forEach((post, i) => {
        console.log(`${i + 1}. ${post.content.substring(0, 50)}...`);
        console.log(`   ID: ${post.id}`);
        console.log(`   Status: ${post.status}`);
        console.log(
          `   Platforms: ${post.postSocialAccounts
            .map(
              (psa) =>
                `${psa.socialAccount.platform} (${psa.socialAccount.name})`
            )
            .join(", ")}`
        );
        console.log("");
      });
      console.log(`🚀 Ready to test with: npm run test:publish-platform-id`);
    }
  } catch (error: any) {
    console.error("💥 Error checking draft posts:", error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDraftPosts();
