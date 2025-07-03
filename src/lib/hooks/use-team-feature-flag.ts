import { api } from "@/lib/utils/api";
import { Feature, PLAN_RANKS, FEATURE_MIN_PLAN } from "@/config/feature-flags";
import { BillingPlan } from "@prisma/client";

/**
 * Hook for checking feature access in team context
 * Team members inherit subscription features from team owner
 */
export const useTeamFeatureFlag = (teamId?: string) => {
  // Get team-based subscription details
  const { data: teamSubscription, isLoading: isLoadingTeamSub } =
    api.team.getEffectiveSubscription.useQuery(
      { teamId: teamId! },
      { enabled: !!teamId }
    );

  // Fallback to individual subscription if no team context
  const { data: individualSubscription, isLoading: isLoadingIndividual } =
    api.user.getSubscriptionDetails.useQuery(undefined, { enabled: !teamId });

  const isLoading = teamId ? isLoadingTeamSub : isLoadingIndividual;
  const effectiveSubscription = teamId
    ? teamSubscription
    : individualSubscription;

  const hasFeature = (feature: Feature): boolean => {
    if (isLoading) {
      // While loading, assume no access to prevent premature feature usage
      return false;
    }

    const requiredPlan = FEATURE_MIN_PLAN[feature];

    // If feature is not explicitly listed, assume it's free
    if (!requiredPlan) {
      return true;
    }

    if (!effectiveSubscription) {
      // No subscription data available, only allow FREE features
      return requiredPlan === BillingPlan.FREE;
    }

    // Check if subscription is active
    if (
      !effectiveSubscription.subscriptionActive &&
      requiredPlan !== BillingPlan.FREE
    ) {
      return false;
    }

    const userPlanRank =
      PLAN_RANKS[effectiveSubscription.subscriptionPlan as BillingPlan];
    const requiredPlanRank = PLAN_RANKS[requiredPlan];

    return userPlanRank >= requiredPlanRank;
  };

  return {
    hasFeature,
    isLoading,
    effectiveSubscription,
    subscriptionSource:
      (effectiveSubscription as any)?.sourceType || "individual",
  };
};

/**
 * Hook for getting teams where user has access to specific features
 */
export const useTeamsWithFeatureAccess = (
  minimumPlan: BillingPlan = BillingPlan.FREE
) => {
  const { data: teamsWithAccess, isLoading } =
    api.team.getTeamsWithPlanAccess.useQuery({
      minimumPlan,
    });

  return {
    teamsWithAccess: teamsWithAccess || [],
    isLoading,
  };
};
