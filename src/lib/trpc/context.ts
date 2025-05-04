import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma/client";

export async function createContext(req: Request) {
  const { userId } = await auth();
  return { userId, prisma };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
