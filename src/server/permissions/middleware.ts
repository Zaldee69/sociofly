import { NextApiHandler, NextApiRequest, NextApiResponse } from "next";
import { auth } from "@clerk/nextjs/server";
import { can } from "./helpers";

type ApiRouteWithPermission = NextApiHandler & {
  permission?: string;
};

/**
 * Middleware to check if the user has the specified permission for the API route
 *
 * @param permission The permission code required for access
 * @param handler The API route handler
 * @returns The middleware-wrapped handler
 */
export function withPermission(
  permission: string,
  handler: NextApiHandler
): NextApiHandler {
  const wrappedHandler: ApiRouteWithPermission = async (
    req: NextApiRequest,
    res: NextApiResponse
  ) => {
    // Store the permission on the handler for reference
    wrappedHandler.permission = permission;

    // Get current user
    const { userId } = await auth();

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Get organization ID from query, body, or header
    const organizationId =
      (req.query.organizationId as string) ||
      (req.body?.organizationId as string) ||
      (req.headers["x-organization-id"] as string);

    if (!organizationId) {
      return res.status(400).json({ error: "Organization ID is required" });
    }

    // Check if user has the required permission
    const userHasPermission = await can(userId, organizationId, permission);

    if (!userHasPermission) {
      return res.status(403).json({
        error: "Forbidden",
        detail: `Missing required permission: ${permission}`,
      });
    }

    // User has permission, proceed to the handler
    return handler(req, res);
  };

  return wrappedHandler;
}

/**
 * Middleware to check if the user has one of the specified permissions
 *
 * @param permissions Array of permission codes, any of which grants access
 * @param handler The API route handler
 * @returns The middleware-wrapped handler
 */
export function withAnyPermission(
  permissions: string[],
  handler: NextApiHandler
): NextApiHandler {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    // Get current user
    const { userId } = await auth();

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Get organization ID from query, body, or header
    const organizationId =
      (req.query.organizationId as string) ||
      (req.body?.organizationId as string) ||
      (req.headers["x-organization-id"] as string);

    if (!organizationId) {
      return res.status(400).json({ error: "Organization ID is required" });
    }

    // Check if user has any of the required permissions
    for (const permission of permissions) {
      const userHasPermission = await can(userId, organizationId, permission);
      if (userHasPermission) {
        // User has at least one permission, proceed to the handler
        return handler(req, res);
      }
    }

    // User doesn't have any of the required permissions
    return res.status(403).json({
      error: "Forbidden",
      detail: `Missing required permissions: ${permissions.join(", ")}`,
    });
  };
}
