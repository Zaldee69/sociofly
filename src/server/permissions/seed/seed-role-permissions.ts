import { PrismaClient, Role } from "@prisma/client";
const prisma = new PrismaClient();

const seed = async () => {
  const permissions = [
    { code: "team.manage", description: "Kelola anggota tim" },
    { code: "billing.manage", description: "Kelola tagihan dan langganan" },
    { code: "account.manage", description: "Kelola akun sosial media" },
    { code: "campaign.create", description: "Buat campaign" },
    { code: "campaign.edit", description: "Edit campaign" },
    { code: "campaign.approve", description: "Setujui campaign" },
    { code: "campaign.publish", description: "Publikasi campaign" },
    { code: "content.create", description: "Buat konten" },
    { code: "content.edit", description: "Edit konten" },
    { code: "content.approve", description: "Setujui konten" },
    { code: "content.publish", description: "Publikasi konten" },
    { code: "analytics.view", description: "Lihat laporan & statistik" },
    { code: "inbox.handle", description: "Kelola dan balas pesan" },
  ];

  // Insert Permissions
  for (const perm of permissions) {
    await prisma.permission.upsert({
      where: { code: perm.code },
      update: {},
      create: perm,
    });
  }

  // Mapping role → permission
  const rolePermissionsMap: Record<string, string[]> = {
    [Role.OWNER]: permissions.map((p) => p.code),
    [Role.MANAGER]: [
      "team.manage",
      "account.manage",
      "campaign.create",
      "campaign.edit",
      "campaign.approve",
      "campaign.publish",
      "content.approve",
      "content.publish",
      "analytics.view",
    ],
    [Role.SUPERVISOR]: [
      "campaign.create",
      "campaign.edit",
      "campaign.approve",
      "content.create",
      "content.edit",
      "content.approve",
      "analytics.view",
    ],
    [Role.CONTENT_CREATOR]: [
      "campaign.create",
      "content.create",
      "content.edit",
    ],
    [Role.INTERNAL_REVIEWER]: ["content.approve", "campaign.approve"],
    [Role.CLIENT_REVIEWER]: ["content.approve", "campaign.approve"],
    [Role.ANALYST]: ["analytics.view"],
    [Role.INBOX_AGENT]: ["inbox.handle"],
  };

  // Insert RolePermissions
  for (const [role, permCodes] of Object.entries(rolePermissionsMap)) {
    for (const code of permCodes) {
      const permission = await prisma.permission.findUnique({
        where: { code },
      });
      if (!permission) continue;

      await prisma.rolePermission.upsert({
        where: {
          role_permissionId: {
            role: role as Role,
            permissionId: permission.id,
          },
        },
        update: {},
        create: {
          role: role as Role,
          permissionId: permission.id,
        },
      });
    }
  }

  console.log("✅ Seeding selesai.");
};

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
