import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Shield, Users, Crown, InfoIcon, AlertTriangle } from "lucide-react";
import { api } from "@/lib/utils/api";
import { useTeamFeatureFlag } from "@/lib/hooks/use-team-feature-flag";
import { formatDate } from "@/lib/utils/date";
import { PLAN_DISPLAY_NAMES } from "@/config/constants";
import { Role } from "@prisma/client";

interface TeamSubscriptionStatusProps {
  teamId: string;
}

const TeamSubscriptionStatus = ({ teamId }: TeamSubscriptionStatusProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Get team details
  const { data: team } = api.team.getTeamById.useQuery({ teamId });

  // Get effective subscription for this team
  const { effectiveSubscription, subscriptionSource, isLoading } =
    useTeamFeatureFlag(teamId);

  // Get owner subscription summary if current user is owner
  const { data: ownerSummary } = api.team.getOwnerSubscriptionSummary.useQuery(
    undefined,
    { enabled: team?.role === Role.OWNER }
  );

  if (isLoading || !effectiveSubscription) {
    return (
      <Card className="bg-white border border-slate-200 overflow-hidden animate-pulse">
        <CardHeader className="pb-3">
          <div className="h-6 bg-slate-200 rounded w-1/3"></div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="h-4 bg-slate-200 rounded w-2/3"></div>
            <div className="h-4 bg-slate-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const isOwner = team?.role === Role.OWNER;
  const isSubscribed = effectiveSubscription.subscriptionActive;
  const planName =
    PLAN_DISPLAY_NAMES[
      effectiveSubscription.subscriptionPlan as keyof typeof PLAN_DISPLAY_NAMES
    ] || effectiveSubscription.subscriptionPlan;

  return (
    <Card className="overflow-hidden border-indigo-200 bg-indigo-50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-white/70">
              {isOwner ? (
                <Crown className="w-5 h-5 text-yellow-600" />
              ) : (
                <Shield className="w-5 h-5 text-green-600" />
              )}
            </div>
            <div>
              <CardTitle className="text-lg">
                {isOwner ? "Team Owner Subscription" : "Inherited Team Access"}
              </CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge className="bg-green-100 text-green-800 border-green-200">
                  {planName}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  <Users className="w-3 h-3 mr-1" />
                  Team Plan
                </Badge>
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            <InfoIcon className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <p className="text-sm text-slate-700 mb-4">
          {isOwner
            ? `Your ${planName} subscription provides premium features to all team members.`
            : `You have access to ${planName} features thanks to your team owner's subscription.`}
        </p>

        {isExpanded && (
          <div className="border-t pt-4 space-y-3">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-slate-600">Status:</span>
                <span className="ml-2">
                  {isSubscribed ? "Active" : "Inactive"}
                </span>
              </div>

              {effectiveSubscription.subscriptionExpiresAt && (
                <div>
                  <span className="font-medium text-slate-600">Expires:</span>
                  <span className="ml-2">
                    {formatDate(effectiveSubscription.subscriptionExpiresAt)}
                  </span>
                </div>
              )}

              <div>
                <span className="font-medium text-slate-600">Source:</span>
                <span className="ml-2 capitalize">
                  {subscriptionSource?.replace("_", " ")}
                </span>
              </div>

              {isOwner && ownerSummary && (
                <div>
                  <span className="font-medium text-slate-600">Coverage:</span>
                  <span className="ml-2">
                    {ownerSummary.impact.totalMembers} members,{" "}
                    {ownerSummary.impact.totalTeams} teams
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TeamSubscriptionStatus;
