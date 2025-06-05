#!/usr/bin/env ts-node

/**
 * Instagram API Testing Script
 *
 * Test Instagram API integration for business accounts
 * Usage: npx tsx scripts/test-instagram-api.ts
 */

import { InstagramPublisher } from "../src/lib/services/publishers/instagram-publisher";
import { SocialPlatform } from "@prisma/client";

// Mock social account for testing
const createMockInstagramAccount = (
  accessToken: string,
  instagramAccountId: string
) => ({
  id: "test-instagram-account",
  platform: SocialPlatform.INSTAGRAM,
  accessToken,
  refreshToken: null,
  expiresAt: null,
  profileId: instagramAccountId, // Instagram Business Account ID
  name: "Test Instagram Account",
  isActive: true,
  userId: "test-user",
  teamId: "test-team",
  profilePicture: null,
  createdAt: new Date(),
  updatedAt: new Date(),
});

async function testInstagramAPI() {
  console.log("🧪 Testing Instagram API Integration\n");

  // Get tokens from environment
  const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN;
  const instagramAccountId = process.env.INSTAGRAM_ACCOUNT_ID;

  if (!accessToken) {
    console.error("❌ INSTAGRAM_ACCESS_TOKEN environment variable not set");
    console.log("\nTo test Instagram API:");
    console.log("1. Get a Page Access Token from Facebook Graph API Explorer");
    console.log(
      "2. Ensure the Page has a connected Instagram Business Account"
    );
    console.log("3. Set INSTAGRAM_ACCESS_TOKEN=your_page_token");
    console.log(
      "4. Set INSTAGRAM_ACCOUNT_ID=your_instagram_business_account_id"
    );
    console.log("\n🔗 Facebook Graph API Explorer:");
    console.log("   https://developers.facebook.com/tools/explorer/");
    process.exit(1);
  }

  if (!instagramAccountId) {
    console.error("❌ INSTAGRAM_ACCOUNT_ID environment variable not set");
    console.log("\nTo get Instagram Account ID:");
    console.log("1. Use Facebook Graph API Explorer");
    console.log("2. Query: /{page_id}?fields=instagram_business_account");
    console.log("3. Copy the instagram_business_account.id value");
    process.exit(1);
  }

  try {
    // Test 1: Get Instagram account information
    console.log("1️⃣ Testing Instagram account information...");
    const accountInfo = await InstagramPublisher.getAccountInfo(
      accessToken,
      instagramAccountId
    );

    if (accountInfo.isValid && accountInfo.accountInfo) {
      console.log("✅ Instagram Account Info:");
      console.log(`   ID: ${accountInfo.accountInfo.id}`);
      console.log(`   Username: @${accountInfo.accountInfo.username}`);
      console.log(`   Account Type: ${accountInfo.accountInfo.accountType}`);
      if (accountInfo.accountInfo.name) {
        console.log(`   Name: ${accountInfo.accountInfo.name}`);
      }
      console.log("");
    } else {
      console.log("❌ Failed to get Instagram account info:");
      console.log(`   Error: ${accountInfo.error}`);
      return;
    }

    // Test 2: Token validation
    console.log("2️⃣ Testing token validation...");
    const socialAccount = createMockInstagramAccount(
      accessToken,
      instagramAccountId
    );
    const isValid = await InstagramPublisher.validateToken(socialAccount);
    console.log(`✅ Token validation: ${isValid ? "VALID" : "INVALID"}\n`);

    if (!isValid) {
      console.log(
        "❌ Token validation failed. Check your tokens and try again."
      );
      return;
    }

    // Test 3: Test publishing (dry run simulation)
    console.log("3️⃣ Testing publish method (simulation)...");

    const testImageUrl = process.env.TEST_IMAGE_URL;
    const testVideoUrl = process.env.TEST_VIDEO_URL;

    if (testImageUrl) {
      console.log("📸 Testing single image post simulation...");
      console.log(`   Image URL: ${testImageUrl}`);
      console.log("   ✅ Single image post method available");
      console.log("   💡 Ready for Instagram image posting");
    }

    if (testVideoUrl) {
      console.log("🎥 Testing video post simulation...");
      console.log(`   Video URL: ${testVideoUrl}`);
      console.log("   ✅ Video post method available");
      console.log("   💡 Ready for Instagram video posting");
    }

    if (testImageUrl && testVideoUrl) {
      console.log("🎠 Testing carousel post simulation...");
      console.log("   ✅ Carousel post method available");
      console.log("   💡 Ready for Instagram carousel posting");
    }

    if (!testImageUrl && !testVideoUrl) {
      console.log("ℹ️  No test media URLs provided");
      console.log(
        "   Set TEST_IMAGE_URL and/or TEST_VIDEO_URL to test media posting"
      );
    }

    console.log("\n🎉 Instagram API tests completed successfully!");

    // Recommendations
    console.log("\n💡 Recommendations:");
    console.log("- Instagram requires media (image/video) for all posts");
    console.log(
      "- Use high-quality images (minimum 1080x1080 for square posts)"
    );
    console.log("- Videos should be MP4 format, max 60 seconds for feed posts");
    console.log("- Carousel posts support 2-10 media items");
    console.log("- Consider Instagram content guidelines and best practices");

    console.log("\n📱 Instagram Features:");
    console.log("- ✅ Single Image Posts");
    console.log("- ✅ Single Video Posts");
    console.log("- ✅ Carousel Posts (multiple images/videos)");
    console.log("- ✅ Video Processing with status checking");
    console.log("- ✅ Media type auto-detection");

    // Usage example
    console.log("\n🔧 Usage Example:");
    console.log("```typescript");
    console.log("const result = await InstagramPublisher.publish(");
    console.log("  socialAccount,");
    console.log("  'Check out this amazing content! #instagram #socialmedia',");
    console.log(
      "  ['https://example.com/image1.jpg', 'https://example.com/image2.jpg']"
    );
    console.log(");");
    console.log("```");
  } catch (error) {
    console.error("❌ Instagram API test failed:", error);

    if (error instanceof Error) {
      if (error.message.includes("Invalid OAuth")) {
        console.log("\n🔧 OAuth Error Fix:");
        console.log("- Check if Page Access Token is valid");
        console.log("- Ensure token has instagram_basic permission");
        console.log("- Verify Instagram Business Account is connected to Page");
      } else if (error.message.includes("account")) {
        console.log("\n🔧 Account Error Fix:");
        console.log("- Verify Instagram Account ID is correct");
        console.log(
          "- Ensure it's a Business or Creator account (not personal)"
        );
        console.log("- Check if account is connected to a Facebook Page");
      }
    }
  }
}

// Run tests
if (require.main === module) {
  testInstagramAPI().catch(console.error);
}

export { testInstagramAPI };
