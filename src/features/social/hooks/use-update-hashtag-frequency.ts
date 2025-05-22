import { trpc } from "@/lib/trpc/client";

export function useUpdateHashtagFrequency() {
  const mutation = trpc.hashtag.updateFrequency.useMutation();

  const updateHashtags = async (hashtags: string[]) => {
    if (!hashtags.length) return { count: 0 };

    try {
      return await mutation.mutateAsync({ hashtags });
    } catch (error) {
      console.error("Failed to update hashtag frequencies:", error);
      return { count: 0 };
    }
  };

  return {
    updateHashtags,
    isPending: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
  };
}
