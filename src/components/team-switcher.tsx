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
import { Button } from "@/components/ui/button";

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
      <Button
        variant="ghost"
        className="flex items-center gap-2 h-9 px-2"
        disabled
      >
        <div className="flex aspect-square size-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <AudioWaveform className="size-3" />
        </div>
        <div className="hidden md:grid text-left text-sm leading-tight">
          <span className="truncate font-medium text-xs">Loading...</span>
        </div>
        <ChevronsUpDown className="ml-auto h-3 w-3" />
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="flex items-center gap-2 h-9 px-2 hover:bg-accent hover:text-accent-foreground"
        >
          <div className="flex aspect-square size-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <AudioWaveform className="size-3" />
          </div>
          <div className="hidden md:grid text-left text-sm leading-tight">
            <span className="truncate font-medium text-xs">
              {isLoading ? "Loading..." : currentTeam?.name || "Select Team"}
            </span>
          </div>
          <ChevronsUpDown className="ml-auto h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-56 rounded-lg"
        align="start"
        side="bottom"
        sideOffset={8}
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
