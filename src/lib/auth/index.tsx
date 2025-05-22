import { useRouter } from "next/navigation";
import { useCallback } from "react";

export function useSignOut() {
  const router = useRouter();

  const signOut = useCallback(async () => {
    // Removed: const supabase = createClient();
    try {
      // Removed: await supabase.auth.signOut();
      router.replace("/login");
      router.refresh();
    } catch (error) {
      console.error("Error signing out:", error);
    }
  }, [router]);

  return signOut;
}
