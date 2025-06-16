"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Calendar, ChartBar, FileText, Home, Image, Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { NavUser } from "./NavUser";
import { TeamSwitcher } from "../team-switcher";
import { NotificationDropdown } from "./NotificationDropdown";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

// Navigation data
const navigationItems = [
  {
    href: "/dashboard",
    icon: Home,
    label: "Overview",
  },
  {
    href: "/calendar",
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

export function AppNavbar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Left side - Logo/Brand and Team Switcher */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <span className="font-semibold text-lg text-slate-900">
                SocioFly
              </span>
            </div>
            <div className="hidden lg:block">
              <TeamSwitcher />
            </div>
          </div>

          {/* Center - Navigation */}
          <nav className="hidden md:flex items-center space-x-1">
            {navigationItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200",
                    "hover:bg-slate-100 hover:text-slate-900",
                    isActive
                      ? "bg-slate-100 text-slate-900 shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Right side - Notifications, User dropdown and mobile menu */}
          <div className="flex items-center gap-2">
            {/* Notification Dropdown */}
            <NotificationDropdown />

            {/* Mobile menu trigger */}
            <div className="md:hidden">
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-9 w-9">
                    <Menu className="h-4 w-4" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-72">
                  <div className="flex flex-col space-y-4 mt-8">
                    <div className="lg:hidden mb-4">
                      <TeamSwitcher />
                    </div>
                    <nav className="flex flex-col space-y-2">
                      {navigationItems.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                              "flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors",
                              "hover:bg-slate-100 hover:text-slate-900",
                              isActive
                                ? "bg-slate-100 text-slate-900"
                                : "text-slate-600"
                            )}
                          >
                            <item.icon className="h-4 w-4" />
                            {item.label}
                          </Link>
                        );
                      })}
                    </nav>
                  </div>
                </SheetContent>
              </Sheet>
            </div>

            <NavUser />
          </div>
        </div>
      </div>
    </header>
  );
}
