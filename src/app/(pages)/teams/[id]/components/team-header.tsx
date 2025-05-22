import React from "react";
import { Team } from "../types";
import { Skeleton } from "@/components/ui/skeleton";
import AddMemberModal from "../../components/add-member";
import { usePermissions } from "@/lib/hooks";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";

interface TeamHeaderProps {
  team: Team;
}

export const TeamHeader = ({ team }: TeamHeaderProps) => {
  const { hasPermission } = usePermissions(team.id);
  const utils = trpc.useUtils();

  // Define mutation at the top level of the component
  const inviteMutation = trpc.team.inviteMember.useMutation({
    onSuccess: () => {
      toast.success("Invitation sent successfully");
      // Invalidate invites to refresh the pending invites list
      utils.team.getTeamInvites.invalidate({ teamId: team.id });
      // Also invalidate team members to refresh the member list
      utils.team.getTeamMembers.invalidate({ teamId: team.id });
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to send invitation");
    },
  });

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
            teamId: values.teamId || team.id,
            role: (values.role === "OWNER" ? "MANAGER" : values.role) as
              | "MANAGER"
              | "SUPERVISOR"
              | "CONTENT_CREATOR"
              | "INTERNAL_REVIEWER"
              | "CLIENT_REVIEWER"
              | "ANALYST"
              | "INBOX_AGENT",
            name: values.team || team.name,
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
    <div className="flex justify-between items-center">
      <div>
        <h1 className="text-3xl font-bold">{team.name}</h1>
        <p className="text-muted-foreground">{team.description}</p>
      </div>
      {hasPermission("team.invite") && team && (
        <AddMemberModal teams={team} onAddMember={handleAddMember} />
      )}
    </div>
  );
};

// Skeleton loader for the TeamHeader component
TeamHeader.Skeleton = function TeamHeaderSkeleton() {
  return (
    <div>
      <Skeleton className="h-8 w-[200px] mb-2" />
      <Skeleton className="h-4 w-[300px]" />
    </div>
  );
};
