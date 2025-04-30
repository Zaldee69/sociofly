import { useEffect, useState } from "react";
import { createClient } from "@/lib/utils/supabase/client";
import { useAuthStore } from "@/lib/stores/use-auth-store";

export type SocialPlatform = "facebook" | "instagram" | "linkedin" | "all";

interface SocialAccount {
  id: string;
  user_id: string;
  platform: SocialPlatform;
  access_token: string;
  platform_user_id: string;
  username: string;
  expires_at: string | null;
  profile_picture_url?: string;
}

interface UseSocialAccountReturn {
  accounts: SocialAccount[] | null;
  account: SocialAccount | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useSocialAccount(platform: string = "all") {
  const [socialAccounts, setSocialAccounts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { user } = useAuthStore();
  const supabase = createClient();

  const fetchSocialAccount = async () => {
    if (!user?.id) return;

    try {
      setIsLoading(true);
      setError(null); // Reset error state

      let query = supabase
        .from("social_accounts")
        .select("*")
        .eq("user_id", user.id);

      if (platform !== "all") {
        query = query.eq("platform", platform);
      }

      const { data, error } = await query;

      console.log(data);

      if (error) {
        console.error("Error fetching social accounts:", error);
        throw error;
      }

      setSocialAccounts(data || []);
    } catch (err) {
      console.error("Error fetching social accounts:", err);
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      if (!isMounted) return;
      await fetchSocialAccount();
    };

    fetchData();

    // Cleanup function
    return () => {
      isMounted = false;
    };
  }, [user?.id, platform]); // Add dependencies

  return {
    socialAccounts,
    isLoading,
    error,
    refetch: fetchSocialAccount,
  };
}
