#!/usr/bin/env ts-node

/**
 * Facebook Page Token Generator
 *
 * Utility to get Page Access Tokens from User Access Token
 * Usage: npx ts-node scripts/get-page-token.ts
 */

import { FacebookAdsApi, User } from "facebook-nodejs-business-sdk";

async function getPageTokens() {
  console.log("🔑 Facebook Page Token Generator\n");

  // Get User Access Token from environment
  const userAccessToken = process.env.FACEBOOK_USER_TOKEN;

  if (!userAccessToken) {
    console.error("❌ FACEBOOK_USER_TOKEN environment variable not set");
    console.log("\nTo get Page tokens:");
    console.log("1. Get a User Access Token from Facebook Graph API Explorer");
    console.log("2. Ensure it has 'pages_show_list' permission");
    console.log("3. Set FACEBOOK_USER_TOKEN=your_user_token");
    console.log("4. Run this script again");
    console.log("\n🔗 Facebook Graph API Explorer:");
    console.log("   https://developers.facebook.com/tools/explorer/");
    process.exit(1);
  }

  try {
    // Initialize Facebook API with User token
    FacebookAdsApi.init(userAccessToken);
    const user = new User("me");

    console.log("1️⃣ Fetching user information...");
    const userInfo = await user.read(["id", "name"]);
    console.log(`✅ User: ${userInfo.name} (${userInfo.id})\n`);

    console.log("2️⃣ Fetching managed pages...");
    const pages = await user.getAccounts([
      "id",
      "name",
      "access_token",
      "category",
    ]);

    if (pages.length === 0) {
      console.log("❌ No pages found for this user");
      console.log("\nPossible reasons:");
      console.log("- User doesn't manage any Facebook Pages");
      console.log("- Missing 'pages_show_list' permission");
      console.log("- User Access Token is invalid");
      return;
    }

    console.log(`✅ Found ${pages.length} page(s):\n`);

    // Display all pages with their tokens
    pages.forEach((page: any, index: number) => {
      console.log(`📄 Page ${index + 1}:`);
      console.log(`   Name: ${page.name}`);
      console.log(`   ID: ${page.id}`);
      console.log(`   Category: ${page.category || "N/A"}`);
      console.log(`   Page Token: ${page.access_token}`);
      console.log("");
    });

    // Generate database insert commands
    console.log("🗄️  Database Setup Commands:\n");

    pages.forEach((page: any, index: number) => {
      console.log(`-- Page ${index + 1}: ${page.name}`);
      console.log(`INSERT INTO "SocialAccount" (`);
      console.log(`  "id", "platform", "accessToken", "profileId", "name",`);
      console.log(`  "isActive", "userId", "teamId", "createdAt", "updatedAt"`);
      console.log(`) VALUES (`);
      console.log(
        `  'fb_page_${page.id}', 'FACEBOOK', '${page.access_token}',`
      );
      console.log(`  '${page.id}', '${page.name}', true,`);
      console.log(`  'YOUR_USER_ID', 'YOUR_TEAM_ID',`);
      console.log(`  NOW(), NOW()`);
      console.log(`);`);
      console.log("");
    });

    // Generate environment variables
    console.log("🔧 Environment Variables (for testing):\n");
    if (pages.length > 0) {
      const firstPage = pages[0];
      console.log(`export FACEBOOK_ACCESS_TOKEN="${firstPage.access_token}"`);
      console.log(`export FACEBOOK_PAGE_ID="${firstPage.id}"`);
      console.log("");
    }

    // Generate test command
    console.log("🧪 Test Page Token:\n");
    console.log("# Set environment variables above, then run:");
    console.log("npm run test:facebook");
    console.log("");

    console.log("💡 Recommendations:");
    console.log("- Store Page tokens (not User token) in your database");
    console.log("- Use Page ID as profileId in SocialAccount table");
    console.log("- Page tokens are more secure and have better rate limits");
    console.log("- Consider refreshing tokens periodically (they expire)");
  } catch (error) {
    console.error("❌ Error fetching page tokens:", error);

    if (error instanceof Error) {
      if (error.message.includes("permissions")) {
        console.log("\n🔧 Permission Error Fix:");
        console.log("- Ensure User token has 'pages_show_list' permission");
        console.log("- Re-generate token in Facebook Graph API Explorer");
        console.log("- Grant all required permissions");
      } else if (error.message.includes("token")) {
        console.log("\n🔧 Token Error Fix:");
        console.log("- Check if User Access Token is valid");
        console.log("- Token might be expired or invalid");
        console.log("- Generate new token from Graph API Explorer");
      }
    }
  }
}

// Run the script
if (require.main === module) {
  getPageTokens().catch(console.error);
}

export { getPageTokens };
