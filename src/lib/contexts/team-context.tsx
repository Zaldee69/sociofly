"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useTeams } from "../hooks/use-teams";
import { usePathname } from "next/navigation";
import { trpc } from "../trpc/client";

interface TeamContextType {
  currentTeamId: string | null;
  setCurrentTeamId: (teamId: string) => void;
  isLoading: boolean;
}

const TeamContext = createContext<TeamContextType>({
  currentTeamId: null,
  setCurrentTeamId: () => {},
  isLoading: true,
});

export const useTeamContext = () => useContext(TeamContext);

export function TeamProvider({ children }: { children: React.ReactNode }) {
  const { teams, isLoading: teamsLoading } = useTeams();
  const [currentTeamId, setCurrentTeamId] = useState<string | null>(null);
  const pathname = usePathname();
  const utils = trpc.useUtils();

  // Get active team from server
  const { data: activeTeam, isLoading: activeTeamLoading } =
    trpc.team.getActiveTeam.useQuery(undefined, {
      // Only fetch if we have teams
      enabled: teams !== undefined && teams.length > 0,
    });

  // Set active team on server
  const { mutate: setActiveTeam } = trpc.team.setActiveTeam.useMutation({
    onSuccess: () => {
      // Refetch active team instead of relying on return value
      utils.team.getActiveTeam.invalidate();
    },
  });

  // If we're on a team-specific page, use that team ID
  useEffect(() => {
    const teamIdMatch = pathname?.match(/\/teams\/([^\/]+)/);
    if (teamIdMatch && teamIdMatch[1]) {
      const urlTeamId = teamIdMatch[1];
      // Only update if it's different from current
      if (urlTeamId !== currentTeamId) {
        setActiveTeam({ teamId: urlTeamId });
      }
    }
  }, [pathname, currentTeamId, setActiveTeam]);

  // Set default team if none is selected and teams are loaded
  useEffect(() => {
    if (!teamsLoading && teams?.length > 0 && !currentTeamId && !activeTeam) {
      const defaultTeamId = teams[0].id;
      setActiveTeam({ teamId: defaultTeamId });
    }
  }, [teams, teamsLoading, currentTeamId, activeTeam, setActiveTeam]);

  // Set currentTeamId when activeTeam is loaded
  useEffect(() => {
    if (activeTeam && activeTeam.id !== currentTeamId) {
      setCurrentTeamId(activeTeam.id);
    }
  }, [activeTeam, currentTeamId]);

  // Validate that current team still exists in user's teams
  useEffect(() => {
    if (!teamsLoading && teams?.length > 0 && currentTeamId) {
      const teamExists = teams.some((team) => team.id === currentTeamId);
      if (!teamExists) {
        // Current team no longer exists, switch to first available team
        const defaultTeamId = teams[0].id;
        setActiveTeam({ teamId: defaultTeamId });
      }
    }
  }, [teams, teamsLoading, currentTeamId, setActiveTeam]);

  // Handle team switching
  const handleSetCurrentTeam = (teamId: string) => {
    setActiveTeam({ teamId });
  };

  const isLoading = teamsLoading || activeTeamLoading;

  return (
    <TeamContext.Provider
      value={{
        currentTeamId,
        setCurrentTeamId: handleSetCurrentTeam,
        isLoading,
      }}
    >
      {children}
    </TeamContext.Provider>
  );
}
