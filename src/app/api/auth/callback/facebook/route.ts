// /api/auth/callback/facebook

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { SocialPlatform } from "@prisma/client";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const state = searchParams.get("state");
  const code = searchParams.get("code");

  if (!state || !code) {
    return NextResponse.json(
      { error: "Missing state or code" },
      { status: 400 }
    );
  }

  const existingUser = await prisma.user.findUnique({
    where: {
      clerkId: state,
    },
    include: {
      memberships: {
        take: 1,
      },
    },
  });

  console.log("state", state);
  console.log("existingUser", existingUser);

  if (!existingUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Get or create organization
  let organizationId = existingUser.memberships[0]?.organizationId;
  if (!organizationId) {
    const organization = await prisma.organization.create({
      data: {
        name: `${existingUser.name || existingUser.email}'s Organization`,
        slug: `${existingUser.email.split("@")[0]}-org`,
      },
    });
    organizationId = organization.id;

    // Create membership
    await prisma.membership.create({
      data: {
        userId: existingUser.id,
        organizationId: organization.id,
        role: "ADMIN",
      },
    });
  }

  const tokenResponse = await fetch(
    `https://graph.facebook.com/v21.0/oauth/access_token?client_secret=${process.env.NEXT_PUBLIC_FACEBOOK_CLIENT_SECRET}&client_id=${process.env.NEXT_PUBLIC_FACEBOOK_CLIENT_ID}&code=${code}&redirect_uri=${encodeURIComponent(
      `http://localhost:3000/api/auth/callback/facebook`
    )}`
  );

  const tokenData = await tokenResponse.json();

  if (tokenData.error) {
    return NextResponse.json({ tokenData }, { status: 200 });
  }

  const accessToken = tokenData.access_token;

  // Get user info using the access token
  const userResponse = await fetch(
    `https://graph.facebook.com/v21.0/me?fields=id&access_token=${accessToken}`
  );

  const userData = await userResponse.json();
  console.log("userData", userData);

  // Get user's Facebook pages
  const pagesResponse = await fetch(
    `https://graph.facebook.com/v21.0/me/accounts?access_token=${accessToken}`
  );

  const pagesData = await pagesResponse.json();

  // Store user's Facebook pages
  for (const page of pagesData.data) {
    await prisma.socialAccount.create({
      data: {
        platform: SocialPlatform.FACEBOOK,
        accessToken: page.access_token,
        userId: existingUser.id,
        organizationId,
        name: page.name,
      },
    });
  }

  return NextResponse.redirect(
    new URL("/onboarding?step=add_social_accounts", request.url)
  );
}
