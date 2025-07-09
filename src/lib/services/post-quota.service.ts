import { prisma } from "@/lib/prisma/client";
import { BillingPlan } from "@prisma/client";

/**
 * Service for handling post quota limits based on subscription plan
 */
export class PostQuotaService {
  // Define monthly post limits per plan
  private static readonly MONTHLY_POST_LIMITS = {
    [BillingPlan.FREE]: 10,
    [BillingPlan.PRO]: 100,
    [BillingPlan.ENTERPRISE]: Infinity,
  };

  /**
   * Get the monthly post limit for a given plan
   * @param plan - The billing plan
   * @returns The monthly post limit
   */
  static getMonthlyPostLimit(plan: BillingPlan): number {
    return this.MONTHLY_POST_LIMITS[plan] || this.MONTHLY_POST_LIMITS[BillingPlan.FREE];
  }

  /**
   * Get the number of posts published in the current month for a user in a team
   * @param userId - The user ID
   * @param teamId - The team ID
   * @returns The number of posts published this month
   */
  static async getMonthlyPostCount(userId: string, teamId: string): Promise<number> {
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // Count posts that were published this month
    const postCount = await prisma.post.count({
      where: {
        userId,
        teamId,
        status: "PUBLISHED",
        publishedAt: {
          gte: firstDayOfMonth,
          lte: lastDayOfMonth,
        },
      },
    });

    return postCount;
  }

  /**
   * Check if a user has reached their monthly post quota
   * @param userId - The user ID
   * @param teamId - The team ID
   * @param plan - The billing plan
   * @returns Object containing quota information
   */
  static async checkPostQuota(userId: string, teamId: string, plan: BillingPlan): Promise<{
    hasQuotaRemaining: boolean;
    currentCount: number;
    limit: number;
    remaining: number;
  }> {
    const limit = this.getMonthlyPostLimit(plan);
    const currentCount = await this.getMonthlyPostCount(userId, teamId);
    const remaining = Math.max(0, limit - currentCount);

    return {
      hasQuotaRemaining: currentCount < limit,
      currentCount,
      limit,
      remaining,
    };
  }
}