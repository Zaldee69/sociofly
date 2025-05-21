import { Badge } from "@/components/ui/badge";
import { Role } from "@prisma/client";
import React from "react";

export const getRoleBadge = (role: Role) => {
  switch (role) {
    case "OWNER":
      return <Badge className="bg-purple-600">Team Owner</Badge>;
    case "SUPERVISOR":
      return <Badge className="bg-blue-600">Supervisor</Badge>;
    case "MANAGER":
      return <Badge className="bg-green-600">Manager</Badge>;
    case "CONTENT_CREATOR":
      return <Badge variant="secondary">Content Creator</Badge>;
    case "CLIENT_REVIEWER":
      return <Badge variant="secondary">Client Reviewer</Badge>;
    case "INTERNAL_REVIEWER":
      return <Badge variant="secondary">Internal Reviewer</Badge>;
    case "ANALYST":
      return <Badge variant="secondary">Analyst</Badge>;
    default:
      return <Badge variant="outline">Unknown</Badge>;
  }
};
