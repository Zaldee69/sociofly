import React, { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";
import { Team, Invite } from "../types";
import AddMemberModal from "../../components/add-member";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Mail,
  Clock,
  X,
  RefreshCw,
  History,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { getRoleBadge } from "../../utils/team-utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Role } from "@prisma/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface TeamInvitesTabProps {
  teamId: string;
  team: Team | undefined;
}

// Extended interface to bridge the gap between database invite and our app's Invite type
interface InviteWithStatus extends Omit<Invite, "status"> {
  team: {
    name: string;
    id: string;
    slug: string;
    logo: string | null;
    createdAt: Date;
    updatedAt: Date;
    ownerId: string;
  };
  acceptedAt: Date | null;
  rejectedAt: Date | null;
  teamId: string;
}

// Extended interface for history invites
interface InviteHistory extends Invite {
  acceptedAt: Date | null;
  rejectedAt: Date | null;
}

export const TeamInvitesTab = ({ teamId, team }: TeamInvitesTabProps) => {
  const utils = trpc.useUtils();
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const [selectedInvite, setSelectedInvite] = useState<Invite | null>(null);
  const [activeTab, setActiveTab] = useState<string>("pending");

  // Fetch all team invites (we'll filter on client side)
  const { data: allInvites, isLoading } = trpc.team.getTeamInvites.useQuery(
    { teamId, includeProcessed: true },
    {
      enabled: !!teamId,
    }
  );

  // Fetch invitation history from TemporaryData
  const { data: inviteHistory, isLoading: isLoadingHistory } =
    trpc.team.getTeamInvitesHistory.useQuery(
      { teamId },
      {
        enabled: !!teamId,
      }
    );

  // Invalidate queries when tab changes to ensure we have fresh data
  useEffect(() => {
    if (activeTab === "history") {
      utils.team.getTeamInvites.invalidate({ teamId });
      utils.team.getTeamInvitesHistory.invalidate({ teamId });
    }
  }, [
    activeTab,
    teamId,
    utils.team.getTeamInvites,
    utils.team.getTeamInvitesHistory,
  ]);

  // Convert DB invites to Invite type and separate pending from processed
  const processedPendingInvites: Invite[] = (allInvites || [])
    .filter(
      (invite: InviteWithStatus) => !invite.acceptedAt && !invite.rejectedAt
    )
    .map((invite: InviteWithStatus) => ({
      id: invite.id,
      email: invite.email,
      role: invite.role,
      createdAt: invite.createdAt,
      status: "PENDING",
    }));

  // Process history invites - accepted or rejected
  // Combine both current processed invites and history invites
  const processedHistoryInvites: InviteHistory[] = [
    // Current invitations that are already processed
    ...(allInvites || [])
      .filter(
        (invite: InviteWithStatus) => invite.acceptedAt || invite.rejectedAt
      )
      .map((invite: InviteWithStatus) => ({
        id: invite.id,
        email: invite.email,
        role: invite.role,
        createdAt: invite.createdAt,
        status: invite.acceptedAt ? "ACCEPTED" : "REJECTED",
        acceptedAt: invite.acceptedAt,
        rejectedAt: invite.rejectedAt,
      })),
    // Historical invitations from TemporaryData
    ...(inviteHistory || []).map((invite: any) => ({
      id: invite.id,
      email: invite.email,
      role: invite.role,
      createdAt: invite.createdAt,
      status: invite.acceptedAt ? "ACCEPTED" : "REJECTED",
      acceptedAt: invite.acceptedAt,
      rejectedAt: invite.rejectedAt,
    })),
  ];

  // Move invitation mutation to component level
  const inviteMutation = trpc.team.inviteMember.useMutation({
    onSuccess: () => {
      toast.success("Invitation sent successfully");
      utils.team.getTeamInvites.invalidate({ teamId });
      // Also refresh the team members list
      utils.team.getTeamMembers.invalidate({ teamId });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Cancel invitation mutation
  const cancelInviteMutation = trpc.team.cancelInvite.useMutation({
    onSuccess: () => {
      toast.success("Invitation cancelled successfully");
      utils.team.getTeamInvites.invalidate({ teamId });
      setCancelConfirmOpen(false);
      setSelectedInvite(null);
    },
    onError: (error: any) => {
      toast.error(error.message);
    },
  });

  // Handler for cancelling invitations
  const handleCancelInvite = (invite: Invite) => {
    setSelectedInvite(invite);
    setCancelConfirmOpen(true);
  };

  // Handle confirm cancel
  const confirmCancelInvite = () => {
    if (selectedInvite) {
      cancelInviteMutation.mutate({
        teamId,
        inviteId: selectedInvite.id,
      });
    }
  };

  // Check if reinvite is allowed (24 hour restriction)
  const canReinvite = (invite: Invite) => {
    // Get the last 24 hours timestamp
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

    // Only allow reinvite if the invite was created more than 24 hours ago
    return invite.createdAt < twentyFourHoursAgo;
  };

  // Handler for reinvite
  const handleReinvite = (invite: Invite) => {
    if (!canReinvite(invite)) {
      toast.error(
        "You can only reinvite after 24 hours from the initial invitation"
      );
      return;
    }

    // Create a new invitation directly
    inviteMutation.mutate(
      {
        email: invite.email,
        teamId,
        role: invite.role as Exclude<Role, "OWNER">,
        name: team?.name || "",
      },
      {
        onSuccess: () => {
          toast.success("Invitation has been sent again");
        },
      }
    );
  };

  // Handler for adding team members
  const handleAddMember = async (values: {
    team: string;
    teamId?: string;
    role: string;
    email: string;
    message?: string;
  }) => {
    return new Promise<void>((resolve, reject) => {
      try {
        inviteMutation.mutate(
          {
            email: values.email,
            teamId: values.teamId || teamId,
            role: (values.role === "OWNER" ? "MANAGER" : values.role) as
              | "MANAGER"
              | "SUPERVISOR"
              | "CONTENT_CREATOR"
              | "INTERNAL_REVIEWER"
              | "CLIENT_REVIEWER"
              | "ANALYST"
              | "INBOX_AGENT",
            name: values.team || "",
          },
          {
            onSuccess: () => resolve(),
            onError: (error) => reject(error),
          }
        );
      } catch (error) {
        reject(error);
      }
    });
  };

  // Get appropriate status badge for history view
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ACCEPTED":
        return (
          <Badge
            variant="outline"
            className="bg-green-50 text-green-700 border-green-200"
          >
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Accepted
          </Badge>
        );
      case "REJECTED":
        return (
          <Badge
            variant="outline"
            className="bg-red-50 text-red-700 border-red-200"
          >
            <XCircle className="h-3 w-3 mr-1" />
            Declined
          </Badge>
        );
      default:
        return (
          <Badge
            variant="outline"
            className="bg-yellow-50 text-yellow-700 border-yellow-200"
          >
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Team Invitations
        </CardTitle>
        <CardDescription>Manage invitations for {team?.name}</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="pending" onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="pending">Pending Invites</TabsTrigger>
            <TabsTrigger value="history">Invite History</TabsTrigger>
          </TabsList>

          {/* Pending Invites Tab */}
          <TabsContent value="pending">
            {isLoading ? (
              <div className="text-center py-12 text-muted-foreground">
                Loading pending invitations...
              </div>
            ) : processedPendingInvites &&
              processedPendingInvites.length > 0 ? (
              <div className="space-y-4">
                {processedPendingInvites.map((invite) => (
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
                            invite.createdAt.getTime() + 7 * 24 * 60 * 60 * 1000
                          ).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleReinvite(invite)}
                        disabled={!canReinvite(invite)}
                        title={
                          canReinvite(invite)
                            ? "Send invitation again"
                            : "You can only reinvite after 24 hours from the initial invitation"
                        }
                        className={
                          !canReinvite(invite)
                            ? "opacity-50 cursor-not-allowed"
                            : "hover:bg-blue-50"
                        }
                      >
                        <RefreshCw className="h-4 w-4 mr-1" />
                        Reinvite
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCancelInvite(invite)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <X className="h-4 w-4 mr-1" />
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
              {team && (
                <AddMemberModal teams={team} onAddMember={handleAddMember} />
              )}
            </div>
          </TabsContent>

          {/* Invite History Tab */}
          <TabsContent value="history">
            {isLoading || isLoadingHistory ? (
              <div className="text-center py-12 text-muted-foreground">
                Loading invitation history...
              </div>
            ) : processedHistoryInvites &&
              processedHistoryInvites.length > 0 ? (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Sent</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Response Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {processedHistoryInvites.map((invite) => (
                      <TableRow key={invite.id}>
                        <TableCell className="font-medium">
                          {invite.email}
                        </TableCell>
                        <TableCell>{getRoleBadge(invite.role)}</TableCell>
                        <TableCell>
                          {invite.createdAt.toLocaleDateString()}
                        </TableCell>
                        <TableCell>{getStatusBadge(invite.status)}</TableCell>
                        <TableCell>
                          {invite.acceptedAt
                            ? invite.acceptedAt.toLocaleDateString()
                            : invite.rejectedAt
                              ? invite.rejectedAt.toLocaleDateString()
                              : "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                No invitation history available
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>

      {/* Confirmation Dialog for Cancellation */}
      <Dialog open={cancelConfirmOpen} onOpenChange={setCancelConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Invitation</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel the invitation for{" "}
              {selectedInvite?.email}?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCancelConfirmOpen(false)}
            >
              No, keep it
            </Button>
            <Button variant="destructive" onClick={confirmCancelInvite}>
              Yes, cancel invitation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
