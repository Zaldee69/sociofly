"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { PlusCircle, Calendar, Settings, User, FileText, Image, ChartBar, Home, Twitter, Facebook, Instagram, MessageCircle, Menu, ChevronLeft, ChevronRight, Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";

const Sidebar: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const pathname = usePathname();

  const isActive = (path: string) => {
    return pathname === path || 
           (path !== "/" && pathname.startsWith(path));
  };

  // Mock notification data
  const notifications = [
    { id: 1, text: "Post successfully sent", isUnread: true, time: "2 mins ago" },
    { id: 2, text: "New comment on your post", isUnread: false, time: "1 hour ago" },
    { id: 3, text: "Schedule reminder: 2 posts tomorrow", isUnread: true, time: "3 hours ago" },
  ];

  return (
    <div className={cn(
      "bg-sidebar text-sidebar-foreground flex flex-col h-full border-r border-sidebar-border relative transition-all duration-300",
      collapsed ? "w-16" : "w-64"
    )}>
      {/* Collapse toggle button */}
      <button 
        className="absolute -right-3 top-20 bg-background border rounded-full p-1 shadow-sm z-10"
        onClick={() => setCollapsed(!collapsed)}
      >
        {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>
      
      {/* Logo */}
      <div className={cn(
        "p-4 flex items-center h-16 border-b border-sidebar-border",
        collapsed ? "justify-center" : "justify-between"
      )}>
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
          <Button size="icon" className="bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90">
            <PlusCircle className="h-4 w-4" />
          </Button>
        ) : (
          <Button asChild className="w-full bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90">
            <Link href="/dashboard/schedule-post">
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
        
        <ul className="space-y-1">
          <li>
            <Link
              href="/dashboard"
              className={cn(
                "flex items-center rounded-md text-sm",
                collapsed ? "justify-center p-2" : "px-4 py-2",
                (isActive("/dashboard") || isActive("/")) 
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/50"
              )}
            >
              <Home className={cn("h-5 w-5", !collapsed && "mr-3")} />
              {!collapsed && <span>Dashboard</span>}
            </Link>
          </li>
          <li>
            <Link
              href="/dashboard/calendar"
              className={cn(
                "flex items-center rounded-md text-sm",
                collapsed ? "justify-center p-2" : "px-4 py-2",
                isActive("/calendar")
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/50"
              )}
            >
              <Calendar className={cn("h-5 w-5", !collapsed && "mr-3")} />
              {!collapsed && <span>Calendar</span>}
            </Link>
          </li>
          <li>
            <Link
              href="/dashboard/posts"
              className={cn(
                "flex items-center rounded-md text-sm",
                collapsed ? "justify-center p-2" : "px-4 py-2",
                isActive("/posts")
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/50"
              )}
            >
              <FileText className={cn("h-5 w-5", !collapsed && "mr-3")} />
              {!collapsed && <span>Posts</span>}
            </Link>
          </li>
          <li>
            <Link
              href="/dashboard/media"
              className={cn(
                "flex items-center rounded-md text-sm",
                collapsed ? "justify-center p-2" : "px-4 py-2",
                isActive("/media")
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/50"
              )}
            >
              <Image className={cn("h-5 w-5", !collapsed && "mr-3")} />
              {!collapsed && <span>Media</span>}
            </Link>
          </li>
          <li>
            <Link
              href="/dashboard/analytics"
              className={cn(
                "flex items-center rounded-md text-sm",
                collapsed ? "justify-center p-2" : "px-4 py-2",
                isActive("/analytics")
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/50"
              )}
            >
              <ChartBar className={cn("h-5 w-5", !collapsed && "mr-3")} />
              {!collapsed && <span>Analytics</span>}
            </Link>
          </li>
        </ul>
        
        {!collapsed && (
          <div className="mt-6 mb-2 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Connected Accounts
          </div>
        )}
        
        {!collapsed && (
          <ul className="space-y-1">
            <li>
              <Link 
                href="#" 
                className="flex items-center px-4 py-2 rounded-md text-sm text-sidebar-foreground hover:bg-sidebar-accent/50"
              >
                <Twitter className="mr-3 h-5 w-5 text-[#1DA1F2]" />
                <span>Twitter</span>
                <span className="ml-auto bg-green-100 text-green-800 text-xs px-1.5 py-0.5 rounded">
                  Connected
                </span>
              </Link>
            </li>
            <li>
              <Link 
                href="#" 
                className="flex items-center px-4 py-2 rounded-md text-sm text-sidebar-foreground hover:bg-sidebar-accent/50"
              >
                <Instagram className="mr-3 h-5 w-5 text-[#E1306C]" />
                <span>Instagram</span>
                <span className="ml-auto bg-green-100 text-green-800 text-xs px-1.5 py-0.5 rounded">
                  Connected
                </span>
              </Link>
            </li>
            <li>
              <Link 
                href="#" 
                className="flex items-center px-4 py-2 rounded-md text-sm text-sidebar-foreground hover:bg-sidebar-accent/50"
              >
                <Facebook className="mr-3 h-5 w-5 text-[#4267B2]" />
                <span>Facebook</span>
                <Button variant="outline" size="sm" className="ml-auto h-6 text-xs">
                  Connect
                </Button>
              </Link>
            </li>
          </ul>
        )}
        
        {!collapsed && (
          <div className="mt-6 mb-2 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Settings
          </div>
        )}
        
        <ul className="space-y-1">
          <li>
            <Link
              href="/dashboard/settings"
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
      <div className={cn(
        "border-t border-sidebar-border",
        collapsed ? "p-2 flex justify-center" : "p-4"
      )}>
        {collapsed ? (
          <button className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center">
            <User className="h-4 w-4" />
          </button>
        ) : (
          <Link href="/dashboard/settings" className="flex items-center px-3 py-2 rounded-md hover:bg-sidebar-accent/50">
            <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center mr-3">
              <User className="h-4 w-4" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-medium">User Name</span>
              <span className="text-xs text-sidebar-foreground/70">Pro Account</span>
            </div>
          </Link>
        )}
      </div>
    </div>
  );
};

export default Sidebar;