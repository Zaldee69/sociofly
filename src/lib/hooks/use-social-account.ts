import { useState, useEffect } from "react";
import { createClient } from "@/lib/utils/supabase/client";
import { User } from "@supabase/supabase-js";

export type SocialPlatform = "facebook" | "instagram" | "twitter" | "all";

interface SocialAccount {
  id: string;
  user_id: string;
  platform: SocialPlatform;
  access_token: string;
  platform_user_id: string;
  username: string;
  expires_at: string | null;
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
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<SocialAccount[] | null>(null);
  const [account, setAccount] = useState<SocialAccount | null>(null);
  const supabase = createClient();

  const fetchAccount = async () => {
    if (!user?.id) return;

    setIsLoading(true);
    setError(null);

    try {
      if (platform === "all") {
        const { data, error } = await supabase
          .from("social_accounts")
          .select("*")
          .eq("user_id", user.id);

        if (error) {
          setError(error.message);
          return;
        }

        setAccounts(data);
        setAccount(null);
      } else {
        const { data, error } = await supabase
          .from("social_accounts")
          .select("*")
          .eq("user_id", user.id)
          .eq("platform", platform)
          .single();

        if (error) {
          setError(error.message);
          return;
        }

        setAccount(data);
        setAccounts(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to fetch ${platform} account(s)`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAccount();
  }, [user?.id, platform]);

  return {
    accounts,
    account,
    isLoading,
    error,
    refetch: fetchAccount,
  };
} 