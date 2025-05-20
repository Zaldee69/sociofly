import { Role, SocialPlatform } from "@prisma/client";

export interface Team {
  id: string;
  name: string;
  description: string;
  role: Role;
  color?: string;
  memberCount?: number;
}

export interface Member {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: "ACTIVE" | "INACTIVE" | "SUSPENDED";
  lastActive: Date;
}

export interface Invite {
  id: string;
  email: string;
  role: Role;
  createdAt: Date;
  status: string;
}

export interface SocialAccount {
  id: string;
  name: string | null;
  platform: SocialPlatform;
  accessToken: string;
  refreshToken: string | null;
  expiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
  organizationId: string;
  profilePicture?: string;
}

export interface Permission {
  id: string;
  name: string;
  description: string;
  code: string;
}

export interface CustomRole {
  id: string;
  name: string;
  description: string | null;
  permissions: string[];
}

export interface TeamFormData {
  name: string;
  description: string;
  color: string;
  notifications: {
    memberJoined: boolean;
    memberLeft: boolean;
    contentCreated: boolean;
    contentReviewed: boolean;
  };
}
