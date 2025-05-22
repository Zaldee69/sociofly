import { ThemeProvider } from "next-themes";
import { cookies } from "next/headers";

import { AppSidebarInset } from "./app-sidebar-inset";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/Sidebar";

type ProviderProps = {
  children: React.ReactNode;
};

export async function Providers({ children }: ProviderProps) {
  const cookieStore = await cookies();

  const sidebarState = cookieStore.get("sidebar:state")?.value;
  //* get sidebar width from cookie
  const sidebarWidth = cookieStore.get("sidebar:width")?.value || "16rem";

  let defaultOpen = true;

  if (sidebarState) {
    defaultOpen = sidebarState === "true";
  }

  return (
    <ThemeProvider
      enableSystem
      attribute="class"
      defaultTheme="light"
      disableTransitionOnChange
    >
      <SidebarProvider defaultOpen={defaultOpen} defaultWidth={sidebarWidth}>
        <AppSidebar>
          <AppSidebarInset>{children}</AppSidebarInset>
        </AppSidebar>
      </SidebarProvider>
    </ThemeProvider>
  );
}
