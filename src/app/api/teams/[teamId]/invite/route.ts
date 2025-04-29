import { createClient } from "@/lib/utils/supabase/server";
import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { sendInvitationEmail } from "@/lib/email";

export async function POST(
  request: Request,
  { params }: { params: { teamId: string } }
) {
  try {
    const supabase = await createClient();
    const { teamId } = params;
    const { email, role } = await request.json();

    // Get current user for audit
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Anda harus login terlebih dahulu" },
        { status: 401 }
      );
    }

    // Check if user has permission to invite
    const { data: teamMember, error: teamError } = await supabase
      .from("team_members")
      .select("role")
      .eq("team_id", teamId)
      .eq("user_id", user.id)
      .single();

    if (teamError || !teamMember || teamMember.role !== "admin") {
      return NextResponse.json(
        { error: "Hanya admin tim yang dapat mengirim undangan" },
        { status: 403 }
      );
    }

    // Check if email already exists in user_profile
    const { data: existingUser, error: userError } = await supabase
      .from("user_profile")
      .select("user_id")
      .eq("email", email)
      .single();

    if (userError && userError.code !== "PGRST116") {
      // PGRST116 means no rows found
      throw userError;
    }

    if (existingUser) {
      // Check if user is already a team member
      const { data: existingMember, error: memberCheckError } = await supabase
        .from("team_members")
        .select("team_id, user_id")
        .eq("team_id", teamId)
        .eq("user_id", existingUser.user_id)
        .single();

      if (memberCheckError && memberCheckError.code !== "PGRST116") {
        throw memberCheckError;
      }

      if (existingMember) {
        return NextResponse.json(
          { error: "Pengguna sudah menjadi anggota tim ini" },
          { status: 400 }
        );
      }

      // Add user directly to team
      const { error: memberError } = await supabase
        .from("team_members")
        .insert([
          {
            team_id: teamId,
            user_id: existingUser.user_id,
            role,
          },
        ]);

      if (memberError) {
        if (memberError.code === "23505") {
          return NextResponse.json(
            { error: "Pengguna sudah menjadi anggota tim ini" },
            { status: 400 }
          );
        }
        throw memberError;
      }

      return NextResponse.json({ success: true, type: "direct_add" });
    } else {
      // Check if there's already a pending invitation
      const { data: existingInvite, error: inviteCheckError } = await supabase
        .from("team_invitations")
        .select("team_id, email")
        .eq("team_id", teamId)
        .eq("email", email)
        .single();

      if (inviteCheckError && inviteCheckError.code !== "PGRST116") {
        throw inviteCheckError;
      }

      if (existingInvite) {
        return NextResponse.json(
          { error: "Undangan sudah terkirim ke email ini" },
          { status: 400 }
        );
      }

      // Create new invitation
      const token = randomUUID();
      const { error: inviteError } = await supabase
        .from("team_invitations")
        .insert([
          {
            team_id: teamId,
            email,
            token,
            role,
          },
        ]);

      if (inviteError) {
        if (inviteError.code === "23505") {
          return NextResponse.json(
            { error: "Undangan sudah terkirim ke email ini" },
            { status: 400 }
          );
        }
        throw inviteError;
      }

      // Send invitation email
      const emailSent = await sendInvitationEmail(email, token);

      console.log("emailSent", emailSent);

      if (!emailSent) {
        // If email fails, delete the invitation
        await supabase.from("team_invitations").delete().eq("token", token);

        return NextResponse.json(
          { error: "Gagal mengirim email undangan" },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true, type: "invitation_sent" });
    }
  } catch (error) {
    console.error("Error processing team invitation:", error);
    return NextResponse.json(
      { error: "Gagal memproses undangan" },
      { status: 500 }
    );
  }
}
