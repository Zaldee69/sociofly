import { trpc } from "@/lib/trpc/client";
import { Role } from "@prisma/client";

/**
 * Custom hook to load team data and related information
 *
 * @param teamId The ID of the team to load
 * @returns Object containing team data and loading states
 */
export function useTeamPageData(teamId: string) {
  // Fetch basic team data
  const { data: team, isLoading: isLoadingTeam } =
    trpc.team.getTeamById.useQuery(
      { teamId },
      {
        retry: false,
        enabled: !!teamId,
      }
    );

  // Fetch team members
  const { data: members, isLoading: isLoadingMembers } =
    trpc.team.getTeamMembers.useQuery(
      { teamId, searchQuery: "" },
      {
        enabled: !!teamId,
        staleTime: 1000 * 60 * 5, // Data remains fresh for 5 minutes
      }
    );

  // Fetch team invites (only if user is team owner)
  const { data: invites, isLoading: isLoadingInvites } =
    trpc.team.getTeamInvites.useQuery(
      { teamId },
      {
        enabled: !!teamId && team?.role === Role.OWNER,
      }
    );

  // Combine all loading states
  const isLoading = isLoadingTeam || isLoadingMembers;

  return {
    team,
    members,
    invites,
    isLoading,
    isLoadingTeam,
    isLoadingMembers,
    isLoadingInvites,
  };
}
