import { prisma } from "@/lib/prisma/client";
import { BillingPlan } from "@prisma/client";

/**
 * Service for handling social account limits based on subscription plan
 */
export class SocialAccountQuotaService {
  // Define social account limits per plan based on pricing plans
  private static readonly SOCIAL_ACCOUNT_LIMITS: Record<BillingPlan, number> = {
    [BillingPlan.FREE]: 2,        // Manage 2 Social Accounts
    [BillingPlan.PRO]: 10,       // Connect up to 10 Social Accounts
    [BillingPlan.ENTERPRISE]: Infinity, // Unlimited Social Accounts & Teams
  };

  /**
   * Get the social account limit for a given plan
   * @param plan - The billing plan
   * @returns The social account limit
   */
  static getSocialAccountLimit(plan: BillingPlan): number {
    return this.SOCIAL_ACCOUNT_LIMITS[plan] || this.SOCIAL_ACCOUNT_LIMITS[BillingPlan.FREE];
  }

  /**
   * Get the number of social accounts connected for a team
   * @param teamId - The team ID
   * @returns The current number of connected social accounts
   */
  static async getCurrentSocialAccountCount(teamId: string): Promise<number> {
    const count = await prisma.socialAccount.count({
      where: {
        teamId,
      },
    });
    return count;
  }

  /**
   * Check if a team can add more social accounts based on their plan
   * @param teamId - The team ID
   * @param plan - The billing plan
   * @returns Object with canAdd boolean and current/limit counts
   */
  static async canAddSocialAccount(
    teamId: string,
    plan: BillingPlan
  ): Promise<{
    canAdd: boolean;
    currentCount: number;
    limit: number;
    remaining: number;
  }> {
    const currentCount = await this.getCurrentSocialAccountCount(teamId);
    const limit = this.getSocialAccountLimit(plan);
    const remaining = limit === Infinity ? Infinity : Math.max(0, limit - currentCount);
    
    return {
      canAdd: currentCount < limit,
      currentCount,
      limit,
      remaining,
    };
  }

  /**
   * Get social account quota info for display
   * @param teamId - The team ID
   * @param plan - The billing plan
   * @returns Formatted quota information
   */
  static async getSocialAccountQuotaInfo(
    teamId: string,
    plan: BillingPlan
  ): Promise<{
    current: number;
    limit: number | string;
    percentage: number;
    isUnlimited: boolean;
  }> {
    const currentCount = await this.getCurrentSocialAccountCount(teamId);
    const limit = this.getSocialAccountLimit(plan);
    const isUnlimited = limit === Infinity;
    
    return {
      current: currentCount,
      limit: isUnlimited ? "Unlimited" : limit,
      percentage: isUnlimited ? 0 : Math.min(100, (currentCount / limit) * 100),
      isUnlimited,
    };
  }
}