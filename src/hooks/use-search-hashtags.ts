import { useQuery } from "@tanstack/react-query";
import { trpc } from "@/lib/trpc/client";
import { useState, useEffect } from "react";

interface UseSearchHashtagsProps {
  initialQuery?: string;
  category?: string;
  limit?: number;
  debounceMs?: number;
}

export function useSearchHashtags({
  initialQuery = "",
  category,
  limit = 10,
  debounceMs = 300,
}: UseSearchHashtagsProps = {}) {
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);

  // Debounce the search query to avoid too many API calls
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, debounceMs);

    return () => {
      clearTimeout(timer);
    };
  }, [searchQuery, debounceMs]);

  const enabled = debouncedQuery.trim().length > 0;

  const query = trpc.hashtag.search.useQuery(
    { query: debouncedQuery, category, limit },
    {
      enabled,
      staleTime: 1000 * 60 * 1, // 1 minute
      refetchOnWindowFocus: false,
      retry: 1,
    }
  );

  // Log errors if they occur
  if (query.error) {
    console.error("Error searching hashtags:", query.error);
  }

  return {
    searchQuery,
    setSearchQuery,
    hashtags: query.data || [],
    isLoading: enabled && query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}
