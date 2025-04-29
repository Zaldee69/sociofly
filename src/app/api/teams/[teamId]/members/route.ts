import { createClient } from "@/lib/utils/supabase/server";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  context: { params: { teamId: string } }
) {
  try {
    const supabase = await createClient();
    const { teamId } = await context.params;

    const { data, error } = await supabase
      .from("team_member_details")
      .select("*")
      .eq("team_id", teamId);

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching team members:", error);
    return NextResponse.json(
      { error: "Failed to fetch team members" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  context: { params: { teamId: string } }
) {
  try {
    const supabase = await createClient();
    const { teamId } = await context.params;
    const { email, role } = await request.json();

    // First, get the user ID from the email
    const { data: userData, error: userError } = await supabase
      .from("user_profile")
      .select("user_id")
      .eq("email", email)
      .single();

    if (userError) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Add the user to the team
    const { error: memberError } = await supabase.from("team_members").insert([
      {
        team_id: teamId,
        user_id: userData.user_id,
        role,
      },
    ]);

    if (memberError) throw memberError;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error adding team member:", error);
    return NextResponse.json(
      { error: "Failed to add team member" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  context: { params: { teamId: string } }
) {
  try {
    const supabase = await createClient();
    const { teamId } = await context.params;
    const { userId } = await request.json();

    const { error } = await supabase
      .from("team_members")
      .delete()
      .eq("team_id", teamId)
      .eq("user_id", userId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error removing team member:", error);
    return NextResponse.json(
      { error: "Failed to remove team member" },
      { status: 500 }
    );
  }
}
