import React, { useState } from "react";
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
import { Mail, Clock, X, RefreshCw } from "lucide-react";
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

interface TeamInvitesTabProps {
  teamId: string;
  team: Team | undefined;
}

// Extended interface to bridge the gap between database invite and our app's Invite type
interface InviteWithStatus extends Omit<Invite, "status"> {
  organization: {
    name: string;
    id: string;
    slug: string;
    logo: string | null;
    createdAt: Date;
    updatedAt: Date;
    ownerId: string;
  };
  acceptedAt: Date | null;
  organizationId: string;
}

export const TeamInvitesTab = ({ teamId, team }: TeamInvitesTabProps) => {
  const utils = trpc.useUtils();
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const [selectedInvite, setSelectedInvite] = useState<Invite | null>(null);

  // Fetch team invites
  const { data: invites } = trpc.team.getTeamInvites.useQuery(
    { teamId },
    {
      enabled: !!teamId && team?.role === "OWNER",
    }
  );

  // Convert DB invites to Invite type
  const processedInvites: Invite[] = (invites || []).map(
    (invite: InviteWithStatus) => ({
      id: invite.id,
      email: invite.email,
      role: invite.role,
      createdAt: invite.createdAt,
      status: invite.acceptedAt ? "ACCEPTED" : "PENDING",
    })
  );

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

    // First cancel the existing invitation
    cancelInviteMutation.mutate(
      {
        teamId,
        inviteId: invite.id,
      },
      {
        onSuccess: () => {
          // Then create a new invitation
          inviteMutation.mutate({
            email: invite.email,
            teamId,
            role: invite.role as Exclude<Role, "OWNER">,
            name: team?.name || "",
          });
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Pending Invitations
        </CardTitle>
        <CardDescription>
          Manage pending invitations for {team?.name}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {processedInvites && processedInvites.length > 0 ? (
          <div className="space-y-4">
            {processedInvites.map((invite) => (
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
                      Sent: {invite.createdAt.toLocaleDateString()} • Expires:{" "}
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
