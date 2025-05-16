import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { SocialPlatform } from "@prisma/client";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const state = searchParams.get("state");
  const code = searchParams.get("code");

  const decodedState = JSON.parse(decodeURIComponent(state!));
  const { userId, userType, orgName, teamEmails } = decodedState;

  if (!state || !code) {
    return NextResponse.json(
      { error: "Missing state or code" },
      { status: 400 }
    );
  }

  const existingUser = await prisma.user.findUnique({
    where: {
      clerkId: userId,
    },
    include: {
      memberships: {
        take: 1,
      },
    },
  });

  if (!existingUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Exchange code for access token
  const tokenUrl = new URL(
    "https://graph.facebook.com/v21.0/oauth/access_token"
  );
  tokenUrl.searchParams.append(
    "client_id",
    process.env.NEXT_PUBLIC_FACEBOOK_CLIENT_ID!
  );
  tokenUrl.searchParams.append(
    "client_secret",
    process.env.NEXT_PUBLIC_FACEBOOK_CLIENT_SECRET!
  );
  tokenUrl.searchParams.append(
    "redirect_uri",
    `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback/instagram`
  );
  tokenUrl.searchParams.append("code", code);

  const tokenResponse = await fetch(tokenUrl.toString(), {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  const tokenData = await tokenResponse.json();

  if (!tokenResponse.ok) {
    console.error("Facebook token error:", tokenData);
    return NextResponse.json(
      { error: "Failed to get Facebook access token" },
      { status: 400 }
    );
  }

  // Get Instagram Business Account ID
  const accountsResponse = await fetch(
    `https://graph.facebook.com/v21.0/me/accounts?access_token=${tokenData.access_token}`
  );

  const accountsData = await accountsResponse.json();

  if (!accountsResponse.ok) {
    console.error("Facebook accounts error:", accountsData);
    return NextResponse.json(
      { error: "Failed to get Facebook accounts" },
      { status: 400 }
    );
  }

  // Get Instagram Business Account
  const instagramResponse = await fetch(
    `https://graph.facebook.com/v21.0/${accountsData.data[0].id}?fields=instagram_business_account&access_token=${tokenData.access_token}`
  );

  const instagramData = await instagramResponse.json();

  if (!instagramResponse.ok) {
    console.error("Instagram business account error:", instagramData);
    return NextResponse.json(
      { error: "Failed to get Instagram business account" },
      { status: 400 }
    );
  }

  // Get Instagram Business Account details
  const instagramAccountResponse = await fetch(
    `https://graph.facebook.com/v21.0/${instagramData.instagram_business_account.id}?fields=id,username,profile_picture_url&access_token=${tokenData.access_token}`
  );

  const instagramAccountData = await instagramAccountResponse.json();

  if (!instagramAccountResponse.ok) {
    console.error("Instagram account details error:", instagramAccountData);
    return NextResponse.json(
      { error: "Failed to get Instagram account details" },
      { status: 400 }
    );
  }

  const datas = [
    {
      platform: SocialPlatform.INSTAGRAM,
      accessToken: tokenData.access_token,
      pagesId: instagramData.instagram_business_account.id,
      userId: existingUser.id,
      name: instagramAccountData.username,
      profilePicture: instagramAccountData.profile_picture_url,
    },
  ];

  const data = encodeURIComponent(JSON.stringify(datas));

  return NextResponse.redirect(
    new URL(
      `/onboarding?step=add_social_accounts&userType=${userType}&orgName=${orgName}&teamEmails=${teamEmails}&refresh=true&pagesData=${data}`,
      request.url
    )
  );
}
