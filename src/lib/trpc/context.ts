import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma/client";

export async function createContext(req: Request) {
  const { userId } = await auth();

  const user = await prisma.user.findUnique({
    where: {
      clerkId: userId!,
    },
  });

  return { userId: user?.id, prisma };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
