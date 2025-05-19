/**
 * Standard permission codes for the application
 */
export const PERMISSIONS = {
  // Content management
  CONTENT_CREATE: "content.create",
  CONTENT_EDIT_OWN: "content.edit.own",
  CONTENT_EDIT_ANY: "content.edit.any",
  CONTENT_DELETE_OWN: "content.delete.own",
  CONTENT_DELETE_ANY: "content.delete.any",
  CONTENT_PUBLISH_OWN: "content.publish.own",
  CONTENT_PUBLISH_ANY: "content.publish.any",
  CONTENT_APPROVE: "content.approve",
  CONTENT_SCHEDULE: "content.schedule",

  // Media management
  MEDIA_UPLOAD: "media.upload",
  MEDIA_DELETE_OWN: "media.delete.own",
  MEDIA_DELETE_ANY: "media.delete.any",

  // Social accounts
  ACCOUNT_CONNECT: "account.connect",
  ACCOUNT_DISCONNECT: "account.disconnect",
  ACCOUNT_MANAGE: "account.manage",

  // Analytics
  ANALYTICS_VIEW: "analytics.view",
  ANALYTICS_EXPORT: "analytics.export",

  // Inbox/Comments
  INBOX_VIEW: "inbox.view",
  INBOX_REPLY: "inbox.reply",

  // Organization management
  ORG_SETTINGS_EDIT: "org.settings.edit",
  ORG_MEMBERS_VIEW: "org.members.view",
  ORG_MEMBERS_INVITE: "org.members.invite",
  ORG_MEMBERS_REMOVE: "org.members.remove",
  ORG_MEMBERS_EDIT_ROLE: "org.members.edit_role",

  // Permission management
  PERMISSIONS_MANAGE: "permissions.manage",
  CUSTOM_ROLES_MANAGE: "custom_roles.manage",
};
