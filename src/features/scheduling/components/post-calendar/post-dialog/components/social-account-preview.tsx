import { Facebook, Twitter } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { FacebookIcon } from "@/components/icons/social-media-icons";
import { InstagramIcon } from "@/components/icons/social-media-icons";
import { cn } from "@/lib/utils";
import type { SocialAccount } from "../types";

interface SocialAccountPreviewProps {
  accounts: string[];
  allAccounts?: SocialAccount[];
  currentPreviewAccount?: SocialAccount;
  onSelectPreviewAccount: (account: SocialAccount) => void;
}

export function SocialAccountPreview({
  accounts,
  allAccounts = [],
  currentPreviewAccount,
  onSelectPreviewAccount,
}: SocialAccountPreviewProps) {
  if (!accounts || accounts.length === 0) return null;

  return (
    <div className="w-full p-4 sticky top-0 z-10 bg-[#f7fafc]">
      {accounts.map((accountId) => {
        if (!accountId) return null;

        // Find account by ID
        const account = allAccounts.find(
          (acc: SocialAccount) => acc.id === accountId
        );

        if (!account) {
          return null;
        }

        // Determine icon based on platform
        const platform = account.platform.toUpperCase();

        return (
          <TooltipProvider key={account.id}>
            <Tooltip>
              <TooltipTrigger
                type="button"
                onClick={() => {
                  onSelectPreviewAccount(account);
                }}
                className={buttonVariants({
                  variant: "outline",
                  className: cn(
                    "!rounded-full !p-2.5 flex-1 mr-1",
                    currentPreviewAccount?.id === account.id
                      ? "bg-black hover:bg-black/80"
                      : "bg-gray-200 hover:bg-gray-300"
                  ),
                })}
              >
                {platform === "FACEBOOK" ? (
                  <FacebookIcon className="fill-white" />
                ) : platform === "INSTAGRAM" ? (
                  <InstagramIcon className="w-5 h-5 text-white" />
                ) : platform === "TWITTER" ? (
                  <Twitter />
                ) : null}
              </TooltipTrigger>
              <TooltipContent>
                <p>{account.name}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      })}
    </div>
  );
}
