// src/hooks/use-auth-register.ts
import { RegisterFormData } from "@/lib/validations/auth";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { useAuthStore } from "@/lib/stores/use-auth-store";
import { createClient } from "@/lib/utils/supabase/client";
import { UserRole, TeamRole } from "@/lib/types/auth";

interface UseRegister {
  isLoading: boolean;
  register: (data: RegisterFormData) => Promise<void>;
}

export function useRegister(): UseRegister {
  const router = useRouter();
  const { setUser, setLoading } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const supabase = createClient();

  const register = async (data: RegisterFormData) => {
    // Prevent double submission
    if (isSubmitting) {
      console.log("Registration already in progress");
      return;
    }

    try {
      setIsSubmitting(true);
      setIsLoading(true);
      setLoading(true);

      // Check if email already exists
      const { data: existingUsers, error: checkError } = await supabase
        .from("user_profile")
        .select("email")
        .eq("email", data.email);

      if (checkError) {
        console.error("Error checking email:", checkError);
        toast.error("Error checking email availability. Please try again.");
        return;
      }

      if (existingUsers && existingUsers.length > 0) {
        toast.error(
          "This email is already registered. Please try logging in instead.",
          {
            action: {
              label: "Go to Login",
              onClick: () => router.push("/login"),
            },
          }
        );
        return;
      }

      // Register the user first
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (authError) {
        if (authError.message.includes("already registered")) {
          toast.error(
            "This email is already registered. Please try logging in instead.",
            {
              action: {
                label: "Go to Login",
                onClick: () => router.push("/login"),
              },
            }
          );
          return;
        }
        throw authError;
      }

      if (!authData.user?.id) {
        throw new Error("User registration failed");
      }

      // User profile is automatically created by database trigger
      // No need to manually create it here

      let teamId: string | null = null;
      let teamRole: TeamRole;

      // If there's an invitation token, get the team role from invitation
      if (data.inviteToken) {
        const { data: invitation, error: inviteError } = await supabase
          .from("team_invitations")
          .select("*")
          .eq("token", data.inviteToken)
          .single();

        if (inviteError) {
          console.error("Error fetching invitation:", inviteError);
          return;
        }

        if (!invitation) {
          console.error("Invitation not found");
          return;
        }

        teamId = invitation.team_id;
        teamRole = invitation.role as TeamRole;

        // Add user to team with invited role
        const { error: memberError } = await supabase
          .from("team_members")
          .insert([
            {
              team_id: invitation.team_id,
              user_id: authData.user.id,
              role: teamRole,
            },
          ]);

        if (memberError) {
          console.error("Error accepting invitation:", memberError);
          return;
        }

        // Delete the invitation
        await supabase
          .from("team_invitations")
          .delete()
          .eq("token", data.inviteToken);

        // Log the acceptance
        await supabase.from("audit_logs").insert([
          {
            action: "team_invite_accepted",
            user_id: authData.user.id,
            team_id: invitation.team_id,
            details: { role: teamRole },
          },
        ]);
      } else {
        // For normal registration, create a new team
        const { data: newTeam, error: teamError } = await supabase
          .from("teams")
          .insert([
            {
              name: `${data.email}'s Team`,
            },
          ])
          .select()
          .single();

        if (teamError) {
          console.error("Error creating team:", teamError);
          return;
        }

        teamId = newTeam.id;
        teamRole = TeamRole.ADMIN;

        // Add user as admin to their team
        const { error: memberError } = await supabase
          .from("team_members")
          .insert([
            {
              team_id: newTeam.id,
              user_id: authData.user.id,
              role: teamRole,
            },
          ]);

        if (memberError) {
          console.error("Error adding user to team:", memberError);
          return;
        }

        // Update user's role to ADMIN since they created a team
        const { error: updateRoleError } = await supabase
          .from("user_profile")
          .update({ role: UserRole.ADMIN })
          .eq("user_id", authData.user.id);

        if (updateRoleError) {
          console.error("Error updating user role:", updateRoleError);
          return;
        }

        // Log team creation
        await supabase.from("audit_logs").insert([
          {
            action: "team_created",
            user_id: authData.user.id,
            team_id: newTeam.id,
            details: { role: teamRole },
          },
        ]);
      }

      // Only redirect if everything was successful
      router.push(`/auth/verify-email?email=${encodeURIComponent(data.email)}`);
    } catch (error) {
      console.error("Registration error:", error);
      toast.error("Registration failed. Please try again.");
    } finally {
      setIsLoading(false);
      setLoading(false);
      setIsSubmitting(false);
    }
  };

  return { isLoading, register };
}
