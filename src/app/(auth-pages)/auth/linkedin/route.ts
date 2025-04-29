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
    // 1. Get access token from LinkedIn
    const tokenUrl = `https://www.linkedin.com/oauth/v2/accessToken?grant_type=authorization_code&code=${code}&client_id=${process.env.NEXT_PUBLIC_LINKEDIN_CLIENT_ID}&client_secret=${process.env.NEXT_PUBLIC_LINKEDIN_CLIENT_SECRET}&redirect_uri=${process.env.NEXT_PUBLIC_LINKEDIN_REDIRECT_URI}`;

    const tokenRes = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    const tokenData = await tokenRes.json();
    console.log("tokenData", tokenData);

    if (!tokenData.access_token) {
      console.error("No access token in response:", tokenData);
      return NextResponse.json(
        { error: "Failed to get access token" },
        { status: 400 }
      );
    }

    const { access_token, expires_in } = tokenData;

    // 2. Get LinkedIn profile
    const profileRes = await fetch(
      "https://api.linkedin.com/v2/me?projection=(id,localizedFirstName,localizedLastName,profilePicture(displayImage~:playableStreams))",
      {
        headers: {
          Authorization: `Bearer ${access_token}`,
          "X-Restli-Protocol-Version": "2.0.0",
        },
      }
    );

    const profileData = await profileRes.json();
    console.log("profileData", profileData);

    let expiresAt = null;
    if (expires_in) {
      const calculatedExpiresAt = new Date(Date.now() + expires_in * 1000);
      if (!isNaN(calculatedExpiresAt.getTime())) {
        expiresAt = calculatedExpiresAt.toISOString();
      }
    }

    // 3. Save LinkedIn account
    const { error: linkedinError } = await supabase
      .from("social_accounts")
      .upsert({
        user_id: userId,
        platform: "linkedin",
        access_token: access_token,
        platform_user_id: profileData.id,
        username: `${profileData.localizedFirstName} ${profileData.localizedLastName}`,
        profile_picture_url:
          profileData.profilePicture?.["displayImage~"]?.elements?.[0]
            ?.identifiers?.[0]?.identifier,
        expires_at: expiresAt,
      });

    if (linkedinError) {
      console.error("LinkedIn error:", linkedinError);
      throw linkedinError;
    }

    return NextResponse.redirect(new URL("/dashboard", req.url));
  } catch (error) {
    console.error("LinkedIn integration failed:", error);
    return NextResponse.json(
      { error: "LinkedIn integration failed" },
      { status: 500 }
    );
  }
}
