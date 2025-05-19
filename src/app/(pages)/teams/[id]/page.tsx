"use client";
import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Users,
  UserPlus,
  Mail,
  Settings,
  ArrowLeft,
  Search,
  Filter,
  Clock,
  CheckCircle,
  X,
  Facebook,
  Plus,
  Instagram,
  Twitter,
  Linkedin,
  Youtube,
  ExternalLink,
  Ellipsis,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import AddMemberModal from "../components/add-member";
import { trpc } from "@/lib/trpc/client";
import { type Role, type SocialPlatform } from "@prisma/client";
import { type TRPCClientErrorLike } from "@trpc/client";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface Member {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: "ACTIVE" | "INACTIVE" | "SUSPENDED";
  lastActive: Date;
}

interface Team {
  id: number;
  name: string;
  description: string;
  role: Role;
}

interface SocialAccount {
  id: string;
  name: string | null;
  platform: SocialPlatform;
  accessToken: string;
  refreshToken: string | null;
  expiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
  organizationId: string;
}

const Page = () => {
  const { id: teamId } = useParams();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [activeTab, setActiveTab] = useState<string>("members");
  const [isAddAccountOpen, setIsAddAccountOpen] = useState(false);
  const [selectedSocialAccount, setSelectedSocialAccount] = useState<
    string | null
  >(null);
  const utils = trpc.useUtils();

  // tRPC queries
  const { data: team, isLoading: isLoadingTeam } =
    trpc.team.getTeamById.useQuery(
      { teamId: teamId as string },
      {
        retry: false,
      }
    );

  const { data: members, isLoading: isLoadingMembers } =
    trpc.team.getTeamMembers.useQuery(
      { teamId: teamId as string, searchQuery: "" },
      {
        enabled: !!teamId,
        staleTime: 1000 * 60 * 5, // Data tetap fresh selama 5 menit
      }
    );

  const { data: invites, isLoading: isLoadingInvites } =
    trpc.team.getTeamInvites.useQuery(
      { teamId: teamId as string },
      {
        enabled: !!teamId && team?.role === "TEAM_OWNER",
      }
    );

  // Social Account queries and mutations
  const { data: socialAccounts, isLoading: isLoadingSocialAccounts } =
    trpc.team.getSocialAccounts.useQuery({ teamId: teamId as string });

  const { data: availableSocialAccounts } =
    trpc.team.getAvailableSocialAccounts.useQuery(
      { teamId: teamId as string },
      {
        enabled: !!teamId && team?.role === "TEAM_OWNER",
      }
    );

  const addSocialAccountMutation = trpc.team.addSocialAccount.useMutation({
    onSuccess: () => {
      toast.success("Social account added successfully");
      setIsAddAccountOpen(false);
      utils.team.getSocialAccounts.invalidate({ teamId: teamId as string });
    },
    onError: (error: TRPCClientErrorLike<any>) => {
      toast.error(error.message);
    },
  });

  const removeSocialAccountMutation = trpc.team.removeSocialAccount.useMutation(
    {
      onSuccess: () => {
        toast.success("Social account removed successfully");
        utils.team.getSocialAccounts.invalidate({ teamId: teamId as string });
      },
      onError: (error: TRPCClientErrorLike<any>) => {
        toast.error(error.message);
      },
    }
  );

  // tRPC mutations
  const inviteMutation = trpc.team.inviteMember.useMutation({
    onSuccess: () => {
      toast.success("Invitation sent successfully");
      utils.team.getTeamInvites.invalidate({ teamId: teamId as string });
    },
    onError: (error: TRPCClientErrorLike<any>) => {
      toast.error(error.message);
    },
  });

  // Handlers
  const handleAddMember = async (values: {
    team: string;
    teamId?: string;
    role: string;
    email: string;
    message?: string;
  }) => {
    return new Promise<void>((resolve, reject) => {
      inviteMutation.mutate(
        {
          email: values.email,
          teamId: values.teamId || (teamId as string),
          role: (values.role === "TEAM_OWNER"
            ? "CAMPAIGN_MANAGER"
            : values.role) as
            | "CAMPAIGN_MANAGER"
            | "CONTENT_PRODUCER"
            | "CONTENT_REVIEWER"
            | "CLIENT_REVIEWER"
            | "ANALYTICS_OBSERVER"
            | "INBOX_AGENT",
          name: values.team || "",
        },
        {
          onSuccess: () => resolve(),
          onError: (error) => reject(error),
        }
      );
    });
  };

  // Handlers for social accounts
  const handleAddSocialAccount = (platform: SocialPlatform) => {
    // This is a placeholder - in reality, you would redirect to OAuth flow
    addSocialAccountMutation.mutate({
      teamId: teamId as string,
      platform,
      accessToken: "placeholder-token", // This would come from OAuth
      name: `${platform.toLowerCase()} account`, // This would come from OAuth
    });
  };

  const handleRemoveSocialAccount = (accountId: string) => {
    removeSocialAccountMutation.mutate({
      teamId: teamId as string,
      accountId,
    });
  };

  const renderPlatformIcon = (platform: SocialPlatform) => {
    switch (platform) {
      case "INSTAGRAM":
        return <Instagram className="h-5 w-5 text-white" />;
      case "FACEBOOK":
        return <Facebook className="h-5 w-5 text-white" />;
      case "TWITTER":
        return <Twitter className="h-5 w-5 text-white" />;
      case "LINKEDIN":
        return <Linkedin className="h-5 w-5 text-white" />;
      case "YOUTUBE":
        return <Youtube className="h-5 w-5 text-white" />;
      default:
        return null;
    }
  };

  // Filter members based on search query
  const filteredMembers =
    members?.filter(
      (member) =>
        member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        member.email.toLowerCase().includes(searchQuery.toLowerCase())
    ) ?? [];

  // Hanya tampilkan loading untuk seluruh halaman pada awal load
  if ((isLoadingTeam || isLoadingMembers) && !searchQuery) {
    return (
      <div className="container mx-auto py-6">
        <div className="mb-6">
          <Button variant="outline" className="mb-4" disabled>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Teams
          </Button>

          <div className="flex justify-between items-center">
            <div>
              <Skeleton className="h-8 w-[200px] mb-2" />
              <Skeleton className="h-4 w-[300px]" />
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-[150px] mb-2" />
              <Skeleton className="h-4 w-[250px]" />
            </CardHeader>
            <CardContent>
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
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!team) {
    return null;
  }

  // Get status badge
  const getStatusBadge = (status: Member["status"]) => {
    switch (status.toLowerCase()) {
      case "active":
        return <Badge className="bg-green-600">Active</Badge>;
      case "inactive":
        return <Badge variant="outline">Inactive</Badge>;
      case "SUSPENDED":
        return <Badge variant="destructive">Suspended</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getRoleBadge = (role: Role) => {
    switch (role) {
      case "TEAM_OWNER":
        return <Badge className="bg-purple-600">Team Owner</Badge>;
      case "CAMPAIGN_MANAGER":
        return <Badge className="bg-blue-600">Campaign Manager</Badge>;
      case "CONTENT_PRODUCER":
        return <Badge variant="secondary">Content Producer</Badge>;
      case "CONTENT_REVIEWER":
        return <Badge variant="secondary">Content Reviewer</Badge>;
      case "CLIENT_REVIEWER":
        return <Badge variant="secondary">Client Reviewer</Badge>;
      case "ANALYTICS_OBSERVER":
        return <Badge variant="secondary">Analytics Observer</Badge>;
      case "INBOX_AGENT":
        return <Badge variant="secondary">Inbox Agent</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <Button
          variant="outline"
          className="mb-4"
          onClick={() => router.back()}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Teams
        </Button>

        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">{team.name}</h1>
            <p className="text-muted-foreground">{team.description}</p>
          </div>
          {team.role === "TEAM_OWNER" && (
            <AddMemberModal teams={team} onAddMember={handleAddMember} />
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="members">
            <Users className="h-4 w-4 mr-2" />
            Team Members
          </TabsTrigger>
          <TabsTrigger value="social-accounts">
            <Users className="h-4 w-4 mr-2" />
            Social Accounts
          </TabsTrigger>
          {team.role === "TEAM_OWNER" && (
            <TabsTrigger value="invites">
              <Mail className="h-4 w-4 mr-2" />
              Pending Invites
            </TabsTrigger>
          )}
          {team.role === "TEAM_OWNER" && (
            <TabsTrigger value="settings">
              <Settings className="h-4 w-4 mr-2" />
              Team Settings
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="members">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Team Members
              </CardTitle>
              <CardDescription>
                Manage the members of {team.name}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex mb-6">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search members..."
                    className="pl-9"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Last Active</TableHead>
                    <TableHead>Status</TableHead>
                    {team.role === "TEAM_OWNER" && (
                      <TableHead className="text-right">Actions</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingMembers && searchQuery
                    ? // Tampilkan skeleton loading hanya untuk tabel saat pencarian
                      Array(3)
                        .fill(0)
                        .map((_, i) => (
                          <TableRow key={`skeleton-${i}`}>
                            <TableCell>
                              <div>
                                <Skeleton className="h-4 w-[150px] mb-2" />
                                <Skeleton className="h-3 w-[120px]" />
                              </div>
                            </TableCell>
                            <TableCell>
                              <Skeleton className="h-4 w-[80px]" />
                            </TableCell>
                            <TableCell>
                              <Skeleton className="h-4 w-[100px]" />
                            </TableCell>
                            <TableCell>
                              <Skeleton className="h-4 w-[60px]" />
                            </TableCell>
                            {team.role === "TEAM_OWNER" && (
                              <TableCell className="text-right">
                                <Skeleton className="h-8 w-8 ml-auto" />
                              </TableCell>
                            )}
                          </TableRow>
                        ))
                    : filteredMembers.map((member) => (
                        <TableRow key={member.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{member.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {member.email}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>{getRoleBadge(member.role)}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3 text-muted-foreground" />
                              <span className="text-sm">
                                {new Date(
                                  member.lastActive
                                ).toLocaleDateString()}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(
                              member.status as
                                | "ACTIVE"
                                | "INACTIVE"
                                | "SUSPENDED"
                            )}
                          </TableCell>
                          {team.role === "TEAM_OWNER" &&
                            member.role !== "TEAM_OWNER" && (
                              <TableCell className="text-right">
                                <Button variant="ghost" size="sm">
                                  <Ellipsis />
                                </Button>
                              </TableCell>
                            )}
                        </TableRow>
                      ))}
                </TableBody>
              </Table>

              {!isLoadingMembers && filteredMembers.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No team members found matching your criteria
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="social-accounts">
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
                        <img
                          src={account.profilePicture!}
                          className="ml-2 text-white hover:text-gray-200 h-10 w-10 rounded-full"
                        />
                        <div>
                          <h3 className="font-medium">{account.name}</h3>
                          <p className="text-sm text-muted-foreground capitalize">
                            {account.platform.toLowerCase()}
                          </p>
                        </div>
                      </div>

                      {team.role === "TEAM_OWNER" && (
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              handleRemoveSocialAccount(account.id)
                            }
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

              {team.role === "TEAM_OWNER" && (
                <div className="mt-6">
                  <Dialog
                    open={isAddAccountOpen}
                    onOpenChange={setIsAddAccountOpen}
                  >
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
                          Choose a platform to connect a new social media
                          account
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        {availableSocialAccounts?.map((platform) => (
                          <Button
                            key={platform}
                            variant="outline"
                            className="w-full justify-start"
                            onClick={() => {
                              setSelectedSocialAccount(platform);
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
        </TabsContent>

        {team.role === "TEAM_OWNER" && (
          <TabsContent value="invites">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Pending Invitations
                </CardTitle>
                <CardDescription>
                  Manage pending invitations for {team.name}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {invites && invites.length > 0 ? (
                  <div className="space-y-4">
                    {invites.map((invite) => (
                      <div
                        key={invite.id}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div>
                          <h3 className="font-medium">{invite.email}</h3>
                          <div className="flex items-center gap-4 mt-1">
                            <p className="text-sm text-muted-foreground">
                              Role: {getRoleBadge(invite.role)}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            <span>
                              Sent: {invite.createdAt.toLocaleDateString()} •
                              Expires:{" "}
                              {new Date(
                                invite.createdAt.getTime() +
                                  7 * 24 * 60 * 60 * 1000
                              ).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <X className="h-4 w-4" />
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    No pending invitations
                  </div>
                )}

                <div className="mt-6">
                  <AddMemberModal teams={team} onAddMember={handleAddMember} />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {team.role === "TEAM_OWNER" && (
          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Team Settings
                </CardTitle>
                <CardDescription>
                  Manage settings for {team.name}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Team Name</label>
                    <Input defaultValue={team.name} disabled />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Team Description
                    </label>
                    <Input defaultValue={team.description} disabled />
                  </div>

                  <div className="pt-4">
                    <p className="text-sm text-muted-foreground">
                      Team settings can only be modified through the
                      organization settings.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};

export default Page;
