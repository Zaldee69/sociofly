import { createTRPCRouter, protectedProcedure } from "../trpc";

export const getSocialAccountsRouter = createTRPCRouter({
  getSocialAccounts: protectedProcedure.query(async ({ ctx }) => {
    const socialAccounts = await ctx.prisma.socialAccount.findMany({
      where: {
        userId: ctx.userId!,
      },
      select: {
        id: true,
        platform: true,
      },
    });

    return socialAccounts;
  }),
});
