"use client";
import React from "react";
import { useParams, useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Settings, Users, Mail } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

// Components
import {
  TeamHeader,
  TeamMembersTab,
  SocialAccountsTab,
  TeamInvitesTab,
  TeamRolesTab,
  TeamSettingsTab,
} from "./components";

// Hooks
import { useTeamPageData } from "./hooks";
import { usePermissions } from "@/hooks/use-permissions";

const TeamPage = () => {
  const { id: teamId } = useParams();
  const router = useRouter();
  const [activeTab, setActiveTab] = React.useState<string>("members");

  // Use custom hook for loading team data
  const { team, isLoading } = useTeamPageData(teamId as string);

  // Get permissions
  const { hasPermission, isPermissionsLoaded } = usePermissions(
    teamId as string
  );

  // Show loading skeleton
  if (isLoading || !isPermissionsLoaded || !team) {
    return (
      <div className="container mx-auto py-6">
        <div className="mb-6">
          <Button variant="outline" className="mb-4" disabled>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Teams
          </Button>
          <div className="flex justify-between items-center">
            <TeamHeader.Skeleton />
          </div>
        </div>
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
  }

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <Button
          variant="outline"
          className="mb-4"
          onClick={() => router.back()}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Teams
        </Button>

        {team && <TeamHeader team={team} />}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="members">
            <Users className="h-4 w-4 mr-2" />
            Team Members
          </TabsTrigger>
          <TabsTrigger value="social-accounts">
            <Users className="h-4 w-4 mr-2" />
            Social Accounts
          </TabsTrigger>
          {hasPermission("team.manage") && (
            <TabsTrigger value="invites">
              <Mail className="h-4 w-4 mr-2" />
              Pending Invites
            </TabsTrigger>
          )}
          {hasPermission("team.manage") && (
            <TabsTrigger value="roles">
              <Settings className="h-4 w-4 mr-2" />
              Manage Roles
            </TabsTrigger>
          )}
          {hasPermission("team.manage") && (
            <TabsTrigger value="settings">
              <Settings className="h-4 w-4 mr-2" />
              Team Settings
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="members">
          <TeamMembersTab teamId={teamId as string} />
        </TabsContent>

        <TabsContent value="social-accounts">
          <SocialAccountsTab teamId={teamId as string} />
        </TabsContent>

        {hasPermission("team.viewInvites") && (
          <TabsContent value="invites">
            <TeamInvitesTab teamId={teamId as string} team={team} />
          </TabsContent>
        )}

        {hasPermission("team.manage") && (
          <TabsContent value="roles">
            <TeamRolesTab teamId={teamId as string} />
          </TabsContent>
        )}

        {hasPermission("team.manage") && (
          <TabsContent value="settings">
            <TeamSettingsTab teamId={teamId as string} team={team} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};

export default TeamPage;
