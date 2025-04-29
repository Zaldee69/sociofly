"use client";

import { useAuthStore } from "@/lib/stores/use-auth-store";
import { Instagram } from "lucide-react";
import Link from "next/link";
import { Button } from "../../ui/button";
import { Badge } from "../../ui/badge";
import { useSocialAccount } from "@/hooks/use-social-account";

export function InstagramConnectButton() {
  const client = useAuthStore();
  const { account, isLoading, error } = useSocialAccount(
    client.user,
    "instagram"
  );

  const instagramAuthUrl = `https://www.facebook.com/v20.0/dialog/oauth?client_id=${process.env.NEXT_PUBLIC_FACEBOOK_CLIENT_ID}&redirect_uri=${process.env.NEXT_PUBLIC_INSTAGRAM_REDIRECT_URI}&state=${client.user?.id}&scope=instagram_basic,instagram_content_publish,pages_show_list,pages_read_engagement,instagram_manage_insights,business_management`;

  return (
    <div className="flex items-center px-4 py-2 rounded-md text-sm text-sidebar-foreground hover:bg-sidebar-accent/50">
      <Instagram className="mr-3 h-5 w-5 text-[#E1306C]" />
      <span>Instagram</span>

      {account ? (
        <Badge className="ml-auto bg-green-100 text-green-800 text-xs">
          Connected
        </Badge>
      ) : (
        <Link className="ml-auto" href={instagramAuthUrl}>
          <Button variant="outline" size="sm" className="h-6 text-xs">
            Connect
          </Button>
        </Link>
      )}
    </div>
  );
}
