import { createClient } from "@/lib/utils/supabase/server";
import { redirect } from "next/navigation";
import { SocialAccountsClient } from "./client";

export default async function SocialAccountsPage() {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/login");
  }

  // Fetch initial accounts data
  const { data: accounts } = await supabase
    .from("social_accounts")
    .select("*")
    .eq("user_id", user.id);

  return <SocialAccountsClient initialAccounts={accounts || []} />;
}
