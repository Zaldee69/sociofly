import { ThemeProvider } from "next-themes";
import { AppNavbar } from "@/components/layout/app-navbar";

type ProviderProps = {
  children: React.ReactNode;
};

export async function NavbarProviders({ children }: ProviderProps) {
  return (
    <ThemeProvider
      enableSystem
      attribute="class"
      defaultTheme="light"
      disableTransitionOnChange
    >
      <div className="min-h-screen bg-background">
        <AppNavbar />
        <main className="flex-1">{children}</main>
      </div>
    </ThemeProvider>
  );
}
