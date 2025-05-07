import { createTRPCRouter, protectedProcedure } from "../trpc";

export const organizationRouter = createTRPCRouter({
  getAll: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.userId) throw new Error("Unauthorized");

    const memberships = await ctx.prisma.membership.findMany({
      where: {
        userId: ctx.userId,
      },
      include: {
        organization: true,
      },
    });

    return memberships.map((m) => m.organization);
  }),
});
