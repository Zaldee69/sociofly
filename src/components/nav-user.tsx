"use client";

import {
  BellIcon,
  CreditCardIcon,
  Link as LinkIcon,
  LogOutIcon,
  MoreVerticalIcon,
  Settings,
  UserCircleIcon,
  Users,
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
import { useSignOut } from "@/lib/auth-utils";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";

export function NavUser() {
  const { user } = useUser();
  const signOut = useSignOut();

  if (!user) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <div className="flex w-full cursor-pointer items-center gap-2 overflow-hidden rounded-md px-2 py-1.5 hover:bg-accent hover:text-accent-foreground">
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
              {user.emailAddresses[0].emailAddress}
            </span>
          </div>
          <MoreVerticalIcon className="ml-auto size-4" />
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-56 rounded-lg"
        side="right"
        align="end"
        sideOffset={30}
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
                {user.emailAddresses[0].emailAddress}
              </span>
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem>
            <UserCircleIcon className="mr-2 h-4 w-4" />
            Account
          </DropdownMenuItem>
          <DropdownMenuItem>
            <CreditCardIcon className="mr-2 h-4 w-4" />
            Billing
          </DropdownMenuItem>
          <DropdownMenuItem>
            <BellIcon className="mr-2 h-4 w-4" />
            Notifications
          </DropdownMenuItem>

          <DropdownMenuItem>
            <Link href="/teams" className="flex items-center gap-2">
              <Users className="mr-2 h-4 w-4" />
              Teams
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Link href="/social-accounts" className="flex items-center gap-2">
              <LinkIcon className="mr-2 h-4 w-4" />
              Social Accounts
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="hover:cursor-pointer"
          onClick={() => signOut()}
        >
          <LogOutIcon className="mr-2 h-4 w-4" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
