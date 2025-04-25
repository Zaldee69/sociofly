import { createClient } from "@/lib/utils/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const supabase = await createClient();
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Fetch all media for the current user
    const { data: media, error } = await supabase
      .from("media")
      .select("*")
      .eq("user_id", user.id)
      .order("uploaded_at", { ascending: false });

    if (error) {
      console.error("Error fetching media:", error);
      return NextResponse.json(
        { error: "Failed to fetch media" },
        { status: 500 }
      );
    }

    return NextResponse.json({ media });
  } catch (error) {
    console.error("Error in media list endpoint:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
