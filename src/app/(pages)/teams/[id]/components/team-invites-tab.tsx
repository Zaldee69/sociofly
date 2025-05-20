import React from "react";
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
import { Mail, Clock, X } from "lucide-react";
import { getRoleBadge } from "../../page";

interface TeamInvitesTabProps {
  teamId: string;
  team: Team | undefined;
}

export const TeamInvitesTab = ({ teamId, team }: TeamInvitesTabProps) => {
  const utils = trpc.useUtils();

  // Fetch team invites
  const { data: invites } = trpc.team.getTeamInvites.useQuery(
    { teamId },
    {
      enabled: !!teamId && team?.role === "OWNER",
    }
  );

  //   // Cancel invitation mutation
  //   const cancelInviteMutation = trpc.team.cancelInvite.useMutation({
  //     onSuccess: () => {
  //       toast.success("Invitation cancelled successfully");
  //       utils.team.getTeamInvites.invalidate({ teamId });
  //     },
  //     onError: (error) => {
  //       toast.error(error.message);
  //     },
  //   });

  // Handler for cancelling invitations
  const handleCancelInvite = (inviteId: string) => {
    // cancelInviteMutation.mutate({
    //   teamId,
    //   inviteId,
    // });
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
      const inviteMutation = trpc.team.inviteMember.useMutation({
        onSuccess: () => {
          toast.success("Invitation sent successfully");
          utils.team.getTeamInvites.invalidate({ teamId });
          resolve();
        },
        onError: (error) => {
          toast.error(error.message);
          reject(error);
        },
      });

      inviteMutation.mutate({
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
      });
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
                      Sent: {invite.createdAt.toLocaleDateString()} • Expires:{" "}
                      {new Date(
                        invite.createdAt.getTime() + 7 * 24 * 60 * 60 * 1000
                      ).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCancelInvite(invite.id)}
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
    </Card>
  );
};
