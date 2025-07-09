import { AppProviders } from "@/components/providers/app-providers";
import { AppNavbar } from "@/components/layout/app-navbar";
import { cookies } from "next/headers";

export default async function ApprovalsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const magicLinkToken = cookieStore.get("magic-link-token");
  const isMagicLink = !!magicLinkToken;

  return (
    <AppProviders>
      {!isMagicLink && <AppNavbar />}
      <main className={!isMagicLink ? "pt-16" : ""}>{children}</main>
    </AppProviders>
  );
}
