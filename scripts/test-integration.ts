import { PostPublisherService } from "../src/lib/services/post-publisher";
import { SchedulerService } from "../src/lib/services/scheduler.service";
import { FacebookPublisher } from "../src/lib/services/publishers/facebook-publisher";
import { prisma } from "../src/lib/prisma/client";
import { PostStatus, SocialPlatform } from "@prisma/client";

async function testIntegration() {
  console.log("🧪 Testing Social Media Publishing Integration...\n");

  try {
    // 1. Test SchedulerService
    console.log("1️⃣ Testing SchedulerService...");
    const duePostsResult = await SchedulerService.processDuePublications();
    console.log(
      `   ✅ Due posts processed: ${duePostsResult.success} success, ${duePostsResult.failed} failed, ${duePostsResult.skipped} skipped\n`
    );

    // 2. Test PostPublisherService directly
    console.log("2️⃣ Testing PostPublisherService...");

    // Find a test post (or create one for testing)
    const testPost = await prisma.post.findFirst({
      where: {
        status: PostStatus.SCHEDULED,
      },
      include: {
        postSocialAccounts: {
          include: {
            socialAccount: true,
          },
        },
      },
    });

    if (testPost && testPost.postSocialAccounts.length > 0) {
      console.log(`   📝 Found test post: ${testPost.id}`);
      console.log(`   📅 Scheduled for: ${testPost.scheduledAt}`);
      console.log(
        `   🎯 Platforms: ${testPost.postSocialAccounts.map((psa) => psa.socialAccount.platform).join(", ")}`
      );

      // Test publishing to one platform
      const firstAccount = testPost.postSocialAccounts[0];
      console.log(
        `   🚀 Testing publish to ${firstAccount.socialAccount.platform}...`
      );

      // Don't actually publish in test mode - just validate
      if (firstAccount.socialAccount.platform === SocialPlatform.FACEBOOK) {
        const isValidToken = await FacebookPublisher.validateToken(
          firstAccount.socialAccount
        );
        console.log(`   🔑 Facebook token valid: ${isValidToken}`);
      }

      console.log("   ✅ Publisher integration test complete\n");
    } else {
      console.log("   ⚠️  No test posts found\n");
    }

    // 3. Test Edge Case Handler
    console.log("3️⃣ Testing Edge Case Processing...");
    const edgeCaseResult = await SchedulerService.processApprovalEdgeCases();
    console.log(
      `   ✅ Edge cases processed: ${edgeCaseResult.reports.length} reports generated\n`
    );

    // 4. Test System Health
    console.log("4️⃣ Testing System Health Check...");
    const healthResult = await SchedulerService.getApprovalSystemHealth();
    console.log(`   💚 System Health Score: ${healthResult.healthScore}/100`);
    console.log(`   📊 Pending Approvals: ${healthResult.pendingApprovals}`);
    console.log(`   ⏰ Overdue Posts: ${healthResult.overduePosts}`);
    console.log(`   🔒 Stuck Approvals: ${healthResult.stuckApprovals}`);
    console.log(`   🔑 Expired Tokens: ${healthResult.expiredTokens}\n`);

    // 5. Test Database Stats
    console.log("5️⃣ Database Statistics...");
    const totalPosts = await prisma.post.count();
    const scheduledPosts = await prisma.post.count({
      where: { status: PostStatus.SCHEDULED },
    });
    const publishedPosts = await prisma.post.count({
      where: { status: PostStatus.PUBLISHED },
    });
    const socialAccounts = await prisma.socialAccount.count();
    const facebookAccounts = await prisma.socialAccount.count({
      where: { platform: SocialPlatform.FACEBOOK },
    });

    console.log(`   📊 Total Posts: ${totalPosts}`);
    console.log(`   📅 Scheduled Posts: ${scheduledPosts}`);
    console.log(`   ✅ Published Posts: ${publishedPosts}`);
    console.log(`   🔗 Social Accounts: ${socialAccounts}`);
    console.log(`   📘 Facebook Accounts: ${facebookAccounts}\n`);

    console.log("🎉 Integration test completed successfully!");
  } catch (error) {
    console.error("❌ Integration test failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testIntegration();
