"use client";

import * as React from "react";
import { useTeamContext } from "@/lib/contexts/team-context";

import { Loader2, Plus, ChevronsUpDown, AudioWaveform } from "lucide-react";

import { trpc } from "@/lib/trpc/client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarMenuButton } from "./ui/sidebar";

interface Team {
  id: string;
  name: string;
  role: string;
}

export function TeamSwitcher() {
  const [isMounted, setIsMounted] = React.useState(false);
  const { currentTeamId, setCurrentTeamId, isLoading } = useTeamContext();
  const { data: teams } = trpc.team.getAllTeams.useQuery();
  const currentTeam = teams?.find((team: Team) => team.id === currentTeamId);

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  // Prevent hydration mismatch by showing consistent state until mounted
  if (!isMounted) {
    return (
      <SidebarMenuButton
        size="lg"
        className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
      >
        <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
          <AudioWaveform className="size-4" />
        </div>
        <div className="grid flex-1 text-left text-sm leading-tight">
          <span className="truncate font-semibold">Loading...</span>
          <span className="truncate text-xs"></span>
        </div>
        <ChevronsUpDown className="ml-auto" />
      </SidebarMenuButton>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <SidebarMenuButton
          size="lg"
          className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
        >
          <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
            <AudioWaveform className="size-4" />
          </div>
          <div className="grid flex-1 text-left text-sm leading-tight">
            <span className="truncate font-semibold">
              {isLoading ? "Loading..." : currentTeam?.name || "Select Team"}
            </span>
            <span className="truncate text-xs">{currentTeam?.role || ""}</span>
          </div>
          <ChevronsUpDown className="ml-auto" />
        </SidebarMenuButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
        align="start"
        side="bottom"
        sideOffset={4}
      >
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          Teams
        </DropdownMenuLabel>
        {isLoading ? (
          <DropdownMenuItem disabled>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Loading teams...
          </DropdownMenuItem>
        ) : (
          teams?.map((team: Team, index: number) => (
            <DropdownMenuItem
              key={team.id}
              onClick={() => setCurrentTeamId(team.id)}
              className="gap-2 p-2"
            >
              <div className="flex size-6 items-center justify-center rounded-sm border">
                <AudioWaveform className="size-4 shrink-0" />
              </div>
              {team.name}
              <DropdownMenuShortcut>⌘{index + 1}</DropdownMenuShortcut>
            </DropdownMenuItem>
          ))
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem className="gap-2 p-2">
          <div className="flex size-6 items-center justify-center rounded-md border bg-background">
            <Plus className="size-4" />
          </div>
          <div className="font-medium text-muted-foreground">Add team</div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Export OrganizationSwitcher as an alias for TeamSwitcher for backward compatibility
export const OrganizationSwitcher = TeamSwitcher;
