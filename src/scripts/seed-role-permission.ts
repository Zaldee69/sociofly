import { PrismaClient, Role } from "@prisma/client";

const prisma = new PrismaClient();

const rolePermissions = {
  TEAM_OWNER: ["*"],

  CAMPAIGN_MANAGER: [
    "content.create",
    "content.edit",
    "content.submit_for_review",
    "content.approve",
    "content.reject",
    "content.delete",
    "content.post_direct",
    "schedule.view",
    "schedule.create",
    "schedule.reschedule",
    "schedule.unschedule",
    "analytics.view",
    "report.generate",
    "ads.manage",
    "smartlinks.edit",
    "team.view_members",
    "media.view",
    "media.upload",
    "media.edit",
    "media.delete",
    "media.copy",
  ],

  CONTENT_PRODUCER: [
    "content.create",
    "content.edit",
    "content.submit_for_review",
    "schedule.view",
    "schedule.create",
    "schedule.reschedule",
    "schedule.unschedule",
    "media.view",
    "media.upload",
    "media.edit",
    "media.delete",
    "media.copy",
  ],

  CONTENT_REVIEWER: [
    "content.view",
    "content.approve",
    "content.reject",
    "schedule.view",
  ],

  CLIENT_REVIEWER: ["content.view", "content.approve", "content.reject"],

  ANALYTICS_OBSERVER: ["analytics.view", "report.generate"],

  INBOX_AGENT: ["inbox.view", "inbox.reply", "inbox.assign"],
};

async function main() {
  await prisma.permission.createMany({
    data: Array.from(new Set(Object.values(rolePermissions).flat())).map(
      (code) => ({ code })
    ),
  });

  // Insert RolePermission Mapping
  for (const [role, permissions] of Object.entries(rolePermissions)) {
    const perms = await prisma.permission.findMany({
      where: { code: { in: permissions } },
    });
    await prisma.rolePermission.createMany({
      data: perms.map((p) => ({
        role: role as Role,
        permissionId: p.id,
      })),
    });
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
