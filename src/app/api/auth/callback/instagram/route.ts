import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { SocialPlatform } from "@prisma/client";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const state = searchParams.get("state");
  const code = searchParams.get("code");

  const decodedState = JSON.parse(decodeURIComponent(state!));
  const { userId, userType, orgName, teamEmails, origin } = decodedState;

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
  const response = await fetch(
    "https://graph.facebook.com/v22.0/oauth/access_token",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: process.env.NEXT_PUBLIC_FACEBOOK_CLIENT_ID!,
        client_secret: process.env.NEXT_PUBLIC_FACEBOOK_CLIENT_SECRET!,
        redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback/instagram`,
        code: code,
      }),
    }
  );

  const tokenData = await response.json();

  if (!response.ok) {
    console.error("Facebook token error:", tokenData);
    return NextResponse.json(
      { error: "Failed to get Facebook access token" },
      { status: 400 }
    );
  }

  // Get Instagram Business Account ID
  const pagesResponse = await fetch(
    `https://graph.facebook.com/v22.0/me/accounts?fields=id,name,access_token&access_token=${tokenData.access_token}`
  );

  const accountsData = await pagesResponse.json();

  if (!pagesResponse.ok) {
    console.error("Facebook accounts error:", accountsData);

    // Simpan error dalam temporary data
    const sessionId = crypto.randomUUID();
    await prisma.temporaryData.create({
      data: {
        id: sessionId,
        data: JSON.stringify({
          error: true,
          message: `Failed to fetch Facebook pages: ${accountsData.error?.message || "Unknown error"}. Please ensure your Facebook app has proper permissions.`,
        }),
        expiresAt: new Date(Date.now() + 30 * 60 * 1000), // Expires in 30 minutes
      },
    });

    // Create URL with conditional parameters
    const redirectUrl = new URL(
      origin ? origin : `/onboarding?step=add_social_accounts`,
      process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
    );

    // Only add params if they exist
    if (userType) redirectUrl.searchParams.append("userType", userType);
    if (orgName) redirectUrl.searchParams.append("orgName", orgName);
    if (teamEmails) redirectUrl.searchParams.append("teamEmails", teamEmails);
    redirectUrl.searchParams.append("refresh", "true");
    redirectUrl.searchParams.append("sessionId", sessionId);
    redirectUrl.searchParams.append("error", "true");

    // Redirect with constructed URL
    return NextResponse.redirect(redirectUrl.toString());
  }

  if (!accountsData.data || accountsData.data.length === 0) {
    console.error("No Facebook pages found");

    // Simpan error dalam temporary data
    const sessionId = crypto.randomUUID();
    await prisma.temporaryData.create({
      data: {
        id: sessionId,
        data: JSON.stringify({
          error: true,
          message:
            "No Facebook pages found. You must have at least one Facebook page.",
        }),
        expiresAt: new Date(Date.now() + 30 * 60 * 1000), // Expires in 30 minutes
      },
    });

    // Create URL with conditional parameters
    const redirectUrl = new URL(
      origin ? origin : `/onboarding?step=add_social_accounts`,
      process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
    );

    // Only add params if they exist
    if (userType) redirectUrl.searchParams.append("userType", userType);
    if (orgName) redirectUrl.searchParams.append("orgName", orgName);
    if (teamEmails) redirectUrl.searchParams.append("teamEmails", teamEmails);
    redirectUrl.searchParams.append("refresh", "true");
    redirectUrl.searchParams.append("sessionId", sessionId);
    redirectUrl.searchParams.append("error", "true");

    // Redirect with constructed URL
    return NextResponse.redirect(redirectUrl.toString());
  }

  // Loop through all Facebook Pages to find one with Instagram account
  let instagramBusinessAccount = null;
  let pageId = null;

  // First check all pages for Instagram business accounts
  for (const page of accountsData.data) {
    // Get Instagram Business Account for this page
    const igBusinessResponse = await fetch(
      `https://graph.facebook.com/v22.0/${page.id}?fields=instagram_business_account&access_token=${tokenData.access_token}`
    );

    const igBusinessData = await igBusinessResponse.json();

    if (igBusinessResponse.ok && igBusinessData.instagram_business_account) {
      instagramBusinessAccount = igBusinessData.instagram_business_account;
      pageId = page.id;
      break;
    }
  }

  if (!instagramBusinessAccount) {
    console.error(
      "No Instagram business account found for any of your Facebook pages"
    );

    // Simpan error dalam temporary data
    const sessionId = crypto.randomUUID();
    await prisma.temporaryData.create({
      data: {
        id: sessionId,
        data: JSON.stringify({
          error: true,
          message:
            "None of your Facebook pages have an Instagram business account connected. Please connect an Instagram business account to one of your Facebook pages.",
        }),
        expiresAt: new Date(Date.now() + 30 * 60 * 1000), // Expires in 30 minutes
      },
    });

    // Create URL with conditional parameters
    const redirectUrl = new URL(
      origin ? origin : `/onboarding?step=add_social_accounts`,
      process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
    );

    // Only add params if they exist
    if (userType) redirectUrl.searchParams.append("userType", userType);
    if (orgName) redirectUrl.searchParams.append("orgName", orgName);
    if (teamEmails) redirectUrl.searchParams.append("teamEmails", teamEmails);
    redirectUrl.searchParams.append("refresh", "true");
    redirectUrl.searchParams.append("sessionId", sessionId);
    redirectUrl.searchParams.append("error", "true");

    // Redirect with constructed URL
    return NextResponse.redirect(redirectUrl.toString());
  }

  // Get Instagram Business Account details
  const igDetailsResponse = await fetch(
    `https://graph.facebook.com/v22.0/${instagramBusinessAccount.id}?fields=id,username,profile_picture_url&access_token=${tokenData.access_token}`
  );

  const instagramAccountData = await igDetailsResponse.json();

  if (!igDetailsResponse.ok) {
    console.error("Instagram account details error:", instagramAccountData);

    // Simpan error dalam temporary data
    const sessionId = crypto.randomUUID();
    await prisma.temporaryData.create({
      data: {
        id: sessionId,
        data: JSON.stringify({
          error: true,
          message: "Failed to get Instagram account details. Please try again.",
        }),
        expiresAt: new Date(Date.now() + 30 * 60 * 1000), // Expires in 30 minutes
      },
    });

    // Create URL with conditional parameters
    const redirectUrl = new URL(
      origin ? origin : `/onboarding?step=add_social_accounts`,
      process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
    );

    // Only add params if they exist
    if (userType) redirectUrl.searchParams.append("userType", userType);
    if (orgName) redirectUrl.searchParams.append("orgName", orgName);
    if (teamEmails) redirectUrl.searchParams.append("teamEmails", teamEmails);
    redirectUrl.searchParams.append("refresh", "true");
    redirectUrl.searchParams.append("sessionId", sessionId);
    redirectUrl.searchParams.append("error", "true");

    // Redirect with constructed URL
    return NextResponse.redirect(redirectUrl.toString());
  }

  const datas = [
    {
      platform: SocialPlatform.INSTAGRAM,
      accessToken: tokenData.access_token,
      profileId: instagramBusinessAccount.id,
      userId: existingUser.id,
      name: instagramAccountData.username,
      profilePicture: instagramAccountData.profile_picture_url,
    },
  ];

  const sessionId = crypto.randomUUID();

  await prisma.temporaryData.create({
    data: {
      id: sessionId,
      data: JSON.stringify(datas),
      expiresAt: new Date(Date.now() + 30 * 60 * 1000), // Expires in 30 minutes
    },
  });

  // Create URL with conditional parameters for successful redirect
  const successRedirectUrl = new URL(
    origin ? origin : `/onboarding?step=add_social_accounts`,
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
  );

  // Only add params if they exist
  if (userType) successRedirectUrl.searchParams.append("userType", userType);
  if (orgName) successRedirectUrl.searchParams.append("orgName", orgName);
  if (teamEmails)
    successRedirectUrl.searchParams.append("teamEmails", teamEmails);
  successRedirectUrl.searchParams.append("refresh", "true");
  successRedirectUrl.searchParams.append("sessionId", sessionId);

  return NextResponse.redirect(successRedirectUrl.toString());
}
