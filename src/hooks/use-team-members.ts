import { useState, useEffect } from "react";
import { toast } from "sonner";

interface TeamMember {
  team_id: string;
  user_id: string;
  role: string;
  created_at: string;
  email: string;
  avatar_url: string | null;
  job_title: string | null;
}

interface UseTeamMembersReturn {
  members: TeamMember[];
  isLoading: boolean;
  error: Error | null;
  addMember: (email: string, role: string) => Promise<void>;
  removeMember: (userId: string) => Promise<void>;
}

export function useTeamMembers(teamId: string | null): UseTeamMembersReturn {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (teamId) {
      fetchMembers();
    } else {
      setMembers([]);
    }
  }, [teamId]);

  const fetchMembers = async () => {
    if (!teamId) return;

    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`/api/teams/${teamId}/members`);
      if (!response.ok) throw new Error("Failed to fetch team members");

      const data = await response.json();
      setMembers(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("An error occurred"));
      toast.error("Failed to fetch team members");
    } finally {
      setIsLoading(false);
    }
  };

  const addMember = async (email: string, role: string) => {
    if (!teamId) return;

    try {
      setIsLoading(true);
      const response = await fetch(`/api/teams/${teamId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to add team member");
      }

      await fetchMembers();
      toast.success("Team member added successfully");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to add team member"
      );
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const removeMember = async (userId: string) => {
    if (!teamId) return;

    try {
      setIsLoading(true);
      const response = await fetch(`/api/teams/${teamId}/members`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });

      if (!response.ok) throw new Error("Failed to remove team member");

      await fetchMembers();
      toast.success("Team member removed successfully");
    } catch (err) {
      toast.error("Failed to remove team member");
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    members,
    isLoading,
    error,
    addMember,
    removeMember,
  };
}
