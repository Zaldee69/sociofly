"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash, User, Users, Loader2 } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import InviteTeamMemberForm from "@/components/invite-team-member-form";

function TeamsContent() {
  const [isAddTeamOpen, setIsAddTeamOpen] = useState(false);
  const [newTeam, setNewTeam] = useState({ name: "" });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Teams</h1>
          <p className="text-gray-500">Manage your teams and team members</p>
        </div>

        <Dialog open={isAddTeamOpen} onOpenChange={setIsAddTeamOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Team
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Team</DialogTitle>
              <DialogDescription>
                Add a new team to manage social media accounts and content.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="name">Team Name</Label>
                <Input
                  id="name"
                  placeholder="Enter team name"
                  value={newTeam.name}
                  onChange={(e) =>
                    setNewTeam({ ...newTeam, name: e.target.value })
                  }
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddTeamOpen(false)}>
                Cancel
              </Button>
              <Button>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Create Team
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Teams List */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Teams</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {/* {teams.map((team: any) => (
                <div
                  key={team.id}
                  className={`p-3 rounded-lg cursor-pointer transition-colors ${
                    selectedTeam?.id === team.id
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted"
                  }`}
                  onClick={() => setSelectedTeam(team)}
                >
                  <div className="font-medium">{team.name}</div>
                  <div className="text-sm opacity-80">
                    {memberCounts[team.id] || 0} members
                  </div>
                </div>
              ))} */}
            </div>
          </CardContent>
        </Card>

        {/* Team Members */}
        {/* {selectedTeam ? (
          <>
            <Card className="md:col-span-2">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Team Members</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Manage members of {selectedTeam.name}
                  </p>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <InviteTeamMemberForm teamId={selectedTeam.id} />

                  <div className="space-y-4">
                    {membersLoading ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      </div>
                    ) : (
                      teamMembers.map((member: any) => (
                        <div
                          key={member.user_id}
                          className="flex items-center justify-between p-3 rounded-lg bg-muted"
                        >
                          <div className="flex items-center space-x-3">
                            <Avatar>
                              <AvatarFallback>
                                {member.full_name?.[0] || <User />}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium">
                                {member.full_name || "Unnamed User"}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {member.email}
                              </div>
                            </div>
                            <Badge variant="outline" className="ml-2">
                              {member.role}
                            </Badge>
                          </div>
                          {member.user_id !== user?.id && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveMember(member.user_id)}
                            >
                              <Trash className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        ) : (
          <Card className="md:col-span-2">
            <CardContent className="flex flex-col items-center justify-center min-h-[300px] text-center">
              <Users className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No Team Selected</h3>
              <p className="text-sm text-muted-foreground">
                Select a team to view and manage its members
              </p>
            </CardContent>
          </Card>
        )} */}
      </div>
    </div>
  );
}

export default function Teams() {
  return (
    <div className="container py-6">
      <TeamsContent />
    </div>
  );
}
