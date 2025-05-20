import { trpc } from "@/lib/trpc/client";
import React from "react";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";

interface PermissionControlsProps {
  organizationId: string;
  membershipId: string;
  permissionCode: string;
  onSuccess?: () => void;
}

/**
 * A component that shows permission control buttons (Grant, Deny, Reset)
 */
export function PermissionControls({
  organizationId,
  membershipId,
  permissionCode,
  onSuccess,
}: PermissionControlsProps) {
  const utils = trpc.useUtils();

  // Get user's permission overrides
  const { data: userOverrides } = trpc.permission.getUserOverrides.useQuery(
    { organizationId, membershipId },
    { enabled: !!organizationId && !!membershipId }
  );

  console.log("userOverrides", userOverrides);

  // Permission status
  const isGranted = userOverrides?.grants.includes(permissionCode);
  const isDenied = userOverrides?.denies.includes(permissionCode);

  // Grant mutation
  const grantMutation = trpc.permission.grant.useMutation({
    onSuccess: () => {
      console.log("grantMutation onSuccess");
      void utils.permission.getUserOverrides.invalidate({
        organizationId,
        membershipId,
      });
      onSuccess?.();
    },
  });

  // Deny mutation
  const denyMutation = trpc.permission.deny.useMutation({
    onSuccess: () => {
      void utils.permission.getUserOverrides.invalidate({
        organizationId,
        membershipId,
      });
      onSuccess?.();
    },
  });

  // Reset mutation
  const revokeMutation = trpc.permission.revoke.useMutation({
    onSuccess: () => {
      void utils.permission.getUserOverrides.invalidate({
        organizationId,
        membershipId,
      });
      onSuccess?.();
    },
  });

  const handleGrant = () => {
    grantMutation.mutate({
      organizationId,
      membershipId,
      permissionCode,
    });
  };

  const handleDeny = () => {
    denyMutation.mutate({
      organizationId,
      membershipId,
      permissionCode,
    });
  };

  const handleReset = () => {
    revokeMutation.mutate({
      organizationId,
      membershipId,
      permissionCode,
    });
  };

  return (
    <div className="flex items-center gap-2">
      <div className="w-24">
        {isGranted && (
          <Button color="success" className="mr-2">
            Granted
          </Button>
        )}
        {isDenied && (
          <Badge color="danger" className="mr-2">
            Denied
          </Badge>
        )}
        {!isGranted && !isDenied && (
          <Badge color="default" className="mr-2">
            Default
          </Badge>
        )}
      </div>

      <div className="flex gap-1">
        <Button
          size="sm"
          variant={isGranted ? "default" : "outline"}
          color="success"
          onClick={handleGrant}
          disabled={grantMutation.isPending}
        >
          Grant
        </Button>

        <Button
          size="sm"
          variant={isDenied ? "default" : "outline"}
          color="danger"
          onClick={handleDeny}
          disabled={denyMutation.isPending}
        >
          Deny
        </Button>

        <Button
          size="sm"
          variant="outline"
          onClick={handleReset}
          disabled={revokeMutation.isPending || (!isGranted && !isDenied)}
        >
          Reset
        </Button>
      </div>
    </div>
  );
}

interface PermissionsPanelProps {
  organizationId: string;
  membershipId: string;
}

/**
 * A panel that shows all permissions with controls
 */
export function PermissionsPanel({
  organizationId,
  membershipId,
}: PermissionsPanelProps) {
  // Get all permission codes
  const { data: allPermissionCodes } =
    trpc.permission.getAllPermissionCodes.useQuery();

  if (!allPermissionCodes) {
    return <div>Loading permissions...</div>;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">User Permissions</h2>
      <div className="rounded-lg border">
        <div className="grid grid-cols-2 gap-4 p-4">
          {allPermissionCodes.map((code: string) => (
            <div key={code} className="flex items-center justify-between">
              <div>
                <div className="font-medium">{code}</div>
                <div className="text-sm text-gray-500">
                  {getPermissionDescription(code)}
                </div>
              </div>
              <PermissionControls
                organizationId={organizationId}
                membershipId={membershipId}
                permissionCode={code}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Usage example with actual data
 */
export function UserPermissionsExample() {
  const organizationId = "org_12345"; // Replace with actual ID
  const membershipId = "mem_67890"; // Replace with actual ID

  return (
    <div className="p-4">
      <PermissionsPanel
        organizationId={organizationId}
        membershipId={membershipId}
      />
    </div>
  );
}

/**
 * Helper to get a description for each permission code
 */
function getPermissionDescription(code: string): string {
  const descriptions: Record<string, string> = {
    "team.manage": "Manage team members",
    "billing.manage": "Manage billing and subscriptions",
    "account.manage": "Manage social media accounts",
    "campaign.create": "Create campaigns",
    "campaign.edit": "Edit campaigns",
    "campaign.approve": "Approve campaigns",
    "campaign.publish": "Publish campaigns",
    "content.create": "Create content",
    "content.edit": "Edit content",
    "content.approve": "Approve content",
    "content.publish": "Publish content",
    "analytics.view": "View reports and analytics",
    "inbox.handle": "Handle and reply to messages",
  };

  return descriptions[code] || "No description available";
}
