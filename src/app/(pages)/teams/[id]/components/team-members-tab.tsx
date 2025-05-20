import React, { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";
import { Role } from "@prisma/client";
import { Search, Clock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";

import { getRoleBadge } from "../../page";
import { EditMemberDropdown } from "./edit-member-dropdown";
import { Member } from "../types";

interface TeamMembersTabProps {
  teamId: string;
}

export const TeamMembersTab = ({ teamId }: TeamMembersTabProps) => {
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [memberToRemove, setMemberToRemove] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [isRemoveDialogOpen, setIsRemoveDialogOpen] = useState(false);

  // Get team data
  const { data: team } = trpc.team.getTeamById.useQuery(
    { teamId },
    { enabled: !!teamId }
  );

  // Get team members with search support
  const { data: members, isLoading: isLoadingMembers } =
    trpc.team.getTeamMembers.useQuery(
      { teamId, searchQuery: "" },
      {
        enabled: !!teamId,
        staleTime: 1000 * 60 * 5, // Data remains fresh for 5 minutes
      }
    );

  // Remove member mutation
  const utils = trpc.useUtils();
  const removeMemberMutation = trpc.team.removeMember.useMutation({
    onSuccess: () => {
      toast.success("Team member has been removed successfully");
      utils.team.getTeamMembers.invalidate({ teamId });
    },
    onError: (error) => {
      toast.error(
        error.message || "Could not remove team member. Please try again."
      );
    },
  });

  // Handle removing a team member
  const handleRemoveMember = async (memberId: string) => {
    try {
      removeMemberMutation.mutate({
        teamId,
        memberId,
      });
      setIsRemoveDialogOpen(false);
      setMemberToRemove(null);
    } catch (error) {
      console.error("Error removing team member:", error);
    }
  };

  // Filter members based on search query
  const filteredMembers =
    members?.filter(
      (member) =>
        member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        member.email.toLowerCase().includes(searchQuery.toLowerCase())
    ) ?? [];

  // Get status badge
  const getStatusBadge = (status: Member["status"]) => {
    switch (status) {
      case "ACTIVE":
        return <Badge className="bg-green-600">Active</Badge>;
      case "INACTIVE":
        return <Badge variant="outline">Inactive</Badge>;
      case "SUSPENDED":
        return <Badge variant="destructive">Suspended</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Team Members
          </CardTitle>
          <CardDescription>Manage the members of {team?.name}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search members..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Last Active</TableHead>
                <TableHead>Status</TableHead>
                {team?.role === Role.OWNER && (
                  <TableHead className="text-right">Actions</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingMembers && searchQuery
                ? // Show skeleton loading only for table when searching
                  Array(3)
                    .fill(0)
                    .map((_, i) => (
                      <TableRow key={`skeleton-${i}`}>
                        <TableCell>
                          <div>
                            <Skeleton className="h-4 w-[150px] mb-2" />
                            <Skeleton className="h-3 w-[120px]" />
                          </div>
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-[80px]" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-[100px]" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-[60px]" />
                        </TableCell>
                        {team?.role === Role.OWNER && (
                          <TableCell className="text-right">
                            <Skeleton className="h-8 w-8 ml-auto" />
                          </TableCell>
                        )}
                      </TableRow>
                    ))
                : filteredMembers.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{member.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {member.email}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>{getRoleBadge(member.role)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm">
                            {new Date(member.lastActive).toLocaleDateString()}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(
                          member.status.toUpperCase() as
                            | "ACTIVE"
                            | "INACTIVE"
                            | "SUSPENDED"
                        )}
                      </TableCell>
                      {team?.role === Role.OWNER &&
                        member.role !== Role.OWNER && (
                          <TableCell className="text-right">
                            <EditMemberDropdown
                              member={member}
                              teamId={teamId}
                              onRemoveMember={(memberId) => {
                                setMemberToRemove({
                                  id: memberId,
                                  name: member.name,
                                });
                                setIsRemoveDialogOpen(true);
                              }}
                            />
                          </TableCell>
                        )}
                    </TableRow>
                  ))}
            </TableBody>
          </Table>

          {!isLoadingMembers && filteredMembers.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No team members found matching your criteria
            </div>
          )}
        </CardContent>
      </Card>

      {/* Remove Member Confirmation Dialog */}
      <Dialog open={isRemoveDialogOpen} onOpenChange={setIsRemoveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Team Member</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove {memberToRemove?.name} from the
              team? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => setIsRemoveDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() =>
                memberToRemove && handleRemoveMember(memberToRemove.id)
              }
            >
              Remove
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

// Skeleton loader component
TeamMembersTab.Skeleton = function TeamMembersTabSkeleton() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-[150px] mb-2" />
          <Skeleton className="h-4 w-[250px]" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center space-x-4">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-[200px]" />
                  <Skeleton className="h-4 w-[150px]" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
