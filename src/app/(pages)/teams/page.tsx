"use client";
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, ChevronRight, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import CreateTeamModal from "./components/create-team";
import { trpc } from "@/lib/trpc/client";
import { Role } from "@prisma/client";
import { motion } from "framer-motion";
import { getRoleBadge } from "./utils/team-utils";

// Variants untuk animasi container
const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

// Variants untuk animasi item
const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 260,
      damping: 20,
    },
  },
  hover: {
    scale: 1.03,
    boxShadow:
      "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
    transition: {
      type: "spring",
      stiffness: 400,
      damping: 17,
    },
  },
};

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

  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <div className="space-y-4 flex justify-between">
          <div className="h-9 w-36 animate-pulse bg-muted rounded" />
          <div className="h-9 w-32 animate-pulse bg-muted rounded" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="h-48 w-full animate-pulse bg-muted rounded-lg opacity-70"
              style={{ animationDelay: `${i * 0.1}s` }}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <motion.div
      className="container mx-auto py-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <motion.div
        className="flex justify-between items-center mb-6"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <h1 className="text-3xl font-bold">My Teams</h1>
        <CreateTeamModal
          onCreateTeam={handleCreateTeam}
          isLoading={createTeamMutation.isPending}
        />
      </motion.div>

      <motion.div
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        variants={containerVariants}
        initial="hidden"
        animate="show"
      >
        {teams?.map((team, index) => (
          <motion.div
            key={team.id}
            variants={itemVariants}
            whileHover="hover"
            transition={{ delay: index * 0.05 }}
          >
            <Card className="overflow-hidden h-full border-2 border-transparent hover:border-primary/20 transition-colors">
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

                <Button
                  onClick={() => handleManageTeam(team.id)}
                  className="w-full group"
                >
                  View Team
                  <ChevronRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {teams?.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          <Card className="text-center py-12">
            <CardContent>
              <p className="text-xl text-muted-foreground mb-4">
                You haven't joined any teams yet
              </p>
              <CreateTeamModal
                onCreateTeam={handleCreateTeam}
                isLoading={createTeamMutation.isPending}
              />
            </CardContent>
          </Card>
        </motion.div>
      )}
    </motion.div>
  );
};

export default TeamManagement;
