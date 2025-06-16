import React, { JSX } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Instagram,
  Facebook,
  Twitter,
  Linkedin,
  Check,
  Loader2,
} from "lucide-react"; // Added Loader2
import { cn } from "@/lib/utils";
import { SocialPlatform } from "@prisma/client";

// Use the SocialPlatform enum from your schema for consistency if possible
// import { SocialPlatform } from "@prisma/client"; // Assuming you can import enums

// Define the interface for SocialAccount - updated to include platform type string for now
interface SocialAccount {
  id: string;
  name: string | null;
  platform: SocialPlatform;
  profilePicture: string | null;
}

interface AnalyticsSidebarProps {
  socialAccounts: SocialAccount[]; // Added prop for social accounts
  isLoading: boolean; // Added prop for loading state
  selectedAccount: string | null;
  onSelectAccount: (accountId: string) => void;
  activeSection: string | null; // Added prop for active navigation section
  onNavigateToSection: (sectionId: string) => void;
}

// Removed mockAccounts

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
  // Use a map for cleaner mapping of platform strings to icons
  const platformIcons: { [key: string]: JSX.Element } = {
    instagram: <Instagram className="h-4 w-4 text-[#E1306C]" />,
    facebook: <Facebook className="h-4 w-4 text-[#4267B2]" />,
    twitter: <Twitter className="h-4 w-4 text-[#1DA1F2]" />,
    linkedin: <Linkedin className="h-4 w-4 text-[#0077B5]" />,
    // Add more platforms if needed
  };
  // Return the specific icon or a default one if not found
  return (
    platformIcons[platform.toLowerCase()] || <Instagram className="h-4 w-4" />
  ); // Default icon
};

const AnalyticsSidebar: React.FC<AnalyticsSidebarProps> = ({
  socialAccounts, // Destructure new prop
  isLoading, // Destructure new prop
  selectedAccount,
  onSelectAccount,
  activeSection, // Destructure new prop
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
    <div className="w-46 border-r sticky top-16 h-[calc(100vh-4rem)] flex flex-col bg-background p-4">
      <div className="pb-4">
        <h3 className="font-semibold text-sm text-gray-900 mb-3">
          Social Media Accounts
        </h3>
        <div className="space-y-2 flex flex-col pr-2">
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
                className={cn("w-full justify-start h-auto p-2")}
                onClick={() => onSelectAccount(account.id)}
              >
                <div className="flex items-center gap-2 w-full">
                  {renderPlatformIcon(account.platform)}
                  <div className="flex-1 text-left">
                    <div className="text-xs font-medium">{account.name}</div>
                    <div className="text-xs text-muted-foreground">
                      @{account.name}
                    </div>
                  </div>
                </div>
              </Button>
            ))
          )}
        </div>
      </div>

      <Separator />

      <div className="py-4 flex-1 flex flex-col pr-2">
        {" "}
        {/* Added flex-1 and flex-col */}
        <h3 className="font-semibold text-sm text-gray-900 mb-3">
          Analytics Navigation
        </h3>
        {/* ScrollArea should take remaining space */}
        <ScrollArea className="flex-1 pb-4">
          {" "}
          {/* Added pb-4 for padding below content */}
          <div className="space-y-1">
            {navigationLinks.map((link) => (
              <Button
                key={link.targetId}
                variant={activeSection === link.targetId ? "default" : "ghost"} // Style active link
                size="sm"
                className={cn(
                  "w-full justify-start text-xs",
                  activeSection === link.targetId && "font-semibold" // Example active style
                )}
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
