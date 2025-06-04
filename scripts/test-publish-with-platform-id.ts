#!/usr/bin/env tsx

import { PrismaClient, PostStatus } from "@prisma/client";
import { PostPublisherService } from "../src/lib/services/post-publisher";

const prisma = new PrismaClient();

async function testPublishWithPlatformId() {
  try {
    console.log("🧪 Testing publish with platformPostId saving...\n");

    // Cari post yang status DRAFT untuk testing
    const draftPost = await prisma.post.findFirst({
      where: {
        status: "DRAFT",
      },
      include: {
        postSocialAccounts: {
          include: {
            socialAccount: {
              select: {
                name: true,
                platform: true,
              },
            },
          },
        },
      },
    });

    if (!draftPost) {
      console.log("❌ No draft post found for testing");
      console.log("💡 Create a draft post first, then run this script");
      return;
    }

    console.log(
      `📝 Testing with post: ${draftPost.content.substring(0, 50)}...`
    );
    console.log(
      `   Platforms: ${draftPost.postSocialAccounts
        .map(
          (psa) => `${psa.socialAccount.platform} (${psa.socialAccount.name})`
        )
        .join(", ")}\n`
    );

    // Test publish ke semua platform
    console.log("🚀 Publishing to all platforms...\n");
    const results = await PostPublisherService.publishToAllPlatforms(
      draftPost.id
    );

    console.log("📊 Publish Results:");
    results.forEach((result, index) => {
      console.log(`${index + 1}. Platform: ${result.platform}`);
      console.log(`   Success: ${result.success}`);
      if (result.success) {
        console.log(`   Platform Post ID: ${result.platformPostId}`);
      } else {
        console.log(`   Error: ${result.error}`);
      }
      console.log("");
    });

    // Cek apakah platformPostId tersimpan di database
    const updatedPost = await prisma.post.findUnique({
      where: { id: draftPost.id },
      include: {
        postSocialAccounts: {
          include: {
            socialAccount: {
              select: {
                name: true,
                platform: true,
              },
            },
          },
        },
      },
    });

    console.log("💾 Database Status After Publishing:");
    console.log(
      "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    );

    updatedPost?.postSocialAccounts.forEach((psa, index) => {
      console.log(
        `${index + 1}. ${psa.socialAccount.platform} (${psa.socialAccount.name})`
      );
      console.log(`   Status: ${psa.status}`);
      console.log(`   Published At: ${psa.publishedAt}`);
      console.log(`   Platform Post ID: ${psa.platformPostId || "NULL"}`);
      console.log(`   PSA ID: ${psa.id}\n`);
    });

    // Summary
    const successfulPublish =
      updatedPost?.postSocialAccounts.filter(
        (psa) => psa.status === "PUBLISHED" && psa.platformPostId
      ) || [];

    console.log(`📈 Summary:`);
    console.log(
      `   Total platforms: ${updatedPost?.postSocialAccounts.length || 0}`
    );
    console.log(`   Successfully published: ${successfulPublish.length}`);
    console.log(`   With platformPostId: ${successfulPublish.length}`);

    if (successfulPublish.length > 0) {
      console.log(`\n✅ SUCCESS: platformPostId is now being saved!`);
      console.log(`🔄 You can now test real analytics collection with:`);
      console.log(`   npm run analytics:collect`);
    } else {
      console.log(`\n⚠️ No successful publishes with platformPostId found`);
      console.log(`   This might be due to missing credentials or API issues`);
    }
  } catch (error: any) {
    console.error("💥 Error testing publish:", error);
  } finally {
    await prisma.$disconnect();
  }
}

testPublishWithPlatformId();
