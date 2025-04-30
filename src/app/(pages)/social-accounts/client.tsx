"use client";

import React, { useState, ReactElement } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Facebook,
  Instagram,
  Linkedin,
  Plus,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { SocialPlatform, useSocialAccount } from "@/hooks/use-social-account";
import { useRoleGuard } from "@/hooks/use-role-guard";
import { UserRole } from "@/lib/types/auth";
import { useAuthStore } from "@/lib/stores/use-auth-store";

interface SocialAccountWithStats {
  id: string;
  user_id: string;
  platform: SocialPlatform;
  username: string;
  name?: string;
  profile_picture_url?: string;
}

type SocialPlatformIcon = Exclude<SocialPlatform, "all">;

const platformIcons: Record<SocialPlatformIcon, ReactElement> = {
  facebook: <Facebook className="h-4 w-4 text-[#1877F2]" />,
  instagram: <Instagram className="h-4 w-4 text-[#E4405F]" />,
  linkedin: <Linkedin className="h-4 w-4 text-[#0A66C2]" />,
};

interface SocialAccountsClientProps {
  initialAccounts: SocialAccountWithStats[];
}

export function SocialAccountsClient({
  initialAccounts,
}: SocialAccountsClientProps) {
  const { isAuthorized, isLoading } = useRoleGuard({
    requiredRole: [UserRole.ADMIN],
    requiredPermissions: [],
    redirectTo: "/dashboard",
  });

  const client = useAuthStore();

  const [activeTab, setActiveTab] = useState<SocialPlatform>("all");
  const [isAddAccountOpen, setIsAddAccountOpen] = useState(false);
  const [newAccount, setNewAccount] = useState({
    platform: "facebook" as SocialPlatform,
    name: "",
    username: "",
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthorized) {
    return null;
  }

  const filteredAccounts =
    activeTab === "all"
      ? initialAccounts
      : initialAccounts.filter((account) => account.platform === activeTab);

  const handleAddAccount = () => {
    switch (newAccount.platform) {
      case "facebook":
        window.open(
          `https://www.facebook.com/v20.0/dialog/oauth?client_id=${process.env.NEXT_PUBLIC_FACEBOOK_CLIENT_ID}&redirect_uri=${process.env.NEXT_PUBLIC_FACEBOOK_REDIRECT_URI}&state=${client.user?.id}&scope=pages_manage_posts,pages_read_engagement,instagram_basic,pages_show_list,pages_read_engagement,business_management`
        );
        break;
      case "instagram":
        window.open(
          `https://www.facebook.com/v20.0/dialog/oauth?client_id=${process.env.NEXT_PUBLIC_FACEBOOK_CLIENT_ID}&redirect_uri=${process.env.NEXT_PUBLIC_INSTAGRAM_REDIRECT_URI}&state=${client.user?.id}&scope=instagram_basic,instagram_content_publish,pages_show_list,pages_read_engagement,instagram_manage_insights,business_management`
        );
        break;
      case "linkedin":
        window.open(
          `https://www.linkedin.com/oauth/v2/authorization?client_id=${process.env.NEXT_PUBLIC_LINKEDIN_CLIENT_ID}&redirect_uri=${process.env.NEXT_PUBLIC_LINKEDIN_REDIRECT_URI}&scope=r_liteprofile,r_emailaddress,w_member_social`
        );
        break;
    }
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value as SocialPlatform);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold mb-2">Social Accounts</h1>
          <p className="text-gray-500">
            Connect and manage your social media accounts.
          </p>
        </div>

        <Dialog open={isAddAccountOpen} onOpenChange={setIsAddAccountOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90">
              <Plus className="h-4 w-4 mr-2" />
              Connect Account
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Connect Social Media Account</DialogTitle>
              <DialogDescription>
                Link a new social media account to your SocioFly dashboard.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="platform">Platform</Label>
                <div className="flex gap-3 flex-wrap">
                  {["facebook", "instagram", "twitter", "linkedin"].map(
                    (platform) => (
                      <Button
                        key={platform}
                        type="button"
                        variant={
                          newAccount.platform === platform
                            ? "default"
                            : "outline"
                        }
                        onClick={() =>
                          setNewAccount({
                            ...newAccount,
                            platform: platform as SocialPlatform,
                          })
                        }
                        className="flex gap-2 items-center"
                      >
                        {platformIcons[platform as keyof typeof platformIcons]}
                        <span className="capitalize">{platform}</span>
                      </Button>
                    )
                  )}
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsAddAccountOpen(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleAddAccount}>Connect Account</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs
        defaultValue="all"
        value={activeTab}
        onValueChange={handleTabChange}
        className="space-y-4"
      >
        <TabsList>
          <TabsTrigger value="all">All Accounts</TabsTrigger>
          <TabsTrigger value="facebook">Facebook</TabsTrigger>
          <TabsTrigger value="instagram">Instagram</TabsTrigger>
          <TabsTrigger value="twitter">Twitter</TabsTrigger>
          <TabsTrigger value="linkedin">LinkedIn</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4">
          {filteredAccounts?.length === 0 ? (
            <Card className="border-dashed border-2">
              <CardContent className="pt-10 pb-10 text-center">
                <AlertCircle className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-medium mb-2">No accounts found</h3>
                <p className="text-gray-500 mb-6 max-w-sm mx-auto">
                  {activeTab === "all"
                    ? "You haven't connected any social media accounts yet."
                    : `You haven't connected any ${activeTab} accounts yet.`}
                </p>
                <Button onClick={() => setIsAddAccountOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Connect Account
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredAccounts?.map((account) => (
                <Card
                  key={account.id}
                  className="overflow-hidden transition-all hover:shadow-md py-0"
                >
                  <CardHeader className="p-4 flex flex-row items-center gap-3">
                    <div className="w-8 h-8 rounded-md bg-gray-100 flex items-center justify-center overflow-hidden">
                      {account.profile_picture_url ? (
                        <img
                          src={account.profile_picture_url}
                          alt={account.username}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                          <span className="text-gray-500 text-sm">
                            {account.username[0]}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-sm font-medium">
                        {account.username}
                      </CardTitle>
                      <CardDescription className="text-xs flex items-center gap-1">
                        {account.platform !== "all" &&
                          account.platform in platformIcons && (
                            <>
                              {
                                platformIcons[
                                  account.platform as SocialPlatformIcon
                                ]
                              }
                              <span className="capitalize">
                                {account.platform}
                              </span>
                            </>
                          )}
                      </CardDescription>
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
