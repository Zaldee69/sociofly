"use client";
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UserPlus, Users, Plus, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import CreateTeamModal from "./components/create-team";
import { trpc } from "@/lib/trpc/client";
import { type Role } from "@prisma/client";

const TeamManagement = () => {
  const router = useRouter();
  const utils = trpc.useUtils();

  // tRPC queries
  const { data: teams, isLoading } = trpc.team.getAllTeams.useQuery();

  // tRPC mutations
  const createTeamMutation = trpc.team.createTeam.useMutation({
    onSuccess: () => {
      toast.success("Team created successfully");
      // Invalidate teams query to refresh the list
      utils.team.getAllTeams.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Handle creating a new team
  const handleCreateTeam = (values: { name: string; description: string }) => {
    createTeamMutation.mutate({
      name: values.name,
      description: values.description,
    });
  };

  // Navigate to team management detail page
  const handleManageTeam = (teamId: string) => {
    router.push(`/teams/${teamId}`);
  };

  // Get role badge
  const getRoleBadge = (role: Role) => {
    switch (role) {
      case "ADMIN":
        return <Badge className="bg-purple-600">Admin</Badge>;
      case "EDITOR":
        return <Badge className="bg-blue-600">Editor</Badge>;
      case "VIEWER":
        return <Badge variant="secondary">Viewer</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center">Loading teams...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">My Teams</h1>
        <CreateTeamModal onCreateTeam={handleCreateTeam} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {teams?.map((team) => (
          <Card key={team.id} className="overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <CardTitle className="text-xl">{team.name}</CardTitle>
                {getRoleBadge(team.role)}
              </div>
              <p className="text-sm text-muted-foreground">
                {team.description}
              </p>
            </CardHeader>
            <CardContent>
              <div className="flex items-center text-sm text-muted-foreground mb-4">
                <Users className="h-4 w-4 mr-1" />
                <span>{team.memberCount} members</span>
              </div>

              {team.role === "ADMIN" ? (
                <Button
                  onClick={() => handleManageTeam(team.id)}
                  className="w-full"
                >
                  Manage Team
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              ) : (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => handleManageTeam(team.id)}
                >
                  View Team
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {teams?.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <p className="text-xl text-muted-foreground mb-4">
              You haven't joined any teams yet
            </p>
            <CreateTeamModal onCreateTeam={handleCreateTeam} />
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default TeamManagement;
