"use client";
import React, { useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Settings, Users, Mail, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { motion, AnimatePresence } from "framer-motion";

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
import { usePermissions, useFeatureFlag } from "@/lib/hooks";
import ApprovalWorkflowTab from "./components/approval-workflow-tab";
import { Feature } from "@/config/feature-flags";

// Animation variants
const pageTransition = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3 },
  },
  exit: {
    opacity: 0,
    y: -20,
    transition: { duration: 0.2 },
  },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4 },
  },
};

const TeamPage = () => {
  const { id: teamId } = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("sessionId");
  const [activeTab, setActiveTab] = React.useState<string>("members");

  // Use custom hook for loading team data
  const { team, isLoading } = useTeamPageData(teamId as string);

  // Get permissions and feature flags
  const { hasPermission, isPermissionsLoaded } = usePermissions(
    teamId as string
  );
  const { hasFeature } = useFeatureFlag();

  const canAccessTeamCollaboration = hasFeature(Feature.TEAM_COLLABORATION);
  const canAccessRoleManagement = hasFeature(Feature.ROLE_MANAGEMENT);
  const canAccessBasicApprovalWorkflows = hasFeature(Feature.BASIC_APPROVAL_WORKFLOWS);
  const canConnectSocialAccountsBasic = hasFeature(Feature.CONNECT_SOCIAL_ACCOUNTS_BASIC);

  // Set active tab to social-accounts if sessionId is present
  useEffect(() => {
    if (sessionId) {
      setActiveTab("social-accounts");
    }
  }, [sessionId]);

  // Show loading skeleton
  if (isLoading || !isPermissionsLoaded || !team) {
    return (
      <motion.div
        className="container mx-auto py-6"
        initial="hidden"
        animate="visible"
        variants={pageTransition}
      >
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
      </motion.div>
    );
  }

  return (
    <motion.div
      className="container mx-auto py-6"
      initial="hidden"
      animate="visible"
      variants={pageTransition}
    >
      <motion.div className="mb-6" variants={fadeInUp}>
        <Button
          variant="outline"
          className="mb-4"
          onClick={() => router.back()}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Teams
        </Button>

        {team && <TeamHeader team={team} />}
      </motion.div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
        >
          <TabsList className="mb-6">
            <motion.div variants={fadeInUp}>
              <TabsTrigger value="members">
                <Users className="h-4 w-4 mr-2" />
                Team Members
              </TabsTrigger>
            </motion.div>

            {canConnectSocialAccountsBasic && (
              <motion.div variants={fadeInUp}>
                <TabsTrigger value="social-accounts">
                  <Users className="h-4 w-4 mr-2" />
                  Social Accounts
                </TabsTrigger>
              </motion.div>
            )}

            {canAccessTeamCollaboration && (
              <motion.div variants={fadeInUp}>
                <TabsTrigger value="invites">
                  <Mail className="h-4 w-4 mr-2" />
                  Member Invites
                </TabsTrigger>
              </motion.div>
            )}

            {canAccessRoleManagement && (
              <motion.div variants={fadeInUp}>
                <TabsTrigger value="roles">
                  <Settings className="h-4 w-4 mr-2" />
                  Manage Roles
                </TabsTrigger>
              </motion.div>
            )}

            {canAccessBasicApprovalWorkflows && (
              <motion.div variants={fadeInUp}>
                <TabsTrigger value="approval-workflow">
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Approval Workflow
                </TabsTrigger>
              </motion.div>
            )}

            {canAccessTeamCollaboration && (
              <motion.div variants={fadeInUp}>
                <TabsTrigger value="settings">
                  <Settings className="h-4 w-4 mr-2" />
                  Team Settings
                </TabsTrigger>
              </motion.div>
            )}
          </TabsList>
        </motion.div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            {activeTab === "members" && (
              <TabsContent value="members" forceMount>
                <TeamMembersTab teamId={teamId as string} />
              </TabsContent>
            )}

            {canConnectSocialAccountsBasic && activeTab === "social-accounts" && (
              <TabsContent value="social-accounts" forceMount>
                <SocialAccountsTab teamId={teamId as string} />
              </TabsContent>
            )}

            {canAccessTeamCollaboration && activeTab === "invites" && (
              <TabsContent value="invites" forceMount>
                <TeamInvitesTab teamId={teamId as string} team={team} />
              </TabsContent>
            )}

            {canAccessRoleManagement && activeTab === "roles" && (
              <TabsContent value="roles" forceMount>
                <TeamRolesTab teamId={teamId as string} />
              </TabsContent>
            )}

            {canAccessTeamCollaboration && activeTab === "settings" && (
              <TabsContent value="settings" forceMount>
                <TeamSettingsTab teamId={teamId as string} team={team} />
              </TabsContent>
            )}

            {canAccessBasicApprovalWorkflows &&
              activeTab === "approval-workflow" && (
                <TabsContent value="approval-workflow" forceMount>
                  <ApprovalWorkflowTab />
                </TabsContent>
              )}
          </motion.div>
        </AnimatePresence>
      </Tabs>
    </motion.div>
  );
};

export default TeamPage;
