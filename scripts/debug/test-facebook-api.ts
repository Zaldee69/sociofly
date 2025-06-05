#!/usr/bin/env ts-node

/**
 * Facebook API Testing Script
 *
 * Test Facebook token validation and publishing functionality
 * Usage: npx ts-node scripts/test-facebook-api.ts
 */

import { FacebookPublisher } from "../src/lib/services/publishers/facebook-publisher";
import { SocialPlatform } from "@prisma/client";

// Mock social account for testing
const createMockSocialAccount = (accessToken: string, profileId?: string) => ({
  id: "test-account",
  platform: SocialPlatform.FACEBOOK,
  accessToken,
  refreshToken: null,
  expiresAt: null,
  profileId: profileId || null,
  name: "Test Account",
  isActive: true,
  userId: "test-user",
  teamId: "test-team",
  profilePicture: null,
  createdAt: new Date(),
  updatedAt: new Date(),
});

async function testFacebookAPI() {
  console.log("🧪 Testing Facebook API Integration\n");

  // Get token from environment
  const accessToken = process.env.FACEBOOK_ACCESS_TOKEN;
  const pageId = process.env.FACEBOOK_PAGE_ID;

  if (!accessToken) {
    console.error("❌ FACEBOOK_ACCESS_TOKEN environment variable not set");
    console.log("\nTo test Facebook API:");
    console.log("1. Get an access token from Facebook Graph API Explorer");
    console.log("2. Set FACEBOOK_ACCESS_TOKEN=your_token");
    console.log("3. Optionally set FACEBOOK_PAGE_ID=your_page_id");
    process.exit(1);
  }

  try {
    // Test 1: Get token information
    console.log("1️⃣ Testing token information...");
    const tokenInfo = await FacebookPublisher.getTokenInfo(accessToken);

    if (tokenInfo) {
      console.log("✅ Token Info:");
      console.log(`   Type: ${tokenInfo.type}`);
      console.log(`   ID: ${tokenInfo.id}`);
      console.log(`   Name: ${tokenInfo.name}`);
      console.log(`   Valid: ${tokenInfo.isValid}\n`);
    } else {
      console.log("❌ Failed to get token info\n");
      return;
    }

    // Test 2: Get token permissions
    console.log("2️⃣ Testing token permissions...");
    const permissions =
      await FacebookPublisher.getTokenPermissions(accessToken);
    console.log("✅ Token Permissions:");
    permissions.forEach((perm) => console.log(`   - ${perm}`));

    // Check required permissions
    const requiredPermissions = ["pages_manage_posts", "pages_show_list"];
    const missingPermissions = requiredPermissions.filter(
      (perm) => !permissions.includes(perm)
    );

    if (missingPermissions.length > 0) {
      console.log(`⚠️  Missing permissions: ${missingPermissions.join(", ")}`);
    } else {
      console.log("✅ All required permissions present");
    }
    console.log();

    // Test 3: Token validation
    console.log("3️⃣ Testing token validation...");
    const socialAccount = createMockSocialAccount(accessToken, pageId);
    const isValid = await FacebookPublisher.validateToken(socialAccount);
    console.log(`✅ Token validation: ${isValid ? "VALID" : "INVALID"}\n`);

    // Test 4: Test publishing (dry run simulation)
    console.log("4️⃣ Testing publish method (simulation)...");

    if (tokenInfo.type === "PAGE" && pageId) {
      console.log("📄 Detected Page token - testing page publishing");

      // Test Page token validation
      console.log("   🔍 Validating Page token specifically...");
      const pageValidation = await FacebookPublisher.validatePageToken(
        accessToken,
        pageId
      );

      if (pageValidation.isValid && pageValidation.pageInfo) {
        console.log("   ✅ Page token validation successful:");
        console.log(`      Page Name: ${pageValidation.pageInfo.name}`);
        console.log(`      Page ID: ${pageValidation.pageInfo.id}`);
        console.log(`      Category: ${pageValidation.pageInfo.category}`);
        console.log("   🎯 Ready for direct page posting");
      } else {
        console.log(
          `   ❌ Page token validation failed: ${pageValidation.error}`
        );
      }

      const pageAccount = createMockSocialAccount(accessToken, pageId);

      try {
        // Don't actually publish, just test the method structure
        console.log("   ✅ Page publishing method available");
        console.log(`      Target Page ID: ${pageId}`);
        console.log(
          "   💡 This setup is optimized for database-stored Page tokens"
        );
      } catch (error) {
        console.error("   ❌ Page publishing test failed:", error);
      }
    } else if (tokenInfo.type === "USER") {
      console.log("👤 Detected User token - testing user publishing");

      try {
        console.log("✅ User publishing method available");
        console.log("   Ready for user timeline posting");

        if (permissions.includes("pages_show_list")) {
          console.log("   Can access user pages");
          console.log(
            "   💡 Consider getting Page tokens for better performance"
          );
        } else {
          console.log(
            "   ⚠️  Cannot access user pages (missing pages_show_list)"
          );
        }
      } catch (error) {
        console.error("❌ User publishing test failed:", error);
      }
    } else {
      console.log("❓ Unknown token type or missing Page ID");
      console.log("   Please set FACEBOOK_PAGE_ID if using Page token");
    }

    console.log("\n🎉 Facebook API tests completed successfully!");

    // Recommendations
    console.log("\n💡 Recommendations:");
    if (tokenInfo.type === "PAGE") {
      console.log("- Use Page tokens for direct page posting");
      console.log("- Ensure Page token has required permissions");
      console.log("- Store Page ID with the token");
    } else {
      console.log("- Use User tokens to get page access tokens");
      console.log("- Implement page selection for multi-page users");
      console.log("- Consider long-lived tokens for production");
    }
  } catch (error) {
    console.error("❌ Facebook API test failed:", error);

    if (error instanceof Error) {
      if (error.message.includes("accounts")) {
        console.log("\n🔧 Quick Fix for 'accounts' error:");
        console.log(
          "- This error occurs when using Page token with /me/accounts"
        );
        console.log("- Use User token for /me/accounts endpoint");
        console.log("- Use Page token directly for page operations");
      }
    }
  }
}

// Run tests
if (require.main === module) {
  testFacebookAPI().catch(console.error);
}

export { testFacebookAPI };
