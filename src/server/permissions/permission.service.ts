import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Grants a permission to a member and removes any existing deny for the same permission
 * @param membershipId The membership ID
 * @param permissionCode The permission code to grant
 * @throws Error if permission code doesn't exist
 */
export async function grantPermissionToMember(
  membershipId: string,
  permissionCode: string
) {
  // Find the permission
  const permission = await prisma.permission.findUnique({
    where: {
      code: permissionCode,
    },
  });

  if (!permission) {
    throw new Error(`Permission ${permissionCode} not found`);
  }

  // Use a transaction to ensure both operations complete
  return prisma.$transaction(async (tx) => {
    // Remove any existing deny for this permission
    await tx.membershipDeny.deleteMany({
      where: {
        membershipId,
        permissionId: permission.id,
      },
    });

    // Create the grant (or do nothing if it already exists)
    return tx.membershipGrant.upsert({
      where: {
        membershipId_permissionId: {
          membershipId,
          permissionId: permission.id,
        },
      },
      create: {
        membershipId,
        permissionId: permission.id,
      },
      update: {}, // No updates needed if it exists
    });
  });
}

/**
 * Denies a permission to a member and removes any existing grant for the same permission
 * @param membershipId The membership ID
 * @param permissionCode The permission code to deny
 * @throws Error if permission code doesn't exist
 */
export async function denyPermissionToMember(
  membershipId: string,
  permissionCode: string
) {
  // Find the permission
  const permission = await prisma.permission.findUnique({
    where: {
      code: permissionCode,
    },
  });

  if (!permission) {
    throw new Error(`Permission ${permissionCode} not found`);
  }

  // Use a transaction to ensure both operations complete
  return prisma.$transaction(async (tx) => {
    // Remove any existing grant for this permission
    await tx.membershipGrant.deleteMany({
      where: {
        membershipId,
        permissionId: permission.id,
      },
    });

    // Create the deny (or do nothing if it already exists)
    return tx.membershipDeny.upsert({
      where: {
        membershipId_permissionId: {
          membershipId,
          permissionId: permission.id,
        },
      },
      create: {
        membershipId,
        permissionId: permission.id,
      },
      update: {}, // No updates needed if it exists
    });
  });
}

/**
 * Revokes both grant and deny for a permission, resetting it to the default role-based value
 * @param membershipId The membership ID
 * @param permissionCode The permission code to reset
 * @throws Error if permission code doesn't exist
 */
export async function revokePermissionOverride(
  membershipId: string,
  permissionCode: string
) {
  // Find the permission
  const permission = await prisma.permission.findUnique({
    where: {
      code: permissionCode,
    },
  });

  if (!permission) {
    throw new Error(`Permission ${permissionCode} not found`);
  }

  // Use a transaction to delete both grant and deny entries
  return prisma.$transaction(async (tx) => {
    // Delete any existing grant
    await tx.membershipGrant.deleteMany({
      where: {
        membershipId,
        permissionId: permission.id,
      },
    });

    // Delete any existing deny
    await tx.membershipDeny.deleteMany({
      where: {
        membershipId,
        permissionId: permission.id,
      },
    });

    return { revoked: true };
  });
}

/**
 * Gets user permission overrides
 * @param membershipId The membership ID
 */
export async function getUserPermissionOverrides(membershipId: string) {
  const [grants, denies] = await Promise.all([
    prisma.membershipGrant.findMany({
      where: { membershipId },
      include: { permission: true },
    }),
    prisma.membershipDeny.findMany({
      where: { membershipId },
      include: { permission: true },
    }),
  ]);

  return {
    grants: grants.map((g) => g.permission.code),
    denies: denies.map((d) => d.permission.code),
  };
}
