import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

serve(async (req) => {
  try {
    const { token } = await req.json();

    if (!token) {
      return new Response(JSON.stringify({ error: "Token is required" }), {
        status: 400,
      });
    }

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get the invitation details
    const { data: invitation, error: inviteError } = await supabaseClient
      .from("team_invitations")
      .select("*")
      .eq("token", token)
      .single();

    if (inviteError || !invitation) {
      return new Response(
        JSON.stringify({ error: "Invitation not found or invalid" }),
        { status: 404 }
      );
    }

    // Check if invitation is expired
    if (new Date(invitation.expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: "Invitation has expired" }), {
        status: 400,
      });
    }

    // Get the current user
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
      });
    }

    // Check if user's email matches invitation
    if (user.email !== invitation.email) {
      return new Response(
        JSON.stringify({ error: "Email does not match invitation" }),
        { status: 403 }
      );
    }

    // Add user to team
    const { error: memberError } = await supabaseClient
      .from("team_members")
      .insert([
        {
          team_id: invitation.team_id,
          user_id: user.id,
          role: invitation.role,
        },
      ]);

    if (memberError) {
      if (memberError.code === "23505") {
        return new Response(
          JSON.stringify({ error: "Already a member of this team" }),
          { status: 400 }
        );
      }
      throw memberError;
    }

    // Delete the invitation
    await supabaseClient.from("team_invitations").delete().eq("token", token);

    // Log the acceptance
    await supabaseClient.from("audit_logs").insert([
      {
        action: "team_invite_accepted",
        user_id: user.id,
        team_id: invitation.team_id,
        details: { role: invitation.role },
      },
    ]);

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (error) {
    console.error("Error processing invitation:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
    });
  }
});
