import {
  Check,
  ChevronDown,
  RefreshCw,
  Loader2,
  CheckCircle,
  AlertCircle,
  Lock,
} from "lucide-react";
import { useState, useEffect } from "react";
import { buttonVariants } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { PostAction } from "../schema";
import { usePostApprovalStatus } from "./approval-status";
import { usePostQuota } from "../hooks/use-post-quota";
import { useTeamFeatureFlag } from "@/lib/hooks/use-team-feature-flag";
import { Feature } from "@/config/feature-flags";
import { Badge } from "@/components/ui/badge";

interface TAction {
  value: PostAction | "RESUBMIT";
  title: string;
  description: string;
  loadingText: string;
}

const normalActions: TAction[] = [
  {
    value: PostAction.PUBLISH_NOW,
    title: "Publish Sekarang",
    description: "Buat postingan dan publish sekarang",
    loadingText: "Publishing post...",
  },
  {
    value: PostAction.SCHEDULE,
    title: "Jadwalkan",
    description: "Buat postingan dan jadwalkan untuk publish nanti",
    loadingText: "Scheduling post...",
  },
  {
    value: PostAction.SAVE_AS_DRAFT,
    title: "Simpan Sebagai Draft",
    description: "Buat postingan dan simpan sebagai draft",
    loadingText: "Saving draft...",
  },
  {
    value: PostAction.REQUEST_REVIEW,
    title: "Ajukan Review",
    description: "Buat postingan dan ajukan review kepada pengguna lain",
    loadingText: "Submitting for review...",
  },
];

const resubmitAction: TAction = {
  value: "RESUBMIT",
  title: "Resubmit for Review",
  description: "Resubmit this post for review from rejection stage",
  loadingText: "Resubmitting for review...",
};

const retryActions: TAction[] = [
  {
    value: PostAction.PUBLISH_NOW,
    title: "Retry Publish",
    description: "Retry publishing this failed post immediately",
    loadingText: "Retrying publish...",
  },
  {
    value: PostAction.SCHEDULE,
    title: "Reschedule",
    description: "Reschedule this failed post for later",
    loadingText: "Rescheduling post...",
  },
  {
    value: PostAction.SAVE_AS_DRAFT,
    title: "Save as Draft",
    description: "Save this failed post as draft for editing",
    loadingText: "Saving as draft...",
  },
];

interface PostActionSelectorProps {
  currentAction: PostAction;
  isUploading: boolean;
  onActionChange: (action: PostAction) => void;
  postId?: string; // Add postId to detect rejection status
  postStatus?: string; // Add post status to detect if published
  teamId: string; // Add teamId to check quota
}

export function PostActionSelector({
  currentAction,
  isUploading,
  onActionChange,
  postId,
  postStatus,
  teamId,
}: PostActionSelectorProps) {
  const [isOpenPopover, setIsOpenPopover] = useState(false);

  // Check if post is rejected
  const { isRejected } = usePostApprovalStatus(postId || "");

  // Check post quota
  const {
    hasQuotaRemaining,
    currentCount,
    limit,
    remaining,
    isLoading: isQuotaLoading,
  } = usePostQuota(teamId);

  // Check feature access based on team subscription
  const { hasFeature, isLoading: isFeatureLoading } =
    useTeamFeatureFlag(teamId);
  const hasBasicSchedulingAccess = hasFeature(Feature.BASIC_POST_SCHEDULING);
  const hasApprovalAccess = hasFeature(Feature.BASIC_APPROVAL_WORKFLOWS);

  // Check if post is published or failed
  const isPublished = postStatus === "PUBLISHED";
  const isFailed = postStatus === "FAILED";

  // Determine if actions should be disabled due to quota
  const isQuotaExceeded = !hasQuotaRemaining;
  const isScheduleAction = currentAction === PostAction.SCHEDULE;
  const isQuotaDisabled = isQuotaExceeded && isScheduleAction;

  // Determine if actions should be disabled due to feature access
  const isScheduleDisabled =
    !hasBasicSchedulingAccess && currentAction === PostAction.SCHEDULE;
  const isPublishNowDisabled =
    !hasBasicSchedulingAccess && currentAction === PostAction.PUBLISH_NOW;
  const isRequestReviewDisabled =
    !hasApprovalAccess && currentAction === PostAction.REQUEST_REVIEW;

  // Combined disabled state
  const isActionDisabled =
    isQuotaDisabled ||
    isScheduleDisabled ||
    isPublishNowDisabled ||
    isRequestReviewDisabled;

  // If post is published, show read-only status
  if (isPublished) {
    return (
      <div
        className={buttonVariants({
          variant: "default",
          className: "pr-3 cursor-default bg-green-600 hover:bg-green-600",
        })}
      >
        <CheckCircle className="w-4 h-4 mr-2" />
        Published
      </div>
    );
  }

  // Determine which actions to show based on post status
  const actions = isRejected
    ? [resubmitAction, ...normalActions]
    : isFailed
      ? retryActions
      : normalActions;
  const defaultAction = isRejected
    ? resubmitAction
    : isFailed
      ? retryActions[0] // Default to "Retry Publish" for failed posts
      : actions.find((a) => a.value === currentAction);

  const handleActionSelect = (actionValue: string) => {
    if (actionValue === "RESUBMIT") {
      // For resubmit, we'll use REQUEST_REVIEW action but the submit handler will detect rejection
      onActionChange(PostAction.REQUEST_REVIEW);
    } else {
      onActionChange(actionValue as PostAction);
    }
    setIsOpenPopover(false);
  };

  // Get the loading text based on current action
  const getLoadingText = () => {
    if (isRejected) {
      return resubmitAction.loadingText;
    }
    if (isFailed) {
      return retryActions[0].loadingText;
    }
    const action = actions.find((a) => a.value === currentAction);
    return action?.loadingText || "Processing...";
  };

  // Show quota info only for schedule action
  const showQuotaInfo = isScheduleAction;

  // Show feature access warning
  const showFeatureWarning = isRequestReviewDisabled;

  return (
    <div className={buttonVariants({ className: "pr-0" })}>
      <button
        form="event-form"
        type="submit"
        className={cn("cursor-pointer flex items-center gap-2", {
          "cursor-not-allowed opacity-70": isActionDisabled,
        })}
        disabled={isUploading || isActionDisabled}
      >
        {isScheduleAction && isQuotaDisabled && (
          <AlertCircle className="w-4 h-4 text-red-500" />
        )}
        {showFeatureWarning && <Lock className="w-4 h-4 text-amber-500" />}
        {isUploading && <Loader2 className="w-4 h-4 animate-spin" />}
        {(isRejected || isFailed) && !isUploading && (
          <RefreshCw className="w-4 h-4" />
        )}
        {isUploading
          ? getLoadingText()
          : isRejected
            ? resubmitAction.title
            : isFailed
              ? retryActions[0].title
              : defaultAction?.title}
        {showFeatureWarning && (
          <Badge
            variant="outline"
            className="ml-2 text-xs bg-amber-50 text-amber-800 border-amber-200"
          >
            Pro
          </Badge>
        )}
        {showQuotaInfo && (
          <Badge
            variant="outline"
            className={cn(
              "ml-2 text-xs border px-2 py-0.5",
              isQuotaDisabled
                ? "bg-red-50 text-red-700 border-red-200"
                : "bg-amber-50 text-amber-700 border-amber-200"
            )}
          >
            {currentCount}/{limit} Post
          </Badge>
        )}
      </button>

      <Popover open={isOpenPopover} onOpenChange={setIsOpenPopover}>
        <PopoverTrigger asChild>
          <button
            className="p-2 border-l"
            disabled={isUploading || isQuotaLoading || isFeatureLoading}
          >
            <ChevronDown className="w-4 h-4" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="p-0" align="end" side="top" sideOffset={10}>
          <Command>
            <CommandList>
              <CommandGroup>
                {actions.map((actionItem) => {
                  // Check if this action is disabled due to quota
                  const isItemQuotaDisabled =
                    !hasQuotaRemaining &&
                    actionItem.value === PostAction.SCHEDULE;

                  // Check if this action is disabled due to feature access
                  const isFeatureDisabled =
                    actionItem.value === PostAction.REQUEST_REVIEW &&
                    !hasApprovalAccess;

                  // Combined disabled state
                  const isItemDisabled =
                    isItemQuotaDisabled || isFeatureDisabled;

                  // Show quota info for schedule action
                  const showItemQuota =
                    actionItem.value === PostAction.SCHEDULE;

                  return (
                    <CommandItem
                      className={cn("justify-between", {
                        "opacity-50 cursor-not-allowed": isItemDisabled,
                      })}
                      key={actionItem.value}
                      value={actionItem.value}
                      onSelect={handleActionSelect}
                      disabled={isItemDisabled}
                    >
                      <div className="flex items-center gap-2">
                        {actionItem.value === "RESUBMIT" && (
                          <RefreshCw className="w-4 h-4" />
                        )}
                        {actionItem.value === PostAction.SCHEDULE &&
                          isItemQuotaDisabled && (
                            <AlertCircle className="w-4 h-4 text-red-500" />
                          )}
                        {isFeatureDisabled && (
                          <Lock className="w-4 h-4 text-amber-500" />
                        )}
                        <div>
                          <div className="flex items-center gap-2">
                            <p
                              className={cn({
                                "font-semibold":
                                  (isRejected &&
                                    actionItem.value === "RESUBMIT") ||
                                  (!isRejected &&
                                    actionItem.value === currentAction),
                              })}
                            >
                              {actionItem.title}
                            </p>
                            {isFeatureDisabled && (
                              <Badge
                                variant="outline"
                                className="text-xs bg-amber-50 text-amber-800 border-amber-200"
                              >
                                Pro
                              </Badge>
                            )}
                            {showItemQuota && (
                              <Badge
                                variant="outline"
                                className={cn(
                                  "text-xs px-2 py-0.5",
                                  isItemQuotaDisabled
                                    ? "bg-red-50 text-red-700 border-red-200"
                                    : "bg-amber-50 text-amber-700 border-amber-200"
                                )}
                              >
                                {currentCount}/{limit} Post
                              </Badge>
                            )}
                          </div>
                          <p
                            className={cn(
                              "text-xs italic text-muted-foreground",
                              {
                                "font-medium":
                                  (isRejected &&
                                    actionItem.value === "RESUBMIT") ||
                                  (!isRejected &&
                                    actionItem.value === currentAction),
                              }
                            )}
                          >
                            {actionItem.description}
                          </p>
                        </div>
                      </div>
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          (isRejected && actionItem.value === "RESUBMIT") ||
                            (!isRejected && actionItem.value === currentAction)
                            ? "opacity-100"
                            : "opacity-0"
                        )}
                      />
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
