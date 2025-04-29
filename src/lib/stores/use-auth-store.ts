// src/lib/stores/use-auth-store.ts
import { User } from "@supabase/supabase-js";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import {
  AuthUser,
  Permission,
  UserRole,
  ROLE_PERMISSIONS,
} from "@/lib/types/auth";
import { createClient } from "@/lib/utils/supabase/client";

interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  sessionExpiry: number | null;
  currentTeamId: string | null;
  setUser: (user: User | null) => Promise<void>;
  setLoading: (isLoading: boolean) => void;
  setSessionExpiry: (expiry: number | null) => void;
  setCurrentTeam: (teamId: string | null) => void;
  clearSession: () => void;
  hasPermission: (permission: Permission) => boolean;
  hasRole: (role: UserRole) => boolean;
  canAccessRoute: (requiredPermissions: Permission[]) => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isLoading: true,
      sessionExpiry: null,
      currentTeamId: null,
      setUser: async (user) => {
        try {
          if (!user || !user.id) {
            set({ user: null, isLoading: false });
            return;
          }

          // Don't set loading true if we already have a user with the same ID
          const currentUser = get().user;
          if (currentUser?.id !== user.id) {
            set({ isLoading: true });
          }

          const supabase = createClient();

          // Fetch user profile from the database
          const { data: userProfile } = await supabase
            .from("user_profile")
            .select("user_id, role")
            .eq("user_id", user.id)
            .maybeSingle();

          // Create AuthUser with role and permissions from database
          const userRole =
            (userProfile?.role as UserRole) || UserRole.CONTRIBUTOR;
          const authUser: AuthUser = {
            ...user,
            role: userRole,
            permissions: ROLE_PERMISSIONS[userRole],
          } as AuthUser;

          set({ user: authUser, isLoading: false });
        } catch (error) {
          console.error("Error in setUser:", error);
          if (!user || !user.id) {
            set({ user: null, isLoading: false });
            return;
          }
          // Set default role if there's an error
          const authUser: AuthUser = {
            ...user,
            role: UserRole.CONTRIBUTOR,
            permissions: ROLE_PERMISSIONS[UserRole.CONTRIBUTOR],
          } as AuthUser;
          set({ user: authUser, isLoading: false });
        }
      },
      setLoading: (isLoading) => set({ isLoading }),
      setSessionExpiry: (expiry) => set({ sessionExpiry: expiry }),
      setCurrentTeam: (teamId) => set({ currentTeamId: teamId }),
      clearSession: () =>
        set({
          user: null,
          isLoading: false,
          sessionExpiry: null,
          currentTeamId: null,
        }),
      hasPermission: (permission) => {
        const user = get().user;
        return user ? user.permissions.includes(permission) : false;
      },
      hasRole: (role) => {
        const user = get().user;
        return user ? user.role === role : false;
      },
      canAccessRoute: (requiredPermissions) => {
        const user = get().user;
        return user
          ? requiredPermissions.every((permission) =>
              user.permissions.includes(permission)
            )
          : false;
      },
    }),
    {
      name: "auth-storage",
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        user: state.user,
        sessionExpiry: state.sessionExpiry,
        currentTeamId: state.currentTeamId,
      }),
      onRehydrateStorage: () => (state) => {
        // Only set loading to false if we have a user
        if (state?.user) {
          state.isLoading = false;
        }
      },
    }
  )
);
