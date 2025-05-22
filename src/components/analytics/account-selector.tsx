"use client";
import React from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Instagram, Facebook, Twitter, Linkedin } from "lucide-react";

export type SocialAccount = {
  id: string;
  name: string;
  username: string;
  platform: "instagram" | "facebook" | "twitter" | "linkedin";
  profileImage?: string;
};

interface AccountSelectorProps {
  accounts: SocialAccount[];
  selectedAccount: string | null;
  onSelectAccount: (accountId: string) => void;
}

const AccountSelector: React.FC<AccountSelectorProps> = ({
  accounts = [],
  selectedAccount,
  onSelectAccount,
}) => {
  const [open, setOpen] = React.useState(false);
  // Ensure accounts is always an array, even if it's undefined or null
  const safeAccounts = React.useMemo(() => accounts || [], [accounts]);

  const renderPlatformIcon = (platform: string) => {
    switch (platform) {
      case "instagram":
        return <Instagram className="h-4 w-4 text-[#E1306C]" />;
      case "facebook":
        return <Facebook className="h-4 w-4 text-[#4267B2]" />;
      case "twitter":
        return <Twitter className="h-4 w-4 text-[#1DA1F2]" />;
      case "linkedin":
        return <Linkedin className="h-4 w-4 text-[#0077B5]" />;
      default:
        return <Instagram className="h-4 w-4" />;
    }
  };

  const selectedAccountData =
    safeAccounts.length > 0
      ? safeAccounts.find((account) => account.id === selectedAccount)
      : null;

  // Render a simple message when there are no accounts
  if (safeAccounts.length === 0) {
    return (
      <div className="w-[280px]">
        <Button variant="outline" className="w-full justify-between" disabled>
          No accounts available
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </div>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="justify-between w-[280px]"
        >
          {selectedAccount && selectedAccountData ? (
            <div className="flex items-center gap-2">
              {renderPlatformIcon(selectedAccountData.platform)}
              <span>{selectedAccountData.name}</span>
              <span className="text-muted-foreground text-xs">
                @{selectedAccountData.username}
              </span>
            </div>
          ) : (
            "Select an account"
          )}
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0">
        <Command>
          <CommandInput placeholder="Search accounts..." />
          <CommandEmpty>No account found.</CommandEmpty>
          <CommandGroup>
            {safeAccounts.map((account) => (
              <CommandItem
                key={account.id}
                value={account.id}
                onSelect={() => {
                  onSelectAccount(account.id);
                  setOpen(false);
                }}
              >
                <div className="flex items-center gap-2">
                  {renderPlatformIcon(account.platform)}
                  <span>{account.name}</span>
                  <span className="text-muted-foreground text-xs">
                    @{account.username}
                  </span>
                </div>
                <Check
                  className={cn(
                    "ml-auto h-4 w-4",
                    selectedAccount === account.id ? "opacity-100" : "opacity-0"
                  )}
                />
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export default AccountSelector;
