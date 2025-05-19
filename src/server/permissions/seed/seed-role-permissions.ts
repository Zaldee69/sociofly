import { PrismaClient, Role } from "@prisma/client";
import { PERMISSIONS } from "./permissions";
import { ROLE_PERMISSIONS } from "./role-permissions";

const prisma = new PrismaClient();

/**
 * Seeds the database with standard permissions and role-permission mappings
 */
async function seedRolePermissions() {
  console.log("🌱 Starting permission seeding...");

  try {
    // 1. Create all permissions
    console.log("Creating permissions...");
    const permissionValues = Object.values(PERMISSIONS);

    for (const permissionCode of permissionValues) {
      await prisma.permission.upsert({
        where: { code: permissionCode },
        update: {}, // No updates needed if exists
        create: { code: permissionCode },
      });
    }

    console.log(`Created ${permissionValues.length} permissions`);

    // 2. Create role-permission mappings
    console.log("Creating role-permission mappings...");

    // Get all permissions from database
    const dbPermissions = await prisma.permission.findMany();
    const permissionMap = new Map(dbPermissions.map((p) => [p.code, p.id]));

    // Loop through each role
    for (const [roleName, permissions] of Object.entries(ROLE_PERMISSIONS)) {
      console.log(`Setting up permissions for role: ${roleName}`);

      // For each permission in this role
      for (const permissionCode of permissions) {
        const permissionId = permissionMap.get(permissionCode);

        if (!permissionId) {
          console.warn(
            `Permission with code ${permissionCode} not found, skipping`
          );
          continue;
        }

        // Add role-permission mapping
        await prisma.rolePermission.upsert({
          where: {
            role_permissionId: {
              role: roleName as Role,
              permissionId,
            },
          },
          update: {}, // No updates needed if exists
          create: {
            role: roleName as Role,
            permissionId,
          },
        });
      }
    }

    console.log("Role-permission seeding completed successfully");
  } catch (error) {
    console.error("Error seeding permissions:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seed if executed directly
if (require.main === module) {
  seedRolePermissions()
    .then(() => {
      console.log("✅ Permission seeding completed!");
      process.exit(0);
    })
    .catch((err) => {
      console.error("❌ Error in permission seeding:", err);
      process.exit(1);
    });
}

export { seedRolePermissions };
