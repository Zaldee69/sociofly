import { prisma } from "@/lib/prisma/client";
import axios from "axios";

export class InsightsCollector {
  /**
   * Fetch and store account-level insights for all social accounts.
   * Should be called by the job scheduler daily.
   */
  static async runAccountInsightsForAllAccounts(): Promise<{
    total: number;
    success: number;
    failed: number;
  }> {
    console.log("🚀 Starting account insights collection for all accounts...");

    // Fetch all social accounts with credentials
    const accounts = await prisma.socialAccount.findMany({
      select: {
        id: true,
        accessToken: true,
        profileId: true,
        platform: true,
      },
    });

    console.log(`📊 Found ${accounts.length} social accounts to process`);

    let success = 0;
    let failed = 0;

    for (const account of accounts) {
      try {
        const { id, accessToken, profileId, platform } = account;
        console.log(`📈 Processing account: ${platform} (${id})`);

        if (!accessToken || !profileId) {
          throw new Error("Missing credentials");
        }

        let currentData = {
          followersCount: 0,
          mediaCount: 0,
          engagementRate: 2.8,
          avgReachPerPost: 0,
        };

        if (platform === "INSTAGRAM") {
          // Get current basic account info
          const basicResp = await axios.get(
            `https://graph.facebook.com/v22.0/${profileId}`,
            {
              params: {
                fields: "followers_count,media_count,name,username",
                access_token: accessToken,
              },
            }
          );

          currentData.followersCount = basicResp.data.followers_count || 0;
          currentData.mediaCount = basicResp.data.media_count || 0;
          currentData.avgReachPerPost = Math.max(
            1,
            Math.round(currentData.followersCount * 0.12)
          );
        } else if (platform === "FACEBOOK") {
          // Get current basic account info
          const basicResp = await axios.get(
            `https://graph.facebook.com/v22.0/${profileId}`,
            {
              params: {
                fields: "fan_count,posts.summary(true).limit(0)",
                access_token: accessToken,
              },
            }
          );

          currentData.followersCount = basicResp.data.fan_count || 0;
          currentData.mediaCount =
            basicResp.data.posts?.summary?.total_count || 0;
          currentData.engagementRate = 2.0;
          currentData.avgReachPerPost = Math.max(
            1,
            Math.round(currentData.followersCount * 0.1)
          );
        } else {
          console.log(`⚠️ Skipping unsupported platform: ${platform}`);
          continue;
        }

        // Estimate previous data (simplified)
        const previousData = {
          followersCount: Math.max(
            0,
            Math.floor(currentData.followersCount * 0.95)
          ),
          mediaCount: Math.max(0, Math.floor(currentData.mediaCount * 0.9)),
          engagementRate: currentData.engagementRate * 0.9,
          avgReachPerPost: Math.max(
            1,
            Math.round(currentData.avgReachPerPost * 0.85)
          ),
        };

        // Calculate percentage changes
        const calculatePercentageChange = (
          current: number,
          previous: number
        ): number => {
          if (previous === 0) return current > 0 ? 100 : 0;
          return parseFloat(
            (((current - previous) / previous) * 100).toFixed(1)
          );
        };

        // Store the insights in the database
        await prisma.accountAnalytics.create({
          data: {
            socialAccountId: id,
            followersCount: currentData.followersCount,
            mediaCount: currentData.mediaCount,
            engagementRate: currentData.engagementRate,
            avgReachPerPost: currentData.avgReachPerPost,
            followerGrowth: JSON.stringify([]),
            // Store comparison data
            previousFollowersCount: previousData.followersCount,
            previousMediaCount: previousData.mediaCount,
            previousEngagementRate: previousData.engagementRate,
            previousAvgReachPerPost: previousData.avgReachPerPost,
            engagementGrowthPercent: calculatePercentageChange(
              currentData.engagementRate,
              previousData.engagementRate
            ),
            reachGrowthPercent: calculatePercentageChange(
              currentData.avgReachPerPost,
              previousData.avgReachPerPost
            ),
            mediaGrowthPercent: calculatePercentageChange(
              currentData.mediaCount,
              previousData.mediaCount
            ),
            followersGrowthPercent: calculatePercentageChange(
              currentData.followersCount,
              previousData.followersCount
            ),
          },
        });

        console.log(`✅ Successfully processed account ${id}`);
        success++;
      } catch (error: any) {
        console.error(`❌ Failed account insights for ${account.id}:`, error);
        failed++;
      }
    }

    console.log(
      `🎯 Account insights collection completed: ${success}/${accounts.length} successful, ${failed} failed`
    );
    return { total: accounts.length, success, failed };
  }

  /**
   * Fetch initial account-level insights for a social account.
   * This should be called once when a user integrates their account.
   */
  static async fetchInitialAccountInsights(
    socialAccountId: string
  ): Promise<void> {
    try {
      // Fetch the social account details
      const account = await prisma.socialAccount.findUnique({
        where: { id: socialAccountId },
        select: { accessToken: true, profileId: true, platform: true },
      });

      if (!account || !account.accessToken || !account.profileId) {
        throw new Error("Missing credentials or account not found");
      }

      const { accessToken, profileId, platform } = account;

      let currentData = {
        followersCount: 0,
        mediaCount: 0,
        engagementRate: 2.8,
        avgReachPerPost: 0,
      };

      console.log(`Fetching ${platform} insights for profileId: ${profileId}`);

      if (platform === "INSTAGRAM") {
        // Get current basic account info
        const basicResp = await axios.get(
          `https://graph.facebook.com/v22.0/${profileId}`,
          {
            params: {
              fields: "followers_count,media_count,name,username",
              access_token: accessToken,
            },
          }
        );

        currentData.followersCount = basicResp.data.followers_count || 0;
        currentData.mediaCount = basicResp.data.media_count || 0;
        currentData.avgReachPerPost = Math.max(
          1,
          Math.round(currentData.followersCount * 0.12)
        );
      }

      // Estimate previous data (simplified)
      const previousData = {
        followersCount: Math.max(
          0,
          Math.floor(currentData.followersCount * 0.95)
        ),
        mediaCount: Math.max(0, Math.floor(currentData.mediaCount * 0.9)),
        engagementRate: currentData.engagementRate * 0.9,
        avgReachPerPost: Math.max(
          1,
          Math.round(currentData.avgReachPerPost * 0.85)
        ),
      };

      // Calculate percentage changes
      const calculatePercentageChange = (
        current: number,
        previous: number
      ): number => {
        if (previous === 0) return current > 0 ? 100 : 0;
        return parseFloat((((current - previous) / previous) * 100).toFixed(1));
      };

      // Store the insights in the database
      await prisma.accountAnalytics.create({
        data: {
          socialAccountId: socialAccountId,
          followersCount: currentData.followersCount,
          mediaCount: currentData.mediaCount,
          engagementRate: currentData.engagementRate,
          avgReachPerPost: currentData.avgReachPerPost,
          followerGrowth: JSON.stringify([]),
          // Store comparison data as well
          previousFollowersCount: previousData.followersCount,
          previousMediaCount: previousData.mediaCount,
          previousEngagementRate: previousData.engagementRate,
          previousAvgReachPerPost: previousData.avgReachPerPost,
          engagementGrowthPercent: calculatePercentageChange(
            currentData.engagementRate,
            previousData.engagementRate
          ),
          reachGrowthPercent: calculatePercentageChange(
            currentData.avgReachPerPost,
            previousData.avgReachPerPost
          ),
          mediaGrowthPercent: calculatePercentageChange(
            currentData.mediaCount,
            previousData.mediaCount
          ),
          followersGrowthPercent: calculatePercentageChange(
            currentData.followersCount,
            previousData.followersCount
          ),
        },
      });

      console.log(`Analytics fetched for account ${socialAccountId}`);
    } catch (error) {
      console.error(`Error:`, error);
      throw error;
    }
  }
}
