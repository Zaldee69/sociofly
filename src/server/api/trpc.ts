import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { ZodError } from "zod";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma/client";
import { type PrismaClient, Role } from "@prisma/client";

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
    if (membership.role === Role.TEAM_OWNER) {
      return next();
    }

    // Check if the user's role has the required permission
    const hasPermission = await ctx.prisma.rolePermission.findFirst({
      where: {
        role: membership.role,
        permission: { code: requiredPermission },
      },
    });

    console.log("hasPermission", hasPermission);

    if (!hasPermission) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: `You don't have the required permission: ${requiredPermission}`,
      });
    }

    return next();
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
    if (membership.role === Role.TEAM_OWNER) {
      return next();
    }

    // Check if the user's role has any of the required permissions
    const hasPermission = await ctx.prisma.rolePermission.findFirst({
      where: {
        role: membership.role,
        permission: { code: { in: permissions } },
      },
    });

    if (!hasPermission) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: `You don't have any of the required permissions: ${permissions.join(", ")}`,
      });
    }

    return next();
  });
