/**
 * Standard permission codes for the application
 */
export const PERMISSIONS = {
  // Team management
  MANAGE_TEAM_MEMBERS: "manage_team_members",

  // Billing management
  MANAGE_BILLING: "manage_billing",

  // Social accounts management
  MANAGE_SOCIAL_ACCOUNTS: "manage_social_accounts",

  // Campaign management
  CREATE_CAMPAIGN: "create_campaign",
  EDIT_CAMPAIGN: "edit_campaign",
  APPROVE_CAMPAIGN: "approve_campaign",
  PUBLISH_CAMPAIGN: "publish_campaign",

  // Content management
  CREATE_CONTENT: "create_content",
  EDIT_CONTENT: "edit_content",
  APPROVE_CONTENT: "approve_content",
  PUBLISH_CONTENT: "publish_content",

  // Analytics
  VIEW_ANALYTICS: "view_analytics",

  // Inbox management
  HANDLE_INBOX: "handle_inbox",
};

/**
 * Permission descriptions for UI display
 */
export const PERMISSION_DESCRIPTIONS = {
  [PERMISSIONS.MANAGE_TEAM_MEMBERS]: "Tambah, ubah, hapus anggota tim",
  [PERMISSIONS.MANAGE_BILLING]: "Kelola tagihan & paket langganan",
  [PERMISSIONS.MANAGE_SOCIAL_ACCOUNTS]: "Hubungkan & kelola akun sosial",
  [PERMISSIONS.CREATE_CAMPAIGN]: "Buat campaign baru",
  [PERMISSIONS.EDIT_CAMPAIGN]: "Edit campaign",
  [PERMISSIONS.APPROVE_CAMPAIGN]: "Menyetujui campaign",
  [PERMISSIONS.PUBLISH_CAMPAIGN]: "Mempublikasikan campaign",
  [PERMISSIONS.CREATE_CONTENT]: "Buat konten",
  [PERMISSIONS.EDIT_CONTENT]: "Edit konten",
  [PERMISSIONS.APPROVE_CONTENT]: "Menyetujui konten",
  [PERMISSIONS.PUBLISH_CONTENT]: "Mempublikasikan konten",
  [PERMISSIONS.VIEW_ANALYTICS]: "Melihat laporan & statistik",
  [PERMISSIONS.HANDLE_INBOX]: "Mengelola dan membalas pesan",
};
