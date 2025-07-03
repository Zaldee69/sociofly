import React, { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";
import { Role } from "@prisma/client";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Settings, Plus, Trash, AlertTriangle } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useFeatureFlag, usePermissions } from "@/lib/hooks";
import { motion } from "framer-motion";
import { Feature } from "@/config/feature-flags";

interface TeamRolesTabProps {
  teamId: string;
}

export const TeamRolesTab = ({ teamId }: TeamRolesTabProps) => {
  const [currentRole, setCurrentRole] = useState("MANAGER");
  const [isCreateRoleOpen, setIsCreateRoleOpen] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleDescription, setNewRoleDescription] = useState("");
  const [newRolePermissions, setNewRolePermissions] = useState<string[]>([]);
  const [isCreatingRole, setIsCreatingRole] = useState(false);
  const [rolePermissions, setRolePermissions] = useState<
    Record<string, string[]>
  >({});
  const [originalRolePermissions, setOriginalRolePermissions] = useState<
    Record<string, string[]>
  >({});
  const [isDeleteRoleOpen, setIsDeleteRoleOpen] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [fallbackRole, setFallbackRole] = useState<Role>(Role.CONTENT_CREATOR);
  const [membersUsingRole, setMembersUsingRole] = useState<number>(0);

  const { rolePermissions: permissionsFromHook, isPermissionsLoaded } =
    usePermissions(teamId);

  const utils = trpc.useUtils();

  // Role descriptions - should come from the database in future updates
  const roleDescriptions: Record<string, string> = {
    OWNER: "Team owner with all permissions",
    MANAGER: "Manages team and has broad permissions",
    SUPERVISOR: "Supervises team and content",
    CONTENT_CREATOR: "Creates and edits content",
    INTERNAL_REVIEWER: "Reviews content internally",
    CLIENT_REVIEWER: "Views and provides feedback on content",
    ANALYST: "Views analytics and performance data",
    INBOX_AGENT: "Manages incoming messages and comments",
    // Legacy roles for backwards compatibility
    TEAM_OWNER: "Team owner with all permissions",
    CAMPAIGN_MANAGER: "Manages campaigns and has broad permissions",
    CONTENT_PRODUCER: "Creates and edits content",
    CONTENT_REVIEWER: "Reviews and approves content",
    ANALYTICS_OBSERVER: "Views analytics and performance data",
  };

  // Get team data
  const { data: team } = trpc.team.getTeamById.useQuery(
    { teamId },
    { enabled: !!teamId }
  );

  const { hasFeature } = useFeatureFlag();

  const canAccessRoleManagement = hasFeature(Feature.ROLE_MANAGEMENT);
  const { hasPermission } = usePermissions(teamId as string);

  // Get custom roles from API
  const { data: customRoles, isLoading: isLoadingCustomRoles } =
    trpc.team.getCustomRoles.useQuery(
      { teamId },
      {
        enabled:
          (!!teamId && team?.role === Role.OWNER && canAccessRoleManagement) ||
          hasPermission("team.manage"),
      }
    );

  // Get available permissions from API
  const { data: availablePermissionsData, isLoading: isLoadingPermissions } =
    trpc.team.getAvailablePermissions.useQuery(undefined, {
      enabled:
        (!!teamId && canAccessRoleManagement) || hasPermission("team.manage"),
      retry: false,
    });

  // Create custom role mutation
  const createCustomRoleMutation = trpc.team.createCustomRole.useMutation({
    onSuccess: () => {
      toast.success("Custom role created successfully");
      if (canAccessRoleManagement) {
        utils.team.getCustomRoles.invalidate({ teamId });
        utils.team.getAllRolePermissions.invalidate(); // Invalidate permissions cache to refresh
      }
      setIsCreateRoleOpen(false);
      setNewRoleName("");
      setNewRoleDescription("");
      setNewRolePermissions([]);
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create custom role");
    },
  });

  // Update custom role mutation
  const updateCustomRoleMutation = trpc.team.updateCustomRole.useMutation({
    onSuccess: () => {
      toast.success("Role permissions updated successfully");
      if (canAccessRoleManagement) {
        utils.team.getCustomRoles.invalidate({ teamId });
        utils.team.getAllRolePermissions.invalidate(); // Invalidate permissions cache to refresh
      }
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update role permissions");
    },
  });

  // Delete custom role mutation
  const deleteCustomRoleMutation = trpc.team.deleteCustomRole.useMutation({
    onSuccess: () => {
      toast.success("Role deleted successfully");
      if (canAccessRoleManagement) {
        utils.team.getCustomRoles.invalidate({ teamId });
        utils.team.getAllRolePermissions.invalidate(); // Invalidate permissions cache to refresh
      }
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete role");
    },
  });

  // Set default role permissions mutation
  const setDefaultRolePermissionsMutation =
    trpc.team.setDefaultRolePermissions.useMutation({
      onSuccess: () => {
        toast.success("Default role permissions updated successfully");
        if (canAccessRoleManagement) {
          utils.team.getAllRolePermissions.invalidate(); // Invalidate all permissions instead of just one role
        }
      },
      onError: (error: any) => {
        toast.error(
          error.message || "Failed to update default role permissions"
        );
      },
    });

  // Format permissions data from the API
  const formattedPermissions = React.useMemo(() => {
    if (!availablePermissionsData) return [];

    return availablePermissionsData.map(
      (p: { code: string; description: string }) => ({
        id: p.code,
        name: p.code
          .split(".")
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(" "),
        description:
          p.description ||
          `Can ${p.code.split(".")[1] || ""} ${p.code.split(".")[0] || ""}`,
      })
    );
  }, [availablePermissionsData]);

  // Use permissions from database only
  const allPermissions = formattedPermissions;

  // Combined role permissions data (built-in + custom)
  const combinedRolePermissions = React.useMemo(() => {
    return rolePermissions;
  }, [rolePermissions]);

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

  // Update the currentRole with useEffect to ensure the default is always MANAGER on mount
  useEffect(() => {
    setCurrentRole("MANAGER");
  }, []);

  // Sync permissionsFromHook to rolePermissions when available
  useEffect(() => {
    if (permissionsFromHook && Object.keys(permissionsFromHook).length > 0) {
      setRolePermissions(permissionsFromHook);
      setOriginalRolePermissions(permissionsFromHook);
    }
  }, [permissionsFromHook]);

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
        teamId,
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

  const handleSaveRolePermissions = async () => {
    try {
      setIsCreatingRole(true);

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
            teamId,
            roleId,
            displayName: currentRole.replace(/_/g, " "),
            description: combinedRoleDescriptions[currentRole] || "",
            permissions: combinedRolePermissions[currentRole] || [],
          });
        }
      } else {
        // For built-in roles
        // Check if the role is a valid built-in role
        if (Object.values(Role).includes(currentRole as Role)) {
          // Use the new setDefaultRolePermissions endpoint to update default role permissions
          await setDefaultRolePermissionsMutation.mutateAsync({
            teamId,
            role: currentRole as Role,
            permissionCodes: combinedRolePermissions[currentRole] || [],
          });
        } else {
          toast.error("Invalid role");
        }
      }

      // Save current state as original state after successful save
      setOriginalRolePermissions({ ...rolePermissions });
    } catch (error) {
      console.error("Error updating role permissions:", error);
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

  // Check members using custom role
  const { data: memberCountData } =
    trpc.team.countMembersWithCustomRole.useQuery(
      { teamId, roleId: roleToDelete?.id || "" },
      {
        enabled: !!roleToDelete?.id,
      }
    );

  // Handle member count data changes
  useEffect(() => {
    if (!memberCountData || !roleToDelete) return;

    setMembersUsingRole(memberCountData.count);

    if (memberCountData.count > 0) {
      setIsDeleteRoleOpen(true);
    } else {
      // If no members are using the role, delete it directly
      deleteCustomRoleMutation.mutate({
        teamId,
        roleId: roleToDelete.id,
      });
    }
  }, [memberCountData, roleToDelete]);

  const handleDeleteCustomRole = async (roleName: string) => {
    const customRole = customRoles?.find(
      (r: { name: string; id: string }) => r.name === roleName
    );

    if (!customRole) {
      toast.error("Cannot delete built-in roles");
      return;
    }

    setRoleToDelete({ id: customRole.id, name: roleName });

    // This will trigger the query to run since we're setting roleToDelete
  };

  const confirmDeleteRole = async () => {
    if (!roleToDelete) return;

    try {
      await deleteCustomRoleMutation.mutateAsync({
        teamId,
        roleId: roleToDelete.id,
        fallbackRole,
      });

      // Set current role to a default one
      setCurrentRole("MANAGER");
      setIsDeleteRoleOpen(false);
      setRoleToDelete(null);
    } catch (error) {
      console.error("Error deleting custom role:", error);
    }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center w-full">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <motion.div
                    initial={{ rotate: -90 }}
                    animate={{ rotate: 0 }}
                    transition={{ duration: 0.5 }}
                  >
                    <Settings className="h-5 w-5" />
                  </motion.div>
                  Manage Roles
                </CardTitle>
                <CardDescription>
                  Configure permissions for each role in your team
                </CardDescription>
              </div>
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button
                  variant="outline"
                  onClick={() => setIsCreateRoleOpen(true)}
                  className="flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Create Custom Role
                </Button>
              </motion.div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-8">
              {/* Role selector tabs */}
              <Tabs
                defaultValue="MANAGER"
                className="w-full"
                onValueChange={(value) => setCurrentRole(value)}
                value={currentRole}
              >
                <TabsList className="justify-start overflow-auto">
                  {isLoadingCustomRoles
                    ? // Tabs loading state
                      Array(4)
                        .fill(0)
                        .map((_, i) => (
                          <motion.div
                            key={`tab-loading-${i}`}
                            className="px-4 py-2 mx-1"
                            animate={{
                              opacity: [0.5, 0.8, 0.5],
                              width: ["80px", "100px", "80px"],
                            }}
                            transition={{
                              repeat: Infinity,
                              duration: 1.5,
                              delay: i * 0.2,
                            }}
                          >
                            <Skeleton className="h-5 w-full" />
                          </motion.div>
                        ))
                    : // Actual tabs with animation
                      Object.keys(combinedRolePermissions)
                        .filter(
                          (role) => role !== "OWNER" && role !== "TEAM_OWNER"
                        )
                        .map((role) => (
                          <motion.div
                            key={role}
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.97 }}
                          >
                            <TabsTrigger
                              value={role}
                              className="min-w-fit whitespace-nowrap"
                            >
                              {role
                                .replace("_", " ")
                                .replace(/_/g, " ")
                                .split(" ")
                                .map(
                                  (word) =>
                                    word.charAt(0).toUpperCase() +
                                    word.slice(1).toLowerCase()
                                )
                                .join(" ")}
                            </TabsTrigger>
                          </motion.div>
                        ))}
                </TabsList>

                {/* Permission tables for each role */}
                {Object.keys(combinedRolePermissions).map((role) => (
                  <TabsContent key={role} value={role} className="mt-6">
                    <div className="flex flex-col gap-6">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-lg font-medium">
                            {role
                              .replace("_", " ")
                              .replace(/_/g, " ")
                              .split(" ")
                              .map(
                                (word) =>
                                  word.charAt(0).toUpperCase() +
                                  word.slice(1).toLowerCase()
                              )
                              .join(" ")}
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
                          <motion.div
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-destructive"
                              onClick={() => handleDeleteCustomRole(role)}
                            >
                              <Trash className="h-4 w-4 mr-2" />
                              Delete Role
                            </Button>
                          </motion.div>
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
                            {/* Show loading skeleton when permissions are being fetched */}
                            {!isPermissionsLoaded
                              ? // Loading state with staggered animation
                                Array(5)
                                  .fill(0)
                                  .map((_, i) => (
                                    <motion.tr
                                      key={`loading-${i}`}
                                      initial={{ opacity: 0, y: 10 }}
                                      animate={{ opacity: 1, y: 0 }}
                                      transition={{
                                        duration: 0.3,
                                        delay: i * 0.05, // Staggered delay for each row
                                      }}
                                      className="border-b"
                                    >
                                      <TableCell>
                                        <motion.div
                                          animate={{
                                            opacity: [0.5, 0.8, 0.5],
                                          }}
                                          transition={{
                                            repeat: Infinity,
                                            duration: 1.5,
                                          }}
                                        >
                                          <Skeleton className="h-4 w-[150px]" />
                                        </motion.div>
                                      </TableCell>
                                      <TableCell>
                                        <motion.div
                                          animate={{
                                            opacity: [0.5, 0.8, 0.5],
                                          }}
                                          transition={{
                                            repeat: Infinity,
                                            duration: 1.5,
                                            delay: 0.2,
                                          }}
                                        >
                                          <Skeleton className="h-4 w-[200px]" />
                                        </motion.div>
                                      </TableCell>
                                      <TableCell className="text-center">
                                        <motion.div
                                          animate={{
                                            opacity: [0.5, 0.8, 0.5],
                                          }}
                                          transition={{
                                            repeat: Infinity,
                                            duration: 1.5,
                                            delay: 0.4,
                                          }}
                                        >
                                          <Skeleton className="h-5 w-10 mx-auto" />
                                        </motion.div>
                                      </TableCell>
                                    </motion.tr>
                                  ))
                              : // Actual permissions with staggered entrance animation
                                allPermissions.map((permission, index) => (
                                  <motion.tr
                                    key={permission.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{
                                      duration: 0.2,
                                      delay: index * 0.03, // Subtle staggered animation
                                    }}
                                    className="border-b"
                                  >
                                    <TableCell className="font-medium">
                                      {permission.name}
                                    </TableCell>
                                    <TableCell>
                                      {permission.description}
                                    </TableCell>
                                    <TableCell className="text-center">
                                      <motion.div whileTap={{ scale: 0.95 }}>
                                        <Switch
                                          checked={
                                            combinedRolePermissions[
                                              role
                                            ]?.includes(permission.id) || false
                                          }
                                          onCheckedChange={() =>
                                            handleTogglePermission(
                                              role,
                                              permission.id
                                            )
                                          }
                                        />
                                      </motion.div>
                                    </TableCell>
                                  </motion.tr>
                                ))}
                          </TableBody>
                        </Table>
                      </div>

                      <div className="flex justify-end mt-4">
                        <motion.div
                          whileHover={
                            !isCreatingRole && hasRolePermissionsChanged
                              ? { scale: 1.02 }
                              : {}
                          }
                          whileTap={
                            !isCreatingRole && hasRolePermissionsChanged
                              ? { scale: 0.98 }
                              : {}
                          }
                        >
                          <Button
                            onClick={handleSaveRolePermissions}
                            disabled={
                              isCreatingRole || !hasRolePermissionsChanged
                            }
                          >
                            {isCreatingRole ? (
                              <div className="flex items-center">
                                <motion.div
                                  animate={{ rotate: 360 }}
                                  transition={{
                                    duration: 1,
                                    repeat: Infinity,
                                    ease: "linear",
                                  }}
                                  className="mr-2 h-4 w-4 border-2 border-current border-t-transparent rounded-full"
                                />
                                <span>Saving...</span>
                              </div>
                            ) : (
                              "Save Role Permissions"
                            )}
                          </Button>
                        </motion.div>
                      </div>
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Create Custom Role Dialog */}
      <Dialog open={isCreateRoleOpen} onOpenChange={setIsCreateRoleOpen}>
        <DialogContent className="max-w-3xl pr-0">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
          >
            <DialogHeader>
              <DialogTitle>Create Custom Role</DialogTitle>
              <DialogDescription>
                Create a new role with custom permissions for your team.
              </DialogDescription>
            </DialogHeader>
          </motion.div>

          <div className="space-y-6 mt-4 max-h-[60vh] overflow-y-auto pr-4">
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
                    {allPermissions.map((permission) => (
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

          <div className="flex justify-end gap-2 mt-4 pr-4">
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

      {/* Delete Role Confirmation Dialog */}
      <Dialog open={isDeleteRoleOpen} onOpenChange={setIsDeleteRoleOpen}>
        <DialogContent className="max-w-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2 }}
          >
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <motion.div
                  animate={{
                    rotate: [0, 10, -10, 10, -10, 0],
                    transition: { duration: 0.5 },
                  }}
                >
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                </motion.div>
                Delete Custom Role
              </DialogTitle>
              <DialogDescription>
                {membersUsingRole > 0 ? (
                  <>
                    There {membersUsingRole === 1 ? "is" : "are"} currently{" "}
                    <strong>{membersUsingRole}</strong>{" "}
                    {membersUsingRole === 1 ? "member" : "members"} assigned to
                    the "{roleToDelete?.name}" role. Please select a fallback
                    role to assign these members to.
                  </>
                ) : (
                  <>
                    Are you sure you want to delete this role? This action
                    cannot be undone.
                  </>
                )}
              </DialogDescription>
            </DialogHeader>

            {membersUsingRole > 0 && (
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Fallback Role</label>
                  <Select
                    value={fallbackRole}
                    onValueChange={(value) => setFallbackRole(value as Role)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a fallback role" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(Role)
                        .filter((role) => role !== "OWNER")
                        .map((role) => (
                          <SelectItem key={role} value={role}>
                            {role
                              .replace(/_/g, " ")
                              .split(" ")
                              .map(
                                (word) =>
                                  word.charAt(0).toUpperCase() +
                                  word.slice(1).toLowerCase()
                              )
                              .join(" ")}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    All members with this custom role will be assigned to this
                    role
                  </p>
                </div>
              </div>
            )}

            <DialogFooter className="gap-2 mt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setIsDeleteRoleOpen(false);
                  setRoleToDelete(null);
                }}
              >
                Cancel
              </Button>
              <Button variant="destructive" onClick={confirmDeleteRole}>
                Delete Role
              </Button>
            </DialogFooter>
          </motion.div>
        </DialogContent>
      </Dialog>
    </>
  );
};
