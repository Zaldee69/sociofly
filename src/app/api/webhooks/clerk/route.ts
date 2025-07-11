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
        await prisma.$transaction(async (tx) => {
          // First, get all workflow IDs to delete their dependent records
          const workflows = await tx.approvalWorkflow.findMany({
            where: { teamId: { in: teamIds } },
            select: { id: true },
          });
          const workflowIds = workflows.map(w => w.id);

          // Delete approval-related records in correct dependency order
          if (workflowIds.length > 0) {
            // Delete ApprovalAssignment first (depends on ApprovalInstance and ApprovalStep)
            await tx.approvalAssignment.deleteMany({
              where: {
                instance: {
                  workflowId: { in: workflowIds }
                }
              }
            });
            
            // Delete ApprovalInstance (depends on ApprovalWorkflow)
            await tx.approvalInstance.deleteMany({
              where: { workflowId: { in: workflowIds } }
            });
            
            // Delete ApprovalStep (depends on ApprovalWorkflow, has onDelete: Cascade)
            // This will be handled automatically by Cascade
          }

          // Delete other team-related records
          await tx.membership.deleteMany({ where: { teamId: { in: teamIds } } });
          await tx.socialAccount.deleteMany({ where: { teamId: { in: teamIds } } });
          await tx.post.deleteMany({ where: { teamId: { in: teamIds } } });
          await tx.invitation.deleteMany({ where: { teamId: { in: teamIds } } });
          await tx.media.deleteMany({ where: { teamId: { in: teamIds } } });
          await tx.customRole.deleteMany({ where: { teamId: { in: teamIds } } });
          await tx.engagementHotspot.deleteMany({ where: { teamId: { in: teamIds } } });
          
          // Now safe to delete ApprovalWorkflow
          await tx.approvalWorkflow.deleteMany({ where: { teamId: { in: teamIds } } });

          // Delete the teams
          await tx.team.deleteMany({ where: { ownerId: dbUser.id } });

          // Finally delete the user
          await tx.user.delete({ where: { clerkId } });
        });
      }
      return new NextResponse("User deleted", { status: 200 });
    }

    return new NextResponse("Event ignored", { status: 200 });
  } catch (error) {
    console.error("Webhook error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
