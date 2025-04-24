import { useState, useEffect } from "react";
import { createClient } from "@/lib/utils/supabase/client";
import { User } from "@supabase/supabase-js";

interface FacebookAccount {
  id: string;
  user_id: string;
  platform: string;
  access_token: string;
  platform_user_id: string;
  username: string;
  expires_at: string | null;
}

interface UseFacebookAccountReturn {
  facebookAccount: FacebookAccount | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useFacebookAccount(user: User | null): UseFacebookAccountReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [facebookAccount, setFacebookAccount] = useState<FacebookAccount | null>(null);
  const supabase = createClient();

  const fetchFacebookAccount = async () => {
    if (!user?.id) return;

    setIsLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from("social_accounts")
        .select("*")
        .eq("user_id", user.id)
        .eq("platform", "facebook")
        .single();

      if (error) {
        setError(error.message);
        return;
      }

      setFacebookAccount(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch Facebook account");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFacebookAccount();
  }, [user?.id]);

  return {
    facebookAccount,
    isLoading,
    error,
    refetch: fetchFacebookAccount,
  };
} 