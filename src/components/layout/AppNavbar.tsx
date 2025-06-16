"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  Calendar,
  ChartBar,
  FileText,
  Home,
  Image,
  Menu,
  X,
  Bell,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { NavUser } from "./NavUser";
import { TeamSwitcher } from "../team-switcher";
import { NotificationDropdown } from "./NotificationDropdown";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetHeader,
  SheetTitle,
  SheetClose,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";

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
  // {
  //   href: "/posts",
  //   icon: FileText,
  //   label: "Posts",
  // },
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  // Close mobile menu when route changes
  React.useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Left side - Logo/Brand and Team Switcher */}
          <div className="flex items-center gap-4 min-w-0">
            <div className="flex items-center gap-3 min-w-0">
              <span className="font-semibold text-lg text-slate-900 truncate">
                SocioFly
              </span>
            </div>
            <div className="hidden xl:block">
              <TeamSwitcher />
            </div>
          </div>

          {/* Center - Navigation (Desktop only) */}
          <nav className="hidden lg:flex items-center space-x-1">
            {navigationItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200",
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
          <div className="flex items-center gap-1 sm:gap-2">
            {/* Notification Dropdown - Hidden on very small screens */}
            <div className="hidden sm:block">
              <NotificationDropdown />
            </div>

            {/* Mobile menu trigger */}
            <div className="lg:hidden">
              <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-9 w-9">
                    <Menu className="h-4 w-4" />
                    <span className="sr-only">Open menu</span>
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-80 sm:w-[400px] p-0">
                  <div className="flex flex-col h-full">
                    {/* Header */}
                    <SheetHeader className="px-6 py-4 border-b">
                      <div className="flex items-center justify-between">
                        <SheetTitle className="text-lg font-semibold">
                          SocioFly
                        </SheetTitle>
                        <SheetClose asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                          >
                            <X className="h-4 w-4" />
                            <span className="sr-only">Close menu</span>
                          </Button>
                        </SheetClose>
                      </div>
                    </SheetHeader>

                    {/* Content */}
                    <div className="flex-1 px-6 py-4 space-y-6 overflow-y-auto">
                      {/* Team Switcher in mobile */}
                      <div className="xl:hidden">
                        <h3 className="text-sm font-medium text-slate-700 mb-3">
                          Team
                        </h3>
                        <TeamSwitcher />
                      </div>

                      <Separator className="xl:hidden" />

                      {/* Navigation */}
                      <div>
                        <h3 className="text-sm font-medium text-slate-700 mb-3">
                          Navigation
                        </h3>
                        <nav className="space-y-1">
                          {navigationItems.map((item) => {
                            const isActive = pathname === item.href;
                            return (
                              <SheetClose asChild key={item.href}>
                                <Link
                                  href={item.href}
                                  className={cn(
                                    "flex items-center gap-3 px-3 py-3 text-sm font-medium rounded-lg transition-colors w-full",
                                    "hover:bg-slate-100 hover:text-slate-900",
                                    isActive
                                      ? "bg-slate-100 text-slate-900 shadow-sm"
                                      : "text-slate-600"
                                  )}
                                >
                                  <item.icon className="h-5 w-5" />
                                  {item.label}
                                </Link>
                              </SheetClose>
                            );
                          })}
                        </nav>
                      </div>

                      <Separator />

                      {/* Notifications section for mobile */}
                      <div className="sm:hidden">
                        <h3 className="text-sm font-medium text-slate-700 mb-3">
                          Notifications
                        </h3>
                        <Button
                          variant="ghost"
                          className="flex items-center gap-3 px-3 py-3 text-sm font-medium rounded-lg w-full justify-start hover:bg-slate-100"
                        >
                          <Bell className="h-5 w-5 text-slate-600" />
                          <span>Notifications</span>
                          <div className="ml-auto flex items-center justify-center w-5 h-5 bg-red-500 text-white text-xs rounded-full">
                            3
                          </div>
                        </Button>
                      </div>
                    </div>

                    {/* Footer - User section */}
                    <div className="px-6 py-4 border-t bg-slate-50/50">
                      <h3 className="text-sm font-medium text-slate-700 mb-3">
                        Account
                      </h3>
                      <div className="w-full">
                        <NavUser variant="mobile" />
                      </div>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>

            {/* Desktop User Dropdown */}
            <div className="hidden lg:block">
              <NavUser />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
