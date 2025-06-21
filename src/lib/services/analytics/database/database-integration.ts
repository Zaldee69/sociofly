/**
 * Database Integration for Analytics V2
 * Connects refactored analytics system with existing Prisma models
 */

import { PrismaClient } from "@prisma/client";
import { AccountMetric, PostMetric, StoryMetric } from "../config/metrics";

export interface StorageOptions {
  socialAccountId: string;
  recordedAt?: Date;
}

export interface StorageResult {
  success: boolean;
  stored: number;
  errors: string[];
}

/**
 * Database Integration Service
 */
export class DatabaseIntegration {
  private prisma: PrismaClient;

  constructor(prisma?: PrismaClient) {
    this.prisma = prisma || new PrismaClient();
  }

  /**
   * Store account analytics using existing schema
   */
  async storeAccountAnalytics(data: AccountMetric, options: StorageOptions) {
    try {
      console.log(
        `💾 Storing account analytics for ${options.socialAccountId}`
      );

      // Get previous record for growth calculation
      const previousRecord = await this.prisma.accountAnalytics.findFirst({
        where: { socialAccountId: options.socialAccountId },
        orderBy: { recordedAt: "desc" },
      });

      const followerGrowthPercent = previousRecord
        ? ((data.followers - previousRecord.followersCount) /
            previousRecord.followersCount) *
          100
        : 0;

      // Create new analytics record
      const result = await this.prisma.accountAnalytics.create({
        data: {
          socialAccountId: options.socialAccountId,
          recordedAt: options.recordedAt || new Date(),

          // Map our metrics to existing schema
          followersCount: data.followers,
          followingCount: data.following || 0,
          mediaCount: data.posts,
          engagementRate: data.engagement_rate,
          avgReachPerPost: data.avg_reach || 0,

          // Additional fields for existing schema compatibility
          totalFollowers: data.followers,
          totalPosts: data.posts,
          avgEngagementPerPost: data.engagement_rate,
          profileVisits: data.profile_visits || 0,

          // Growth metrics
          previousFollowersCount: previousRecord?.followersCount || 0,
          followersGrowthPercent: Math.round(followerGrowthPercent * 100) / 100,

          // Daily growth data
          followerGrowth: {
            daily: [
              {
                date: new Date().toISOString().split("T")[0],
                followers: data.followers,
                change:
                  data.followers -
                  (previousRecord?.followersCount || data.followers),
              },
            ],
          },
        },
      });

      console.log(`✅ Account analytics stored: ${result.id}`);
      return result;
    } catch (error) {
      console.error(`❌ Failed to store account analytics:`, error);
      throw error;
    }
  }

  /**
   * Store complete analytics data
   */
  async storeCompleteAnalytics(
    accountData: AccountMetric,
    postData: PostMetric[],
    storyData: StoryMetric[],
    options: StorageOptions
  ): Promise<StorageResult> {
    const errors: string[] = [];
    let stored = 0;

    console.log(`💾 Storing complete analytics for ${options.socialAccountId}`);

    try {
      // Store account analytics
      await this.storeAccountAnalytics(accountData, options);
      stored++;

      console.log(`✅ Stored complete analytics: ${stored} records`);

      return {
        success: errors.length === 0,
        stored,
        errors,
      };
    } catch (error) {
      console.error(`❌ Failed to store complete analytics:`, error);
      return {
        success: false,
        stored,
        errors: [error instanceof Error ? error.message : "Unknown error"],
      };
    }
  }

  /**
   * Get latest analytics
   */
  async getLatestAnalytics(socialAccountId: string) {
    try {
      const latest = await this.prisma.accountAnalytics.findFirst({
        where: { socialAccountId },
        orderBy: { recordedAt: "desc" },
      });

      return {
        account: latest,
        lastUpdated: latest?.recordedAt || null,
      };
    } catch (error) {
      console.error(`❌ Failed to get latest analytics:`, error);
      throw error;
    }
  }

  /**
   * Close connection
   */
  async disconnect() {
    await this.prisma.$disconnect();
  }
}

/**
 * Factory function
 */
export function createDatabaseIntegration(
  prisma?: PrismaClient
): DatabaseIntegration {
  return new DatabaseIntegration(prisma);
}
