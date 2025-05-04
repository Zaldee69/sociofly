import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { ZodError } from "zod";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma/client";
import { type PrismaClient } from "@prisma/client";

interface CreateContextOptions {
  prisma: PrismaClient;
  userId: string | null;
}

export const createTRPCContext = async (): Promise<CreateContextOptions> => {
  const { userId } = await auth();
  return {
    prisma,
    userId: userId ?? null,
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
