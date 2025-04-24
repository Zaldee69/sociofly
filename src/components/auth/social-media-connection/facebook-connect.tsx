"use client";

import { useAuthStore } from "@/lib/stores/use-auth-store";
import { Facebook, Loader2 } from "lucide-react";
import Link from "next/link";
import { Button } from "../../ui/button";
import { Badge } from "../../ui/badge";
import { useSocialAccount } from "@/lib/hooks/use-social-account";

export function FacebookConnectButton() {
  const client = useAuthStore();
  const { account, isLoading, error } = useSocialAccount(
    client.user,
    "facebook"
  );

  return (
    <div className="flex items-center px-4 py-2 rounded-md text-sm text-sidebar-foreground hover:bg-sidebar-accent/50">
      <Facebook className="mr-3 h-5 w-5 text-[#4267B2]" />
      <span>Facebook</span>

      {account ? (
        <Badge className="ml-auto bg-green-100 text-green-800 text-xs">
          Connected
        </Badge>
      ) : (
        <Link
          className="ml-auto"
          href={`https://www.facebook.com/v18.0/dialog/oauth?client_id=${process.env.NEXT_PUBLIC_FACEBOOK_CLIENT_ID}&redirect_uri=${process.env.NEXT_PUBLIC_FACEBOOK_REDIRECT_URI}&state=${client.user?.id}&scope=pages_manage_posts,pages_read_engagement`}
        >
          <Button variant="outline" size="sm" className="h-6 text-xs">
            Connect
          </Button>
        </Link>
      )}
    </div>
  );
}
