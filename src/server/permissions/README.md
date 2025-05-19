# Permission System

This directory contains the implementation of the multi-tenant permission system for the Social Media Content Scheduler application.

## Overview

The permission system provides role-based access control with the ability to:

- Use predefined roles with standard permissions
- Create custom roles with specific permissions
- Override permissions for individual users with grants and denials

## Key Components

1. **Models** (in Prisma schema):

   - `Permission`: Stores available permissions
   - `RolePermission`: Maps standard roles to permissions
   - `CustomRole`: Organization-specific roles
   - `CustomRolePermission`: Maps custom roles to permissions
   - `MembershipGrant`: Explicit permission grants for a user
   - `MembershipDeny`: Explicit permission denials for a user

2. **Helper Functions**:

   - `getEffectivePermissions(userId, organizationId)`: Calculates all permissions a user has
   - `can(userId, organizationId, permission)`: Checks if a user has a specific permission

3. **Middleware**:
   - `withPermission(permission, handler)`: Protects API routes with permission checks
   - `withAnyPermission(permissions, handler)`: Allows access if user has any of the listed permissions

## Usage Examples

### Protecting API Routes

```typescript
// pages/api/organizations/[organizationId]/posts/index.ts
import { withPermission } from "@/server/permissions/middleware";
import { PERMISSIONS } from "@/server/permissions/seed/permissions";

// Only users with 'content.create' permission can create posts
export default withPermission(PERMISSIONS.CONTENT_CREATE, async (req, res) => {
  // Your API handler code here
  if (req.method === "POST") {
    // Create post logic
  } else if (req.method === "GET") {
    // List posts logic
  }
});
```

### Checking Permissions in Components

```typescript
// src/components/PostActions.tsx
import { useState, useEffect } from 'react';
import { trpc } from '@/utils/trpc';

export function PostActions({ post, organizationId }) {
  // Check if user can edit this post
  const canEditQuery = trpc.permissions.can.useQuery({
    organizationId,
    permission: 'content.edit.any', // or content.edit.own if checking ownership
  });

  if (!canEditQuery.data) {
    return null; // Hide edit button if user doesn't have permission
  }

  return (
    <div>
      <button>Edit Post</button>
      {/* Other actions */}
    </div>
  );
}
```

### Getting All User Permissions

```typescript
// src/hooks/usePermissions.ts
import { trpc } from "@/utils/trpc";

export function usePermissions(organizationId: string) {
  const { data: permissions, isLoading } = trpc.permissions.getAll.useQuery({
    organizationId,
  });

  const hasPermission = (permission: string) => {
    return permissions?.has(permission) ?? false;
  };

  return {
    permissions,
    hasPermission,
    isLoading,
  };
}
```

## Database Seeding

Run the following command to seed the database with standard permissions and role mappings:

```bash
npm run seed:permissions
```

This will create:

1. All permissions defined in `permissions.ts`
2. Role-permission mappings defined in `role-permissions.ts`
