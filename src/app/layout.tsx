import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { Toaster } from "sonner";
import { TRPCProvider } from "@/components/providers/trpc-provider";
import { TeamProvider } from "@/lib/contexts/team-context";
import { WebSocketProvider } from "@/components/providers/websocket-provider";
import { ClerkProviderWrapper } from "@/components/providers/clerk-provider-wrapper";
import { getEnvironment } from "@/config/env";

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
}: {
  children: React.ReactNode;
}) {
  // Get environment variables with fallback for build time
  let publishableKey: string | undefined;
  try {
    const env = getEnvironment();
    publishableKey = env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  } catch (error) {
    // Fallback for build time when environment variables might not be available
    publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  }

  return (
    <ClerkProviderWrapper publishableKey={publishableKey}>
      <html lang="en" className="light" style={{ colorScheme: "light" }}>
        <body className={dmSans.className}>
          <Toaster />
          <TRPCProvider>
            <TeamProvider>
              <WebSocketProvider enableNotifications={true}>
                <main className="flex-1">{children}</main>
              </WebSocketProvider>
            </TeamProvider>
          </TRPCProvider>
          <Script
            src={
              process.env.NEXT_PUBLIC_MIDTRANS_SNAP_URL ||
              "https://app.sandbox.midtrans.com/snap/snap.js"
            }
            strategy="afterInteractive"
            data-client-key={process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY}
          />
        </body>
      </html>
    </ClerkProviderWrapper>
  );
}
