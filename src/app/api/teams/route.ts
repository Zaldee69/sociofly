import { withRoleAuth } from "@/lib/api/with-role-auth";
import { Permission, UserRole } from "@/lib/types/auth";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/utils/supabase/server";

export async function POST(request: NextRequest) {
  return withRoleAuth(
    request,
    {
      requiredRole: [UserRole.ADMIN],
      requiredPermissions: [Permission.CREATE_TEAM],
    },
    async (user) => {
      try {
        const supabase = await createClient();
        const body = await request.json();

        // Create team
        const { data: team, error: teamError } = await supabase
          .from("teams")
          .insert({
            name: body.name,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (teamError) {
          throw teamError;
        }

        // Add creator as team admin
        const { error: memberError } = await supabase
          .from("team_members")
          .insert({
            team_id: team.id,
            user_id: user.id,
            role: "admin",
            created_at: new Date().toISOString(),
          });

        if (memberError) {
          throw memberError;
        }

        return NextResponse.json(team);
      } catch (error) {
        console.error("Team creation error:", error);
        return NextResponse.json(
          { error: "Failed to create team" },
          { status: 500 }
        );
      }
    }
  );
}

export async function GET() {
  try {
    const supabase = await createClient();

    // Get teams
    const { data: teams, error: teamsError } = await supabase
      .from("teams")
      .select("*")
      .order("created_at", { ascending: false });

    if (teamsError) throw teamsError;

    // Get member counts
    const { data: memberDetails, error: countError } = await supabase
      .from("team_member_details")
      .select("team_id");

    if (countError) throw countError;

    const memberCounts: Record<string, number> = {};
    memberDetails?.forEach((member) => {
      memberCounts[member.team_id] = (memberCounts[member.team_id] || 0) + 1;
    });

    return NextResponse.json({
      teams,
      memberCounts,
    });
  } catch (error) {
    console.error("Error fetching teams:", error);
    return NextResponse.json(
      { error: "Failed to fetch teams" },
      { status: 500 }
    );
  }
}
