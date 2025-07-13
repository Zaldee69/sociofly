"use client";

import { ClerkProvider } from "@clerk/nextjs";
import { ReactNode } from "react";

interface ClerkProviderWrapperProps {
  children: ReactNode;
  publishableKey?: string;
}

export function ClerkProviderWrapper({
  children,
  publishableKey,
}: ClerkProviderWrapperProps) {
  // If no publishable key is available during build time, render children without Clerk
  if (!publishableKey) {
    console.warn(
      "Clerk publishable key not found. Authentication features will be disabled."
    );
    return <>{children}</>;
  }

  return <ClerkProvider publishableKey={publishableKey}>{children}</ClerkProvider>;
}