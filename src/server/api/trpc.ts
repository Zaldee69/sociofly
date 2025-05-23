import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { ZodError } from "zod";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma/client";
import { type PrismaClient, Role } from "@prisma/client";
import { getEffectivePermissions, can } from "../permissions/helpers";

interface CreateContextOptions {
  prisma: PrismaClient;
  userId: string | null;
  auth: {
    userId: string | null;
    clerkId: string | null;
  };
}

export const createTRPCContext = async (): Promise<CreateContextOptions> => {
  const { userId: clerkUserId } = await auth();

  // If no Clerk user ID, return context with null userId
  if (!clerkUserId) {
    return {
      prisma,
      userId: null,
      auth: {
        userId: null,
        clerkId: null,
      },
    };
  }

  // Try to find the user in our database
  const user = await prisma.user.findUnique({
    where: { clerkId: clerkUserId },
  });

  // If no user found in our DB but Clerk authenticated, create a new user
  if (!user && clerkUserId) {
    console.log(
      `User with Clerk ID ${clerkUserId} not found in database. This may cause errors in some procedures.`
    );
  }

  return {
    prisma,
    userId: user?.id ?? null,
    auth: {
      userId: user?.id ?? null,
      clerkId: clerkUserId,
    },
  };
};

const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

export const createTRPCRouter = t.router;
export const publicProcedure = t.procedure;

const enforceUserIsAuthed = t.middleware(({ ctx, next }) => {
  if (!ctx.userId) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You must be logged in to access this resource",
    });
  }
  return next({
    ctx: {
      ...ctx,
      auth: { userId: ctx.userId },
    },
  });
});

export const protectedProcedure = t.procedure.use(enforceUserIsAuthed);

/**
 * Middleware untuk memeriksa apakah user memiliki permission yang diperlukan
 * @param requiredPermission Kode permission yang diperlukan (contoh: "content.create")
 */
export const requirePermission = (
  requiredPermission: string,
  fallbackTeamId?: string
) =>
  protectedProcedure.use(async ({ ctx, next, input }) => {
    const { userId } = ctx.auth;

    const membership = await ctx.prisma.membership.findFirst({
      where: { userId },
      include: { team: true },
    });

    if (!membership) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "You don't have access to any team",
      });
    }

    // Special Case: Team Owner has all permissions
    if (membership.role === Role.OWNER) {
      return next();
    }

    // Try to get teamId from input if it exists, otherwise use the fallback
    let dynamicTeamId: string | undefined = fallbackTeamId;

    try {
      // The input might be a custom marker object from tRPC
      // We need to handle it carefully
      if (input && typeof input === "object") {
        // Use Object.prototype.hasOwnProperty to safely check for property
        if (Object.prototype.hasOwnProperty.call(input, "teamId")) {
          const potentialTeamId = (input as any).teamId;
          if (typeof potentialTeamId === "string") {
            dynamicTeamId = potentialTeamId;
            console.log("Found teamId in input:", dynamicTeamId);
          }
        } else {
          console.log("input object does not have teamId property");
        }
      } else {
        console.log("input is not an object:", typeof input);
      }
    } catch (error) {
      console.error("Error extracting teamId from input:", error);
    }

    // If no teamId is available, use the user's primary team
    const team = dynamicTeamId ? dynamicTeamId : membership.teamId;

    console.log("Using team ID for permission check:", team);
    console.log("User's primary team:", membership.teamId);

    // Use the helper function to check permissions
    const hasPermission = await can(userId, team, requiredPermission);

    if (hasPermission) {
      return next();
    }

    throw new TRPCError({
      code: "FORBIDDEN",
      message: `You don't have the required permission: ${requiredPermission}`,
    });
  });

/**
 * Middleware untuk memeriksa apakah user memiliki salah satu dari banyak permission
 * @param permissions Array kode permission (contoh: ["content.create", "content.edit"])
 */
export const requireAnyPermission = (permissions: string[]) =>
  protectedProcedure.use(async ({ ctx, next }) => {
    const { userId } = ctx.auth;

    const membership = await ctx.prisma.membership.findFirst({
      where: { userId },
      include: { team: true },
    });

    if (!membership) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "You don't have access to any team",
      });
    }

    // Special Case: Team Owner has all permissions
    if (membership.role === Role.OWNER) {
      return next();
    }

    // Get all permissions for this user
    const userPermissions = await getEffectivePermissions(
      userId,
      membership.teamId
    );

    // Check if user has any of the required permissions
    const hasAnyPermission = permissions.some((p) => userPermissions.has(p));

    if (hasAnyPermission) {
      return next();
    }

    throw new TRPCError({
      code: "FORBIDDEN",
      message: `You don't have any of the required permissions: ${permissions.join(", ")}`,
    });
  });
