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
  };
}

export const createTRPCContext = async (): Promise<CreateContextOptions> => {
  const { userId } = await auth();
  return {
    prisma,
    userId: userId ?? null,
    auth: {
      userId: userId ?? null,
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
export const requirePermission = (requiredPermission: string) =>
  protectedProcedure.use(async ({ ctx, next }) => {
    const { userId } = ctx.auth;

    const membership = await ctx.prisma.membership.findFirst({
      where: { userId },
      include: { organization: true },
    });

    if (!membership) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "You don't have access to any organization",
      });
    }

    // Special Case: Team Owner has all permissions
    if (membership.role === Role.OWNER) {
      return next();
    }

    // Use the helper function to check permissions
    const hasPermission = await can(
      userId,
      membership.organizationId,
      requiredPermission
    );

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
      include: { organization: true },
    });

    if (!membership) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "You don't have access to any organization",
      });
    }

    // Special Case: Team Owner has all permissions
    if (membership.role === Role.OWNER) {
      return next();
    }

    // Get all permissions for this user
    const userPermissions = await getEffectivePermissions(
      userId,
      membership.organizationId
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
