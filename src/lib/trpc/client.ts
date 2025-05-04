import { createTRPCReact } from "@trpc/react-query";
import { httpBatchLink } from "@trpc/client";
import type { AppRouter } from "@/server/api/root";
import superjson from "superjson";

export const trpc = createTRPCReact<AppRouter>();

export const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: "http://localhost:3000/api/trpc",
      transformer: superjson,
    }),
  ],
});
