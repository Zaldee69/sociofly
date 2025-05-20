import React, { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";
import { SocialPlatform, Role } from "@prisma/client";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users,
  X,
  Plus,
  Facebook,
  Instagram,
  Twitter,
  Linkedin,
  Youtube,
  ExternalLink,
} from "lucide-react";
import { usePermissions } from "@/hooks/use-permissions";

interface SocialAccountsTabProps {
  teamId: string;
}

export const SocialAccountsTab = ({ teamId }: SocialAccountsTabProps) => {
  const [isAddAccountOpen, setIsAddAccountOpen] = useState(false);
  const { hasPermission } = usePermissions(teamId);

  // Social Account queries and mutations
  const { data: socialAccounts, isLoading: isLoadingSocialAccounts } =
    trpc.team.getSocialAccounts.useQuery({ teamId });

  const { data: team } = trpc.team.getTeamById.useQuery(
    { teamId },
    {
      enabled: !!teamId,
    }
  );

  const { data: availableSocialAccounts } =
    trpc.team.getAvailableSocialAccounts.useQuery(
      { teamId },
      {
        enabled: !!teamId && team?.role === Role.OWNER,
      }
    );

  const utils = trpc.useUtils();

  const addSocialAccountMutation = trpc.team.addSocialAccount.useMutation({
    onSuccess: () => {
      toast.success("Social account added successfully");
      setIsAddAccountOpen(false);
      utils.team.getSocialAccounts.invalidate({ teamId });
    },
    onError: (error: any) => {
      toast.error(error.message);
    },
  });

  const removeSocialAccountMutation = trpc.team.removeSocialAccount.useMutation(
    {
      onSuccess: () => {
        toast.success("Social account removed successfully");
        utils.team.getSocialAccounts.invalidate({ teamId });
      },
      onError: (error: any) => {
        toast.error(error.message);
      },
    }
  );

  // Handlers for social accounts
  const handleAddSocialAccount = (platform: SocialPlatform) => {
    addSocialAccountMutation.mutate({
      teamId,
      platform,
      accessToken: "placeholder-token", // Will be replaced with OAuth
      name: `${platform.toLowerCase()} account`,
    });
  };

  const handleRemoveSocialAccount = (accountId: string) => {
    removeSocialAccountMutation.mutate({
      teamId,
      accountId,
    });
  };

  // Platform icon mapping
  const platformIcons: Record<SocialPlatform, React.ReactNode> = {
    INSTAGRAM: <Instagram className="h-5 w-5 text-white" />,
    FACEBOOK: <Facebook className="h-5 w-5 text-white" />,
    TWITTER: <Twitter className="h-5 w-5 text-white" />,
    LINKEDIN: <Linkedin className="h-5 w-5 text-white" />,
    YOUTUBE: <Youtube className="h-5 w-5 text-white" />,
    TIKTOK: <ExternalLink className="h-5 w-5 text-white" />, // Fallback icon for TikTok
  };

  const renderPlatformIcon = (platform: SocialPlatform) => {
    return platformIcons[platform] || null;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Social Accounts
        </CardTitle>
        <CardDescription>
          Manage connected social media accounts
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoadingSocialAccounts ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center space-x-4">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-[200px]" />
                  <Skeleton className="h-4 w-[150px]" />
                </div>
              </div>
            ))}
          </div>
        ) : socialAccounts && socialAccounts.length > 0 ? (
          <div className="space-y-4">
            {socialAccounts.map((account) => (
              <div
                key={account.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex items-center gap-4">
                  {account.profilePicture ? (
                    <img
                      src={account.profilePicture}
                      className="h-10 w-10 rounded-full"
                      alt={account.name || "Social account"}
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      {renderPlatformIcon(account.platform)}
                    </div>
                  )}
                  <div>
                    <h3 className="font-medium">{account.name}</h3>
                    <p className="text-sm text-muted-foreground capitalize">
                      {account.platform.toLowerCase()}
                    </p>
                  </div>
                </div>

                {hasPermission("social.connect") && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRemoveSocialAccount(account.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <X className="h-4 w-4" />
                      Remove
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            No social accounts connected
          </div>
        )}

        {hasPermission("social.connect") && (
          <div className="mt-6">
            <Dialog open={isAddAccountOpen} onOpenChange={setIsAddAccountOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Connect Account
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Connect Social Account</DialogTitle>
                  <DialogDescription>
                    Choose a platform to connect a new social media account
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  {availableSocialAccounts?.map((platform) => (
                    <Button
                      key={platform}
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => {
                        handleAddSocialAccount(platform);
                      }}
                    >
                      {renderPlatformIcon(platform)}
                      <span className="ml-2 capitalize">
                        {platform.toLowerCase()}
                      </span>
                    </Button>
                  ))}
                </div>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
