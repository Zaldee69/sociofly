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
import dynamic from "next/dynamic";
import { useDynamicNavItems } from "./sidebar/dynamic-nav-items";

// Dynamically import the ConnectedAccounts component with no SSR
const ConnectedAccounts = dynamic(
  () =>
    import("./sidebar/connected-accounts").then((mod) => mod.ConnectedAccounts),
  { ssr: false }
);

const Sidebar: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  const isActive = (path: string) => {
    return pathname === path || (path !== "/" && pathname.startsWith(path));
  };

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
  const dynamicNavItems = useDynamicNavItems();
  const allNavItems = [...baseNavItems, ...dynamicNavItems];

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
              <span className="text-primary">Post</span>
              <span>Spark</span>
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

        {/* Connected Accounts - Dynamically loaded */}
        <ConnectedAccounts collapsed={collapsed} />

        {!collapsed && (
          <div className="mt-6 mb-2 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Settings
          </div>
        )}

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
        className={cn(
          "border-t border-sidebar-border",
          collapsed ? "p-2 flex justify-center" : "p-4"
        )}
      >
        {collapsed ? (
          <button className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center">
            <User className="h-4 w-4" />
          </button>
        ) : (
          <Link
            href="/settings"
            className="flex items-center px-3 py-2 rounded-md hover:bg-sidebar-accent/50"
          >
            <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center mr-3">
              <User className="h-4 w-4" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-medium">User Name</span>
              <span className="text-xs text-sidebar-foreground/70">
                Pro Account
              </span>
            </div>
          </Link>
        )}
      </div>
    </div>
  );
};

export default Sidebar;
