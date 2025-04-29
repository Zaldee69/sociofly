import { create } from "zustand";
import { createClient } from "@/lib/utils/supabase/client";

interface TeamMember {
  id: string;
  user_id: string;
  team_id: string;
  role: string;
  user: {
    email: string;
    user_profile: {
      full_name: string;
      avatar_url: string;
    };
  };
}

interface Team {
  id: string;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
  members: TeamMember[];
  member_count: number;
}

interface TeamState {
  currentTeam: Team | null;
  isLoading: boolean;
  error: string | null;
  setCurrentTeam: (team: Team | null) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  fetchTeam: (teamId: string) => Promise<void>;
  refreshTeam: () => Promise<void>;
}

export const useTeamStore = create<TeamState>((set, get) => ({
  currentTeam: null,
  isLoading: false,
  error: null,

  setCurrentTeam: (team) => set({ currentTeam: team }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),

  fetchTeam: async (teamId: string) => {
    try {
      set({ isLoading: true, error: null });
      const supabase = createClient();

      const { data: team, error: teamError } = await supabase
        .from("teams")
        .select(
          `
          *,
          members:team_members(
            id,
            user_id,
            team_id,
            role,
            user:user_id(
              email,
              user_profile(
                full_name,
                avatar_url
              )
            )
          )
        `
        )
        .eq("id", teamId)
        .single();

      if (teamError) throw teamError;

      // Transform the data to include member_count
      const transformedTeam = {
        ...team,
        member_count: team.members.length,
      };

      set({ currentTeam: transformedTeam });
    } catch (error) {
      console.error("Error fetching team:", error);
      set({ error: "Failed to fetch team data" });
    } finally {
      set({ isLoading: false });
    }
  },

  refreshTeam: async () => {
    const { currentTeam } = get();
    if (currentTeam) {
      await get().fetchTeam(currentTeam.id);
    }
  },
}));
