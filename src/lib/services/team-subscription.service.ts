import { prisma } from "@/lib/prisma/client";
import { BillingPlan } from "@prisma/client";
import { PLAN_RANKS } from "@/config/feature-flags";

/**
 * Service for handling team-based subscription logic
 * Team members inherit subscription features from team owner
 */
export class TeamSubscriptionService {
  /**
   * Get effective subscription plan for a user in a specific team context
   * @param userId - The user ID
   * @param teamId - The team ID (optional, if not provided returns user's own subscription)
   * @returns The effective subscription plan and details
   */
  static async getEffectiveSubscription(userId: string, teamId?: string) {
    try {
      // If no teamId provided, return user's own subscription
      if (!teamId) {
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: {
            subscriptionPlan: true,
            subscriptionActive: true,
            subscriptionExpiresAt: true,
            subscriptionUpdatedAt: true,
          },
        });

        if (!user) {
          throw new Error("User not found");
        }

        return {
          subscriptionPlan: user.subscriptionPlan,
          subscriptionActive: user.subscriptionActive,
          subscriptionExpiresAt: user.subscriptionExpiresAt,
          subscriptionUpdatedAt: user.subscriptionUpdatedAt,
          sourceType: "individual" as const,
          sourceUserId: userId,
        };
      }

      // Get team information and check if user is member
      const team = await prisma.team.findUnique({
        where: { id: teamId },
        include: {
          owner: {
            select: {
              id: true,
              subscriptionPlan: true,
              subscriptionActive: true,
              subscriptionExpiresAt: true,
              subscriptionUpdatedAt: true,
            },
          },
          memberships: {
            where: { userId },
            select: { userId: true, role: true },
          },
        },
      });

      if (!team) {
        throw new Error("Team not found");
      }

      // Check if user is member of this team
      const membership = team.memberships[0];
      if (!membership) {
        throw new Error("User is not a member of this team");
      }

      // Return team owner's subscription (team members inherit from owner)
      return {
        subscriptionPlan: team.owner.subscriptionPlan,
        subscriptionActive: team.owner.subscriptionActive,
        subscriptionExpiresAt: team.owner.subscriptionExpiresAt,
        subscriptionUpdatedAt: team.owner.subscriptionUpdatedAt,
        sourceType: "team_owner" as const,
        sourceUserId: team.owner.id,
        teamId: teamId,
        userRole: membership.role,
      };
    } catch (error) {
      console.error("Error getting effective subscription:", error);
      // Fallback to FREE plan on error
      return {
        subscriptionPlan: BillingPlan.FREE,
        subscriptionActive: false,
        subscriptionExpiresAt: null,
        subscriptionUpdatedAt: null,
        sourceType: "fallback" as const,
        sourceUserId: userId,
      };
    }
  }

  /**
   * Check if user has access to a feature in team context
   * @param userId - The user ID
   * @param teamId - The team ID
   * @param requiredPlan - The minimum plan required for the feature
   * @returns boolean indicating if user has access
   */
  static async hasFeatureAccess(
    userId: string,
    teamId: string,
    requiredPlan: BillingPlan
  ): Promise<boolean> {
    try {
      const effectiveSubscription = await this.getEffectiveSubscription(
        userId,
        teamId
      );

      if (!effectiveSubscription.subscriptionActive) {
        // If subscription is not active, only allow FREE features
        return requiredPlan === BillingPlan.FREE;
      }

      const userPlanRank = PLAN_RANKS[effectiveSubscription.subscriptionPlan];
      const requiredPlanRank = PLAN_RANKS[requiredPlan];

      return userPlanRank >= requiredPlanRank;
    } catch (error) {
      console.error("Error checking feature access:", error);
      // Fail closed - deny access on error except for FREE features
      return requiredPlan === BillingPlan.FREE;
    }
  }

  /**
   * Get all teams where user has specific plan access (either as owner or member)
   * @param userId - The user ID
   * @param minimumPlan - The minimum plan to filter by
   * @returns Array of teams with access
   */
  static async getTeamsWithPlanAccess(
    userId: string,
    minimumPlan: BillingPlan = BillingPlan.FREE
  ) {
    try {
      // Get all teams where user is a member
      const memberships = await prisma.membership.findMany({
        where: { userId },
        include: {
          team: {
            include: {
              owner: {
                select: {
                  id: true,
                  subscriptionPlan: true,
                  subscriptionActive: true,
                },
              },
            },
          },
        },
      });

      const teamsWithAccess = memberships.filter((membership) => {
        const ownerPlan = membership.team.owner.subscriptionPlan;
        const ownerActive = membership.team.owner.subscriptionActive;

        // If subscription not active, only FREE features available
        if (!ownerActive && minimumPlan !== BillingPlan.FREE) {
          return false;
        }

        const ownerPlanRank = PLAN_RANKS[ownerPlan];
        const requiredPlanRank = PLAN_RANKS[minimumPlan];

        return ownerPlanRank >= requiredPlanRank;
      });

      return teamsWithAccess.map((membership) => ({
        teamId: membership.team.id,
        teamName: membership.team.name,
        teamSlug: membership.team.slug,
        userRole: membership.role,
        effectivePlan: membership.team.owner.subscriptionPlan,
        subscriptionActive: membership.team.owner.subscriptionActive,
        isOwner: membership.team.ownerId === userId,
      }));
    } catch (error) {
      console.error("Error getting teams with plan access:", error);
      return [];
    }
  }

  /**
   * Get subscription summary for team owner
   * Includes info about how many teams and members benefit from the subscription
   * @param ownerId - The team owner user ID
   */
  static async getOwnerSubscriptionSummary(ownerId: string) {
    try {
      const owner = await prisma.user.findUnique({
        where: { id: ownerId },
        select: {
          id: true,
          name: true,
          email: true,
          subscriptionPlan: true,
          subscriptionActive: true,
          subscriptionExpiresAt: true,
          teams: {
            select: {
              id: true,
              name: true,
              _count: {
                select: { memberships: true },
              },
            },
          },
        },
      });

      if (!owner) {
        throw new Error("Owner not found");
      }

      const totalTeams = owner.teams.length;
      const totalMembers = owner.teams.reduce(
        (sum, team) => sum + team._count.memberships,
        0
      );

      return {
        owner: {
          id: owner.id,
          name: owner.name,
          email: owner.email,
        },
        subscription: {
          plan: owner.subscriptionPlan,
          active: owner.subscriptionActive,
          expiresAt: owner.subscriptionExpiresAt,
        },
        impact: {
          totalTeams,
          totalMembers,
          teams: owner.teams.map((team) => ({
            id: team.id,
            name: team.name,
            memberCount: team._count.memberships,
          })),
        },
      };
    } catch (error) {
      console.error("Error getting owner subscription summary:", error);
      throw error;
    }
  }
}
