"use client";

import { CheckCircle2 } from "lucide-react";
import { UserRole } from "@/lib/types/auth";
import { useAuthStore } from "@/lib/stores/use-auth-store";

export const useDynamicNavItems = () => {
  const { user, isLoading } = useAuthStore();

  if (isLoading || !user) {
    return [];
  }

  const items = [];

  // Approvals (for ADMIN and CONTRIBUTOR)
  if (user.role === UserRole.ADMIN || user.role === UserRole.CONTRIBUTOR) {
    items.push({
      href: "/approvals",
      icon: CheckCircle2,
      label: "Approvals",
    });
  }

  return items;
};
