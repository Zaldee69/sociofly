import React, { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface MemberPermissionEditorProps {
  membershipId: string;
  organizationId: string;
  permissionCode: string;
  onClose?: () => void;
}

type PermissionOverrideStatus = "inherit" | "grant" | "deny";

export function MemberPermissionEditor({
  membershipId,
  organizationId,
  permissionCode,
  onClose,
}: MemberPermissionEditorProps) {
  const [status, setStatus] = useState<PermissionOverrideStatus>("inherit");
  const [initialStatus, setInitialStatus] =
    useState<PermissionOverrideStatus>("inherit");
  const [isLoading, setIsLoading] = useState(true);

  const utils = trpc.useUtils();

  // Get user's permission overrides
  const { data: userOverrides, isLoading: isLoadingOverrides } =
    trpc.permission.getUserOverrides.useQuery(
      { organizationId, membershipId },
      {
        enabled: !!organizationId && !!membershipId,
      }
    );

  // Mutations
  const grantMutation = trpc.permission.grant.useMutation({
    onSuccess: () => {
      toast.success("Permission granted successfully");
      void utils.permission.getUserOverrides.invalidate({
        organizationId,
        membershipId,
      });
      onClose?.();
    },
    onError: (error) => {
      toast.error(`Error granting permission: ${error.message}`);
      console.error("Grant permission error:", error);
    },
  });

  const denyMutation = trpc.permission.deny.useMutation({
    onSuccess: () => {
      toast.success("Permission denied successfully");
      void utils.permission.getUserOverrides.invalidate({
        organizationId,
        membershipId,
      });
      onClose?.();
    },
    onError: (error) => {
      toast.error(`Error denying permission: ${error.message}`);
      console.error("Deny permission error:", error);
    },
  });

  const revokeMutation = trpc.permission.revoke.useMutation({
    onSuccess: () => {
      toast.success("Permission reset to default");
      void utils.permission.getUserOverrides.invalidate({
        organizationId,
        membershipId,
      });
      onClose?.();
    },
    onError: (error) => {
      toast.error(`Error resetting permission: ${error.message}`);
      console.error("Revoke permission error:", error);
    },
  });

  // Initialize permission state when data is loaded
  useEffect(() => {
    if (userOverrides) {
      let currentStatus: PermissionOverrideStatus = "inherit";

      if (userOverrides.grants.includes(permissionCode)) {
        currentStatus = "grant";
      } else if (userOverrides.denies.includes(permissionCode)) {
        currentStatus = "deny";
      }

      setStatus(currentStatus);
      setInitialStatus(currentStatus);
      setIsLoading(false);
    }
  }, [userOverrides, permissionCode]);

  // Handle permission change
  const handlePermissionChange = (value: string) => {
    const newStatus = value as PermissionOverrideStatus;
    setStatus(newStatus);
  };

  // Check if permission has changed
  const hasChanged = status !== initialStatus;

  // Handle save
  const handleSave = () => {
    // Send mutation based on selected value
    if (status === "grant") {
      grantMutation.mutate({
        organizationId,
        membershipId,
        permissionCode,
      });
    } else if (status === "deny") {
      denyMutation.mutate({
        organizationId,
        membershipId,
        permissionCode,
      });
    } else {
      // "inherit" => revoke all overrides
      revokeMutation.mutate({
        organizationId,
        membershipId,
        permissionCode,
      });
    }
  };

  if (isLoading || isLoadingOverrides) {
    return (
      <div className="p-4 text-center">Loading permission settings...</div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <h4 className="font-medium text-sm">Manage Permission Override</h4>

      <RadioGroup value={status} onValueChange={handlePermissionChange}>
        <div className="flex items-center space-x-2.5 rounded-md border p-2 hover:bg-muted/50">
          <RadioGroupItem value="inherit" id="inherit" />
          <Label
            htmlFor="inherit"
            className="flex flex-col cursor-pointer text-sm items-start gap-0 w-full"
          >
            <span className="font-medium">Inherit from Role</span>
            <span className="text-xs text-muted-foreground">
              Use default permission from user's role
            </span>
          </Label>
        </div>
        <div className="flex items-center space-x-2.5 rounded-md border p-2 hover:bg-muted/50">
          <RadioGroupItem value="grant" id="grant" />
          <Label
            htmlFor="grant"
            className="flex flex-col cursor-pointer text-sm items-start gap-0 w-full"
          >
            <span className="font-medium">Grant Permission</span>
            <span className="text-xs text-muted-foreground">
              Explicitly allow this permission
            </span>
          </Label>
        </div>
        <div className="flex items-center space-x-2.5 rounded-md border p-2 hover:bg-muted/50">
          <RadioGroupItem value="deny" id="deny" />
          <Label
            htmlFor="deny"
            className="flex flex-col cursor-pointer text-sm items-start gap-0 w-full"
          >
            <span className="font-medium">Deny Permission</span>
            <span className="text-xs text-muted-foreground">
              Explicitly forbid this permission
            </span>
          </Label>
        </div>
      </RadioGroup>

      <div className="flex justify-end space-x-2.5 pt-2">
        <Button variant="outline" size="sm" onClick={onClose}>
          Cancel
        </Button>
        <Button size="sm" onClick={handleSave} disabled={!hasChanged}>
          Save
        </Button>
      </div>
    </div>
  );
}
