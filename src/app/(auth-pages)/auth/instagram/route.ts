import { NextResponse } from "next/server";
import { createClient } from "@/lib/utils/supabase/server";

interface FacebookPage {
  id: string;
  name: string;
  access_token: string;
  instagram_business_account?: {
    id: string;
  };
}

interface InstagramAccount {
  username: string;
  profile_picture_url: string;
}

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
    const tokenUrl = `https://graph.facebook.com/v18.0/oauth/access_token?client_secret=${process.env.NEXT_PUBLIC_FACEBOOK_CLIENT_SECRET}&client_id=${process.env.NEXT_PUBLIC_FACEBOOK_CLIENT_ID}&redirect_uri=${process.env.NEXT_PUBLIC_INSTAGRAM_REDIRECT_URI}&code=${code}`;

    console.log("tokenUrl", tokenUrl);

    const tokenRes = await fetch(tokenUrl);
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

    // 2. Get Facebook Pages
    const pageRes = await fetch(
      `https://graph.facebook.com/v20.0/me/accounts?access_token=${access_token}`
    );

    console.log(
      "pageRes",
      `https://graph.facebook.com/v20.0/me/accounts?access_token=${access_token}`
    );

    const pageData = await pageRes.json();
    console.log("pageData", pageData);

    if (pageData.error) {
      console.error("Error getting pages:", pageData.error);
      return NextResponse.json(
        { error: "Failed to get Facebook pages" },
        { status: 400 }
      );
    }

    const { data: pages } = pageData;
    console.log("pages", pages);

    if (!pages || pages.length === 0) {
      return NextResponse.json(
        { error: "No Facebook pages found" },
        { status: 400 }
      );
    }

    let expiresAt = null;
    if (expires_in) {
      const calculatedExpiresAt = new Date(Date.now() + expires_in * 1000);
      if (!isNaN(calculatedExpiresAt.getTime())) {
        expiresAt = calculatedExpiresAt.toISOString();
      }
    }

    // Process each page
    for (const page of pages) {
      // Get Instagram Business Account for this page
      const instagramRes = await fetch(
        `https://graph.facebook.com/v22.0/${page.id}?fields=instagram_business_account&access_token=${access_token}`
      );

      const instagramData = await instagramRes.json();
      console.log("instagramData for page", page.name, instagramData);

      const { instagram_business_account } = instagramData;

      // Skip if no Instagram business account
      if (!instagram_business_account) {
        console.log(`No Instagram business account for page ${page.name}`);
        continue;
      }

      // Get Instagram account details
      const instagramAccountRes = await fetch(
        `https://graph.facebook.com/v22.0/${instagram_business_account.id}?fields=username,profile_picture_url&access_token=${access_token}`
      );

      const instagramAccountData =
        (await instagramAccountRes.json()) as InstagramAccount;
      console.log(
        "instagramAccountData for page",
        page.name,
        instagramAccountData
      );

      // Save Instagram account
      const { error: instagramError } = await supabase
        .from("social_accounts")
        .upsert({
          user_id: userId,
          platform: "instagram",
          access_token: page.access_token, // Use page access token
          platform_user_id: instagram_business_account.id,
          username: instagramAccountData.username,
          profile_picture_url: instagramAccountData.profile_picture_url,
          expires_at: expiresAt,
        });

      if (instagramError) {
        console.error(
          `Instagram error for account ${instagramAccountData.username}:`,
          instagramError
        );
        continue; // Continue with next page even if one fails
      }
    }

    return NextResponse.redirect(new URL("/dashboard", req.url));
  } catch (error) {
    console.error("Instagram integration failed:", error);
    return NextResponse.json(
      { error: "Instagram integration failed" },
      { status: 500 }
    );
  }
}
