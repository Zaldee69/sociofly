import { api } from "@/lib/utils/api";
import { Feature, PLAN_RANKS, FEATURE_MIN_PLAN } from "@/config/feature-flags";
import { BillingPlan } from "@prisma/client";

export const useFeatureFlag = () => {
  const { data: userData, isLoading } = api.user.getSubscriptionDetails.useQuery();
  const userPlan = userData?.subscriptionPlan || BillingPlan.FREE;

  const hasFeature = (feature: Feature): boolean => {
    if (isLoading) {
      // While loading, assume no access or handle as per your UX needs
      // For now, we'll return false to prevent premature access
      return false;
    }

    const requiredPlan = FEATURE_MIN_PLAN[feature];

    // If a feature is not explicitly listed in FEATURE_MIN_PLAN, assume it's free
    if (!requiredPlan) {
      return true;
    }

    const userPlanRank = PLAN_RANKS[userPlan];
    const requiredPlanRank = PLAN_RANKS[requiredPlan];

    return userPlanRank >= requiredPlanRank;
  };

  return { hasFeature, isLoading, userPlan };
};
