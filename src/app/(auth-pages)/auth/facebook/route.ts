import { NextResponse } from "next/server";
import { createClient } from "@/lib/utils/supabase/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const userId = searchParams.get("state"); // ID user dari session
  const supabase = await createClient();

  if (!code || !userId) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  try {
    // 1. Dapatkan access token dari Facebook
    const tokenUrl = `https://graph.facebook.com/v18.0/oauth/access_token?client_secret=${process.env.NEXT_PUBLIC_FACEBOOK_CLIENT_SECRET}&client_id=${process.env.NEXT_PUBLIC_FACEBOOK_CLIENT_ID}&redirect_uri=${process.env.NEXT_PUBLIC_FACEBOOK_REDIRECT_URI}&code=${code}`;

    const tokenRes = await fetch(tokenUrl);
    const { access_token, expires_in } = await tokenRes.json();


    const pageRes = await fetch(
      `https://graph.facebook.com/v18.0/me/accounts?access_token=${access_token}`
    );
    const { data: pages } = await pageRes.json();
    const page = pages[0];

    let expiresAt = null;
    if (expires_in) {
      const calculatedExpiresAt = new Date(Date.now() + expires_in * 1000);
      if (!isNaN(calculatedExpiresAt.getTime())) {
        expiresAt = calculatedExpiresAt.toISOString();
      }
    }

    const { error } = await supabase.from("social_accounts").upsert(
      {
        user_id: userId,
        platform: "facebook",
        access_token: page.access_token,
        platform_user_id: page.id,
        username: page.name,
        expires_at: expiresAt,
      },
    );

    if (error) {
      console.log("error", error);
      throw error;
    }

    return NextResponse.redirect(new URL("/dashboard", req.url));
  } catch (error) {
    console.error("Facebook integration failed:", error);
    return NextResponse.json(
      { error: "Facebook integration failed" },
      { status: 500 }
    );
  }
}
