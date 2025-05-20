import React, { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc/client";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  PERMISSIONS,
  PERMISSION_DESCRIPTIONS,
} from "@/server/permissions/seed/permissions";

interface PermissionPopoverProps {
  membershipId: string;
  organizationId: string;
  trigger?: React.ReactNode;
}

type PermissionOverrideStatus = "inherit" | "grant" | "deny";

interface PermissionState {
  code: string;
  label: string;
  status: PermissionOverrideStatus;
}

export function PermissionPopover({
  membershipId,
  organizationId,
  trigger,
}: PermissionPopoverProps) {
  const [open, setOpen] = useState(false);
  const [permissions, setPermissions] = useState<PermissionState[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const utils = trpc.useUtils();

  // Get all permission codes
  const { data: allPermissionCodes } =
    trpc.permission.getAllPermissionCodes.useQuery(undefined, {
      staleTime: 1000 * 60 * 5, // 5 minutes
    });

  // Get user's permission overrides
  const { data: userOverrides } = trpc.permission.getUserOverrides.useQuery(
    { organizationId, membershipId },
    {
      enabled: !!organizationId && !!membershipId && open,
    }
  );

  // Mutations
  const grantMutation = trpc.permission.grant.useMutation({
    onSuccess: () => {
      void utils.permission.getUserOverrides.invalidate({
        organizationId,
        membershipId,
      });
    },
    onError: (error) => {
      console.error("Grant permission error:", error);
    },
  });

  const denyMutation = trpc.permission.deny.useMutation({
    onSuccess: () => {
      void utils.permission.getUserOverrides.invalidate({
        organizationId,
        membershipId,
      });
    },
    onError: (error) => {
      console.error("Deny permission error:", error);
    },
  });

  const revokeMutation = trpc.permission.revoke.useMutation({
    onSuccess: () => {
      void utils.permission.getUserOverrides.invalidate({
        organizationId,
        membershipId,
      });
    },
    onError: (error) => {
      console.error("Revoke permission error:", error);
    },
  });

  // Initialize permission states when data is loaded
  useEffect(() => {
    if (allPermissionCodes && userOverrides) {
      const updatedPermissions = allPermissionCodes.map((code) => {
        let status: PermissionOverrideStatus = "inherit";

        if (userOverrides.grants.includes(code)) {
          status = "grant";
        } else if (userOverrides.denies.includes(code)) {
          status = "deny";
        }

        return {
          code,
          label: getPermissionLabel(code),
          status,
        };
      });

      setPermissions(updatedPermissions);
      setIsLoading(false);
    }
  }, [allPermissionCodes, userOverrides]);

  // Set loading state to false when data is fetched or when popover opens
  useEffect(() => {
    if (open && userOverrides) {
      setIsLoading(false);
    }
  }, [userOverrides, open]);

  // Handle permission change
  const handlePermissionChange = (value: string, permissionCode: string) => {
    const status = value as PermissionOverrideStatus;

    // Update local state first for responsive UI
    setPermissions((prev) =>
      prev.map((p) => (p.code === permissionCode ? { ...p, status } : p))
    );

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

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {trigger || <Button variant="ghost">Edit Permissions</Button>}
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-4">
        <div className="space-y-3">
          <h4 className="font-medium mb-4">Manage Permission Overrides</h4>

          {isLoading ? (
            <div className="py-3 text-center">Loading permissions...</div>
          ) : (
            permissions.map((perm) => (
              <div
                key={perm.code}
                className="grid grid-cols-2 items-center gap-4 py-2 border-b border-gray-100"
              >
                <div>
                  <p className="font-medium text-sm">{perm.label}</p>
                  <p className="text-xs text-gray-500">{perm.code}</p>
                </div>
                <RadioGroup
                  value={perm.status}
                  onValueChange={(val) =>
                    handlePermissionChange(val, perm.code)
                  }
                  className="flex justify-between"
                >
                  <div className="flex items-center space-x-1">
                    <RadioGroupItem
                      value="inherit"
                      id={`inherit-${perm.code}`}
                    />
                    <Label htmlFor={`inherit-${perm.code}`} className="text-xs">
                      Inherit
                    </Label>
                  </div>
                  <div className="flex items-center space-x-1">
                    <RadioGroupItem value="grant" id={`grant-${perm.code}`} />
                    <Label htmlFor={`grant-${perm.code}`} className="text-xs">
                      Grant
                    </Label>
                  </div>
                  <div className="flex items-center space-x-1">
                    <RadioGroupItem value="deny" id={`deny-${perm.code}`} />
                    <Label htmlFor={`deny-${perm.code}`} className="text-xs">
                      Deny
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// Helper function to get a user-friendly label for permission
function getPermissionLabel(code: string): string {
  // First try to match from PERMISSION_DESCRIPTIONS
  const permKeys = Object.keys(PERMISSIONS) as Array<keyof typeof PERMISSIONS>;
  for (const key of permKeys) {
    if (PERMISSIONS[key] === code) {
      return PERMISSION_DESCRIPTIONS[PERMISSIONS[key]] || code;
    }
  }

  // If not found, format the code
  return code
    .split(".")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
