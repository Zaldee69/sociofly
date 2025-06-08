import React from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Instagram, Facebook, Twitter, Linkedin, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface SocialAccount {
  id: string;
  name: string;
  username: string;
  platform: "instagram" | "facebook" | "twitter" | "linkedin";
  isConnected: boolean;
}

interface AnalyticsSidebarProps {
  selectedAccount: string | null;
  onSelectAccount: (accountId: string) => void;
  onNavigateToSection: (sectionId: string) => void;
}

const mockAccounts: SocialAccount[] = [
  {
    id: "1",
    name: "Company Instagram",
    username: "company_ig",
    platform: "instagram",
    isConnected: true,
  },
  {
    id: "2",
    name: "Company Facebook",
    username: "company_fb",
    platform: "facebook",
    isConnected: true,
  },
  {
    id: "3",
    name: "Company Twitter",
    username: "company_tw",
    platform: "twitter",
    isConnected: false,
  },
  {
    id: "4",
    name: "Company LinkedIn",
    username: "company_li",
    platform: "linkedin",
    isConnected: true,
  },
];

const navigationLinks = [
  { label: "Overview", targetId: "overview" },
  { label: "Post Performance", targetId: "post-performance" },
  { label: "Audience", targetId: "audience" },
  { label: "Sentiment", targetId: "sentiment" },
  { label: "Optimization", targetId: "optimization" },
  { label: "Competitors", targetId: "competitors" },
  { label: "Custom Reports", targetId: "custom-reports" },
];

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

const AnalyticsSidebar: React.FC<AnalyticsSidebarProps> = ({
  selectedAccount,
  onSelectAccount,
  onNavigateToSection,
}) => {
  const handleSectionClick = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
    onNavigateToSection(sectionId);
  };

  return (
    <div className="w-64 bg-gray-50 border-r h-full flex flex-col sticky top-0">
      <div className="p-4">
        <h3 className="font-semibold text-sm text-gray-900 mb-3">
          Social Media Accounts
        </h3>
        <div className="space-y-2">
          {mockAccounts.map((account) => (
            <Button
              key={account.id}
              variant={selectedAccount === account.id ? "default" : "ghost"}
              size="sm"
              className={cn(
                "w-full justify-start h-auto p-2",
                !account.isConnected && "opacity-50"
              )}
              onClick={() => account.isConnected && onSelectAccount(account.id)}
              disabled={!account.isConnected}
            >
              <div className="flex items-center gap-2 w-full">
                {renderPlatformIcon(account.platform)}
                <div className="flex-1 text-left">
                  <div className="text-xs font-medium">{account.name}</div>
                  <div className="text-xs text-muted-foreground">
                    @{account.username}
                  </div>
                </div>
                {account.isConnected && selectedAccount === account.id && (
                  <Check className="h-3 w-3" />
                )}
              </div>
            </Button>
          ))}
        </div>
      </div>

      <Separator />

      <div className="p-4">
        <h3 className="font-semibold text-sm text-gray-900 mb-3">
          Analytics Navigation
        </h3>
        <ScrollArea className="flex-1">
          <div className="space-y-1">
            {navigationLinks.map((link) => (
              <Button
                key={link.targetId}
                variant="ghost"
                size="sm"
                className="w-full justify-start text-xs"
                onClick={() => handleSectionClick(link.targetId)}
              >
                {link.label}
              </Button>
            ))}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};

export default AnalyticsSidebar;
