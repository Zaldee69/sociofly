"use client";
import React, { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Users,
  UserPlus,
  Mail,
  Settings,
  ArrowLeft,
  Search,
  Filter,
  Clock,
  CheckCircle,
  X,
  Facebook,
  Plus,
  Instagram,
  Twitter,
  Linkedin,
  Youtube,
  ExternalLink,
  Ellipsis,
  Trash,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import AddMemberModal from "../components/add-member";
import { trpc } from "@/lib/trpc/client";
import { type SocialPlatform, Role } from "@prisma/client";
import { type TRPCClientErrorLike } from "@trpc/client";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Member {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: "ACTIVE" | "INACTIVE" | "SUSPENDED";
  lastActive: Date;
}

interface Team {
  id: number;
  name: string;
  description: string;
  role: Role;
  color?: string;
}

interface SocialAccount {
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
}

const Page = () => {
  const { id: teamId } = useParams();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [activeTab, setActiveTab] = useState<string>("members");
  const [isAddAccountOpen, setIsAddAccountOpen] = useState(false);
  const [selectedSocialAccount, setSelectedSocialAccount] = useState<
    string | null
  >(null);
  const [memberToRemove, setMemberToRemove] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [isRemoveDialogOpen, setIsRemoveDialogOpen] = useState(false);
  const [isDeleteTeamDialogOpen, setIsDeleteTeamDialogOpen] = useState(false);
  const [teamFormData, setTeamFormData] = useState({
    name: "",
    description: "",
    color: "#6366F1",
    notifications: {
      memberJoined: true,
      memberLeft: true,
      contentCreated: true,
      contentReviewed: false,
    },
  });
  const [originalFormData, setOriginalFormData] = useState({
    name: "",
    description: "",
    color: "#6366F1",
    notifications: {
      memberJoined: true,
      memberLeft: true,
      contentCreated: true,
      contentReviewed: false,
    },
  });
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [rolePermissions, setRolePermissions] = useState<
    Record<string, string[]>
  >({});
  const [originalRolePermissions, setOriginalRolePermissions] = useState<
    Record<string, string[]>
  >({});
  const [isRolePermissionsSaving, setIsRolePermissionsSaving] = useState(false);
  const [currentRole, setCurrentRole] = useState("CAMPAIGN_MANAGER");
  const [isCreateRoleOpen, setIsCreateRoleOpen] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleDescription, setNewRoleDescription] = useState("");
  const [newRolePermissions, setNewRolePermissions] = useState<string[]>([]);
  const [isCreatingRole, setIsCreatingRole] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const utils = trpc.useUtils();

  // tRPC queries
  const { data: team, isLoading: isLoadingTeam } =
    trpc.team.getTeamById.useQuery(
      { teamId: teamId as string },
      {
        retry: false,
      }
    );

  const { data: members, isLoading: isLoadingMembers } =
    trpc.team.getTeamMembers.useQuery(
      { teamId: teamId as string, searchQuery: "" },
      {
        enabled: !!teamId,
        staleTime: 1000 * 60 * 5, // Data tetap fresh selama 5 menit
      }
    );

  const { data: invites, isLoading: isLoadingInvites } =
    trpc.team.getTeamInvites.useQuery(
      { teamId: teamId as string },
      {
        enabled: !!teamId && team?.role === "TEAM_OWNER",
      }
    );

  // Social Account queries and mutations
  const { data: socialAccounts, isLoading: isLoadingSocialAccounts } =
    trpc.team.getSocialAccounts.useQuery({ teamId: teamId as string });

  const { data: availableSocialAccounts } =
    trpc.team.getAvailableSocialAccounts.useQuery(
      { teamId: teamId as string },
      {
        enabled: !!teamId && team?.role === "TEAM_OWNER",
      }
    );

  const addSocialAccountMutation = trpc.team.addSocialAccount.useMutation({
    onSuccess: () => {
      toast.success("Social account added successfully");
      setIsAddAccountOpen(false);
      utils.team.getSocialAccounts.invalidate({ teamId: teamId as string });
    },
    onError: (error: TRPCClientErrorLike<any>) => {
      toast.error(error.message);
    },
  });

  const removeSocialAccountMutation = trpc.team.removeSocialAccount.useMutation(
    {
      onSuccess: () => {
        toast.success("Social account removed successfully");
        utils.team.getSocialAccounts.invalidate({ teamId: teamId as string });
      },
      onError: (error: TRPCClientErrorLike<any>) => {
        toast.error(error.message);
      },
    }
  );

  // tRPC mutations
  const inviteMutation = trpc.team.inviteMember.useMutation({
    onSuccess: () => {
      toast.success("Invitation sent successfully");
      utils.team.getTeamInvites.invalidate({ teamId: teamId as string });
    },
    onError: (error: TRPCClientErrorLike<any>) => {
      toast.error(error.message);
    },
  });

  const updateRoleMutation = trpc.team.updateMemberRole.useMutation({
    onSuccess: () => {
      toast.success("Team member role has been updated successfully");
      utils.team.getTeamMembers.invalidate({ teamId: teamId as string });
    },
    onError: (error: TRPCClientErrorLike<any>) => {
      toast.error(
        error.message || "Could not update team member role. Please try again."
      );
    },
  });

  const removeMemberMutation = trpc.team.removeMember.useMutation({
    onSuccess: () => {
      toast.success("Team member has been removed successfully");
      utils.team.getTeamMembers.invalidate({ teamId: teamId as string });
    },
    onError: (error: TRPCClientErrorLike<any>) => {
      toast.error(
        error.message || "Could not remove team member. Please try again."
      );
    },
  });

  // New team update mutation
  const updateTeamMutation = trpc.team.updateTeam.useMutation({
    onSuccess: () => {
      toast.success("Team settings updated successfully");
      utils.team.getTeamById.invalidate({ teamId: teamId as string });
    },
    onError: (error: TRPCClientErrorLike<any>) => {
      toast.error(
        error.message || "Could not update team settings. Please try again."
      );
    },
  });

  // New team delete mutation
  const deleteTeamMutation = trpc.team.deleteTeam.useMutation({
    onSuccess: () => {
      toast.success("Team deleted successfully");
      router.push("/teams");
    },
    onError: (error: TRPCClientErrorLike<any>) => {
      toast.error(error.message || "Could not delete team. Please try again.");
    },
  });

  // Get custom roles from API
  const { data: customRoles, isLoading: isLoadingCustomRoles } =
    trpc.team.getCustomRoles.useQuery(
      { teamId: teamId as string },
      {
        enabled: !!teamId && team?.role === "TEAM_OWNER",
      }
    );

  // Get available permissions from API
  const { data: availablePermissionsData } =
    trpc.team.getAvailablePermissions.useQuery(undefined, {
      enabled: !!teamId && team?.role === "TEAM_OWNER",
    });

  // Create custom role mutation
  const createCustomRoleMutation = trpc.team.createCustomRole.useMutation({
    onSuccess: () => {
      toast.success("Custom role created successfully");
      utils.team.getCustomRoles.invalidate({ teamId: teamId as string });
      setIsCreateRoleOpen(false);
      setNewRoleName("");
      setNewRoleDescription("");
      setNewRolePermissions([]);
    },
    onError: (error: TRPCClientErrorLike<any>) => {
      toast.error(error.message || "Failed to create custom role");
    },
  });

  // Update custom role mutation
  const updateCustomRoleMutation = trpc.team.updateCustomRole.useMutation({
    onSuccess: () => {
      toast.success("Role permissions updated successfully");
      utils.team.getCustomRoles.invalidate({ teamId: teamId as string });
    },
    onError: (error: TRPCClientErrorLike<any>) => {
      toast.error(error.message || "Failed to update role permissions");
    },
  });

  // Delete custom role mutation
  const deleteCustomRoleMutation = trpc.team.deleteCustomRole.useMutation({
    onSuccess: () => {
      toast.success("Role deleted successfully");
      utils.team.getCustomRoles.invalidate({ teamId: teamId as string });
    },
    onError: (error: TRPCClientErrorLike<any>) => {
      toast.error(error.message || "Failed to delete role");
    },
  });

  // Available permissions fallback
  const availablePermissions = [
    {
      id: "content.create",
      name: "Create Content",
      description: "Can create new content and drafts",
    },
    {
      id: "content.edit",
      name: "Edit Content",
      description: "Can edit existing content",
    },
    {
      id: "content.view",
      name: "View Content",
      description: "Can view content in all stages",
    },
    {
      id: "content.delete",
      name: "Delete Content",
      description: "Can delete content",
    },
    {
      id: "content.approve",
      name: "Approve Content",
      description: "Can approve content for publishing",
    },
    {
      id: "content.publish",
      name: "Publish Content",
      description: "Can publish approved content",
    },
    {
      id: "content.comment",
      name: "Comment on Content",
      description: "Can add comments to content",
    },
    {
      id: "analytics.view",
      name: "View Analytics",
      description: "Can view analytics and reports",
    },
    {
      id: "analytics.export",
      name: "Export Analytics",
      description: "Can export analytics data",
    },
    {
      id: "team.invite",
      name: "Invite Members",
      description: "Can invite new team members",
    },
    {
      id: "messages.view",
      name: "View Messages",
      description: "Can view incoming messages",
    },
    {
      id: "messages.reply",
      name: "Reply to Messages",
      description: "Can reply to incoming messages",
    },
  ];

  // Role descriptions
  const roleDescriptions: Record<string, string> = {
    CAMPAIGN_MANAGER: "Manages campaigns and has broad permissions",
    CONTENT_PRODUCER: "Creates and edits content",
    CONTENT_REVIEWER: "Reviews and approves content",
    CLIENT_REVIEWER: "Views and provides feedback on content",
    ANALYTICS_OBSERVER: "Views analytics and performance data",
    INBOX_AGENT: "Manages incoming messages and comments",
  };

  // Format permissions data from the API
  const formattedPermissions = React.useMemo(() => {
    if (!availablePermissionsData) return [];

    return availablePermissionsData.map((p: { code: string }) => ({
      id: p.code,
      name: p.code
        .split(".")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" "),
      description: `Can ${p.code.split(".")[1] || ""} ${p.code.split(".")[0] || ""}`,
    }));
  }, [availablePermissionsData]);

  // Combined permissions and roles
  const allPermissions =
    formattedPermissions.length > 0
      ? formattedPermissions
      : availablePermissions;

  // Combined role permissions data (built-in + custom)
  const combinedRolePermissions = React.useMemo(() => {
    const combined = { ...rolePermissions };

    // Remove TEAM_OWNER role as it should not be editable
    if (combined["TEAM_OWNER"]) {
      delete combined["TEAM_OWNER"];
    }

    if (customRoles) {
      customRoles.forEach((role: { name: string; permissions: string[] }) => {
        combined[role.name] = role.permissions;
      });
    }

    return combined;
  }, [rolePermissions, customRoles]);

  // Combined role descriptions
  const combinedRoleDescriptions = React.useMemo(() => {
    const combined = { ...roleDescriptions };

    // Remove TEAM_OWNER role as it should not be editable
    if (combined["TEAM_OWNER"]) {
      delete combined["TEAM_OWNER"];
    }

    if (customRoles) {
      customRoles.forEach(
        (role: { name: string; description: string | null }) => {
          combined[role.name] = role.description || "";
        }
      );
    }

    return combined;
  }, [roleDescriptions, customRoles]);

  // Use effect to update form when team data changes
  useEffect(() => {
    if (team) {
      const initialData = {
        name: team.name,
        description: team.description,
        color: "#6366F1", // Default color since it's not in the API yet
        notifications: {
          memberJoined: true,
          memberLeft: true,
          contentCreated: true,
          contentReviewed: false,
        },
      };
      setTeamFormData(initialData);
      setOriginalFormData(initialData);
    }
  }, [team]);

  // Check if general settings have changed
  const hasGeneralSettingsChanged = React.useMemo(() => {
    return (
      teamFormData.name !== originalFormData.name ||
      teamFormData.description !== originalFormData.description ||
      teamFormData.color !== originalFormData.color
    );
  }, [teamFormData, originalFormData]);

  // Check if notification settings have changed
  const hasNotificationSettingsChanged = React.useMemo(() => {
    return (
      teamFormData.notifications.memberJoined !==
        originalFormData.notifications.memberJoined ||
      teamFormData.notifications.memberLeft !==
        originalFormData.notifications.memberLeft ||
      teamFormData.notifications.contentCreated !==
        originalFormData.notifications.contentCreated ||
      teamFormData.notifications.contentReviewed !==
        originalFormData.notifications.contentReviewed
    );
  }, [teamFormData.notifications, originalFormData.notifications]);

  // Initialize permissions
  const { data: initializedPermissions } =
    trpc.team.initializePermissions.useQuery(undefined, {
      enabled: !!teamId && team?.role === "TEAM_OWNER",
      staleTime: Infinity, // Only need to run once
    });

  // Get role permissions queries for each built-in role
  const teamOwnerPermissions = trpc.team.getRolePermissions.useQuery(
    { role: "TEAM_OWNER" as Role },
    { enabled: !!teamId && team?.role === "TEAM_OWNER" }
  );

  const campaignManagerPermissions = trpc.team.getRolePermissions.useQuery(
    { role: "CAMPAIGN_MANAGER" as Role },
    { enabled: !!teamId && team?.role === "TEAM_OWNER" }
  );

  const contentProducerPermissions = trpc.team.getRolePermissions.useQuery(
    { role: "CONTENT_PRODUCER" as Role },
    { enabled: !!teamId && team?.role === "TEAM_OWNER" }
  );

  const contentReviewerPermissions = trpc.team.getRolePermissions.useQuery(
    { role: "CONTENT_REVIEWER" as Role },
    { enabled: !!teamId && team?.role === "TEAM_OWNER" }
  );

  const clientReviewerPermissions = trpc.team.getRolePermissions.useQuery(
    { role: "CLIENT_REVIEWER" as Role },
    { enabled: !!teamId && team?.role === "TEAM_OWNER" }
  );

  const analyticsObserverPermissions = trpc.team.getRolePermissions.useQuery(
    { role: "ANALYTICS_OBSERVER" as Role },
    { enabled: !!teamId && team?.role === "TEAM_OWNER" }
  );

  const inboxAgentPermissions = trpc.team.getRolePermissions.useQuery(
    { role: "INBOX_AGENT" as Role },
    { enabled: !!teamId && team?.role === "TEAM_OWNER" }
  );

  // Update built-in role permissions mutation
  const updateBuiltInRoleMutation = trpc.team.updateRolePermissions.useMutation(
    {
      onSuccess: () => {
        toast.success("Role permissions updated successfully");
        // Refresh the data
        utils.team.getRolePermissions.invalidate();
      },
      onError: (error: TRPCClientErrorLike<any>) => {
        toast.error(error.message || "Failed to update role permissions");
      },
    }
  );

  // Update role permissions from queries
  useEffect(() => {
    if (team?.role === "TEAM_OWNER" && initializedPermissions) {
      const updatedRolePermissions = { ...rolePermissions };

      // Skip TEAM_OWNER permissions as it should not be editable

      if (campaignManagerPermissions.data) {
        updatedRolePermissions["CAMPAIGN_MANAGER"] =
          campaignManagerPermissions.data;
      }

      if (contentProducerPermissions.data) {
        updatedRolePermissions["CONTENT_PRODUCER"] =
          contentProducerPermissions.data;
      }

      if (contentReviewerPermissions.data) {
        updatedRolePermissions["CONTENT_REVIEWER"] =
          contentReviewerPermissions.data;
      }

      if (clientReviewerPermissions.data) {
        updatedRolePermissions["CLIENT_REVIEWER"] =
          clientReviewerPermissions.data;
      }

      if (analyticsObserverPermissions.data) {
        updatedRolePermissions["ANALYTICS_OBSERVER"] =
          analyticsObserverPermissions.data;
      }

      if (inboxAgentPermissions.data) {
        updatedRolePermissions["INBOX_AGENT"] = inboxAgentPermissions.data;
      }

      if (Object.keys(updatedRolePermissions).length > 0) {
        setRolePermissions(updatedRolePermissions);
        setOriginalRolePermissions(updatedRolePermissions);
      }
    }
  }, [
    team,
    initializedPermissions,
    // Skip teamOwnerPermissions.data from dependency array
    campaignManagerPermissions.data,
    contentProducerPermissions.data,
    contentReviewerPermissions.data,
    clientReviewerPermissions.data,
    analyticsObserverPermissions.data,
    inboxAgentPermissions.data,
  ]);

  // Define permission hierarchy
  const permissionHierarchy: Record<string, string[]> = {
    // Team hierarchy
    "team.manage": ["team.invite", "team.viewInvites", "team.view_members"],

    // Content hierarchy
    "content.edit": ["content.create", "content.view"],
    "content.approve": ["content.view", "content.comment"],
    "content.publish": ["content.view", "content.approve"],
    "content.delete": ["content.view"],

    // Media hierarchy
    "media.edit": ["media.view"],
    "media.delete": ["media.view"],
    "media.copy": ["media.view"],
    "media.upload": ["media.view"],

    // Schedule hierarchy
    "schedule.create": ["schedule.view"],
    "schedule.reschedule": ["schedule.view"],
    "schedule.unschedule": ["schedule.view"],

    // Analytics hierarchy
    "analytics.export": ["analytics.view"],

    // Inbox hierarchy
    "inbox.reply": ["inbox.view"],
    "inbox.assign": ["inbox.view"],

    // Messages hierarchy
    "messages.reply": ["messages.view"],
  };

  // Helper function to check if the user has a specific permission
  const hasPermission = (permission: string) => {
    // TEAM_OWNER has all permissions
    if (team?.role === "TEAM_OWNER") {
      return true;
    }

    const userPermissions = combinedRolePermissions[team?.role as string] || [];

    // Direct permission check
    if (userPermissions.includes(permission)) {
      return true;
    }

    // Check if user has a higher permission that includes this one
    for (const [higherPerm, includedPerms] of Object.entries(
      permissionHierarchy
    )) {
      if (
        userPermissions.includes(higherPerm) &&
        includedPerms.includes(permission)
      ) {
        return true;
      }
    }

    return false;
  };

  // Handlers
  const handleAddMember = async (values: {
    team: string;
    teamId?: string;
    role: string;
    email: string;
    message?: string;
  }) => {
    return new Promise<void>((resolve, reject) => {
      inviteMutation.mutate(
        {
          email: values.email,
          teamId: values.teamId || (teamId as string),
          role: (values.role === "TEAM_OWNER"
            ? "CAMPAIGN_MANAGER"
            : values.role) as
            | "CAMPAIGN_MANAGER"
            | "CONTENT_PRODUCER"
            | "CONTENT_REVIEWER"
            | "CLIENT_REVIEWER"
            | "ANALYTICS_OBSERVER"
            | "INBOX_AGENT",
          name: values.team || "",
        },
        {
          onSuccess: () => resolve(),
          onError: (error) => reject(error),
        }
      );
    });
  };

  // Handlers for social accounts
  const handleAddSocialAccount = (platform: SocialPlatform) => {
    // This is a placeholder - in reality, you would redirect to OAuth flow
    addSocialAccountMutation.mutate({
      teamId: teamId as string,
      platform,
      accessToken: "placeholder-token", // This would come from OAuth
      name: `${platform.toLowerCase()} account`, // This would come from OAuth
    });
  };

  const handleRemoveSocialAccount = (accountId: string) => {
    removeSocialAccountMutation.mutate({
      teamId: teamId as string,
      accountId,
    });
  };

  const handleChangeRole = async (
    memberId: string,
    role:
      | "CAMPAIGN_MANAGER"
      | "CONTENT_PRODUCER"
      | "CONTENT_REVIEWER"
      | "CLIENT_REVIEWER"
      | "ANALYTICS_OBSERVER"
      | "INBOX_AGENT"
  ) => {
    try {
      updateRoleMutation.mutate({
        teamId: teamId as string,
        memberId,
        role,
      });
    } catch (error) {
      console.error("Error updating member role:", error);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    try {
      removeMemberMutation.mutate({
        teamId: teamId as string,
        memberId,
      });
      setIsRemoveDialogOpen(false);
      setMemberToRemove(null);
    } catch (error) {
      console.error("Error removing team member:", error);
    }
  };

  const handleTeamUpdate = async () => {
    try {
      setIsSaving(true);
      await updateTeamMutation.mutateAsync({
        teamId: teamId as string,
        name: teamFormData.name,
        description: teamFormData.description,
        color: teamFormData.color,
        notificationSettings: teamFormData.notifications,
      });
      // Update original data after successful save
      setOriginalFormData({ ...teamFormData });
    } catch (error) {
      console.error("Error updating team:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTeamDelete = async () => {
    try {
      deleteTeamMutation.mutate({
        teamId: teamId as string,
      });
    } catch (error) {
      console.error("Error deleting team:", error);
    }
  };

  const handleSaveRolePermissions = async () => {
    try {
      setIsRolePermissionsSaving(true);

      // Check if this is a custom role or a built-in role
      const isCustomRole = customRoles?.some(
        (r: { name: string }) => r.name === currentRole
      );

      if (isCustomRole) {
        // Find the role ID
        const roleId = customRoles?.find(
          (r: { name: string }) => r.name === currentRole
        )?.id;

        if (roleId) {
          // Update custom role
          await updateCustomRoleMutation.mutateAsync({
            teamId: teamId as string,
            roleId,
            displayName: currentRole.replace(/_/g, " "),
            description: combinedRoleDescriptions[currentRole],
            permissions: combinedRolePermissions[currentRole],
          });
        }
      } else {
        // For built-in roles
        // Check if the role is a valid built-in role
        if (Object.values(Role).includes(currentRole as Role)) {
          await updateBuiltInRoleMutation.mutateAsync({
            teamId: teamId as string,
            role: currentRole as Role,
            permissions: combinedRolePermissions[currentRole],
          });
        } else {
          toast.error("Invalid role");
        }
      }

      // Update original permissions after save
      setOriginalRolePermissions({ ...combinedRolePermissions });
    } catch (error) {
      console.error("Error updating role permissions:", error);
    } finally {
      setIsRolePermissionsSaving(false);
    }
  };

  // Check if role permissions have changed
  const hasRolePermissionsChanged = React.useMemo(() => {
    // Get the currently selected role
    const currentRolePermissions = rolePermissions[currentRole] || [];
    const originalCurrentRolePermissions =
      originalRolePermissions[currentRole] || [];

    // Quick length check first
    if (
      currentRolePermissions.length !== originalCurrentRolePermissions.length
    ) {
      return true;
    }

    // Check if all items are the same
    const sortedCurrent = [...currentRolePermissions].sort();
    const sortedOriginal = [...originalCurrentRolePermissions].sort();

    return sortedCurrent.some(
      (permission, index) => permission !== sortedOriginal[index]
    );
  }, [rolePermissions, originalRolePermissions, currentRole]);

  const handleTogglePermission = (role: string, permission: string) => {
    setRolePermissions((prev) => {
      const updatedPermissions = { ...prev };

      if (updatedPermissions[role].includes(permission)) {
        // Remove permission if already exists
        updatedPermissions[role] = updatedPermissions[role].filter(
          (p) => p !== permission
        );
      } else {
        // Add permission if doesn't exist
        updatedPermissions[role] = [...updatedPermissions[role], permission];
      }

      return updatedPermissions;
    });
  };

  const handleCreateCustomRole = async () => {
    if (!newRoleName.trim()) {
      toast.error("Role name cannot be empty");
      return;
    }

    try {
      setIsCreatingRole(true);

      // Format role name to match pattern (uppercase with underscores)
      const formattedRoleName = newRoleName
        .toUpperCase()
        .trim()
        .replace(/\s+/g, "_");

      // Check if role already exists
      if (combinedRolePermissions[formattedRoleName]) {
        toast.error("A role with this name already exists");
        return;
      }

      // Create the role in the database
      createCustomRoleMutation.mutate({
        teamId: teamId as string,
        name: formattedRoleName,
        displayName: newRoleName.trim(),
        description: newRoleDescription,
        permissions: newRolePermissions,
      });

      // Set current role to the newly created one after successful creation
      setCurrentRole(formattedRoleName);
    } catch (error) {
      console.error("Error creating custom role:", error);
    } finally {
      setIsCreatingRole(false);
    }
  };

  const handleToggleNewRolePermission = (permission: string) => {
    setNewRolePermissions((prev) => {
      if (prev.includes(permission)) {
        return prev.filter((p) => p !== permission);
      } else {
        return [...prev, permission];
      }
    });
  };

  const handleDeleteCustomRole = async (roleName: string) => {
    const customRole = customRoles?.find(
      (r: { name: string; id: string }) => r.name === roleName
    );

    if (!customRole) {
      toast.error("Cannot delete built-in roles");
      return;
    }

    try {
      await deleteCustomRoleMutation.mutateAsync({
        teamId: teamId as string,
        roleId: customRole.id,
      });

      // Set current role to a default one
      setCurrentRole("CAMPAIGN_MANAGER");
    } catch (error) {
      console.error("Error deleting custom role:", error);
    }
  };

  const renderPlatformIcon = (platform: SocialPlatform) => {
    switch (platform) {
      case "INSTAGRAM":
        return <Instagram className="h-5 w-5 text-white" />;
      case "FACEBOOK":
        return <Facebook className="h-5 w-5 text-white" />;
      case "TWITTER":
        return <Twitter className="h-5 w-5 text-white" />;
      case "LINKEDIN":
        return <Linkedin className="h-5 w-5 text-white" />;
      case "YOUTUBE":
        return <Youtube className="h-5 w-5 text-white" />;
      default:
        return null;
    }
  };

  // Filter members based on search query
  const filteredMembers =
    members?.filter(
      (member) =>
        member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        member.email.toLowerCase().includes(searchQuery.toLowerCase())
    ) ?? [];

  // Hanya tampilkan loading untuk seluruh halaman pada awal load
  if ((isLoadingTeam || isLoadingMembers) && !searchQuery) {
    return (
      <div className="container mx-auto py-6">
        <div className="mb-6">
          <Button variant="outline" className="mb-4" disabled>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Teams
          </Button>

          <div className="flex justify-between items-center">
            <div>
              <Skeleton className="h-8 w-[200px] mb-2" />
              <Skeleton className="h-4 w-[300px]" />
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-[150px] mb-2" />
              <Skeleton className="h-4 w-[250px]" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center space-x-4">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-[200px]" />
                      <Skeleton className="h-4 w-[150px]" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!team) {
    return null;
  }

  // Get status badge
  const getStatusBadge = (status: Member["status"]) => {
    switch (status.toLowerCase()) {
      case "active":
        return <Badge className="bg-green-600">Active</Badge>;
      case "inactive":
        return <Badge variant="outline">Inactive</Badge>;
      case "SUSPENDED":
        return <Badge variant="destructive">Suspended</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getRoleBadge = (role: Role) => {
    switch (role) {
      case "TEAM_OWNER":
        return <Badge className="bg-purple-600">Team Owner</Badge>;
      case "CAMPAIGN_MANAGER":
        return <Badge className="bg-blue-600">Campaign Manager</Badge>;
      case "CONTENT_PRODUCER":
        return <Badge variant="secondary">Content Producer</Badge>;
      case "CONTENT_REVIEWER":
        return <Badge variant="secondary">Content Reviewer</Badge>;
      case "CLIENT_REVIEWER":
        return <Badge variant="secondary">Client Reviewer</Badge>;
      case "ANALYTICS_OBSERVER":
        return <Badge variant="secondary">Analytics Observer</Badge>;
      case "INBOX_AGENT":
        return <Badge variant="secondary">Inbox Agent</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <Button
          variant="outline"
          className="mb-4"
          onClick={() => router.back()}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Teams
        </Button>

        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">{team.name}</h1>
            <p className="text-muted-foreground">{team.description}</p>
          </div>
          {hasPermission("team.invite") && (
            <AddMemberModal teams={team} onAddMember={handleAddMember} />
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="members">
            <Users className="h-4 w-4 mr-2" />
            Team Members
          </TabsTrigger>
          <TabsTrigger value="social-accounts">
            <Users className="h-4 w-4 mr-2" />
            Social Accounts
          </TabsTrigger>
          {hasPermission("team.viewInvites") && (
            <TabsTrigger value="invites">
              <Mail className="h-4 w-4 mr-2" />
              Pending Invites
            </TabsTrigger>
          )}
          {hasPermission("team.manage") && (
            <TabsTrigger value="roles">
              <Settings className="h-4 w-4 mr-2" />
              Manage Roles
            </TabsTrigger>
          )}
          {hasPermission("team.manage") && (
            <TabsTrigger value="settings">
              <Settings className="h-4 w-4 mr-2" />
              Team Settings
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="members">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Team Members
              </CardTitle>
              <CardDescription>
                Manage the members of {team.name}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex mb-6">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search members..."
                    className="pl-9"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Last Active</TableHead>
                    <TableHead>Status</TableHead>
                    {/* {team.role === "TEAM_OWNER" && (
                      <TableHead className="text-right">Actions</TableHead>
                    )} */}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingMembers && searchQuery
                    ? // Tampilkan skeleton loading hanya untuk tabel saat pencarian
                      Array(3)
                        .fill(0)
                        .map((_, i) => (
                          <TableRow key={`skeleton-${i}`}>
                            <TableCell>
                              <div>
                                <Skeleton className="h-4 w-[150px] mb-2" />
                                <Skeleton className="h-3 w-[120px]" />
                              </div>
                            </TableCell>
                            <TableCell>
                              <Skeleton className="h-4 w-[80px]" />
                            </TableCell>
                            <TableCell>
                              <Skeleton className="h-4 w-[100px]" />
                            </TableCell>
                            <TableCell>
                              <Skeleton className="h-4 w-[60px]" />
                            </TableCell>
                            {team.role === "TEAM_OWNER" && (
                              <TableCell className="text-right">
                                <Skeleton className="h-8 w-8 ml-auto" />
                              </TableCell>
                            )}
                          </TableRow>
                        ))
                    : filteredMembers.map((member) => (
                        <TableRow key={member.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{member.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {member.email}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>{getRoleBadge(member.role)}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3 text-muted-foreground" />
                              <span className="text-sm">
                                {new Date(
                                  member.lastActive
                                ).toLocaleDateString()}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(
                              member.status as
                                | "ACTIVE"
                                | "INACTIVE"
                                | "SUSPENDED"
                            )}
                          </TableCell>
                          {team.role === "TEAM_OWNER" &&
                            member.role !== "TEAM_OWNER" && (
                              <TableCell className="text-right">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost">
                                      <Ellipsis className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent
                                    side="left"
                                    className="w-56"
                                  >
                                    <DropdownMenuLabel>
                                      Edit Member
                                    </DropdownMenuLabel>

                                    <DropdownMenuSeparator />
                                    <DropdownMenuGroup>
                                      <DropdownMenuSub>
                                        <DropdownMenuSubTrigger>
                                          Change Role
                                        </DropdownMenuSubTrigger>
                                        <DropdownMenuPortal>
                                          <DropdownMenuSubContent
                                            sideOffset={10}
                                          >
                                            <DropdownMenuItem
                                              onClick={() =>
                                                handleChangeRole(
                                                  member.id,
                                                  "CAMPAIGN_MANAGER"
                                                )
                                              }
                                            >
                                              Campaign Manager
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                              onClick={() =>
                                                handleChangeRole(
                                                  member.id,
                                                  "CONTENT_PRODUCER"
                                                )
                                              }
                                            >
                                              Content Producer
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                              onClick={() =>
                                                handleChangeRole(
                                                  member.id,
                                                  "CONTENT_REVIEWER"
                                                )
                                              }
                                            >
                                              Content Reviewer
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                              onClick={() =>
                                                handleChangeRole(
                                                  member.id,
                                                  "CLIENT_REVIEWER"
                                                )
                                              }
                                            >
                                              Client Reviewer
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                              onClick={() =>
                                                handleChangeRole(
                                                  member.id,
                                                  "ANALYTICS_OBSERVER"
                                                )
                                              }
                                            >
                                              Analytics Observer
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                              onClick={() =>
                                                handleChangeRole(
                                                  member.id,
                                                  "INBOX_AGENT"
                                                )
                                              }
                                            >
                                              Inbox Agent
                                            </DropdownMenuItem>
                                          </DropdownMenuSubContent>
                                        </DropdownMenuPortal>
                                      </DropdownMenuSub>
                                    </DropdownMenuGroup>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      className="text-destructive"
                                      onClick={() => {
                                        setMemberToRemove({
                                          id: member.id,
                                          name: member.name,
                                        });
                                        setIsRemoveDialogOpen(true);
                                      }}
                                    >
                                      <Trash className="mr-2 h-4 w-4 text-destructive hover:text-destructive" />{" "}
                                      Remove Member
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>
                            )}
                        </TableRow>
                      ))}
                </TableBody>
              </Table>

              {!isLoadingMembers && filteredMembers.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No team members found matching your criteria
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="social-accounts">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Social Accounts
              </CardTitle>
              <CardDescription>
                Manage connected social media accounts
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingSocialAccounts ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center space-x-4">
                      <Skeleton className="h-12 w-12 rounded-full" />
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-[200px]" />
                        <Skeleton className="h-4 w-[150px]" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : socialAccounts && socialAccounts.length > 0 ? (
                <div className="space-y-4">
                  {socialAccounts.map((account) => (
                    <div
                      key={account.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center gap-4">
                        <img
                          src={account.profilePicture!}
                          className="ml-2 text-white hover:text-gray-200 h-10 w-10 rounded-full"
                        />
                        <div>
                          <h3 className="font-medium">{account.name}</h3>
                          <p className="text-sm text-muted-foreground capitalize">
                            {account.platform.toLowerCase()}
                          </p>
                        </div>
                      </div>

                      {hasPermission("social.connect") && (
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              handleRemoveSocialAccount(account.id)
                            }
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <X className="h-4 w-4" />
                            Remove
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  No social accounts connected
                </div>
              )}

              {hasPermission("social.connect") && (
                <div className="mt-6">
                  <Dialog
                    open={isAddAccountOpen}
                    onOpenChange={setIsAddAccountOpen}
                  >
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        Connect Account
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Connect Social Account</DialogTitle>
                        <DialogDescription>
                          Choose a platform to connect a new social media
                          account
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        {availableSocialAccounts?.map((platform) => (
                          <Button
                            key={platform}
                            variant="outline"
                            className="w-full justify-start"
                            onClick={() => {
                              setSelectedSocialAccount(platform);
                              handleAddSocialAccount(platform);
                            }}
                          >
                            {renderPlatformIcon(platform)}
                            <span className="ml-2 capitalize">
                              {platform.toLowerCase()}
                            </span>
                          </Button>
                        ))}
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {hasPermission("team.viewInvites") && (
          <TabsContent value="invites">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Pending Invitations
                </CardTitle>
                <CardDescription>
                  Manage pending invitations for {team.name}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {invites && invites.length > 0 ? (
                  <div className="space-y-4">
                    {invites.map((invite) => (
                      <div
                        key={invite.id}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div>
                          <h3 className="font-medium">{invite.email}</h3>
                          <div className="flex items-center gap-4 mt-1">
                            <p className="text-sm text-muted-foreground">
                              Role: {getRoleBadge(invite.role)}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            <span>
                              Sent: {invite.createdAt.toLocaleDateString()} •
                              Expires:{" "}
                              {new Date(
                                invite.createdAt.getTime() +
                                  7 * 24 * 60 * 60 * 1000
                              ).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <X className="h-4 w-4" />
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    No pending invitations
                  </div>
                )}

                <div className="mt-6">
                  <AddMemberModal teams={team} onAddMember={handleAddMember} />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {hasPermission("team.manage") && (
          <TabsContent value="roles">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Manage Roles
                </CardTitle>
                <CardDescription>
                  Configure permissions for each role in {team.name}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-8">
                  {/* Add Custom Role Button */}
                  <div className="flex justify-end">
                    <Button
                      variant="outline"
                      onClick={() => setIsCreateRoleOpen(true)}
                      className="flex items-center gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Create Custom Role
                    </Button>
                  </div>

                  {/* Role selector tabs */}
                  <Tabs
                    defaultValue="CAMPAIGN_MANAGER"
                    className="w-full"
                    onValueChange={(value) => setCurrentRole(value)}
                    value={currentRole}
                  >
                    <TabsList className="w-full justify-start overflow-auto">
                      {Object.keys(combinedRolePermissions).map((role) => (
                        <TabsTrigger
                          key={role}
                          value={role}
                          className="min-w-fit whitespace-nowrap"
                        >
                          {role.replace("_", " ").replace(/_/g, " ")}
                        </TabsTrigger>
                      ))}
                    </TabsList>

                    {/* Permission tables for each role */}
                    {Object.keys(combinedRolePermissions).map((role) => (
                      <TabsContent key={role} value={role} className="mt-6">
                        <div className="flex flex-col gap-6">
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="text-lg font-medium">
                                {role.replace("_", " ").replace(/_/g, " ")}
                              </h3>
                              <p className="text-sm text-muted-foreground">
                                {
                                  combinedRoleDescriptions[
                                    role as keyof typeof combinedRoleDescriptions
                                  ]
                                }
                              </p>
                            </div>

                            {/* Delete button for custom roles */}
                            {customRoles?.some(
                              (r: { name: string }) => r.name === role
                            ) && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-destructive"
                                onClick={() => handleDeleteCustomRole(role)}
                              >
                                <Trash className="h-4 w-4 mr-2" />
                                Delete Role
                              </Button>
                            )}
                          </div>

                          <div className="border rounded-md">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="w-1/3">
                                    Permission
                                  </TableHead>
                                  <TableHead className="w-1/2">
                                    Description
                                  </TableHead>
                                  <TableHead className="w-1/6 text-center">
                                    Access
                                  </TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {allPermissions.map((permission) => (
                                  <TableRow key={permission.id}>
                                    <TableCell className="font-medium">
                                      {permission.name}
                                    </TableCell>
                                    <TableCell>
                                      {permission.description}
                                    </TableCell>
                                    <TableCell className="text-center">
                                      <Switch
                                        checked={combinedRolePermissions[
                                          role
                                        ].includes(permission.id)}
                                        onCheckedChange={() =>
                                          handleTogglePermission(
                                            role,
                                            permission.id
                                          )
                                        }
                                      />
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>

                          <div className="flex justify-end mt-4">
                            <Button
                              onClick={handleSaveRolePermissions}
                              disabled={
                                isRolePermissionsSaving ||
                                !hasRolePermissionsChanged
                              }
                            >
                              {isRolePermissionsSaving
                                ? "Saving..."
                                : "Save Role Permissions"}
                            </Button>
                          </div>
                        </div>
                      </TabsContent>
                    ))}
                  </Tabs>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {hasPermission("team.manage") && (
          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Team Settings
                </CardTitle>
                <CardDescription>
                  Manage settings for {team.name}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-8">
                  <div className="space-y-6">
                    <h3 className="text-lg font-medium">General Settings</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Team Name</label>
                        <Input
                          value={teamFormData.name}
                          onChange={(e) =>
                            setTeamFormData({
                              ...teamFormData,
                              name: e.target.value,
                            })
                          }
                          placeholder="Enter team name"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">
                          Team Description
                        </label>
                        <Input
                          value={teamFormData.description}
                          onChange={(e) =>
                            setTeamFormData({
                              ...teamFormData,
                              description: e.target.value,
                            })
                          }
                          placeholder="Enter team description"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">
                          Team Color
                        </label>
                        <div className="flex items-center gap-3">
                          <div
                            className="w-10 h-10 rounded-md border"
                            style={{ backgroundColor: teamFormData.color }}
                          />
                          <Input
                            type="color"
                            value={teamFormData.color}
                            onChange={(e) =>
                              setTeamFormData({
                                ...teamFormData,
                                color: e.target.value,
                              })
                            }
                            className="w-16 h-10 p-1"
                          />
                          <span className="text-sm text-muted-foreground">
                            {teamFormData.color}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end mt-4">
                      <Button
                        onClick={handleTeamUpdate}
                        disabled={!hasGeneralSettingsChanged || isSaving}
                      >
                        {isSaving ? "Saving..." : "Save Changes"}
                      </Button>
                    </div>
                  </div>

                  <div className="pt-4 border-t">
                    <h3 className="text-lg font-medium mb-4">
                      Notification Preferences
                    </h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">New Member Joined</p>
                          <p className="text-sm text-muted-foreground">
                            Receive notifications when a new member joins the
                            team
                          </p>
                        </div>
                        <Switch
                          checked={teamFormData.notifications.memberJoined}
                          onCheckedChange={(checked) =>
                            setTeamFormData({
                              ...teamFormData,
                              notifications: {
                                ...teamFormData.notifications,
                                memberJoined: checked,
                              },
                            })
                          }
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">Member Left</p>
                          <p className="text-sm text-muted-foreground">
                            Receive notifications when a member leaves the team
                          </p>
                        </div>
                        <Switch
                          checked={teamFormData.notifications.memberLeft}
                          onCheckedChange={(checked) =>
                            setTeamFormData({
                              ...teamFormData,
                              notifications: {
                                ...teamFormData.notifications,
                                memberLeft: checked,
                              },
                            })
                          }
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">Content Created</p>
                          <p className="text-sm text-muted-foreground">
                            Receive notifications about new content
                          </p>
                        </div>
                        <Switch
                          checked={teamFormData.notifications.contentCreated}
                          onCheckedChange={(checked) =>
                            setTeamFormData({
                              ...teamFormData,
                              notifications: {
                                ...teamFormData.notifications,
                                contentCreated: checked,
                              },
                            })
                          }
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">Content Reviewed</p>
                          <p className="text-sm text-muted-foreground">
                            Receive notifications when content is reviewed
                          </p>
                        </div>
                        <Switch
                          checked={teamFormData.notifications.contentReviewed}
                          onCheckedChange={(checked) =>
                            setTeamFormData({
                              ...teamFormData,
                              notifications: {
                                ...teamFormData.notifications,
                                contentReviewed: checked,
                              },
                            })
                          }
                        />
                      </div>
                    </div>

                    <div className="flex justify-end mt-4">
                      <Button
                        onClick={handleTeamUpdate}
                        disabled={!hasNotificationSettingsChanged || isSaving}
                      >
                        {isSaving ? "Saving..." : "Save Notification Settings"}
                      </Button>
                    </div>
                  </div>

                  <div className="pt-4 border-t">
                    <h3 className="text-lg font-medium text-destructive mb-4">
                      Danger Zone
                    </h3>
                    <div className="border border-destructive/20 rounded-md p-4 bg-destructive/5">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium">Delete Team</p>
                          <p className="text-sm text-muted-foreground">
                            Permanently delete this team and all associated
                            data. This action cannot be undone.
                          </p>
                        </div>
                        <Button
                          variant="destructive"
                          onClick={() => setIsDeleteTeamDialogOpen(true)}
                        >
                          Delete Team
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {/* Remove Member Confirmation Dialog */}
      <Dialog open={isRemoveDialogOpen} onOpenChange={setIsRemoveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Team Member</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove {memberToRemove?.name} from the
              team? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => setIsRemoveDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() =>
                memberToRemove && handleRemoveMember(memberToRemove.id)
              }
            >
              Remove
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Team Confirmation Dialog */}
      <Dialog
        open={isDeleteTeamDialogOpen}
        onOpenChange={setIsDeleteTeamDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Team</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the team{" "}
              <span className="font-bold">{team?.name}</span>? This action will
              permanently delete all team data, including members, posts, and
              settings. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            <p className="text-sm text-muted-foreground mb-4">
              Please type <span className="font-bold">{team?.name}</span> to
              confirm:
            </p>
            <Input
              className="mb-4"
              placeholder={`Type "${team?.name}" to confirm`}
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteTeamDialogOpen(false);
                setDeleteConfirmText("");
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleTeamDelete}
              disabled={deleteConfirmText !== team?.name}
            >
              Delete Permanently
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Custom Role Dialog */}
      <Dialog open={isCreateRoleOpen} onOpenChange={setIsCreateRoleOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Custom Role</DialogTitle>
            <DialogDescription>
              Create a new role with custom permissions for your team.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">Role Name</label>
                <Input
                  placeholder="e.g. Content Manager"
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Will be formatted as{" "}
                  {newRoleName
                    ? newRoleName.toUpperCase().replace(/\s+/g, "_")
                    : "ROLE_NAME"}
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Role Description</label>
                <Input
                  placeholder="e.g. Manages content creation workflow"
                  value={newRoleDescription}
                  onChange={(e) => setNewRoleDescription(e.target.value)}
                />
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium mb-3">Role Permissions</h3>
              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-1/3">Permission</TableHead>
                      <TableHead className="w-1/2">Description</TableHead>
                      <TableHead className="w-1/6 text-center">
                        Access
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {availablePermissions.map((permission) => (
                      <TableRow key={permission.id}>
                        <TableCell className="font-medium">
                          {permission.name}
                        </TableCell>
                        <TableCell>{permission.description}</TableCell>
                        <TableCell className="text-center">
                          <Switch
                            checked={newRolePermissions.includes(permission.id)}
                            onCheckedChange={() =>
                              handleToggleNewRolePermission(permission.id)
                            }
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => {
                setIsCreateRoleOpen(false);
                setNewRoleName("");
                setNewRoleDescription("");
                setNewRolePermissions([]);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateCustomRole}
              disabled={isCreatingRole || !newRoleName.trim()}
            >
              {isCreatingRole ? "Creating..." : "Create Role"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Page;
