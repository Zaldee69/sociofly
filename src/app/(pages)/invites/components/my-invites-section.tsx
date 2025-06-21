"use client";

import React, { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, X, Calendar, Users } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { getRoleBadge } from "../../teams/utils/team-utils";

export default function MyInvitesSection() {
  const router = useRouter();
  const utils = trpc.useUtils();
  const [actionInviteId, setActionInviteId] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<"accept" | "reject">(
    "accept"
  );

  // Fetch invites
  const { data: invites, isLoading } = trpc.team.getMyInvites.useQuery(
    undefined,
    {
      refetchOnWindowFocus: false,
    }
  );

  // Accept invite mutation
  const acceptMutation = trpc.team.acceptInvite.useMutation({
    onSuccess: () => {
      toast.success("You've successfully joined the team!");
      setConfirmOpen(false);
      setActionInviteId(null);
      utils.team.getMyInvites.invalidate();
      router.refresh();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Reject invite mutation
  const rejectMutation = trpc.team.rejectInvite.useMutation({
    onSuccess: () => {
      toast.success("Invitation rejected");
      setConfirmOpen(false);
      setActionInviteId(null);
      utils.team.getMyInvites.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Handler for accepting/rejecting invitations
  const handleInviteAction = (
    inviteId: string,
    action: "accept" | "reject"
  ) => {
    setActionInviteId(inviteId);
    setConfirmAction(action);
    setConfirmOpen(true);
  };

  // Handler for confirming action
  const confirmInviteAction = () => {
    if (!actionInviteId) return;

    if (confirmAction === "accept") {
      acceptMutation.mutate({ inviteId: actionInviteId });
    } else {
      rejectMutation.mutate({ inviteId: actionInviteId });
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <LoadingSpinner />
      </div>
    );
  }

  if (!invites || invites.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Team Invitations</CardTitle>
          <CardDescription>
            You don't have any pending team invitations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Users className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              When someone invites you to join their team, it will appear here.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Team Invitations</CardTitle>
          <CardDescription>
            Manage invitations to join different teams
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {invites.map((invite) => (
              <div
                key={invite.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg gap-4"
              >
                <div className="space-y-2">
                  <h3 className="font-medium text-lg">{invite.team.name}</h3>
                  <div className="flex flex-col sm:flex-row gap-2 sm:gap-6">
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Users className="h-4 w-4 mr-1" />
                      <span>Role: {getRoleBadge(invite.role)}</span>
                    </div>
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4 mr-1" />
                      <span>
                        Invited:{" "}
                        {new Date(invite.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 self-end sm:self-center">
                  <Button
                    onClick={() => handleInviteAction(invite.id, "accept")}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Accept
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleInviteAction(invite.id, "reject")}
                    className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Decline
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirmAction === "accept"
                ? "Accept Invitation"
                : "Decline Invitation"}
            </DialogTitle>
            <DialogDescription>
              {confirmAction === "accept"
                ? "Are you sure you want to join this team? You'll be able to access their content and collaborate with team members."
                : "Are you sure you want to decline this invitation? You'll need to be invited again to join this team."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => setConfirmOpen(false)}
              disabled={acceptMutation.isPending || rejectMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant={confirmAction === "accept" ? "default" : "destructive"}
              onClick={confirmInviteAction}
              disabled={acceptMutation.isPending || rejectMutation.isPending}
            >
              {acceptMutation.isPending || rejectMutation.isPending ? (
                <LoadingSpinner className="h-4 w-4 mr-1" />
              ) : confirmAction === "accept" ? (
                <>
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Join Team
                </>
              ) : (
                <>
                  <X className="h-4 w-4 mr-1" />
                  Decline
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
