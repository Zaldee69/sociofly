"use client";

import { ReactNode } from "react";
import { ThemeProvider } from "next-themes";
import { TeamProvider } from "@/lib/contexts/team-context";
import { TRPCProvider } from "@/components/providers/trpc-provider";

interface AppProvidersProps {
  children: ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <TRPCProvider>
      <ThemeProvider
        attribute="class"
        defaultTheme="light"
        enableSystem
        disableTransitionOnChange
      >
        <TeamProvider>{children}</TeamProvider>
      </ThemeProvider>
    </TRPCProvider>
  );
}
