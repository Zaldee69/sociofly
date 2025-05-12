"use client";

import { useOrganization } from "@/contexts/organization-context";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Building2, Loader2, Users } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function OrganizationSwitcher() {
  const { selectedOrganization, organizations, switchOrganization, isLoading } =
    useOrganization();

  if (organizations.length <= 1) return null;

  return (
    <div className="px-2 animate-in slide-in-from-top-2 duration-300">
      <Select
        value={selectedOrganization?.id}
        onValueChange={switchOrganization}
      >
        <SelectTrigger
          className={cn(
            "w-full bg-background",
            !selectedOrganization && "text-muted-foreground"
          )}
        >
          {isLoading ? (
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" />
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-muted-foreground" />
              <SelectValue placeholder="Select Organization">
                {selectedOrganization?.name || "Select Organization"}
              </SelectValue>
            </div>
          )}
        </SelectTrigger>
        <SelectContent>
          {organizations.map((org) => (
            <SelectItem
              key={org.id}
              value={org.id}
              className="cursor-pointer hover:bg-accent transition-colors"
            >
              <div className="flex items-center gap-2">
                <span>{org.name}</span>
                {org.role && (
                  <span className="text-xs text-muted-foreground">
                    ({org.role})
                  </span>
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
