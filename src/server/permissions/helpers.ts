import { PrismaClient, Role, Permission } from "@prisma/client";
import { currentUser } from "@clerk/nextjs/server";

const prisma = new PrismaClient();

type MembershipWithRelations = {
  id: string;
  role: Role;
  customRoleId: string | null;
  customRole?: {
    permissions: Array<{
      permission: Permission;
    }>;
  };
  grantsPermission: Array<{
    permission: Permission;
  }>;
  deniesPermission: Array<{
    permission: Permission;
  }>;
};

/**
 * Calculates the effective permissions for a user in a specific organization
 *
 * @param userId The user ID
 * @param organizationId The organization ID
 * @returns A Promise resolving to a Set of permission codes the user has
 */
export async function getEffectivePermissions(
  userId: string,
  organizationId: string
): Promise<Set<string>> {
  // 1. Find membership with custom query to handle relations properly
  const membership = (await prisma.$queryRaw`
    SELECT 
      m.id, m.role, m."customRoleId",
      json_agg(DISTINCT jsonb_build_object('permission', g.permission)) FILTER (WHERE g.id IS NOT NULL) AS "grantsPermission",
      json_agg(DISTINCT jsonb_build_object('permission', d.permission)) FILTER (WHERE d.id IS NOT NULL) AS "deniesPermission",
      json_agg(DISTINCT jsonb_build_object(
        'permissions', 
        (SELECT json_agg(jsonb_build_object('permission', cp.permission)) 
         FROM "CustomRolePermission" crp
         JOIN "Permission" cp ON crp."permissionId" = cp.id
         WHERE crp."customRoleId" = m."customRoleId")
      )) FILTER (WHERE m."customRoleId" IS NOT NULL) AS "customRole"
    FROM "Membership" m
    LEFT JOIN "MembershipGrant" mg ON m.id = mg."membershipId"
    LEFT JOIN "Permission" g ON mg."permissionId" = g.id
    LEFT JOIN "MembershipDeny" md ON m.id = md."membershipId"
    LEFT JOIN "Permission" d ON md."permissionId" = d.id
    WHERE m."userId" = ${userId} AND m."organizationId" = ${organizationId}
    GROUP BY m.id, m.role, m."customRoleId"
  `) as unknown as MembershipWithRelations[];

  if (!membership || membership.length === 0) {
    return new Set<string>();
  }

  const memberData = membership[0];
  // 2. Get base permissions from role or customRole
  let basePermissions: Set<string> = new Set<string>();

  if (memberData.customRoleId && memberData.customRole?.permissions?.length) {
    // If user has a custom role, use permissions from that
    memberData.customRole.permissions.forEach((crp) => {
      if (crp.permission?.code) {
        basePermissions.add(crp.permission.code);
      }
    });
  } else {
    // If user has a standard role, get permissions for that role
    const rolePermissions = await prisma.rolePermission.findMany({
      where: {
        role: memberData.role,
      },
      include: {
        permission: true,
      },
    });

    rolePermissions.forEach((rp) => {
      basePermissions.add(rp.permission.code);
    });
  }

  // 3. Add explicitly granted permissions
  if (memberData.grantsPermission?.length) {
    memberData.grantsPermission.forEach((grant) => {
      if (grant.permission?.code) {
        basePermissions.add(grant.permission.code);
      }
    });
  }

  // 4. Remove explicitly denied permissions
  if (memberData.deniesPermission?.length) {
    memberData.deniesPermission.forEach((deny) => {
      if (deny.permission?.code) {
        basePermissions.delete(deny.permission.code);
      }
    });
  }

  return basePermissions;
}

/**
 * Checks if a user has a specific permission in an organization
 *
 * @param userId The user ID
 * @param organizationId The organization ID
 * @param permission The permission code to check
 * @returns A Promise resolving to a boolean indicating if the user has the permission
 */
export async function can(
  userId: string,
  organizationId: string,
  permission: string
): Promise<boolean> {
  const permissions = await getEffectivePermissions(userId, organizationId);
  return permissions.has(permission);
}

/**
 * Gets user ID from the session
 */
export async function getCurrentUserId(): Promise<string | null> {
  const user = await currentUser();
  return user?.id || null;
}
