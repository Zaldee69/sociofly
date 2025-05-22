import { Webhook } from "svix";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";

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
      const createdUser = await prisma.user.create({
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

      // Create memberships for all pending invitations
      for (const invitation of pendingInvitations) {
        await prisma.membership.create({
          data: {
            userId: createdUser.id,
            teamId: invitation.teamId,
            role: invitation.role,
          },
        });

        // Mark invitation as accepted
        await prisma.invitation.update({
          where: { id: invitation.id },
          data: { acceptedAt: new Date() },
        });
      }

      console.log(
        `✅ User created with status ${onboardingStatus} and invitations processed:`,
        user.id
      );
      return new NextResponse("User created", { status: 200 });
    }

    return new NextResponse("Event ignored", { status: 200 });
  } catch (error) {
    console.error("Webhook error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
