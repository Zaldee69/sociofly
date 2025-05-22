import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc/client";

export function useTeams() {
  const {
    data: teamsData,
    isLoading,
    isError,
    error,
    refetch,
  } = trpc.team.getAllTeams.useQuery();

  return {
    teams: teamsData || [],
    isLoading,
    isError,
    error,
    refetch,
  };
}

export function useTeam(teamId: string) {
  const {
    data: teamData,
    isLoading,
    isError,
    error,
    refetch,
  } = trpc.team.getTeamById.useQuery({ teamId });

  return {
    team: teamData || null,
    isLoading,
    isError,
    error,
    refetch,
  };
}

export function useCreateTeam() {
  const utils = trpc.useContext();
  const mutation = trpc.team.createTeam.useMutation({
    onSuccess: () => {
      // Invalidate queries after team creation
      utils.team.getAllTeams.invalidate();
    },
  });

  return mutation;
}

export function useUpdateTeam() {
  const utils = trpc.useContext();
  const mutation = trpc.team.updateTeam.useMutation({
    onSuccess: () => {
      // Invalidate queries after team update
      utils.team.getAllTeams.invalidate();
    },
  });

  return mutation;
}

export function useDeleteTeam() {
  const utils = trpc.useContext();
  const mutation = trpc.team.deleteTeam.useMutation({
    onSuccess: () => {
      // Invalidate queries after team deletion
      utils.team.getAllTeams.invalidate();
    },
  });

  return mutation;
}
