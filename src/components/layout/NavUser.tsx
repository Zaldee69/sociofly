"use client";

import * as React from "react";
import {
  BellIcon,
  CreditCardIcon,
  Link as LinkIcon,
  LogOutIcon,
  MoreVerticalIcon,
  Settings,
  UserCircleIcon,
  Users,
  Mail,
  ChevronDownIcon,
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { InvitationIndicator } from "@/components/ui/invitation-indicator";

interface NavUserProps {
  variant?: "default" | "mobile";
}

export function NavUser({ variant = "default" }: NavUserProps) {
  const [isMounted, setIsMounted] = React.useState(false);
  const { user } = useUser();

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  // Prevent hydration mismatch by not rendering until mounted
  if (!isMounted || !user) {
    return null;
  }

  // Mobile variant - used in mobile sidebar
  if (variant === "mobile") {
    return (
      <div className="space-y-3">
        {/* User Info Display */}
        <div className="flex items-center gap-3 p-3 rounded-lg bg-white border">
          <div className="relative">
            <Avatar className="h-10 w-10 rounded-full">
              <AvatarImage src={user.imageUrl} alt={user.firstName!} />
              <AvatarFallback className="rounded-full">
                {user.firstName?.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <InvitationIndicator
              variant="dot"
              className="absolute -right-0.5 -top-0.5"
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-900 truncate">
              {user.firstName + " " + user.lastName}
            </p>
            <p className="text-xs text-slate-500 truncate">
              {user.emailAddresses[0]?.emailAddress}
            </p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="space-y-1">
          <Link href="/teams">
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 px-3 py-2 h-auto text-sm hover:bg-slate-100"
            >
              <Users className="h-4 w-4" />
              <span>Teams</span>
            </Button>
          </Link>
          <Link href="/invites">
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 px-3 py-2 h-auto text-sm hover:bg-slate-100"
            >
              <Mail className="h-4 w-4" />
              <span>Invitations</span>
              <InvitationIndicator className="ml-auto" />
            </Button>
          </Link>
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 px-3 py-2 h-auto text-sm hover:bg-slate-100"
          >
            <UserCircleIcon className="h-4 w-4" />
            <span>Account Settings</span>
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 px-3 py-2 h-auto text-sm text-red-600 hover:bg-red-50 hover:text-red-700"
          >
            <LogOutIcon className="h-4 w-4" />
            <span>Sign Out</span>
          </Button>
        </div>
      </div>
    );
  }

  // Default variant - used in desktop navbar
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="flex items-center gap-2 h-9 px-2 hover:bg-slate-100 hover:text-slate-900"
        >
          <div className="relative">
            <Avatar className="h-7 w-7 rounded-full">
              <AvatarImage src={user.imageUrl} alt={user.firstName!} />
              <AvatarFallback className="rounded-full text-xs">
                {user.firstName?.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <InvitationIndicator
              variant="dot"
              className="absolute -right-0.5 -top-0.5"
            />
          </div>
          {/* Show username on larger screens */}
          <div className="hidden sm:grid text-left text-sm leading-tight">
            <span className="truncate font-medium text-xs">
              {user.firstName}
            </span>
          </div>
          <ChevronDownIcon className="hidden sm:block h-3 w-3 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-56 rounded-lg"
        side="bottom"
        align="end"
        sideOffset={8}
      >
        <DropdownMenuLabel className="p-0 font-normal">
          <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
            <Avatar className="h-8 w-8 rounded-lg">
              <AvatarImage src={user.imageUrl} alt={user.firstName!} />
              <AvatarFallback className="rounded-lg">
                {user.firstName?.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">
                {user.firstName + " " + user.lastName}
              </span>
              <span className="truncate text-xs text-muted-foreground">
                {user.emailAddresses[0]?.emailAddress}
              </span>
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem className="hover:cursor-pointer">
            <UserCircleIcon className="mr-2 h-4 w-4" />
            Account
          </DropdownMenuItem>
          <Link href="/billing" className="flex items-center gap-2">
            <DropdownMenuItem className="hover:cursor-pointer">
              <CreditCardIcon className="mr-2 h-4 w-4" />
              Billing
            </DropdownMenuItem>
          </Link>
          <Link href="/teams" className="flex items-center gap-2">
            <DropdownMenuItem className="w-full hover:cursor-pointer">
              <Users className="mr-2 h-4 w-4" />
              Teams
            </DropdownMenuItem>
          </Link>
          <Link
            href="/invites"
            className="flex w-full items-center justify-between"
          >
            <DropdownMenuItem className="w-full hover:cursor-pointer">
              <div className="flex items-center gap-2">
                <Mail className="mr-2 h-4 w-4" />
                Invitations
              </div>
              <InvitationIndicator />
            </DropdownMenuItem>
          </Link>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="hover:cursor-pointer">
          <LogOutIcon className="mr-2 h-4 w-4" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
