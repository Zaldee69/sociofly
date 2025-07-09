import { useEffect, useState } from "react";
import { BillingPlan } from "@prisma/client";
import { trpc } from "@/lib/trpc/client";

interface PostQuotaInfo {
  hasQuotaRemaining: boolean;
  currentCount: number;
  limit: number;
  remaining: number;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Hook to check post quota based on user's subscription plan
 * @param teamId - The team ID
 * @returns Post quota information
 */
export function usePostQuota(teamId: string): PostQuotaInfo {
  const [error, setError] = useState<Error | null>(null);

  // Get post quota information
  const {
    data: quotaData,
    isLoading,
    error: quotaError,
  } = trpc.post.getPostQuota.useQuery(
    { teamId },
    {
      enabled: !!teamId,
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5, // 5 minutes
    }
  );

  // Set error if query fails
  useEffect(() => {
    if (quotaError) {
      setError(new Error(quotaError.message));
    }
  }, [quotaError]);

  // Compute derived state
  const hasQuotaRemaining = quotaData?.hasQuotaRemaining ?? true; // Default to true to avoid blocking UI unnecessarily
  const currentCount = quotaData?.currentCount ?? 0;
  const limit = quotaData?.limit ?? 0;
  const remaining = quotaData?.remaining ?? 0;

  return {
    hasQuotaRemaining,
    currentCount,
    limit,
    remaining,
    isLoading,
    error,
  };
}