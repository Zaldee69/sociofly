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

export function NavUser() {
  const { user } = useUser();

  if (!user) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="flex items-center gap-2 h-9 px-2 hover:bg-accent hover:text-accent-foreground"
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
                {user.emailAddresses[0].emailAddress}
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
          <DropdownMenuItem className="hover:cursor-pointer">
            <CreditCardIcon className="mr-2 h-4 w-4" />
            Billing
          </DropdownMenuItem>
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
