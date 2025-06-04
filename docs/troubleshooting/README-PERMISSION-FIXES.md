# Permission System Optimization

## Problem

The application was experiencing performance issues due to excessive tRPC API calls related to permission checks:

1. The `usePermissions` hook was making 8+ separate API calls to fetch permissions for different roles
2. Each role's permissions were fetched individually, causing multiple database queries
3. Components that used the hook were triggering these redundant API calls on each render

## Solution

### 1. Consolidated API Endpoint

- Added a new `getAllRolePermissions` endpoint to the team router that fetches permissions for all roles in a single API call
- The new endpoint returns a structured object with role names as keys and permission arrays as values

```typescript
// Get permissions for all roles in one call
getAllRolePermissions: protectedProcedure.query(async ({ ctx }) => {
  if (!ctx.userId) throw new TRPCError({ code: "UNAUTHORIZED" });

  // Get all role permissions
  const rolePermissions = await ctx.prisma.rolePermission.findMany({
    include: {
      permission: true,
    },
  });

  // Group by role
  const permissionsByRole: Record<string, string[]> = {};

  rolePermissions.forEach((rp) => {
    const role = rp.role;
    if (!permissionsByRole[role]) {
      permissionsByRole[role] = [];
    }
    permissionsByRole[role].push(rp.permission.code);
  });

  return permissionsByRole;
}),
```

### 2. Optimized usePermissions Hook

- Modified the `usePermissions` hook to use the consolidated API endpoint
- Removed individual role permission queries (reduced 8+ API calls to just 1)
- Improved state management to properly cache and track permission data
- Added proper dependency tracking in useEffect to avoid unnecessary re-renders

```typescript
// Get ALL role permissions in a single query
const { data: allRolePermissions, isLoading: isLoadingRolePermissions } =
  trpc.team.getAllRolePermissions.useQuery(undefined, { enabled: !!teamId });

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
```

### 3. Proper Cache Invalidation

- Updated all permission-related mutations to properly invalidate the cache
- Ensured that component refreshes trigger single API calls instead of multiple ones

```typescript
// Example of proper cache invalidation
createCustomRoleMutation.useMutation({
  onSuccess: () => {
    toast.success("Custom role created successfully");
    utils.team.getCustomRoles.invalidate({ teamId });
    utils.team.getAllRolePermissions.invalidate(); // Invalidate permissions cache to refresh
    // ...
  },
});
```

## Benefits

- Reduced API calls from 8+ per permission check to just 1 call
- Improved application performance and reduced server load
- More efficient React renders with fewer state updates
- Better caching of permission data across components
- Smoother UI experience with less data fetching

## Further Improvements

- Consider implementing server-side data bundling to reduce queries even further
- Add proper caching headers to the API responses for fewer full refreshes
- Consider implementing optimistic updates for permission changes
