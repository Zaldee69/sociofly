import { NextResponse } from "next/server";
import { type NextRequest } from "next/server";

export async function withAuth(
  req: NextRequest,
  handler: (user: any) => Promise<Response>
) {
  try {
    // TODO: Implement new authentication logic
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
