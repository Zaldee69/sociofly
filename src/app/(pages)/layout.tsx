import { Providers } from "@/components/providers/sidebar";

const Layout = ({ children }: { children: React.ReactNode }) => {
  return (
    <Providers>
      <div className="h-screen flex">
        <main className="flex-1 overflow-auto">
          <div className="w-full p-6 pt-0">{children}</div>
        </main>
      </div>
    </Providers>
  );
};

export default Layout;
