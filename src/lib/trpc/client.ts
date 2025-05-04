import { createTRPCReact } from "@trpc/react-query";
import { httpBatchLink } from "@trpc/client";
import type { AppRouter } from "@/server/api/root";
import superjson from "superjson";
import { getBaseUrl } from "@/lib/utils";

export const trpc = createTRPCReact<AppRouter>();

export const createTRPCClient = () => {
  return trpc.createClient({
    links: [
      httpBatchLink({
        url: `${getBaseUrl()}/api/trpc`,
        transformer: superjson,
      }),
    ],
  });
};
