/**
 * Permission codes used throughout the application
 */
export const PERMISSIONS = {
  TEAM_MANAGE: "team.manage",
  BILLING_MANAGE: "billing.manage",
  ACCOUNTS_MANAGE: "account.manage",
  CAMPAIGN_CREATE: "campaign.create",
  CAMPAIGN_EDIT: "campaign.edit",
  CAMPAIGN_APPROVE: "campaign.approve",
  CAMPAIGN_PUBLISH: "campaign.publish",
  CONTENT_CREATE: "content.create",
  CONTENT_EDIT: "content.edit",
  CONTENT_APPROVE: "content.approve",
  CONTENT_PUBLISH: "content.publish",
  ANALYTICS_VIEW: "analytics.view",
  INBOX_HANDLE: "inbox.handle",
} as const;

/**
 * Permission descriptions for UI display
 */
export const PERMISSION_DESCRIPTIONS = {
  [PERMISSIONS.TEAM_MANAGE]: "Tambah, ubah, hapus anggota tim",
  [PERMISSIONS.BILLING_MANAGE]: "Kelola tagihan & paket langganan",
  [PERMISSIONS.ACCOUNTS_MANAGE]: "Hubungkan & kelola akun sosial",
  [PERMISSIONS.CAMPAIGN_CREATE]: "Buat campaign baru",
  [PERMISSIONS.CAMPAIGN_EDIT]: "Edit campaign",
  [PERMISSIONS.CAMPAIGN_APPROVE]: "Menyetujui campaign",
  [PERMISSIONS.CAMPAIGN_PUBLISH]: "Mempublikasikan campaign",
  [PERMISSIONS.CONTENT_CREATE]: "Buat konten",
  [PERMISSIONS.CONTENT_EDIT]: "Edit konten",
  [PERMISSIONS.CONTENT_APPROVE]: "Menyetujui konten",
  [PERMISSIONS.CONTENT_PUBLISH]: "Mempublikasikan konten",
  [PERMISSIONS.ANALYTICS_VIEW]: "Melihat laporan & statistik",
  [PERMISSIONS.INBOX_HANDLE]: "Mengelola dan membalas pesan",
};
