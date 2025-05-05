"use client";

import { trpc } from "@/lib/trpc/client";
import { redirect } from "next/navigation";

const Layout = ({ children }: { children: React.ReactNode }) => {
  const status = trpc.onboarding.getOnboardingStatus.useQuery();

  if (status.data?.onboardingStatus === "COMPLETED") {
    redirect("/dashboard");
  }

  return <div>{children}</div>;
};

export default Layout;
