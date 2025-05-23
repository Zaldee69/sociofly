"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { createTRPCClient } from "@/lib/trpc/client";
import { TeamProvider } from "@/lib/contexts/team-context";

export function TRPCProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  const [trpcClient] = useState(() => createTRPCClient());

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <TeamProvider>{children}</TeamProvider>
      </QueryClientProvider>
    </trpc.Provider>
  );
}
