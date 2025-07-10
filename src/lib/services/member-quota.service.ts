import { prisma } from "@/lib/prisma/client";
import { BillingPlan } from "@prisma/client";

/**
 * Service for handling team member limits based on subscription plan
 */
export class MemberQuotaService {
  // Define member limits per plan based on pricing plans
  private static readonly MEMBER_LIMITS: Record<BillingPlan, number> = {
    [BillingPlan.FREE]: 0,        // No additional team members allowed
    [BillingPlan.PRO]: 25,       // Up to 25 team members
    [BillingPlan.ENTERPRISE]: Infinity, // Unlimited team members
  };

  /**
   * Get the member limit for a given plan
   * @param plan - The billing plan
   * @returns The member limit
   */
  static getMemberLimit(plan: BillingPlan): number {
    return this.MEMBER_LIMITS[plan] || this.MEMBER_LIMITS[BillingPlan.FREE];
  }

  /**
   * Get the number of members in a team
   * @param teamId - The team ID
   * @returns The number of members
   */
  static async getMemberCount(teamId: string): Promise<number> {
    const count = await prisma.membership.count({
      where: {
        teamId,
        // Only count active memberships
        status: "ACTIVE",
      },
    });
    return count;
  }

  /**
   * Check if a team can add more members
   * @param teamId - The team ID
   * @param plan - The billing plan
   * @returns Whether the team can add more members
   */
  static async canAddMember(teamId: string, plan: BillingPlan): Promise<boolean> {
    const currentCount = await this.getMemberCount(teamId);
    const limit = this.getMemberLimit(plan);
    return currentCount < limit;
  }

  /**
   * Get member quota information for a team
   * @param teamId - The team ID
   * @param plan - The billing plan
   * @returns Member quota information
   */
  static async getMemberQuotaInfo(
    teamId: string,
    plan: BillingPlan
  ): Promise<{
    current: number;
    limit: number | string;
    percentage: number;
    isUnlimited: boolean;
    canAdd: boolean;
  }> {
    const currentCount = await this.getMemberCount(teamId);
    const limit = this.getMemberLimit(plan);
    const isUnlimited = limit === Infinity;
    const canAdd = currentCount < limit;
    const percentage = isUnlimited ? 0 : Math.min(100, (currentCount / limit) * 100);

    return {
      current: currentCount,
      limit: isUnlimited ? "Unlimited" : limit,
      percentage,
      isUnlimited,
      canAdd,
    };
  }

  /**
   * Validate if a team can add a new member before invitation
   * @param teamId - The team ID
   * @param plan - The billing plan
   * @throws Error if member limit is reached
   */
  static async validateMemberQuota(teamId: string, plan: BillingPlan): Promise<void> {
    const canAdd = await this.canAddMember(teamId, plan);
    if (!canAdd) {
      const quotaInfo = await this.getMemberQuotaInfo(teamId, plan);
      throw new Error(
        `Member limit reached. Your ${plan} plan allows up to ${quotaInfo.limit} team members.`
      );
    }
  }
}