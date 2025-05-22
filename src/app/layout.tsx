import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import { TRPCProvider } from "@/components/providers/trpc-provider";
import { ClerkProvider } from "@clerk/nextjs";
import { TeamProvider } from "@/lib/contexts/team-context";
import { Inter } from "next/font/google";

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
            <TeamProvider>
              <main className="flex-1">{children}</main>
            </TeamProvider>
          </TRPCProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
