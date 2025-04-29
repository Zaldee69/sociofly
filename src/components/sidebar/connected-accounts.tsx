"use client";

import { cn } from "@/lib/utils";
import { FacebookConnectButton } from "../auth/social-media-connection/facebook-connect";
import { InstagramConnectButton } from "../auth/social-media-connection/instagram-connect";
import { LinkedInConnectButton } from "../auth/social-media-connection/linkedin-connect";

interface ConnectedAccountsProps {
  collapsed: boolean;
}

export const ConnectedAccounts = ({ collapsed }: ConnectedAccountsProps) => {
  if (collapsed) return null;

  return (
    <>
      <div className="mt-6 mb-2 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        Connected Accounts
      </div>
      <ul className="space-y-1">
        <li>
          <LinkedInConnectButton />
        </li>
        <li>
          <InstagramConnectButton />
        </li>
        <li>
          <FacebookConnectButton />
        </li>
      </ul>
    </>
  );
};
