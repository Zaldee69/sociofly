"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useTeams } from "../hooks/use-teams";
import { usePathname } from "next/navigation";

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

const CURRENT_TEAM_KEY = "current-team-id";

export function TeamProvider({ children }: { children: React.ReactNode }) {
  const { teams, isLoading } = useTeams();
  const [currentTeamId, setCurrentTeamId] = useState<string | null>(null);
  const pathname = usePathname();

  // Load current team from localStorage on mount
  useEffect(() => {
    const savedTeamId = localStorage.getItem(CURRENT_TEAM_KEY);
    if (savedTeamId) {
      setCurrentTeamId(savedTeamId);
    }
  }, []);

  // If we're on a team-specific page, use that team ID
  useEffect(() => {
    const teamIdMatch = pathname?.match(/\/teams\/([^\/]+)/);
    if (teamIdMatch && teamIdMatch[1]) {
      const urlTeamId = teamIdMatch[1];
      // Only update if it's different from current
      if (urlTeamId !== currentTeamId) {
        setCurrentTeamId(urlTeamId);
        localStorage.setItem(CURRENT_TEAM_KEY, urlTeamId);
      }
    }
  }, [pathname, currentTeamId]);

  // Set default team if none is selected and teams are loaded
  useEffect(() => {
    if (!isLoading && teams?.length > 0 && !currentTeamId) {
      const defaultTeamId = teams[0].id;
      setCurrentTeamId(defaultTeamId);
      localStorage.setItem(CURRENT_TEAM_KEY, defaultTeamId);
    }
  }, [teams, isLoading, currentTeamId]);

  // Validate that current team still exists in user's teams
  useEffect(() => {
    if (!isLoading && teams?.length > 0 && currentTeamId) {
      const teamExists = teams.some((team) => team.id === currentTeamId);
      if (!teamExists) {
        // Current team no longer exists, switch to first available team
        const defaultTeamId = teams[0].id;
        setCurrentTeamId(defaultTeamId);
        localStorage.setItem(CURRENT_TEAM_KEY, defaultTeamId);
      }
    }
  }, [teams, isLoading, currentTeamId]);

  // Handle team switching (without navigation)
  const handleSetCurrentTeam = (teamId: string) => {
    setCurrentTeamId(teamId);
    localStorage.setItem(CURRENT_TEAM_KEY, teamId);
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
