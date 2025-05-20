import { useState, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc/client";
import { Role } from "@prisma/client";

export function usePermissions(teamId: string) {
  const { data: team } = trpc.team.getTeamById.useQuery(
    { teamId },
    { enabled: !!teamId }
  );

  // Get user's membership ID for the current team
  const { data: userMembership } = trpc.team.getTeamMembership.useQuery(
    { teamId },
    { enabled: !!teamId }
  );

  // Get role permissions from API endpoints
  const { data: ownerPermissions } =
    trpc.team.getDefaultRolePermissions.useQuery(
      { role: "OWNER" as Role },
      { enabled: !!teamId }
    );

  const { data: managerPermissions } =
    trpc.team.getDefaultRolePermissions.useQuery(
      { role: "MANAGER" as Role },
      { enabled: !!teamId }
    );

  const { data: supervisorPermissions } =
    trpc.team.getDefaultRolePermissions.useQuery(
      { role: "SUPERVISOR" as Role },
      { enabled: !!teamId }
    );

  const { data: contentCreatorPermissions } =
    trpc.team.getDefaultRolePermissions.useQuery(
      { role: "CONTENT_CREATOR" as Role },
      { enabled: !!teamId }
    );

  const { data: internalReviewerPermissions } =
    trpc.team.getDefaultRolePermissions.useQuery(
      { role: "INTERNAL_REVIEWER" as Role },
      { enabled: !!teamId }
    );

  const { data: clientReviewerPermissions } =
    trpc.team.getDefaultRolePermissions.useQuery(
      { role: "CLIENT_REVIEWER" as Role },
      { enabled: !!teamId }
    );

  const { data: analystPermissions } =
    trpc.team.getDefaultRolePermissions.useQuery(
      { role: "ANALYST" as Role },
      { enabled: !!teamId }
    );

  const { data: inboxAgentPermissions } =
    trpc.team.getDefaultRolePermissions.useQuery(
      { role: "INBOX_AGENT" as Role },
      { enabled: !!teamId }
    );

  // Get custom roles from API
  const { data: customRoles, isLoading: isLoadingCustomRoles } =
    trpc.team.getCustomRoles.useQuery(
      { teamId },
      {
        enabled: !!teamId,
      }
    );

  // Set up combined role permissions
  const [rolePermissions, setRolePermissions] = useState<
    Record<string, string[]>
  >({});

  // Get user permission overrides
  const {
    data: userPermissionOverrides,
    isLoading: isLoadingPermissionOverrides,
  } = trpc.permission.getUserOverrides.useQuery(
    {
      organizationId: typeof teamId === "string" ? teamId : "",
      membershipId: userMembership?.id || "",
    },
    {
      enabled: !!teamId && !!userMembership?.id,
    }
  );

  // Load permissions
  const [isPermissionsLoaded, setIsPermissionsLoaded] = useState(false);

  // Track if we've ever set permissions to loaded (to prevent flicker back to unloaded)
  const wasEverLoaded = useRef(false);

  // Keep track of loading states for different permission queries
  const isLoadingBasePermissions = !ownerPermissions && !managerPermissions;
  const isLoadingTeamData = !team;
  const isLoadingUserMembership = !userMembership && !!teamId;

  // Overall loading state that includes all permission-related data
  const isPermissionsLoading =
    isLoadingBasePermissions ||
    isLoadingTeamData ||
    isLoadingUserMembership ||
    (!!userMembership?.id && isLoadingPermissionOverrides) ||
    isLoadingCustomRoles;

  // Format and combine role permissions
  useEffect(() => {
    // Wait until we have at least some base permissions
    if (isLoadingBasePermissions) {
      return;
    }

    const updatedRolePermissions: Record<string, string[]> = {};
    let hasAnyPermissions = false;

    // Load permissions from the new API endpoints
    if (ownerPermissions?.length) {
      updatedRolePermissions["OWNER"] = ownerPermissions;
      hasAnyPermissions = true;
    }

    if (managerPermissions?.length) {
      updatedRolePermissions["MANAGER"] = managerPermissions;
      hasAnyPermissions = true;
    }

    if (supervisorPermissions?.length) {
      updatedRolePermissions["SUPERVISOR"] = supervisorPermissions;
      hasAnyPermissions = true;
    }

    if (contentCreatorPermissions?.length) {
      updatedRolePermissions["CONTENT_CREATOR"] = contentCreatorPermissions;
      hasAnyPermissions = true;
    }

    if (internalReviewerPermissions?.length) {
      updatedRolePermissions["INTERNAL_REVIEWER"] = internalReviewerPermissions;
      hasAnyPermissions = true;
    }

    if (clientReviewerPermissions?.length) {
      updatedRolePermissions["CLIENT_REVIEWER"] = clientReviewerPermissions;
      hasAnyPermissions = true;
    }

    if (analystPermissions?.length) {
      updatedRolePermissions["ANALYST"] = analystPermissions;
      hasAnyPermissions = true;
    }

    if (inboxAgentPermissions?.length) {
      updatedRolePermissions["INBOX_AGENT"] = inboxAgentPermissions;
      hasAnyPermissions = true;
    }

    // Add custom roles if available
    if (customRoles?.length) {
      customRoles.forEach((role) => {
        if (role.permissions?.length) {
          updatedRolePermissions[role.name] = role.permissions;
          hasAnyPermissions = true;
        }
      });
    }

    // Update permissions in state if we have any
    if (hasAnyPermissions) {
      setRolePermissions(updatedRolePermissions);
    }
  }, [
    ownerPermissions,
    managerPermissions,
    supervisorPermissions,
    contentCreatorPermissions,
    internalReviewerPermissions,
    clientReviewerPermissions,
    analystPermissions,
    inboxAgentPermissions,
    customRoles,
    isLoadingBasePermissions,
  ]);

  // Update loading state based on all permission data availability
  useEffect(() => {
    if (!isPermissionsLoading) {
      setIsPermissionsLoaded(true);
      wasEverLoaded.current = true;
    } else if (!wasEverLoaded.current) {
      // Only set to false if we've never loaded permissions before
      // This prevents flickering back to loading state
      setIsPermissionsLoaded(false);
    }
  }, [isPermissionsLoading]);

  // Helper function to check if the user has a specific permission
  const hasPermission = (permission: string) => {
    // Special case: if permissions were ever loaded and user is OWNER, grant all permissions
    // This avoids showing/hiding UI elements during loading for owners
    if (team?.role === Role.OWNER) {
      return true;
    }

    // If still loading or missing data, deny permission
    if (!isPermissionsLoaded || !team || !team.role) {
      return false;
    }

    // Check for explicit grant from MembershipGrant (overrides deny and role-based permissions)
    if (userPermissionOverrides?.grants?.includes(permission)) {
      return true;
    }

    // Check for explicit deny from MembershipDeny (overrides role-based permissions)
    if (userPermissionOverrides?.denies?.includes(permission)) {
      return false;
    }

    // Check permissions in memory from the server
    const userPermissions = rolePermissions[team.role] || [];

    // Direct permission check from database-sourced permissions
    return userPermissions.includes(permission);
  };

  console.log(isPermissionsLoaded);

  return {
    hasPermission,
    isPermissionsLoaded,
    teamRole: team?.role,
    userMembershipId: userMembership?.id,
    rolePermissions,
    userPermissionOverrides,
  };
}
