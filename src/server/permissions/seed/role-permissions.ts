import { Role } from "@prisma/client";
import { PERMISSIONS } from "./permissions";

/**
 * Default role-permission mapping
 * Maps standard roles to their default permissions
 */
export const ROLE_PERMISSIONS: Record<Role, string[]> = {
  TEAM_OWNER: [
    // Team owners have all permissions
    ...Object.values(PERMISSIONS),
  ],

  CAMPAIGN_MANAGER: [
    // Content management
    PERMISSIONS.CONTENT_CREATE,
    PERMISSIONS.CONTENT_EDIT_OWN,
    PERMISSIONS.CONTENT_EDIT_ANY,
    PERMISSIONS.CONTENT_DELETE_OWN,
    PERMISSIONS.CONTENT_DELETE_ANY,
    PERMISSIONS.CONTENT_PUBLISH_OWN,
    PERMISSIONS.CONTENT_PUBLISH_ANY,
    PERMISSIONS.CONTENT_APPROVE,
    PERMISSIONS.CONTENT_SCHEDULE,

    // Media management
    PERMISSIONS.MEDIA_UPLOAD,
    PERMISSIONS.MEDIA_DELETE_OWN,
    PERMISSIONS.MEDIA_DELETE_ANY,

    // Social accounts
    PERMISSIONS.ACCOUNT_CONNECT,
    PERMISSIONS.ACCOUNT_DISCONNECT,
    PERMISSIONS.ACCOUNT_MANAGE,

    // Analytics
    PERMISSIONS.ANALYTICS_VIEW,
    PERMISSIONS.ANALYTICS_EXPORT,

    // Inbox
    PERMISSIONS.INBOX_VIEW,
    PERMISSIONS.INBOX_REPLY,

    // Organization management (limited)
    PERMISSIONS.ORG_MEMBERS_VIEW,
    PERMISSIONS.ORG_MEMBERS_INVITE,
  ],

  CONTENT_PRODUCER: [
    // Content (limited)
    PERMISSIONS.CONTENT_CREATE,
    PERMISSIONS.CONTENT_EDIT_OWN,
    PERMISSIONS.CONTENT_DELETE_OWN,
    PERMISSIONS.CONTENT_SCHEDULE,

    // Media
    PERMISSIONS.MEDIA_UPLOAD,
    PERMISSIONS.MEDIA_DELETE_OWN,

    // Analytics (limited)
    PERMISSIONS.ANALYTICS_VIEW,
  ],

  CONTENT_REVIEWER: [
    // Content review-focused
    PERMISSIONS.CONTENT_EDIT_ANY,
    PERMISSIONS.CONTENT_APPROVE,

    // Analytics for context
    PERMISSIONS.ANALYTICS_VIEW,

    // Limited inbox access
    PERMISSIONS.INBOX_VIEW,
  ],

  CLIENT_REVIEWER: [
    // Client reviewers can only approve content
    PERMISSIONS.CONTENT_APPROVE,

    // Basic analytics
    PERMISSIONS.ANALYTICS_VIEW,
  ],

  ANALYTICS_OBSERVER: [
    // Read-only analytics access
    PERMISSIONS.ANALYTICS_VIEW,
    PERMISSIONS.ANALYTICS_EXPORT,
  ],

  INBOX_AGENT: [
    // Inbox management only
    PERMISSIONS.INBOX_VIEW,
    PERMISSIONS.INBOX_REPLY,

    // Read-only content access
    PERMISSIONS.ANALYTICS_VIEW,
  ],
};
