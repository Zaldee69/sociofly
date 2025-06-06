#!/usr/bin/env tsx

/**
 * Script to create mock analytics data for testing
 * Usage: npm run create:mock-analytics
 */

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

// Realistic demographic data
const DEMOGRAPHICS = {
  ageGroups: [
    { range: "18-24", percentage: 25 },
    { range: "25-34", percentage: 35 },
    { range: "35-44", percentage: 22 },
    { range: "45-54", percentage: 12 },
    { range: "55+", percentage: 6 },
  ],
  gender: [
    { type: "Female", percentage: 58 },
    { type: "Male", percentage: 40 },
    { type: "Other", percentage: 2 },
  ],
  topLocations: [
    { country: "Indonesia", percentage: 45 },
    { country: "Malaysia", percentage: 18 },
    { country: "Singapore", percentage: 12 },
    { country: "Thailand", percentage: 8 },
    { country: "Others", percentage: 17 },
  ],
};

async function createMockAnalytics() {
  try {
    console.log("🎭 Creating mock analytics data...\n");

    // Find a published post to add analytics to
    const post = await prisma.post.findFirst({
      where: {
        status: "PUBLISHED",
      },
      include: {
        postSocialAccounts: {
          include: {
            socialAccount: true,
          },
        },
      },
    });

    if (!post || !post.postSocialAccounts.length) {
      console.log("❌ No published posts found to add analytics to");
      return;
    }

    console.log(`✅ Found post: ${post.id}`);
    console.log(`📝 Content: ${post.content.substring(0, 50)}...`);

    // Create analytics for each platform
    for (const psa of post.postSocialAccounts) {
      const platform = psa.socialAccount.platform;
      const isFacebook = platform === "FACEBOOK";

      // Generate random but realistic metrics
      const baseViews = Math.floor(Math.random() * 5000) + 1000;
      const likes =
        Math.floor(baseViews * 0.05) + Math.floor(Math.random() * 50);
      const comments = Math.floor(likes * 0.1) + Math.floor(Math.random() * 20);
      const shares = Math.floor(likes * 0.05) + Math.floor(Math.random() * 10);
      const reach =
        Math.floor(baseViews * 0.8) + Math.floor(Math.random() * 500);
      const impressions =
        Math.floor(reach * 1.2) + Math.floor(Math.random() * 300);
      const clicks =
        Math.floor(impressions * 0.02) + Math.floor(Math.random() * 20);

      // For Facebook, create rich insights that match the basic metrics
      const rawInsights = isFacebook
        ? [
            {
              name: "post_impressions",
              period: "lifetime",
              values: [{ value: impressions }],
            },
            {
              name: "post_impressions_unique",
              period: "lifetime",
              values: [{ value: reach }], // Use reach as unique impressions
            },
            {
              name: "post_impressions_paid",
              period: "lifetime",
              values: [{ value: Math.floor(impressions * 0.3) }], // 30% paid
            },
            {
              name: "post_impressions_organic",
              period: "lifetime",
              values: [{ value: Math.floor(impressions * 0.7) }], // 70% organic
            },
            {
              name: "post_clicks",
              period: "lifetime",
              values: [{ value: clicks }],
            },
            {
              name: "post_reactions_like_total",
              period: "lifetime",
              values: [{ value: Math.floor(likes * 0.6) }], // 60% likes
            },
            {
              name: "post_reactions_love_total",
              period: "lifetime",
              values: [{ value: Math.floor(likes * 0.2) }], // 20% loves
            },
            {
              name: "post_reactions_wow_total",
              period: "lifetime",
              values: [{ value: Math.floor(likes * 0.05) }], // 5% wow
            },
            {
              name: "post_reactions_haha_total",
              period: "lifetime",
              values: [{ value: Math.floor(likes * 0.1) }], // 10% haha
            },
            {
              name: "post_reactions_sorry_total",
              period: "lifetime",
              values: [{ value: Math.floor(likes * 0.03) }], // 3% sad
            },
            {
              name: "post_reactions_anger_total",
              period: "lifetime",
              values: [{ value: Math.floor(likes * 0.02) }], // 2% angry
            },
          ]
        : null;

      // Create analytics record
      const analyticsData = {
        postSocialAccountId: psa.id,
        recordedAt: new Date(),
        views: baseViews,
        likes,
        comments,
        shares,
        clicks,
        reach,
        impressions,
        engagement: likes + comments + shares,
        rawInsights: rawInsights ? rawInsights : Prisma.JsonNull,
      };

      // Create or update analytics
      const analytics = await prisma.postAnalytics.upsert({
        where: {
          postSocialAccountId_recordedAt: {
            postSocialAccountId: psa.id,
            recordedAt: analyticsData.recordedAt,
          },
        },
        update: analyticsData,
        create: analyticsData,
      });

      // Create demographic records
      const recordedAt = analyticsData.recordedAt;

      // Age groups
      for (const age of DEMOGRAPHICS.ageGroups) {
        await prisma.postAnalyticsDemographics.create({
          data: {
            postSocialAccountId: psa.id,
            ageGroup: age.range,
            percentage: age.percentage,
            recordedAt,
          },
        });
      }

      // Gender
      for (const gender of DEMOGRAPHICS.gender) {
        await prisma.postAnalyticsDemographics.create({
          data: {
            postSocialAccountId: psa.id,
            ageGroup: "ALL", // Default age group for gender demographics
            gender: gender.type,
            percentage: gender.percentage,
            recordedAt,
          },
        });
      }

      // Locations
      for (const location of DEMOGRAPHICS.topLocations) {
        await prisma.postAnalyticsDemographics.create({
          data: {
            postSocialAccountId: psa.id,
            ageGroup: "ALL", // Default age group for location demographics
            location: location.country,
            percentage: location.percentage,
            recordedAt,
          },
        });
      }

      console.log(
        `📊 Created analytics for ${platform} (${psa.socialAccount.name})`
      );
      console.log(`   Views: ${baseViews.toLocaleString()}`);
      console.log(`   Likes: ${likes}`);
      console.log(`   Comments: ${comments}`);
      console.log(`   Shares: ${shares}`);
      console.log(`   Clicks: ${clicks}`);
      console.log(`   Reach: ${reach.toLocaleString()}`);
      console.log(`   Impressions: ${impressions.toLocaleString()}`);

      if (isFacebook) {
        const paidImpressions = Math.floor(impressions * 0.3);
        const organicImpressions = Math.floor(impressions * 0.7);
        console.log(`   Rich Insights: ✅`);
        console.log(`     - Total Impressions: ${impressions}`);
        console.log(`     - Unique Impressions: ${reach}`);
        console.log(
          `     - Paid vs Organic: ${paidImpressions} / ${organicImpressions}`
        );
        console.log(
          `     - Reactions: ${likes} (${Math.floor(likes * 0.6)} likes, ${Math.floor(likes * 0.2)} loves)`
        );
      } else {
        console.log(`   Rich Insights: ❌ (Basic metrics only)`);
      }

      console.log(`   Demographics: ✅`);
      console.log(
        `     - Top Age Group: ${DEMOGRAPHICS.ageGroups[1].range} (${DEMOGRAPHICS.ageGroups[1].percentage}%)`
      );
      console.log(
        `     - Gender Split: ${DEMOGRAPHICS.gender[0].percentage}% ${DEMOGRAPHICS.gender[0].type}`
      );
      console.log(
        `     - Top Location: ${DEMOGRAPHICS.topLocations[0].country} (${DEMOGRAPHICS.topLocations[0].percentage}%)`
      );
      console.log("");
    }

    console.log(`✅ Mock analytics data created successfully!`);
    console.log(`🌐 Test in frontend: http://localhost:3000/posts/${post.id}`);
  } catch (error: any) {
    console.error("❌ Error creating mock analytics:", error.message);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
createMockAnalytics().catch(console.error);
