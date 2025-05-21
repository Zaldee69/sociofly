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

  const tokenResponse = await fetch(
    `https://graph.facebook.com/v21.0/oauth/access_token?client_secret=${process.env.NEXT_PUBLIC_FACEBOOK_CLIENT_SECRET}&client_id=${process.env.NEXT_PUBLIC_FACEBOOK_CLIENT_ID}&code=${code}&redirect_uri=${encodeURIComponent(
      `http://localhost:3000/api/auth/callback/facebook`
    )}`
  );

  const tokenData = await tokenResponse.json();

  if (tokenData.error) {
    const sessionId = crypto.randomUUID();
    await prisma.temporaryData.create({
      data: {
        id: sessionId,
        data: JSON.stringify({
          error: true,
          message: "Failed to get Facebook access token. Please try again.",
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

    return NextResponse.redirect(redirectUrl.toString());
  }

  const accessToken = tokenData.access_token;

  // Get user's Facebook pages
  const pagesResponse = await fetch(
    `https://graph.facebook.com/v21.0/me/accounts?access_token=${accessToken}`
  );

  const pagesData = await pagesResponse.json();

  if (!pagesResponse.ok || !pagesData.data || pagesData.data.length === 0) {
    const sessionId = crypto.randomUUID();
    await prisma.temporaryData.create({
      data: {
        id: sessionId,
        data: JSON.stringify({
          error: true,
          message:
            "No Facebook pages found. You must have at least one Facebook page with admin access.",
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

    return NextResponse.redirect(redirectUrl.toString());
  }

  const datas = [];

  // Store user's Facebook pages
  for (const page of pagesData.data) {
    const profileResponse = await fetch(
      `https://graph.facebook.com/v21.0/${page.id}/picture?type=large&redirect=false&access_token=${page.access_token}`
    );
    const profileData = await profileResponse.json();

    datas.push({
      platform: SocialPlatform.FACEBOOK,
      accessToken: page.access_token,
      profileId: page.id,
      userId: existingUser.id,
      name: page.name,
      profilePicture: profileData.data.url,
    });
  }

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
