"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  PlusCircle,
  Calendar,
  Settings,
  User,
  FileText,
  Image,
  ChartBar,
  Home,
  ChevronLeft,
  ChevronRight,
  Bell,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SidebarFooter } from "./ui/sidebar";
import { NavUser } from "./nav-user";
import { useUser } from "@clerk/nextjs";

const Sidebar: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  const isActive = (path: string) => {
    return pathname === path || (path !== "/" && pathname.startsWith(path));
  };

  const { user } = useUser();

  const userData = {
    id: user?.id || "",
    firstName: user?.firstName || "",
    lastName: user?.lastName || "",
    name: `${user?.firstName || ""} ${user?.lastName || ""}`.trim(),
    email: user?.emailAddresses[0]?.emailAddress || "",
    imageUrl: user?.imageUrl || "",
  };

  console.log(userData);

  // Base navigation items that are always shown
  const baseNavItems = [
    {
      href: "/dashboard",
      icon: Home,
      label: "Dashboard",
    },
    {
      href: "/calendar/month-view",
      icon: Calendar,
      label: "Calendar",
    },
    {
      href: "/posts",
      icon: FileText,
      label: "Posts",
    },
    {
      href: "/media",
      icon: Image,
      label: "Media",
    },
    {
      href: "/analytics",
      icon: ChartBar,
      label: "Analytics",
    },
  ];

  // Get dynamic navigation items
  const allNavItems = [...baseNavItems];

  return (
    <div
      className={cn(
        "bg-sidebar text-sidebar-foreground flex flex-col h-full border-r border-sidebar-border relative transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Collapse toggle button */}
      <button
        className="absolute -right-3 top-20 bg-background border rounded-full p-1 shadow-sm z-10"
        onClick={() => setCollapsed(!collapsed)}
      >
        {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      {/* Logo */}
      <div
        className={cn(
          "p-4 flex items-center h-16 border-b border-sidebar-border",
          collapsed ? "justify-center" : "justify-between"
        )}
      >
        {collapsed ? (
          <span className="font-bold text-xl">PS</span>
        ) : (
          <>
            <h1 className="font-bold text-xl flex items-center gap-1">
              <span className="text-primary">SocioFly</span>
            </h1>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Bell size={16} />
            </Button>
          </>
        )}
      </div>

      {/* Create Post Button */}
      <div className={cn("px-4 py-2", collapsed && "flex justify-center")}>
        {collapsed ? (
          <Button
            size="icon"
            className="bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90"
          >
            <PlusCircle className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            asChild
            className="w-full bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90"
          >
            <Link href="/schedule-post">
              <PlusCircle className="mr-2 h-4 w-4" />
              Compose
            </Link>
          </Button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 overflow-y-auto">
        {!collapsed && (
          <div className="mb-2 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Workspace
          </div>
        )}

        {/* Main navigation items */}
        <ul className="space-y-1">
          {allNavItems.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  "flex items-center rounded-md text-sm",
                  collapsed ? "justify-center p-2" : "px-4 py-2",
                  isActive(item.href)
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/50"
                )}
              >
                <item.icon className={cn("h-5 w-5", !collapsed && "mr-3")} />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            </li>
          ))}
        </ul>

        <ul className="space-y-1">
          <li>
            <Link
              href="/settings"
              className={cn(
                "flex items-center rounded-md text-sm",
                collapsed ? "justify-center p-2" : "px-4 py-2",
                isActive("/settings")
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/50"
              )}
            >
              <Settings className={cn("h-5 w-5", !collapsed && "mr-3")} />
              {!collapsed && <span>Settings</span>}
            </Link>
          </li>
        </ul>
      </nav>

      {/* User Profile */}
      <div
        className={cn("border-t border-sidebar-border p-2 flex justify-center")}
      >
        {collapsed ? (
          <button className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center">
            <User className="h-4 w-4" />
          </button>
        ) : (
          <SidebarFooter>
            <NavUser user={userData} />
          </SidebarFooter>
        )}
      </div>
    </div>
  );
};

export default Sidebar;
