import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../trpc";

export const hashtagRouter = createTRPCRouter({
  getPopular: publicProcedure
    .input(
      z.object({
        category: z.string().optional(),
        limit: z.number().default(10),
      })
    )
    .query(async ({ ctx, input }) => {
      const { category, limit } = input;

      // First check if the prisma object has the Hashtag model
      if (!ctx.prisma.hashtag) {
        console.error("Hashtag model is not defined in the Prisma client");
        // Return empty array as fallback
        return [];
      }

      const whereClause = category ? { category } : {};

      try {
        return await ctx.prisma.hashtag.findMany({
          where: whereClause,
          orderBy: {
            frequency: "desc",
          },
          take: limit,
        });
      } catch (error) {
        console.error("Error fetching hashtags:", error);
        return [];
      }
    }),

  search: publicProcedure
    .input(
      z.object({
        query: z.string(),
        category: z.string().optional(),
        limit: z.number().default(10),
      })
    )
    .query(async ({ ctx, input }) => {
      const { query, category, limit } = input;

      if (!ctx.prisma.hashtag) {
        console.error("Hashtag model is not defined in the Prisma client");
        return [];
      }

      if (!query.trim()) {
        return [];
      }

      try {
        const whereClause: any = {
          name: {
            contains: query.toLowerCase(),
            mode: "insensitive",
          },
        };

        if (category) {
          whereClause.category = category;
        }

        return await ctx.prisma.hashtag.findMany({
          where: whereClause,
          orderBy: {
            frequency: "desc",
          },
          take: limit,
        });
      } catch (error) {
        console.error("Error searching hashtags:", error);
        return [];
      }
    }),

  updateFrequency: publicProcedure
    .input(
      z.object({
        hashtags: z.array(z.string()),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { hashtags } = input;

      // Check if the Hashtag model exists
      if (!ctx.prisma.hashtag) {
        console.error("Hashtag model is not defined in the Prisma client");
        return { count: 0 };
      }

      try {
        // Process each hashtag
        const updatePromises = hashtags.map(async (hashtag) => {
          // Default category if not present in the tag
          const category = hashtag.includes(":")
            ? hashtag.split(":")[0]
            : "general";

          const name = hashtag.includes(":")
            ? hashtag.split(":")[1].trim()
            : hashtag.trim();

          // Skip empty tags
          if (!name) return null;

          // Upsert the hashtag
          return ctx.prisma.hashtag.upsert({
            where: { name },
            update: {
              frequency: {
                increment: 1,
              },
            },
            create: {
              name,
              category,
              frequency: 1,
            },
          });
        });

        // Execute all updates
        const results = await Promise.all(updatePromises);

        return {
          count: results.filter(Boolean).length,
        };
      } catch (error) {
        console.error("Error updating hashtags:", error);
        return { count: 0 };
      }
    }),
});
