import { NavbarProviders } from "@/components/providers/navbar";

const Layout = ({ children }: { children: React.ReactNode }) => {
  return (
    <NavbarProviders>
      <div className="container mx-auto px-4 py-6">{children}</div>
    </NavbarProviders>
  );
};

export default Layout;
