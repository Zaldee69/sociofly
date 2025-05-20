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

  // Get ALL role permissions in a single query
  const { data: allRolePermissions, isLoading: isLoadingRolePermissions } =
    trpc.team.getAllRolePermissions.useQuery(undefined, { enabled: !!teamId });

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
  const isLoadingTeamData = !team;
  const isLoadingUserMembership = !userMembership && !!teamId;

  // Overall loading state that includes all permission-related data
  const isPermissionsLoading =
    isLoadingRolePermissions ||
    isLoadingTeamData ||
    isLoadingUserMembership ||
    (!!userMembership?.id && isLoadingPermissionOverrides) ||
    isLoadingCustomRoles;

  // Update role permissions when allRolePermissions data changes
  useEffect(() => {
    if (allRolePermissions) {
      // Start with the permissions from the server
      const updatedPermissions = { ...allRolePermissions };

      // Add custom roles if available
      if (customRoles?.length) {
        customRoles.forEach((role) => {
          if (role.permissions?.length) {
            updatedPermissions[role.name] = role.permissions;
          }
        });
      }

      setRolePermissions(updatedPermissions);
    }
  }, [allRolePermissions, customRoles]);

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

  return {
    hasPermission,
    isPermissionsLoaded,
    teamRole: team?.role,
    userMembershipId: userMembership?.id,
    rolePermissions,
    userPermissionOverrides,
  };
}
