#!/usr/bin/env ts-node

/**
 * Get Instagram Accounts Script
 *
 * Retrieve Instagram Business accounts connected to Facebook Pages
 * Usage: npx tsx scripts/get-instagram-accounts.ts
 */

import { InstagramPublisher } from "../src/lib/services/publishers/instagram-publisher";

async function getInstagramAccounts() {
  console.log("📱 Getting Instagram Accounts from Facebook Pages\n");

  // Get Page Access Token from environment
  const pageAccessToken = process.env.PAGE_ACCESS_TOKEN;
  const pageId = process.env.FACEBOOK_PAGE_ID;

  if (!pageAccessToken) {
    console.error("❌ PAGE_ACCESS_TOKEN environment variable not set");
    console.log("\nTo get Instagram accounts:");
    console.log("1. Get a User Access Token from Facebook Graph API Explorer");
    console.log("2. Exchange User token for Page token using /me/accounts");
    console.log("3. Set PAGE_ACCESS_TOKEN=your_page_token");
    console.log("4. Set FACEBOOK_PAGE_ID=your_page_id");
    console.log("\n🔗 Facebook Graph API Explorer:");
    console.log("   https://developers.facebook.com/tools/explorer/");
    process.exit(1);
  }

  if (!pageId) {
    console.error("❌ FACEBOOK_PAGE_ID environment variable not set");
    console.log("\nTo get Facebook Page ID:");
    console.log("1. Use Facebook Graph API Explorer");
    console.log("2. Query: /me/accounts with User token");
    console.log("3. Copy the page ID from the response");
    process.exit(1);
  }

  try {
    console.log("🔍 Searching for Instagram accounts...");
    console.log(`Facebook Page ID: ${pageId}`);
    console.log("");

    // Get connected Instagram accounts
    const instagramAccounts =
      await InstagramPublisher.getConnectedInstagramAccounts(
        pageAccessToken,
        pageId
      );

    if (instagramAccounts.length === 0) {
      console.log("❌ No Instagram Business accounts found");
      console.log("\n🔧 Troubleshooting:");
      console.log(
        "1. Ensure the Facebook Page has a connected Instagram Business account"
      );
      console.log("2. Go to Facebook Page Settings > Instagram");
      console.log("3. Connect or verify the Instagram Business account");
      console.log(
        "4. Make sure the account is a Business or Creator account (not personal)"
      );
      console.log("\n📚 Instagram Business Account Setup:");
      console.log("   https://business.instagram.com/getting-started");
      return;
    }

    console.log(`✅ Found ${instagramAccounts.length} Instagram account(s):\n`);

    instagramAccounts.forEach((account, index) => {
      console.log(`${index + 1}. Instagram Account:`);
      console.log(`   ID: ${account.id}`);
      console.log(`   Username: @${account.username}`);
      console.log(`   Account Type: ${account.accountType}`);
      console.log("");

      // Generate environment variables
      console.log(`💾 Environment Variables:`);
      console.log(`   INSTAGRAM_ACCOUNT_ID=${account.id}`);
      console.log(`   INSTAGRAM_ACCESS_TOKEN=${pageAccessToken}`);
      console.log("");

      // Generate database insert command
      console.log(`🗄️  Database Insert Command:`);
      console.log(`INSERT INTO "SocialAccount" (`);
      console.log(
        `  "id", "platform", "accessToken", "profileId", "name", "isActive", "userId", "teamId"`
      );
      console.log(`) VALUES (`);
      console.log(
        `  '${account.id}', 'INSTAGRAM', '${pageAccessToken}', '${account.id}', '@${account.username}', true, 'YOUR_USER_ID', 'YOUR_TEAM_ID'`
      );
      console.log(`);`);
      console.log("");
    });

    // Additional information
    console.log("📋 Next Steps:");
    console.log("1. Copy the INSTAGRAM_ACCESS_TOKEN and INSTAGRAM_ACCOUNT_ID");
    console.log("2. Add them to your .env file or environment variables");
    console.log(
      "3. Update the database insert command with your actual user and team IDs"
    );
    console.log("4. Run the test script: npm run test:instagram");

    console.log("\n⚠️  Important Notes:");
    console.log("- The Page Access Token is used as Instagram Access Token");
    console.log("- The token inherits permissions from the Facebook Page");
    console.log(
      "- Ensure the token has 'instagram_basic' and 'pages_manage_posts' permissions"
    );
    console.log(
      "- Token expiration follows Facebook Page token expiration rules"
    );

    console.log("\n🔗 Useful Links:");
    console.log(
      "- Instagram Graph API: https://developers.facebook.com/docs/instagram-api"
    );
    console.log(
      "- Page Access Tokens: https://developers.facebook.com/docs/pages/access-tokens"
    );
    console.log(
      "- Instagram Business Accounts: https://business.instagram.com/"
    );
  } catch (error) {
    console.error("❌ Failed to get Instagram accounts:", error);

    if (error instanceof Error) {
      if (error.message.includes("Invalid OAuth")) {
        console.log("\n🔧 OAuth Error Fix:");
        console.log("- Check if Page Access Token is valid and not expired");
        console.log("- Ensure token has 'pages_show_list' permission");
        console.log("- Verify you have admin access to the Facebook Page");
      } else if (error.message.includes("permissions")) {
        console.log("\n🔧 Permission Error Fix:");
        console.log(
          "- The Page Access Token needs 'instagram_basic' permission"
        );
        console.log("- Re-generate the token with proper permissions");
        console.log("- Check Facebook App permissions and review status");
      }
    }
  }
}

// Additional utility function to validate Instagram setup
async function validateInstagramSetup() {
  console.log("🔍 Validating Instagram API setup...\n");

  const requiredEnvVars = ["PAGE_ACCESS_TOKEN", "FACEBOOK_PAGE_ID"];

  const optionalEnvVars = [
    "INSTAGRAM_ACCESS_TOKEN",
    "INSTAGRAM_ACCOUNT_ID",
    "TEST_IMAGE_URL",
    "TEST_VIDEO_URL",
  ];

  console.log("📋 Environment Variables Check:");

  requiredEnvVars.forEach((varName) => {
    const value = process.env[varName];
    console.log(
      `${value ? "✅" : "❌"} ${varName}: ${value ? "SET" : "NOT SET"}`
    );
  });

  console.log("\n📋 Optional Environment Variables:");

  optionalEnvVars.forEach((varName) => {
    const value = process.env[varName];
    console.log(
      `${value ? "✅" : "ℹ️ "} ${varName}: ${value ? "SET" : "NOT SET"}`
    );
  });

  const hasRequired = requiredEnvVars.every((varName) => process.env[varName]);

  if (hasRequired) {
    console.log(
      "\n✅ Required environment variables are set. Ready to get Instagram accounts!"
    );
  } else {
    console.log("\n❌ Some required environment variables are missing.");
    console.log("Set the missing variables and try again.");
  }
}

// Command line arguments handling
const args = process.argv.slice(2);

if (args.includes("--validate") || args.includes("-v")) {
  validateInstagramSetup().catch(console.error);
} else if (require.main === module) {
  getInstagramAccounts().catch(console.error);
}

export { getInstagramAccounts, validateInstagramSetup };
