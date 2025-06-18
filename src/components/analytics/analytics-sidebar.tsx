import React, { JSX } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Instagram,
  Facebook,
  Twitter,
  Linkedin,
  Check,
  Loader2,
  BarChart3,
  Users,
  MessageSquare,
  TrendingUp,
  Target,
  Hash,
  Link,
  PlayCircle,
  PieChart,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SocialPlatform } from "@prisma/client";

// Define the interface for SocialAccount
interface SocialAccount {
  id: string;
  name: string | null;
  platform: SocialPlatform;
  profilePicture: string | null;
}

interface AnalyticsSidebarProps {
  socialAccounts: SocialAccount[];
  isLoading: boolean;
  selectedAccount: string | null;
  onSelectAccount: (accountId: string) => void;
  activeSection: string | null;
  onNavigateToSection: (sectionId: string) => void;
  disableTransition?: boolean;
}

// Updated navigation links with new sections and icons
const navigationLinks = [
  {
    label: "Overview",
    targetId: "overview",
    icon: <BarChart3 className="h-4 w-4" />,
    description: "General metrics",
  },
  {
    label: "Comparison",
    targetId: "comparison",
    icon: <TrendingUp className="h-4 w-4" />,
    description: "Growth & trends",
  },
  {
    label: "Posts",
    targetId: "posts",
    icon: <PieChart className="h-4 w-4" />,
    description: "Post performance",
  },
  {
    label: "Stories",
    targetId: "stories",
    icon: <PlayCircle className="h-4 w-4" />,
    description: "Stories analytics",
    platforms: ["INSTAGRAM"], // Only show for Instagram
  },
  {
    label: "Audience",
    targetId: "audience",
    icon: <Users className="h-4 w-4" />,
    description: "Demographics & insights",
  },
  {
    label: "Hashtags",
    targetId: "hashtags",
    icon: <Hash className="h-4 w-4" />,
    description: "Hashtag performance",
    platforms: ["INSTAGRAM"], // Only show for Instagram
  },
  {
    label: "Links",
    targetId: "links",
    icon: <Link className="h-4 w-4" />,
    description: "Link & CTA tracking",
  },
  {
    label: "Sentiment",
    targetId: "sentiment",
    icon: <MessageSquare className="h-4 w-4" />,
    description: "Brand perception",
  },
  {
    label: "Optimization",
    targetId: "optimization",
    icon: <Target className="h-4 w-4" />,
    description: "Best posting times",
  },
  {
    label: "Competitors",
    targetId: "competitors",
    icon: <TrendingUp className="h-4 w-4" />,
    description: "Competitor analysis",
  },
  {
    label: "Reports",
    targetId: "custom-reports",
    icon: <BarChart3 className="h-4 w-4" />,
    description: "Custom reports",
  },
];

const renderPlatformIcon = (platform: string) => {
  const platformIcons: { [key: string]: JSX.Element } = {
    instagram: <Instagram className="h-4 w-4 text-[#E1306C]" />,
    facebook: <Facebook className="h-4 w-4 text-[#4267B2]" />,
    twitter: <Twitter className="h-4 w-4 text-[#1DA1F2]" />,
    linkedin: <Linkedin className="h-4 w-4 text-[#0077B5]" />,
  };
  return (
    platformIcons[platform.toLowerCase()] || <Instagram className="h-4 w-4" />
  );
};

const AnalyticsSidebar: React.FC<AnalyticsSidebarProps> = ({
  socialAccounts,
  isLoading,
  selectedAccount,
  onSelectAccount,
  activeSection,
  onNavigateToSection,
  disableTransition = false,
}) => {
  const handleSectionClick = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
    onNavigateToSection(sectionId);
  };

  // Get selected account platform for filtering navigation
  const selectedAccountData = socialAccounts?.find(
    (acc) => acc.id === selectedAccount
  );
  const selectedPlatform = selectedAccountData?.platform;

  return (
    <div
      className="w-64 border-r sticky flex flex-col bg-background transition-all duration-300 overflow-hidden"
      style={{
        top: "var(--sidebar-top, calc(64px + 80px))",
        maxHeight: "var(--sidebar-height, calc(100vh - 144px))",
        minHeight: "400px",
      }}
    >
      {/* Social Accounts Section */}
      <div className="p-4 pb-3 flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm text-gray-900">
            Social Accounts
          </h3>
          {selectedAccount && (
            <Badge variant="secondary" className="text-xs">
              {socialAccounts
                ?.find((acc) => acc.id === selectedAccount)
                ?.platform.toLowerCase()}
            </Badge>
          )}
        </div>
        <div className="space-y-2">
          {isLoading || !socialAccounts ? (
            <div className="flex items-center justify-center py-4 text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading accounts...
            </div>
          ) : socialAccounts.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-4">
              No social accounts found.
            </div>
          ) : (
            socialAccounts.map((account) => (
              <Button
                key={account.id}
                variant={selectedAccount === account.id ? "default" : "ghost"}
                size="sm"
                className={cn(
                  "w-full justify-start h-auto p-3",
                  selectedAccount === account.id &&
                    "bg-primary text-primary-foreground",
                  selectedAccount !== account.id && "hover:bg-transparent"
                )}
                onClick={() => onSelectAccount(account.id)}
              >
                <div className="flex items-center gap-3 w-full">
                  {renderPlatformIcon(account.platform)}
                  <div className="flex-1 text-left min-w-0">
                    <div className="text-sm font-medium truncate">
                      {account.name || "Unnamed Account"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {account.platform.toLowerCase()}
                    </div>
                  </div>
                  {selectedAccount === account.id && (
                    <Check className="h-4 w-4 flex-shrink-0" />
                  )}
                </div>
              </Button>
            ))
          )}
        </div>
      </div>

      <Separator />

      {/* Analytics Navigation Section */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="p-4 pb-2 flex-shrink-0">
          <h3 className="font-semibold text-sm text-gray-900 mb-3">
            Analytics Sections
          </h3>
        </div>

        <ScrollArea
          className="flex-1 px-4 overflow-y-auto"
          style={{ maxHeight: "calc(100% - 60px)" }}
        >
          <div className="space-y-1 pb-6">
            {/* Always show navigation links, but disable when no account selected */}
            {navigationLinks.map((link) => {
              // Show all links when no account selected, or filter by platform when account selected
              const shouldShow =
                !selectedAccount ||
                !link.platforms ||
                (selectedPlatform && link.platforms.includes(selectedPlatform));

              if (!shouldShow) return null;

              const isDisabled = !selectedAccount;

              return (
                <Button
                  key={link.targetId}
                  variant={
                    activeSection === link.targetId && !isDisabled
                      ? "default"
                      : "ghost"
                  }
                  size="sm"
                  disabled={isDisabled}
                  className={cn(
                    "w-full justify-start text-left h-auto p-3",
                    !disableTransition &&
                      "transition-all duration-300 ease-in-out",
                    !isDisabled &&
                      activeSection === link.targetId &&
                      "bg-primary text-primary-foreground font-medium shadow-md",
                    !isDisabled &&
                      activeSection === link.targetId &&
                      !disableTransition &&
                      "transform scale-[1.02]",
                    !isDisabled &&
                      activeSection !== link.targetId &&
                      "hover:bg-accent hover:text-accent-foreground",
                    !isDisabled &&
                      activeSection !== link.targetId &&
                      !disableTransition &&
                      "hover:scale-[1.01] hover:shadow-sm",
                    isDisabled &&
                      "opacity-50 cursor-not-allowed hover:bg-transparent"
                  )}
                  onClick={() =>
                    !isDisabled && handleSectionClick(link.targetId)
                  }
                >
                  <div className="flex items-center gap-3 w-full">
                    <div
                      className={cn(
                        "flex-shrink-0",
                        !disableTransition &&
                          !isDisabled &&
                          "transition-transform duration-200 ease-in-out",
                        !isDisabled &&
                          activeSection === link.targetId &&
                          !disableTransition &&
                          "scale-110"
                      )}
                    >
                      {link.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div
                        className={cn(
                          "text-sm",
                          !disableTransition &&
                            !isDisabled &&
                            "transition-all duration-200 ease-in-out",
                          !isDisabled && activeSection === link.targetId
                            ? "font-semibold"
                            : "font-medium"
                        )}
                      >
                        {link.label}
                      </div>
                      <div
                        className={cn(
                          "text-xs truncate",
                          !disableTransition &&
                            !isDisabled &&
                            "transition-colors duration-200 ease-in-out",
                          !isDisabled && activeSection === link.targetId
                            ? "text-primary-foreground/80"
                            : "text-muted-foreground"
                        )}
                      >
                        {link.description}
                      </div>
                    </div>
                    {!isDisabled && activeSection === link.targetId && (
                      <div
                        className={cn(
                          "flex-shrink-0",
                          !disableTransition &&
                            "animate-in slide-in-from-right-2 duration-200"
                        )}
                      >
                        <div className="w-2 h-2 bg-primary-foreground rounded-full"></div>
                      </div>
                    )}
                  </div>
                </Button>
              );
            })}

            {/* Helper text when no account selected */}
            {!selectedAccount && (
              <div className="mt-6 p-3 bg-muted/30 rounded-lg">
                <div className="text-center text-xs text-muted-foreground">
                  <Users className="h-4 w-4 mx-auto mb-1 opacity-60" />
                  Select an account above to enable analytics sections
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Footer with platform info */}
      {selectedAccountData && (
        <>
          <Separator />
          <div className="p-4 pt-3 flex-shrink-0">
            <div className="text-xs text-muted-foreground text-center">
              {selectedAccountData.platform === "INSTAGRAM" && (
                <span>Instagram-specific features enabled</span>
              )}
              {selectedAccountData.platform === "FACEBOOK" && (
                <span>Facebook analytics ready</span>
              )}
              {!["INSTAGRAM", "FACEBOOK"].includes(
                selectedAccountData.platform
              ) && <span>Basic analytics available</span>}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AnalyticsSidebar;
