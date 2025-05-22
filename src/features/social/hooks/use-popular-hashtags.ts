import { useQuery } from "@tanstack/react-query";
import { trpc } from "@/lib/trpc/client";

interface UsePopularHashtagsProps {
  category?: string;
  limit?: number;
  enabled?: boolean;
}

export function usePopularHashtags({
  category,
  limit = 10,
  enabled = true,
}: UsePopularHashtagsProps = {}) {
  const query = trpc.hashtag.getPopular.useQuery(
    { category, limit },
    {
      enabled,
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false,
      retry: 1, // Only retry once to avoid excessive requests on failure
    }
  );

  // Log errors if they occur
  if (query.error) {
    console.error("Error fetching hashtags:", query.error);
  }

  return {
    hashtags: query.data || [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}
