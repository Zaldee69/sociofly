import React from "react";
import { redirect } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";
import { Heading } from "@/components/ui/heading";
import MyInvitesSection from "./components/my-invites-section";

export default async function InvitesPage() {
  const user = await currentUser();

  if (!user) {
    redirect("/sign-in");
  }

  return (
    <div className="container py-8">
      <Heading
        title="Team Invitations"
        description="View and manage invitations to join teams"
      />

      <div className="mt-8">
        <MyInvitesSection />
      </div>
    </div>
  );
}
