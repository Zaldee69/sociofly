"use client";

import { trpc } from "@/lib/trpc/client";
import { Badge } from "@/components/ui/badge";
import { useEffect } from "react";

interface InvitationIndicatorProps {
  variant?: "badge" | "dot";
  className?: string;
}

export function InvitationIndicator({
  variant = "badge",
  className = "",
}: InvitationIndicatorProps) {
  // Fetch pending invitations for the current user
  const { data: invites, refetch } = trpc.team.getMyInvites.useQuery(
    undefined,
    {
      // Don't refetch too aggressively - every 5 minutes is enough
      refetchInterval: 5 * 60 * 1000,
      // But refetch when window gains focus
      refetchOnWindowFocus: true,
    }
  );

  // Set up refetch when component mounts and becomes visible
  useEffect(() => {
    refetch();
  }, [refetch]);

  // Count pending invitations
  const pendingInvitesCount = invites?.length || 0;

  if (pendingInvitesCount === 0) {
    return null;
  }

  // Render different variants
  if (variant === "dot") {
    return (
      <span
        className={`h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white ${className}`}
        title={`${pendingInvitesCount} pending invitation${pendingInvitesCount > 1 ? "s" : ""}`}
      />
    );
  }

  return (
    <Badge
      variant="destructive"
      className={`h-5 px-1.5 text-xs font-medium ${className}`}
    >
      {pendingInvitesCount}
    </Badge>
  );
}
