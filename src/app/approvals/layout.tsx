"use client";

import { AppProviders } from "@/components/providers/app-providers";
import { AppNavbar } from "@/components/layout/app-navbar";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function ApprovalsLayoutContent({ children }: { children: React.ReactNode }) {
  const searchParams = useSearchParams();
  const token = searchParams?.get("token");
  const isExternalReviewer = !!token;

  return (
    <AppProviders>
      {!isExternalReviewer && <AppNavbar />}
      <main className={!isExternalReviewer ? "pt-16" : ""}>{children}</main>
    </AppProviders>
  );
}

export default function ApprovalsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={
      <AppProviders>
        <main>{children}</main>
      </AppProviders>
    }>
      <ApprovalsLayoutContent>{children}</ApprovalsLayoutContent>
    </Suspense>
  );
}
