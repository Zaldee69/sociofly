"use client";

import { useEffect, useState } from "react";
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

  useEffect(() => {
    // Comment out or remove all code that references supabase
    // TODO: Replace with new data fetching logic
  }, []);

  const fetchInvitations = async () => {
    try {
      // Comment out or remove all code that references supabase
      // TODO: Replace with new data fetching logic
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
      // Comment out or remove all code that references supabase
      // TODO: Replace with new data fetching logic
    } catch (error) {
      console.error(`Error ${action}ing invitation:`, error);
      // TODO: Add error handling for invitation actions
    }
  };
}
