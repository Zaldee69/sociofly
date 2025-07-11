import React, { useState, useEffect, useCallback } from "react";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";
import { SocialPlatform, Role, BillingPlan } from "@prisma/client";
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
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
  AlertCircle,
  Crown,
  Zap,
  Shield,
} from "lucide-react";
import { useSearchParams, useRouter } from "next/navigation";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useUser } from "@clerk/nextjs";
import { AccountSelectionDialog } from "@/app/onboarding/components/account-selection-dialog";
import { usePermissions } from "@/lib/hooks";
import { SocialAccountQuotaService } from "@/lib/services/social-account-quota.service";
import { PLAN_DISPLAY_NAMES } from "@/config/constants";
import { useRouter as useNextRouter } from "next/navigation";

interface SocialAccountsTabProps {
  teamId: string;
}

export const SocialAccountsTab = ({ teamId }: SocialAccountsTabProps) => {
  const [isAddAccountOpen, setIsAddAccountOpen] = useState(false);
  const [isAccountSelectionOpen, setIsAccountSelectionOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState<string | undefined>(
    undefined
  );
  const [isRemovingAccount, setIsRemovingAccount] = useState(false);
  const [quotaInfo, setQuotaInfo] = useState<{
    current: number;
    limit: number | string;
    percentage: number;
    isUnlimited: boolean;
    canAdd: boolean;
  } | null>(null);
  const { hasPermission } = usePermissions(teamId);
  const searchParams = useSearchParams();
  const authUser = useUser();
  const sessionId = searchParams?.get("sessionId") ?? "";
  const router = useNextRouter();

  // Function to remove sessionId from URL
  const removeSessionIdFromUrl = useCallback(() => {
    if (sessionId) {
      // Create new URL without sessionId param
      const url = new URL(window.location.href);
      url.searchParams.delete("sessionId");

      // Replace current URL without refresh
      window.history.replaceState({}, "", url.toString());
    }
  }, [sessionId]);

  // Social Account queries and mutations
  const { data: socialAccounts, isLoading: isLoadingSocialAccounts } =
    trpc.team.getSocialAccounts.useQuery({ teamId });

  const { data: team } = trpc.team.getTeamById.useQuery(
    { teamId },
    {
      enabled: !!teamId,
    }
  );

  // Get team subscription data
  const { data: teamSubscription } = trpc.team.getEffectiveSubscription.useQuery(
    { teamId },
    { enabled: !!teamId }
  );

  const { data: availableSocialAccounts } =
    trpc.team.getAvailableSocialAccounts.useQuery(
      { teamId },
      {
        enabled: !!teamId && team?.role === Role.OWNER,
      }
    );

  // Get temporary data from onboarding endpoint
  const { data: temporaryData } = trpc.onboarding.getTemporaryData.useQuery(
    {
      sessionId,
    },
    {
      enabled: !!sessionId,
    }
  );

  // Check if there's an error in temporary data
  useEffect(() => {
    if (temporaryData && typeof temporaryData === "object") {
      if ("error" in temporaryData && "message" in temporaryData) {
        setErrorMessage(temporaryData.message as string);
      } else {
        setErrorMessage(undefined);
      }
    }
  }, [temporaryData]);

  // Update quota info when social accounts or subscription changes
  useEffect(() => {
    const updateQuotaInfo = async () => {
      if (!teamSubscription || !socialAccounts) return;
      
      const plan = teamSubscription.subscriptionPlan || BillingPlan.FREE;
      const currentCount = socialAccounts.length;
      const limit = SocialAccountQuotaService.getSocialAccountLimit(plan);
      const isUnlimited = limit === Infinity;
      const canAdd = currentCount < limit;
      
      setQuotaInfo({
        current: currentCount,
        limit: isUnlimited ? "Unlimited" : limit,
        percentage: isUnlimited ? 0 : Math.min(100, (currentCount / limit) * 100),
        isUnlimited,
        canAdd,
      });
    };
    
    updateQuotaInfo();
  }, [socialAccounts, teamSubscription]);

  const utils = trpc.useUtils();

  // Existing mutations
  const addSocialAccountMutation = trpc.team.addSocialAccount.useMutation({
    onSuccess: () => {
      toast.success("Social account added successfully");
      setIsAddAccountOpen(false);
      utils.team.getSocialAccounts.invalidate({ teamId });
      removeSessionIdFromUrl(); // Remove sessionId from URL on success
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

  // New mutations for temporary data handling
  const deleteTemporaryData = trpc.onboarding.deleteTemporaryData.useMutation({
    onSuccess: () => {
      toast.success("Account connection canceled");
      utils.onboarding.getTemporaryData.invalidate({ sessionId });
      setIsRemovingAccount(false);
      removeSessionIdFromUrl(); // Remove sessionId from URL after cancel
    },
    onError: (error) => {
      toast.error("Failed to cancel connection");
      console.error("Error deleting account:", error);
      setIsRemovingAccount(false);
    },
  });

  const updateTemporaryData = trpc.onboarding.deleteTemporaryData.useMutation({
    onSuccess: () => {
      utils.onboarding.getTemporaryData.invalidate({ sessionId });
    },
    onError: (error) => {
      toast.error("Failed to select account");
      console.error("Error selecting account:", error);
    },
  });

  // Mutation to save selected account
  const saveSelectedAccountMutation = trpc.team.addSocialAccount.useMutation({
    onSuccess: () => {
      toast.success("Social account added successfully");
      setIsAccountSelectionOpen(false);
      setSelectedAccount(null);
      utils.team.getSocialAccounts.invalidate({ teamId });
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to add account");
    },
  });

  // Function to filter data to only selected account
  const filterAccountData = (selectedAccount: any) => {
    if (!sessionId || !selectedAccount) return;

    const filteredData = [selectedAccount];
    updateTemporaryData.mutate({
      sessionId,
      data: JSON.stringify(filteredData),
    });
  };

  // Update selectedAccount when pagesData changes to a single account
  useEffect(() => {
    if (
      Array.isArray(temporaryData) &&
      temporaryData.length === 1 &&
      !selectedAccount
    ) {
      setSelectedAccount(temporaryData[0]);
    }
  }, [temporaryData, selectedAccount]);

  // Save the selected account
  const handleSaveSelectedAccount = useCallback(
    (account: any) => {
      if (!account) return;

      // Check if this account is already being processed
      const processingKey = `processing-${account.profileId || account.id}`;
      if (sessionStorage.getItem(processingKey)) {
        console.log("Already processing this account");
        return;
      }

      // Mark this account as being processed
      sessionStorage.setItem(processingKey, "true");

      saveSelectedAccountMutation.mutate(
        {
          teamId,
          platform: account.platform as SocialPlatform,
          accessToken: account.accessToken || "placeholder-token",
          name: account.name || `${account.platform.toLowerCase()} account`,
          refreshToken: account.refreshToken,
          expiresAt: account.expiresAt
            ? new Date(account.expiresAt)
            : undefined,
          profileId: account.profileId,
          profilePicture: account.profilePicture,
        },
        {
          onSuccess: () => {
            // Clear processing state on success
            sessionStorage.removeItem(processingKey);
            removeSessionIdFromUrl(); // Remove sessionId from URL after success
          },
          onError: () => {
            // Clear processing state on error too
            sessionStorage.removeItem(processingKey);
          },
        }
      );
    },
    [saveSelectedAccountMutation, teamId, removeSessionIdFromUrl]
  );

  // Clean up all processing flags when component unmounts
  useEffect(() => {
    return () => {
      // Remove all sessionStorage items that start with "processing-"
      Object.keys(sessionStorage).forEach((key) => {
        if (key.startsWith("processing-")) {
          sessionStorage.removeItem(key);
        }
      });
    };
  }, []);

  // Handle account selection
  const handleAccountSelect = (account: any) => {
    setSelectedAccount(account);
    setIsAccountSelectionOpen(false);
    filterAccountData(account);

    // Add to sessionStorage to remember we've handled selection for this session
    sessionStorage.setItem(`processed-${sessionId}`, "true");

    // Save the selected account
    handleSaveSelectedAccount(account);
  };

  // Check if temporary data exists and user has permission
  useEffect(() => {
    if (
      sessionId &&
      Array.isArray(temporaryData) &&
      temporaryData.length > 0 &&
      hasPermission("account.manage")
    ) {
      // Keep track of whether account has been processed
      const alreadyProcessed = sessionStorage.getItem(`processed-${sessionId}`);

      if (alreadyProcessed) {
        // Already processed this session, don't do it again
        // But still remove the sessionId from the URL
        removeSessionIdFromUrl();
        return;
      }

      // If multiple accounts, show selection dialog but don't process automatically
      if (temporaryData.length > 1) {
        setIsAccountSelectionOpen(true);
        // Don't mark as processed yet - we'll do that when user makes a selection
      } else if (temporaryData.length === 1) {
        // If single account, handle directly
        handleSaveSelectedAccount(temporaryData[0]);
        // Mark as processed to avoid duplicate processing
        sessionStorage.setItem(`processed-${sessionId}`, "true");
      }
    }
  }, [
    temporaryData,
    sessionId,
    hasPermission,
    handleSaveSelectedAccount,
    removeSessionIdFromUrl,
  ]);

  // Clean up sessionStorage when component unmounts
  useEffect(() => {
    return () => {
      if (sessionId) {
        sessionStorage.removeItem(`processed-${sessionId}`);
      }
    };
  }, [sessionId]);

  // Method to handle OAuth connection for a platform
  const handleSocialConnect = (platform: SocialPlatform) => {
    // Create a state object with all the parameters we want to pass
    const stateData = {
      userId: authUser.user?.id,
      teamId: teamId,
      origin: `/teams/${teamId}`, // For redirect back to teams page
    };

    // Encode the state data using encodeURIComponent
    const encodedState = encodeURIComponent(JSON.stringify(stateData));

    if (platform === SocialPlatform.FACEBOOK) {
      window.location.href = `https://www.facebook.com/v22.0/dialog/oauth?client_id=${
        process.env.NEXT_PUBLIC_FACEBOOK_CLIENT_ID
      }&state=${encodedState}&redirect_uri=${encodeURIComponent(
        `${window.location.origin}/api/auth/callback/facebook`
      )}&scope=email,business_management,pages_show_list,pages_read_engagement,read_insights,pages_read_user_content,pages_manage_posts,pages_manage_cta,pages_manage_engagement,pages_manage_metadata`;
    } else if (platform === SocialPlatform.INSTAGRAM) {
      window.location.href = `https://www.facebook.com/v22.0/dialog/oauth?client_id=${
        process.env.NEXT_PUBLIC_FACEBOOK_CLIENT_ID
      }&state=${encodedState}&redirect_uri=${encodeURIComponent(
        `${window.location.origin}/api/auth/callback/instagram`
      )}&scope=instagram_basic,instagram_content_publish,pages_show_list,pages_read_engagement,instagram_manage_insights,business_management`;
    }
  };

  // Handlers for social accounts
  const handleAddSocialAccount = (platform: SocialPlatform) => {
    // Check quota before adding
    if (quotaInfo && !quotaInfo.canAdd) {
      const plan = teamSubscription?.subscriptionPlan || BillingPlan.FREE;
      const planName = PLAN_DISPLAY_NAMES[plan as keyof typeof PLAN_DISPLAY_NAMES];
      
      toast.error(
        `You've reached the limit of ${quotaInfo.limit} social accounts for the ${planName} plan. Upgrade to connect more accounts.`,
        {
          action: {
            label: "Upgrade Plan",
            onClick: () => router.push("/billing"),
          },
        }
      );
      setIsAddAccountOpen(false);
      return;
    }

    // For FACEBOOK and INSTAGRAM, use OAuth flow
    if (
      platform === SocialPlatform.FACEBOOK ||
      platform === SocialPlatform.INSTAGRAM
    ) {
      handleSocialConnect(platform);
      setIsAddAccountOpen(false);
      return;
    }

    // For other platforms, use placeholder (will be updated later)
    addSocialAccountMutation.mutate({
      teamId,
      platform,
      accessToken: "placeholder-token", // Will be replaced with OAuth
      name: `${platform.toLowerCase()} account`,
      profileId: `manual-${platform.toLowerCase()}-${Date.now()}`, // Add unique profileId for manual accounts
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
    INSTAGRAM: <Instagram className="h-5 w-5 text-blue" />,
    FACEBOOK: <Facebook className="h-5 w-5 text-blue" />,
    TWITTER: <Twitter className="h-5 w-5 text-blue" />,
    LINKEDIN: <Linkedin className="h-5 w-5 text-blue" />,
    YOUTUBE: <Youtube className="h-5 w-5 text-blue" />,
    TIKTOK: <ExternalLink className="h-5 w-5 text-white" />, // Fallback icon for TikTok
  };

  const renderPlatformIcon = (platform: SocialPlatform) => {
    return platformIcons[platform] || null;
  };

  // Get plan icon and color
  const getPlanIcon = (plan: BillingPlan) => {
    switch (plan) {
      case BillingPlan.FREE:
        return <Crown className="h-4 w-4" />;
      case BillingPlan.PRO:
        return <Zap className="h-4 w-4" />;
      case BillingPlan.ENTERPRISE:
        return <Shield className="h-4 w-4" />;
      default:
        return <Crown className="h-4 w-4" />;
    }
  };

  const getPlanColor = (plan: BillingPlan) => {
    switch (plan) {
      case BillingPlan.FREE:
        return "secondary";
      case BillingPlan.PRO:
        return "default";
      case BillingPlan.ENTERPRISE:
        return "destructive";
      default:
        return "secondary";
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Social Accounts
            </CardTitle>
            <CardDescription>
              Manage connected social media accounts
            </CardDescription>
          </div>
          {teamSubscription && quotaInfo && (
            <div className="text-right space-y-2">
              <Badge 
                variant={getPlanColor(teamSubscription.subscriptionPlan || BillingPlan.FREE)}
                className="flex items-center gap-1"
              >
                {getPlanIcon(teamSubscription.subscriptionPlan || BillingPlan.FREE)}
                {PLAN_DISPLAY_NAMES[teamSubscription.subscriptionPlan as keyof typeof PLAN_DISPLAY_NAMES] || "Basic"}
              </Badge>
              <div className="text-sm text-muted-foreground">
                {quotaInfo.current} / {quotaInfo.limit} accounts
              </div>
              {!quotaInfo.isUnlimited && (
                <Progress 
                  value={quotaInfo.percentage} 
                  className="w-24 h-2"
                />
              )}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {errorMessage && (
          <Alert variant="destructive" className="mb-4">
            <AlertTitle className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Failed to connect
            </AlertTitle>
            <AlertDescription className="text-sm">
              {errorMessage}
            </AlertDescription>
          </Alert>
        )}

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

                {hasPermission("account.manage") && (
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

        {hasPermission("account.manage") && (
          <div className="mt-6">
            {quotaInfo && !quotaInfo.canAdd && (
              <Alert className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Account Limit Reached</AlertTitle>
                <AlertDescription className="flex items-center justify-between">
                  <span>
                    You've reached the limit of {quotaInfo.limit} social accounts for your current plan.
                  </span>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => router.push("/billing")}
                    className="ml-2"
                  >
                    Upgrade Plan
                  </Button>
                </AlertDescription>
              </Alert>
            )}
            <Dialog open={isAddAccountOpen} onOpenChange={setIsAddAccountOpen}>
              <DialogTrigger asChild>
                <Button disabled={quotaInfo?.canAdd === false}>
                  <Plus className="h-4 w-4 mr-2" />
                  {quotaInfo?.canAdd === false ? "Limit Reached" : "Connect Account"}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Connect Social Account</DialogTitle>
                  <DialogDescription>
                    Choose a platform to connect a new social media account
                  </DialogDescription>
                  {quotaInfo && teamSubscription && (
                    <div className="flex items-center justify-between p-3 bg-muted rounded-lg mt-4">
                      <div className="flex items-center gap-2">
                        <Badge variant={getPlanColor(teamSubscription.subscriptionPlan || BillingPlan.FREE)}>
                          {getPlanIcon(teamSubscription.subscriptionPlan || BillingPlan.FREE)}
                          {PLAN_DISPLAY_NAMES[teamSubscription.subscriptionPlan as keyof typeof PLAN_DISPLAY_NAMES] || "Basic"}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {quotaInfo.current} / {quotaInfo.limit} accounts used
                        </span>
                      </div>
                      {!quotaInfo.isUnlimited && (
                        <Progress value={quotaInfo.percentage} className="w-20 h-2" />
                      )}
                    </div>
                  )}
                </DialogHeader>
                <div className="space-y-4">
                  {availableSocialAccounts?.map((platform) => (
                    <Button
                      key={platform}
                      variant="outline"
                      className="w-full justify-start"
                      disabled={
                        platform === SocialPlatform.TIKTOK ||
                        platform === SocialPlatform.YOUTUBE ||
                        platform === SocialPlatform.LINKEDIN ||
                        platform === SocialPlatform.TWITTER
                      }
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

        {/* Account selection dialog */}
        <AccountSelectionDialog
          isOpen={isAccountSelectionOpen}
          onClose={() => setIsAccountSelectionOpen(false)}
          accounts={temporaryData || []}
          onSelectAccount={handleAccountSelect}
        />
      </CardContent>
    </Card>
  );
};
