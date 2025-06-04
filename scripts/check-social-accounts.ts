#!/usr/bin/env tsx

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function checkSocialAccounts() {
  try {
    console.log("🔍 Checking SocialAccount credentials...\n");

    const accounts = await prisma.socialAccount.findMany({
      select: {
        id: true,
        name: true,
        platform: true,
        accessToken: true,
        profileId: true,
        team: {
          select: { name: true },
        },
      },
    });

    console.log(`📊 Found ${accounts.length} social accounts:\n`);

    accounts.forEach((acc, index) => {
      console.log(`${index + 1}. ${acc.platform} - ${acc.name}`);
      console.log(`   Team: ${acc.team.name}`);
      console.log(`   Profile ID: ${acc.profileId || "❌ NO PROFILE ID"}`);
      console.log(
        `   Access Token: ${acc.accessToken ? "✅ HAS TOKEN" : "❌ NO TOKEN"}`
      );
      if (acc.accessToken) {
        console.log(`   Token preview: ${acc.accessToken.substring(0, 20)}...`);
      }
      console.log("");
    });

    // Check credentials status
    const withCredentials = accounts.filter((acc) => acc.accessToken);
    const withoutCredentials = accounts.filter((acc) => !acc.accessToken);

    console.log("📈 Summary:");
    console.log(`   Total accounts: ${accounts.length}`);
    console.log(`   With credentials: ${withCredentials.length}`);
    console.log(`   Without credentials: ${withoutCredentials.length}`);

    if (withoutCredentials.length > 0) {
      console.log("\n⚠️  Accounts missing credentials:");
      withoutCredentials.forEach((acc) => {
        console.log(`   - ${acc.platform}: ${acc.name}`);
      });

      console.log("\n💡 To fix this, you need to:");
      console.log(
        "   1. Setup Facebook/Instagram App in developers.facebook.com"
      );
      console.log("   2. Get access tokens for each account");
      console.log("   3. Store tokens in database (encrypted in production)");
    }
  } catch (error: any) {
    console.error("💥 Error checking social accounts:", error);
  } finally {
    await prisma.$disconnect();
  }
}

checkSocialAccounts();
