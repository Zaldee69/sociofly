import { useState, useEffect } from "react";
import { createClient } from "@/lib/utils/supabase/client";
import { User } from "@supabase/supabase-js";

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

export function useSocialAccount(
  user: User | null,
  platform: SocialPlatform
): UseSocialAccountReturn {
  const [socialAccount, setSocialAccount] = useState<SocialAccount[] | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const supabase = createClient();

  const fetchSocialAccount = async () => {
    if (!user?.id) return;

    try {
      setIsLoading(true);
      let query = supabase
        .from("social_accounts")
        .select("*")
        .eq("user_id", user.id);

      if (platform !== "all") {
        query = query.eq("platform", platform);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      setSocialAccount(data);
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSocialAccount();
  }, [user?.id, platform, supabase]);

  return {
    accounts: socialAccount,
    account: platform === "all" ? null : socialAccount?.[0] || null,
    isLoading,
    error: error ? error.message : null,
    refetch: fetchSocialAccount,
  };
}
