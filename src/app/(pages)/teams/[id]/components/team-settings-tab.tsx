import React, { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Team, TeamFormData } from "../types";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Settings } from "lucide-react";

interface TeamSettingsTabProps {
  teamId: string;
  team: Team | undefined;
}

export const TeamSettingsTab = ({ teamId, team }: TeamSettingsTabProps) => {
  const router = useRouter();
  const [isDeleteTeamDialogOpen, setIsDeleteTeamDialogOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [teamFormData, setTeamFormData] = useState<TeamFormData>({
    name: "",
    description: "",
    color: "#6366F1",
    notifications: {
      memberJoined: true,
      memberLeft: true,
      contentCreated: true,
      contentReviewed: false,
    },
  });
  const [originalFormData, setOriginalFormData] = useState<TeamFormData>({
    name: "",
    description: "",
    color: "#6366F1",
    notifications: {
      memberJoined: true,
      memberLeft: true,
      contentCreated: true,
      contentReviewed: false,
    },
  });

  const utils = trpc.useUtils();

  // Team update mutation
  const updateTeamMutation = trpc.team.updateTeam.useMutation({
    onSuccess: () => {
      toast.success("Team settings updated successfully");
      utils.team.getTeamById.invalidate({ teamId });
    },
    onError: (error) => {
      toast.error(
        error.message || "Could not update team settings. Please try again."
      );
    },
  });

  // Team delete mutation
  const deleteTeamMutation = trpc.team.deleteTeam.useMutation({
    onSuccess: () => {
      toast.success("Team deleted successfully");
      router.push("/teams");
    },
    onError: (error) => {
      toast.error(error.message || "Could not delete team. Please try again.");
    },
  });

  // Update form when team data changes
  useEffect(() => {
    if (team) {
      const initialData = {
        name: team.name,
        description: team.description,
        color: team.color || "#6366F1", // Default color if not provided
        notifications: {
          memberJoined: true,
          memberLeft: true,
          contentCreated: true,
          contentReviewed: false,
        },
      };
      setTeamFormData(initialData);
      setOriginalFormData(initialData);
    }
  }, [team]);

  // Check if general settings have changed
  const hasGeneralSettingsChanged = React.useMemo(() => {
    return (
      teamFormData.name !== originalFormData.name ||
      teamFormData.description !== originalFormData.description ||
      teamFormData.color !== originalFormData.color
    );
  }, [teamFormData, originalFormData]);

  // Check if notification settings have changed
  const hasNotificationSettingsChanged = React.useMemo(() => {
    return (
      teamFormData.notifications.memberJoined !==
        originalFormData.notifications.memberJoined ||
      teamFormData.notifications.memberLeft !==
        originalFormData.notifications.memberLeft ||
      teamFormData.notifications.contentCreated !==
        originalFormData.notifications.contentCreated ||
      teamFormData.notifications.contentReviewed !==
        originalFormData.notifications.contentReviewed
    );
  }, [teamFormData.notifications, originalFormData.notifications]);

  // Handle team settings update
  const handleTeamUpdate = async () => {
    try {
      setIsSaving(true);
      await updateTeamMutation.mutateAsync({
        teamId,
        name: teamFormData.name,
        description: teamFormData.description,
        color: teamFormData.color,
        notificationSettings: teamFormData.notifications,
      });
      // Update original data after successful save
      setOriginalFormData({ ...teamFormData });
    } catch (error) {
      console.error("Error updating team:", error);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle team deletion
  const handleTeamDelete = async () => {
    try {
      deleteTeamMutation.mutate({
        teamId,
      });
    } catch (error) {
      console.error("Error deleting team:", error);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Team Settings
          </CardTitle>
          <CardDescription>Manage settings for {team?.name}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-8">
            <div className="space-y-6">
              <h3 className="text-lg font-medium">General Settings</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Team Name</label>
                  <Input
                    value={teamFormData.name}
                    onChange={(e) =>
                      setTeamFormData({
                        ...teamFormData,
                        name: e.target.value,
                      })
                    }
                    placeholder="Enter team name"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Team Description
                  </label>
                  <Input
                    value={teamFormData.description}
                    onChange={(e) =>
                      setTeamFormData({
                        ...teamFormData,
                        description: e.target.value,
                      })
                    }
                    placeholder="Enter team description"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Team Color</label>
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-md border"
                      style={{ backgroundColor: teamFormData.color }}
                    />
                    <Input
                      type="color"
                      value={teamFormData.color}
                      onChange={(e) =>
                        setTeamFormData({
                          ...teamFormData,
                          color: e.target.value,
                        })
                      }
                      className="w-16 h-10 p-1"
                    />
                    <span className="text-sm text-muted-foreground">
                      {teamFormData.color}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end mt-4">
                <Button
                  onClick={handleTeamUpdate}
                  disabled={!hasGeneralSettingsChanged || isSaving}
                >
                  {isSaving ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </div>

            <div className="pt-4 border-t">
              <h3 className="text-lg font-medium mb-4">
                Notification Preferences
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">New Member Joined</p>
                    <p className="text-sm text-muted-foreground">
                      Receive notifications when a new member joins the team
                    </p>
                  </div>
                  <Switch
                    checked={teamFormData.notifications.memberJoined}
                    onCheckedChange={(checked) =>
                      setTeamFormData({
                        ...teamFormData,
                        notifications: {
                          ...teamFormData.notifications,
                          memberJoined: checked,
                        },
                      })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Member Left</p>
                    <p className="text-sm text-muted-foreground">
                      Receive notifications when a member leaves the team
                    </p>
                  </div>
                  <Switch
                    checked={teamFormData.notifications.memberLeft}
                    onCheckedChange={(checked) =>
                      setTeamFormData({
                        ...teamFormData,
                        notifications: {
                          ...teamFormData.notifications,
                          memberLeft: checked,
                        },
                      })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Content Created</p>
                    <p className="text-sm text-muted-foreground">
                      Receive notifications about new content
                    </p>
                  </div>
                  <Switch
                    checked={teamFormData.notifications.contentCreated}
                    onCheckedChange={(checked) =>
                      setTeamFormData({
                        ...teamFormData,
                        notifications: {
                          ...teamFormData.notifications,
                          contentCreated: checked,
                        },
                      })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Content Reviewed</p>
                    <p className="text-sm text-muted-foreground">
                      Receive notifications when content is reviewed
                    </p>
                  </div>
                  <Switch
                    checked={teamFormData.notifications.contentReviewed}
                    onCheckedChange={(checked) =>
                      setTeamFormData({
                        ...teamFormData,
                        notifications: {
                          ...teamFormData.notifications,
                          contentReviewed: checked,
                        },
                      })
                    }
                  />
                </div>
              </div>

              <div className="flex justify-end mt-4">
                <Button
                  onClick={handleTeamUpdate}
                  disabled={!hasNotificationSettingsChanged || isSaving}
                >
                  {isSaving ? "Saving..." : "Save Notification Settings"}
                </Button>
              </div>
            </div>

            <div className="pt-4 border-t">
              <h3 className="text-lg font-medium text-destructive mb-4">
                Danger Zone
              </h3>
              <div className="border border-destructive/20 rounded-md p-4 bg-destructive/5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium">Delete Team</p>
                    <p className="text-sm text-muted-foreground">
                      Permanently delete this team and all associated data. This
                      action cannot be undone.
                    </p>
                  </div>
                  <Button
                    variant="destructive"
                    onClick={() => setIsDeleteTeamDialogOpen(true)}
                  >
                    Delete Team
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Delete Team Confirmation Dialog */}
      <Dialog
        open={isDeleteTeamDialogOpen}
        onOpenChange={setIsDeleteTeamDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Team</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the team{" "}
              <span className="font-bold">{team?.name}</span>? This action will
              permanently delete all team data, including members, posts, and
              settings. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            <p className="text-sm text-muted-foreground mb-4">
              Please type <span className="font-bold">{team?.name}</span> to
              confirm:
            </p>
            <Input
              className="mb-4"
              placeholder={`Type "${team?.name}" to confirm`}
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteTeamDialogOpen(false);
                setDeleteConfirmText("");
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleTeamDelete}
              disabled={deleteConfirmText !== team?.name}
            >
              Delete Permanently
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
