import { BillingPlan } from "@prisma/client";
import { prisma } from "@/lib/prisma/client";

/**
 * Service untuk mengecek akses fitur analytics berdasarkan tier plan
 */
export class AnalyticsAccessService {
  /**
   * Mapping fitur analytics yang tersedia per plan
   */
  private static readonly ANALYTICS_FEATURES: Record<
    BillingPlan,
    {
      initialSync: boolean;
      incrementalSync: boolean;
      dailySync: boolean;
      postAnalytics: boolean;
      maxSyncDaysBack: number;
      maxPostsPerSync: number;
    }
  > = {
    [BillingPlan.FREE]: {
      initialSync: false,
      incrementalSync: false,
      dailySync: false,
      postAnalytics: false,
      maxSyncDaysBack: 0,
      maxPostsPerSync: 0,
    },
    [BillingPlan.PRO]: {
      initialSync: true,
      incrementalSync: true,
      dailySync: true,
      postAnalytics: true,
      maxSyncDaysBack: 30,
      maxPostsPerSync: 100,
    },
    [BillingPlan.ENTERPRISE]: {
      initialSync: true,
      incrementalSync: true,
      dailySync: true,
      postAnalytics: true,
      maxSyncDaysBack: 365,
      maxPostsPerSync: 1000,
    },
  };

  /**
   * Mengecek apakah user memiliki akses ke fitur analytics tertentu
   */
  static async hasAnalyticsAccess(
    userId: string,
    feature: "initialSync" | "incrementalSync" | "dailySync" | "postAnalytics"
  ): Promise<{
    hasAccess: boolean;
    plan: BillingPlan;
    isActive: boolean;
    reason?: string;
  }> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          subscriptionPlan: true,
          subscriptionActive: true,
          subscriptionExpiresAt: true,
        },
      });

      if (!user) {
        return {
          hasAccess: false,
          plan: BillingPlan.FREE,
          isActive: false,
          reason: "User not found",
        };
      }

      const now = new Date();
      const isSubscriptionActive =
        user.subscriptionActive &&
        (!user.subscriptionExpiresAt || user.subscriptionExpiresAt > now);

      // Jika subscription tidak aktif, fallback ke FREE plan
      const effectivePlan = isSubscriptionActive
        ? user.subscriptionPlan
        : BillingPlan.FREE;

      const features = this.ANALYTICS_FEATURES[effectivePlan];
      const hasAccess = features[feature];

      return {
        hasAccess,
        plan: effectivePlan,
        isActive: isSubscriptionActive,
        reason: !hasAccess
          ? `Feature '${feature}' not available in ${effectivePlan} plan`
          : undefined,
      };
    } catch (error) {
      console.error("Error checking analytics access:", error);
      return {
        hasAccess: false,
        plan: BillingPlan.FREE,
        isActive: false,
        reason: "Error checking subscription status",
      };
    }
  }

  /**
   * Mengecek akses berdasarkan teamId (menggunakan owner team)
   */
  static async hasAnalyticsAccessByTeam(
    teamId: string,
    feature: "initialSync" | "incrementalSync" | "dailySync" | "postAnalytics"
  ): Promise<{
    hasAccess: boolean;
    plan: BillingPlan;
    isActive: boolean;
    reason?: string;
  }> {
    try {
      const team = await prisma.team.findUnique({
        where: { id: teamId },
        select: {
          ownerId: true,
        },
      });

      console.log("team", team);

      if (!team) {
        return {
          hasAccess: false,
          plan: BillingPlan.FREE,
          isActive: false,
          reason: "Team not found",
        };
      }

      return this.hasAnalyticsAccess(team.ownerId, feature);
    } catch (error) {
      console.error("Error checking team analytics access:", error);
      return {
        hasAccess: false,
        plan: BillingPlan.FREE,
        isActive: false,
        reason: "Error checking team subscription status",
      };
    }
  }

  /**
   * Mendapatkan limits untuk sync berdasarkan plan
   */
  static getSyncLimits(plan: BillingPlan): {
    maxSyncDaysBack: number;
    maxPostsPerSync: number;
  } {
    const features = this.ANALYTICS_FEATURES[plan];
    return {
      maxSyncDaysBack: features.maxSyncDaysBack,
      maxPostsPerSync: features.maxPostsPerSync,
    };
  }

  /**
   * Validasi parameter sync berdasarkan plan limits
   */
  static validateSyncParams(
    plan: BillingPlan,
    daysBack?: number,
    limit?: number
  ): {
    isValid: boolean;
    adjustedDaysBack?: number;
    adjustedLimit?: number;
    warnings: string[];
  } {
    const limits = this.getSyncLimits(plan);
    const warnings: string[] = [];
    let adjustedDaysBack = daysBack;
    let adjustedLimit = limit;

    // Validasi daysBack
    if (daysBack && daysBack > limits.maxSyncDaysBack) {
      adjustedDaysBack = limits.maxSyncDaysBack;
      warnings.push(
        `Days back reduced from ${daysBack} to ${limits.maxSyncDaysBack} due to plan limits`
      );
    }

    // Validasi limit
    if (limit && limit > limits.maxPostsPerSync) {
      adjustedLimit = limits.maxPostsPerSync;
      warnings.push(
        `Posts limit reduced from ${limit} to ${limits.maxPostsPerSync} due to plan limits`
      );
    }

    return {
      isValid: warnings.length === 0,
      adjustedDaysBack,
      adjustedLimit,
      warnings,
    };
  }
}
