import React, { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Ellipsis, Trash, UserCog, Lock } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MemberPermissionEditor } from "./member-permission-editor";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";
import { Role } from "@prisma/client";

interface EditMemberDropdownProps {
  member: {
    id: string;
    name: string;
    email: string;
    role: Role;
  };
  teamId: string;
  onRemoveMember?: (memberId: string) => void;
}

export function EditMemberDropdown({
  member,
  teamId,
  onRemoveMember,
}: EditMemberDropdownProps) {
  const [isPermissionDialogOpen, setIsPermissionDialogOpen] = useState(false);
  const [selectedPermission, setSelectedPermission] = useState("");
  const [isRemoveDialogOpen, setIsRemoveDialogOpen] = useState(false);
  const [isPermissionSaving, setIsPermissionSaving] = useState(false);

  const { data: availablePermissions } =
    trpc.permission.getAllPermissionCodes.useQuery();

  // Grouped permissions based on prefix
  const groupedPermissions = React.useMemo(() => {
    if (!availablePermissions) return {};

    const groups: Record<string, string[]> = {};

    availablePermissions.forEach((perm) => {
      const parts = perm.split(".");
      if (parts.length === 2) {
        const category = parts[0];
        if (!groups[category]) {
          groups[category] = [];
        }
        groups[category].push(perm);
      }
    });

    return groups;
  }, [availablePermissions]);

  // Handle role change
  const updateRoleMutation = trpc.team.updateMemberRole.useMutation({
    onSuccess: () => {
      toast.success("Team member role has been updated successfully");
    },
    onError: (error) => {
      toast.error(
        error.message || "Could not update team member role. Please try again."
      );
    },
  });

  // Type safe role change handler
  const handleChangeRole = (
    role:
      | "MANAGER"
      | "SUPERVISOR"
      | "CONTENT_CREATOR"
      | "INTERNAL_REVIEWER"
      | "CLIENT_REVIEWER"
      | "ANALYST"
      | "INBOX_AGENT"
  ) => {
    updateRoleMutation.mutate({
      teamId,
      memberId: member.id,
      role,
    });
  };

  // Handle permission dialog close - prevent if we're saving
  const handlePermissionDialogChange = (open: boolean) => {
    if (!isPermissionSaving) {
      setIsPermissionDialogOpen(open);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon">
            <Ellipsis className="h-4 w-4" />
            <span className="sr-only">More options</span>
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Edit Member</DropdownMenuLabel>
          <DropdownMenuSeparator />

          {/* Role Change Submenu */}
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <UserCog className="mr-2 h-4 w-4" />
              <span>Change Role</span>
            </DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent sideOffset={10}>
                {/* OWNER role is excluded as it can't be assigned */}
                <DropdownMenuItem onClick={() => handleChangeRole("MANAGER")}>
                  Manager
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleChangeRole("SUPERVISOR")}
                >
                  Supervisor
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleChangeRole("CONTENT_CREATOR")}
                >
                  Content Creator
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleChangeRole("CLIENT_REVIEWER")}
                >
                  Client Reviewer
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleChangeRole("INTERNAL_REVIEWER")}
                >
                  Internal Reviewer
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleChangeRole("ANALYST")}>
                  Analyst
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleChangeRole("INBOX_AGENT")}
                >
                  Inbox Agent
                </DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>

          {/* Permissions Submenu */}
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <Lock className="mr-2 h-4 w-4" />
              <span>Edit Permissions</span>
            </DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent sideOffset={10}>
                {Object.entries(groupedPermissions).map(
                  ([category, permissions]) => (
                    <React.Fragment key={category}>
                      {permissions.map((perm) => (
                        <DropdownMenuItem
                          key={perm}
                          onClick={() => {
                            setSelectedPermission(perm);
                            setIsPermissionDialogOpen(true);
                          }}
                        >
                          {perm}
                        </DropdownMenuItem>
                      ))}
                      <DropdownMenuSeparator />
                    </React.Fragment>
                  )
                )}
              </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>

          <DropdownMenuSeparator />

          {/* Remove Member */}
          <DropdownMenuItem
            className="text-destructive"
            onClick={() => setIsRemoveDialogOpen(true)}
          >
            <Trash className="mr-2 h-4 w-4" />
            <span>Remove Member</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Permission Edit Dialog */}
      <Dialog
        open={isPermissionDialogOpen}
        onOpenChange={handlePermissionDialogChange}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Permission</DialogTitle>
            <DialogDescription>
              Manage override for permission:{" "}
              <strong>{selectedPermission}</strong>
            </DialogDescription>
          </DialogHeader>

          <MemberPermissionEditor
            membershipId={member.id}
            organizationId={teamId}
            permissionCode={selectedPermission}
            onClose={() => setIsPermissionDialogOpen(false)}
            onSavingStateChange={setIsPermissionSaving}
          />
        </DialogContent>
      </Dialog>

      {/* Remove Member Confirmation Dialog */}
      <Dialog open={isRemoveDialogOpen} onOpenChange={setIsRemoveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Team Member</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove {member.name} from the team? This
              action cannot be undone.
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
              onClick={() => {
                if (onRemoveMember) {
                  onRemoveMember(member.id);
                  setIsRemoveDialogOpen(false);
                }
              }}
            >
              Remove
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
