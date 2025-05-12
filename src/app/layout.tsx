import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import { TRPCProvider } from "@/components/providers/trpc-provider";
import { ClerkProvider } from "@clerk/nextjs";
import { OrganizationProvider } from "@/contexts/organization-context";
import { Inter } from "next/font/google";
import { Providers } from "./providers";

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
  preload: true,
  fallback: ["system-ui", "arial"],
  adjustFontFallback: true,
});

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Post Spark - Social Media Management",
  description: "Streamline your social media management with Post Spark",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className={dmSans.className}>
          <Toaster />
          <TRPCProvider>
            <OrganizationProvider>
              <Providers>
                <main className="flex-1">{children}</main>
              </Providers>
            </OrganizationProvider>
          </TRPCProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
