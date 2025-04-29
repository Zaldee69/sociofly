import { useState, useEffect } from "react";
import { toast } from "sonner";

interface Team {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

interface UseTeamsReturn {
  teams: Team[];
  memberCounts: Record<string, number>;
  selectedTeam: Team | null;
  isLoading: boolean;
  error: Error | null;
  setSelectedTeam: (team: Team | null) => void;
  createTeam: (name: string) => Promise<void>;
}

export function useTeams(): UseTeamsReturn {
  const [teams, setTeams] = useState<Team[]>([]);
  const [memberCounts, setMemberCounts] = useState<Record<string, number>>({});
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    fetchTeams();
  }, []);

  const fetchTeams = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch("/api/teams");
      if (!response.ok) throw new Error("Failed to fetch teams");

      const { teams, memberCounts } = await response.json();

      setTeams(teams);
      setMemberCounts(memberCounts);

      if (!selectedTeam && teams.length > 0) {
        setSelectedTeam(teams[0]);
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error("An error occurred"));
      toast.error("Failed to fetch teams");
    } finally {
      setIsLoading(false);
    }
  };

  const createTeam = async (name: string) => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });

      if (!response.ok) throw new Error("Failed to create team");

      await fetchTeams();
      toast.success("Team created successfully");
    } catch (err) {
      toast.error("Failed to create team");
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    teams,
    memberCounts,
    selectedTeam,
    isLoading,
    error,
    setSelectedTeam,
    createTeam,
  };
}
