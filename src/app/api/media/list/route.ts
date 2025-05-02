import { NextResponse } from "next/server";

export async function GET() {
  try {
    // TODO: Replace with real data fetching logic
    const media: any[] = [];

    return NextResponse.json({ media });
  } catch (error) {
    console.error("Error in media list endpoint:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
