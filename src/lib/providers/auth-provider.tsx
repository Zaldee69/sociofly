// src/lib/providers/auth-provider.tsx
"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/lib/stores/use-auth-store";
import { createClient } from "@/lib/utils/supabase/client";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setUser, setSessionExpiry, clearSession, setLoading } =
    useAuthStore();
  const supabase = createClient();

  useEffect(() => {
    // Initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setUser(session.user).then(() => {
          setSessionExpiry(session.expires_at ?? null);
          setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session) {
        await setUser(session.user);
        setSessionExpiry(session.expires_at ?? null);
      } else {
        clearSession();
      }
      setLoading(false);
    });

    // Check session expiry periodically
    const checkInterval = setInterval(() => {
      const expiry = useAuthStore.getState().sessionExpiry;
      if (expiry && Date.now() / 1000 >= expiry) {
        clearSession();
        window.location.href = "/login";
      }
    }, 60000); // Check every minute

    return () => {
      subscription.unsubscribe();
      clearInterval(checkInterval);
    };
  }, [setUser, setSessionExpiry, clearSession, setLoading]);

  return <>{children}</>;
}
