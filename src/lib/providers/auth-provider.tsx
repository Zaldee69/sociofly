// src/lib/providers/auth-provider.tsx
"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/lib/stores/use-auth-store";
import { createClient } from "@/lib/utils/supabase/client";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setUser, setSessionExpiry, clearSession, setLoading } = useAuthStore();
  const supabase = createClient();

  useEffect(() => {

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setUser(session.user);
        setSessionExpiry(session.expires_at ?? null);
      }
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        setUser(session.user);
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