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
  console.log(
    `Getting effective permissions for user ${userId} in org ${organizationId}`
  );

  try {
    // 1. Find membership with custom query to handle relations properly
    const membership = (await prisma.$queryRaw`
      SELECT 
        m.id, m.role, m."customRoleId",
        json_agg(DISTINCT jsonb_build_object('permission', jsonb_build_object('id', g.id, 'code', g.code))) FILTER (WHERE g.id IS NOT NULL) AS "grantsPermission",
        json_agg(DISTINCT jsonb_build_object('permission', jsonb_build_object('id', d.id, 'code', d.code))) FILTER (WHERE d.id IS NOT NULL) AS "deniesPermission",
        json_agg(DISTINCT jsonb_build_object(
          'permissions', 
          (SELECT json_agg(jsonb_build_object('permission', jsonb_build_object('id', cp.id, 'code', cp.code))) 
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
      console.log(
        `No membership found for user ${userId} in org ${organizationId}`
      );
      return new Set<string>();
    }

    const memberData = membership[0];
    console.log(
      `Found membership with role: ${memberData.role}, customRoleId: ${memberData.customRoleId || "none"}`
    );

    // 2. Get base permissions from role or customRole
    let basePermissions: Set<string> = new Set<string>();

    if (memberData.customRoleId && memberData.customRole?.permissions?.length) {
      console.log(`Using custom role permissions`);
      // If user has a custom role, use permissions from that
      memberData.customRole.permissions.forEach((crp) => {
        if (crp.permission?.code) {
          basePermissions.add(crp.permission.code);
        }
      });
    } else {
      console.log(
        `Using standard role permissions for role: ${memberData.role}`
      );
      // If user has a standard role, get permissions for that role
      const rolePermissions = await prisma.rolePermission.findMany({
        where: {
          role: memberData.role,
        },
        include: {
          permission: true,
        },
      });

      console.log(
        `Found ${rolePermissions.length} permissions for role ${memberData.role}`
      );

      rolePermissions.forEach((rp) => {
        basePermissions.add(rp.permission.code);
      });
    }

    console.log(`Base permissions: ${Array.from(basePermissions).join(", ")}`);

    // 3. Add explicitly granted permissions
    if (memberData.grantsPermission?.length) {
      console.log(
        `Adding ${memberData.grantsPermission.length} explicitly granted permissions`
      );
      memberData.grantsPermission.forEach((grant) => {
        if (grant.permission?.code) {
          basePermissions.add(grant.permission.code);
          console.log(`Granted: ${grant.permission.code}`);
        }
      });
    }

    // 4. Remove explicitly denied permissions
    if (memberData.deniesPermission?.length) {
      console.log(
        `Removing ${memberData.deniesPermission.length} explicitly denied permissions`
      );
      memberData.deniesPermission.forEach((deny) => {
        if (deny.permission?.code) {
          basePermissions.delete(deny.permission.code);
          console.log(`Denied: ${deny.permission.code}`);
        }
      });
    }

    console.log(`Final permissions: ${Array.from(basePermissions).join(", ")}`);
    return basePermissions;
  } catch (error) {
    console.error("Error in getEffectivePermissions:", error);
    throw error;
  }
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
  try {
    if (!userId || !organizationId) {
      console.warn("Missing userId or organizationId in can check", {
        userId,
        organizationId,
      });
      return false;
    }

    console.log(
      `Checking permission ${permission} for user ${userId} in org ${organizationId}`
    );

    // Get membership to check if owner (which always has all permissions)
    const membership = await prisma.membership.findFirst({
      where: {
        userId,
        organizationId,
      },
      select: { role: true },
    });

    if (!membership) {
      console.log(
        `No membership found for user ${userId} in org ${organizationId}`
      );
      return false;
    }

    // Special Case: Team Owner has all permissions
    if (membership.role === Role.OWNER) {
      console.log(`User ${userId} is OWNER, granting all permissions`);
      return true;
    }

    const permissions = await getEffectivePermissions(userId, organizationId);
    const hasPermission = permissions.has(permission);
    console.log(
      `Permission check result for ${permission}: ${hasPermission ? "GRANTED" : "DENIED"}`
    );
    return hasPermission;
  } catch (error) {
    console.error(`Error checking permission ${permission}:`, error);
    // In production, fail closed (deny access) on errors
    return false;
  }
}

/**
 * Gets user ID from the session
 */
export async function getCurrentUserId(): Promise<string | null> {
  const user = await currentUser();
  return user?.id || null;
}
