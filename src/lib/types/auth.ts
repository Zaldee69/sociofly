import { User } from "@supabase/supabase-js";

export enum UserRole {
  ADMIN = "admin",
  SUPERVISOR = "supervisor",
  CONTRIBUTOR = "contributor",
}

export enum Permission {
  // Team Management
  CREATE_TEAM = "create_team",
  EDIT_TEAM = "edit_team",
  DELETE_TEAM = "delete_team",
  INVITE_MEMBER = "invite_member",
  REMOVE_MEMBER = "remove_member",

  // Post Management
  CREATE_POST = "create_post",
  EDIT_POST = "edit_post",
  DELETE_POST = "delete_post",
  APPROVE_POST = "approve_post",
  REJECT_POST = "reject_post",
  SCHEDULE_POST = "schedule_post",

  // Social Media Management
  CONNECT_SOCIAL = "connect_social",
  DISCONNECT_SOCIAL = "disconnect_social",
  VIEW_ANALYTICS = "view_analytics",
}

export interface AuthUser extends User {
  role: UserRole;
  permissions: Permission[];
}

export interface TeamMemberRole {
  id: string;
  name: string;
  permissions: Permission[];
}

export interface TeamMember {
  userId: string;
  teamId: string;
  role: TeamMemberRole;
  joinedAt: Date;
}

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  [UserRole.ADMIN]: Object.values(Permission),
  [UserRole.SUPERVISOR]: [
    Permission.CREATE_POST,
    Permission.EDIT_POST,
    Permission.DELETE_POST,
    Permission.APPROVE_POST,
    Permission.REJECT_POST,
    Permission.SCHEDULE_POST,
    Permission.VIEW_ANALYTICS,
  ],
  [UserRole.CONTRIBUTOR]: [
    Permission.CREATE_POST,
    Permission.EDIT_POST,
    Permission.SCHEDULE_POST,
  ],
};

export function hasPermission(user: AuthUser, permission: Permission): boolean {
  return user.permissions.includes(permission);
}

export function hasRole(user: AuthUser, role: UserRole): boolean {
  return user.role === role;
}

export function canAccessRoute(
  user: AuthUser,
  requiredPermissions: Permission[]
): boolean {
  return requiredPermissions.every((permission) =>
    hasPermission(user, permission)
  );
}
