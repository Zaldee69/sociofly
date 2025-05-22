"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useTeams } from "../hooks/use-teams";
import { usePathname, useRouter } from "next/navigation";

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
  const { teams, isLoading } = useTeams();
  const [currentTeamId, setCurrentTeamId] = useState<string | null>(null);
  const pathname = usePathname();
  const router = useRouter();

  // Extract teamId from URL if we're on a team-specific page
  useEffect(() => {
    const teamIdMatch = pathname?.match(/\/teams\/([^\/]+)/);
    if (teamIdMatch && teamIdMatch[1]) {
      setCurrentTeamId(teamIdMatch[1]);
    }
  }, [pathname]);

  // Set default team if none is selected
  useEffect(() => {
    if (!isLoading && teams?.length > 0 && !currentTeamId) {
      setCurrentTeamId(teams[0].id);
    }
  }, [teams, isLoading, currentTeamId]);

  // Navigate to team page when team is changed
  const handleSetCurrentTeam = (teamId: string) => {
    setCurrentTeamId(teamId);
    if (!pathname?.includes(`/teams/${teamId}`)) {
      router.push(`/teams/${teamId}`);
    }
  };

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
