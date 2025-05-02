// import { createClient } from "@/lib/utils/supabase/server";
import { redirect } from "next/navigation";
import { SocialAccountsClient } from "./client";

export default async function SocialAccountsPage() {
  // const supabase = await createClient();

  // const {
  //   data: { user },
  //   error,
  // } = await supabase.auth.getUser();

  // if (error || !user) {
  //   redirect("/login");
  // }

  // Fetch initial accounts data
  const initialAccounts: any[] = [];

  return <SocialAccountsClient initialAccounts={initialAccounts} />;
}
