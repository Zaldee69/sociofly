import { createClient } from "@/lib/utils/supabase/server";
import { NextResponse } from "next/server";
import { type NextRequest } from "next/server";
import { withRoleAuth } from "@/lib/api/with-role-auth";
import { Permission } from "@/lib/types/auth";

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json(
        { error: "Token undangan tidak ditemukan" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Get the invitation details
    const { data: invitation, error: inviteError } = await supabase
      .from("team_invitations")
      .select("*")
      .eq("token", token)
      .single();

    if (inviteError || !invitation) {
      return NextResponse.json(
        { error: "Undangan tidak valid atau sudah kadaluarsa" },
        { status: 400 }
      );
    }

    // Check if invitation is expired
    if (new Date(invitation.expires_at) < new Date()) {
      return NextResponse.json(
        { error: "Undangan sudah kadaluarsa" },
        { status: 400 }
      );
    }

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    // If user is not logged in, redirect to signup with invitation data
    if (userError || !user) {
      return NextResponse.json(
        {
          error: "Unauthorized",
          redirectTo: `/register?invite_token=${token}&email=${invitation.email}`,
        },
        { status: 401 }
      );
    }

    // Now that we know the user exists, check permissions
    return withRoleAuth(
      request,
      {
        requiredPermissions: [Permission.INVITE_MEMBER],
      },
      async (authUser) => {
        try {
          // Add user to team
          const { error: memberError } = await supabase
            .from("team_members")
            .insert([
              {
                team_id: invitation.team_id,
                user_id: authUser.id,
                role: invitation.role,
              },
            ]);

          console.log("memberError", memberError);

          if (memberError) {
            if (memberError.code === "23505") {
              return NextResponse.json(
                { error: "Anda sudah menjadi anggota tim ini" },
                { status: 400 }
              );
            }
            throw memberError;
          }

          // Delete the invitation
          await supabase.from("team_invitations").delete().eq("token", token);

          // Log the acceptance
          await supabase.from("audit_logs").insert([
            {
              action: "team_invite_accepted",
              user_id: authUser.id,
              team_id: invitation.team_id,
              details: { role: invitation.role },
            },
          ]);

          return NextResponse.json({ success: true });
        } catch (error) {
          console.error("Error processing invitation:", error);
          return NextResponse.json(
            { error: "Terjadi kesalahan saat memproses undangan" },
            { status: 500 }
          );
        }
      }
    );
  } catch (error) {
    console.error("Error processing invitation:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan saat memproses undangan" },
      { status: 500 }
    );
  }
}
