import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import { TRPCProvider } from "@/components/providers/trpc-provider";
import { ClerkProvider } from "@clerk/nextjs";
const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
  preload: true,
  fallback: ["system-ui", "arial"],
  adjustFontFallback: true,
});

export const metadata: Metadata = {
  title: "Post Spark - Social Media Management",
  description: "Streamline your social media management with Post Spark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className={dmSans.className}>
          <Toaster />
          <TRPCProvider>{children}</TRPCProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
