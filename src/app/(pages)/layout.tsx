import Sidebar from "@/components/custom-sidebar";

const Layout = ({ children }: { children: React.ReactNode }) => {
  return <div className="h-screen flex">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="w-full p-6">
          {children}
        </div>
      </main>
    </div>
};

export default Layout;
