"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

interface TeamInvitation {
  id: string;
  token: string;
  team_id: string;
  team: {
    name: string;
    description: string | null;
  };
  role: string;
  email: string;
  expires_at: string;
  created_at: string;
}

export default function TeamInvitationsPage() {
  const [invitations, setInvitations] = useState<TeamInvitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    fetchInvitations();
  }, []);

  const fetchInvitations = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/auth/login");
        return;
      }

      const { data, error } = await supabase
        .from("team_invitations")
        .select(
          `
          *,
          team:teams(name, description)
        `
        )
        .eq("email", user.email)
        .gt("expires_at", new Date().toISOString());

      if (error) throw error;
      setInvitations(data || []);
    } catch (error) {
      console.error("Error fetching invitations:", error);
      toast.error("Failed to load invitations");
    } finally {
      setIsLoading(false);
    }
  };

  const handleInvitation = async (
    token: string,
    action: "accept" | "reject"
  ) => {
    try {
      if (action === "accept") {
        const { error } = await supabase.functions.invoke(
          "accept-team-invitation",
          {
            body: { token },
          }
        );

        if (error) throw error;
        toast.success("Successfully joined the team!");
      } else {
        const { error } = await supabase
          .from("team_invitations")
          .delete()
          .eq("token", token);

        if (error) throw error;
        toast.success("Invitation rejected");
      }

      // Refresh invitations list
      fetchInvitations();
    } catch (error) {
      console.error(`Error ${action}ing invitation:`, error);
      toast.error(`Failed to ${action} invitation`);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Team Invitations</h1>
      {invitations.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-600">You have no pending team invitations.</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {invitations.map((invitation) => (
            <Card key={invitation.id}>
              <CardHeader>
                <CardTitle>{invitation.team.name}</CardTitle>
                <CardDescription>
                  {invitation.team.description || "No description provided"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Role:</span>
                    <Badge variant="secondary">{invitation.role}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Expires:</span>
                    <span className="text-sm">
                      {format(new Date(invitation.expires_at), "MMM d, yyyy")}
                    </span>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex gap-2">
                <Button
                  onClick={() => handleInvitation(invitation.token, "accept")}
                  className="flex-1"
                >
                  Accept
                </Button>
                <Button
                  onClick={() => handleInvitation(invitation.token, "reject")}
                  variant="outline"
                  className="flex-1"
                >
                  Reject
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
