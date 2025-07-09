import { Webhook } from "svix";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { clerkClient } from "@clerk/nextjs/server";

const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET!;

export async function POST(req: Request) {
  try {
    const headerPayload = await headers();
    const svix_id = headerPayload.get("svix-id");
    const svix_timestamp = headerPayload.get("svix-timestamp");
    const svix_signature = headerPayload.get("svix-signature");

    if (!svix_id || !svix_timestamp || !svix_signature) {
      return new NextResponse("Missing svix headers", { status: 400 });
    }

    const payload = await req.json();
    const body = JSON.stringify(payload);

    const wh = new Webhook(WEBHOOK_SECRET);
    let evt;

    try {
      evt = wh.verify(body, {
        "svix-id": svix_id,
        "svix-timestamp": svix_timestamp,
        "svix-signature": svix_signature,
      });
    } catch (err) {
      console.error("❌ Invalid webhook signature", err);
      return new NextResponse("Invalid webhook signature", { status: 401 });
    }

    const { type, data } = evt as { type: string; data: any };

    if (type === "user.created") {
      const user = data;
      const email = user.email_addresses?.[0]?.email_address || "";

      // Check for pending invitations before creating user
      const pendingInvitations = await prisma.invitation.findMany({
        where: {
          email,
          acceptedAt: null,
          rejectedAt: null,
        },
        include: {
          team: true,
        },
      });

      // If user has pending invitations, set onboardingStatus to COMPLETED
      const onboardingStatus =
        pendingInvitations.length > 0 ? "COMPLETED" : "NOT_STARTED";

      // Create the user in our database
      await prisma.user.create({
        data: {
          clerkId: user.id,
          email,
          name:
            [user.first_name, user.last_name]
              .filter(Boolean)
              .join(" ")
              .trim() || null,
          onboardingStatus, // Set based on invitations
        },
      });

      // Update Clerk user metadata to match onboarding status
      const clerk = await clerkClient();
      await clerk.users.updateUser(user.id, {
        publicMetadata: {
          onboardingComplete: onboardingStatus === "COMPLETED",
        },
      });

      console.log(
        `✅ User created with status ${onboardingStatus} and invitations processed:`,
        user.id
      );
      return new NextResponse("User created", { status: 200 });
    }

    // Handle user.updated event to sync onboarding status
    if (type === "user.updated") {
      const user = data;
      const clerkId = user.id;

      // Find the user in our database
      const dbUser = await prisma.user.findUnique({
        where: { clerkId },
      });

      if (dbUser) {
        // Sync the onboardingComplete metadata with our database
        const isOnboardingComplete = dbUser.onboardingStatus === "COMPLETED";
        const currentMetadata = user.public_metadata || {};

        // Check if the metadata already matches to prevent infinite loop
        if (currentMetadata.onboardingComplete === isOnboardingComplete) {
          console.log(
            `⏭️ Skipping metadata update for user ${clerkId} - already in sync`
          );
          return new NextResponse("Already in sync", { status: 200 });
        }

        try {
          const clerk = await clerkClient();

          // Update user metadata
          await clerk.users.updateUser(clerkId, {
            publicMetadata: {
              ...currentMetadata,
              onboardingComplete: isOnboardingComplete,
            },
          });

          console.log(
            `✅ Updated Clerk metadata for user ${clerkId}. onboardingComplete: ${isOnboardingComplete}`
          );
        } catch (error) {
          console.error("Failed to update user:", error);
        }
      }

      return new NextResponse("User updated", { status: 200 });
    }

    if (type === "user.deleted") {
      const user = data;
      const clerkId = user.id;
      // Delete user and their owned teams
      const dbUser = await prisma.user.findUnique({
        where: { clerkId },
        include: { teams: true },
      });

      if (dbUser) {
        const teamIds = dbUser.teams.map((team) => team.id);

        // Delete all related records in the correct order
        await prisma.$transaction([
          // First delete records from tables that reference teams
          prisma.membership.deleteMany({ where: { teamId: { in: teamIds } } }),
          prisma.socialAccount.deleteMany({
            where: { teamId: { in: teamIds } },
          }),
          prisma.post.deleteMany({ where: { teamId: { in: teamIds } } }),
          prisma.invitation.deleteMany({ where: { teamId: { in: teamIds } } }),
          prisma.media.deleteMany({ where: { teamId: { in: teamIds } } }),
          prisma.customRole.deleteMany({ where: { teamId: { in: teamIds } } }),
          prisma.approvalWorkflow.deleteMany({
            where: { teamId: { in: teamIds } },
          }),
          prisma.engagementHotspot.deleteMany({
            where: { teamId: { in: teamIds } },
          }),

          // Then delete the teams
          prisma.team.deleteMany({ where: { ownerId: dbUser.id } }),

          // Finally delete the user
          prisma.user.delete({ where: { clerkId } }),
        ]);
      }
      return new NextResponse("User deleted", { status: 200 });
    }

    return new NextResponse("Event ignored", { status: 200 });
  } catch (error) {
    console.error("Webhook error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
