import { createTRPCClient, httpBatchLink } from "@trpc/client";
import { PostFormValues, PostAction } from "../schema";
import { CalendarPost } from "../../types";
import { ApprovalAssignment, PostStatus } from "@prisma/client";
import { getBaseUrl } from "@/utils/general";
import superjson from "superjson";
import type { AppRouter } from "@/server/api/root";

// Create a standalone tRPC client for non-React contexts
const standaloneClient = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: `${getBaseUrl()}/api/trpc`,
      transformer: superjson,
    }),
  ],
});

/**
 * Handles the submission of a post with approval workflow integration
 *
 * @param post The form values for the post
 * @param teamId The team ID
 * @returns The response from the API
 */
export async function submitPostWithApproval(
  post: PostFormValues,
  teamId: string
): Promise<CalendarPost> {
  // First, create the post
  const createdPost = await standaloneClient.post.create.mutate({
    content: post.content,
    mediaUrls: post.mediaUrls.map(
      (media) => media.uploadedUrl || media.preview
    ),
    scheduledAt: post.scheduledAt,
    platform: "ALL", // This is determined by the social accounts selection
    teamId: teamId,
    socialAccountIds: post.socialAccounts,
  });

  // If approval is needed, submit for approval
  if (post.needsApproval && post.approvalWorkflowId && createdPost.id) {
    await standaloneClient.approvalRequest.submitForApproval.mutate({
      postId: createdPost.id,
      workflowId: post.approvalWorkflowId,
    });

    // The post status would be updated by the approval request process
    // but we can return a representation of the post for UI updates
    return {
      id: createdPost.id,
      postSocialAccounts: [], // Will be populated by the backend
      content: post.content,
      scheduledAt: post.scheduledAt,
      status: "PENDING_APPROVAL" as PostStatus,
      mediaUrls: post.mediaUrls.map(
        (media) => media.uploadedUrl || media.preview
      ),
    } as CalendarPost;
  }

  // For posts without approval workflow, return the standard post
  return {
    id: createdPost.id,
    postSocialAccounts: [], // Will be populated by the backend
    content: post.content,
    scheduledAt: post.scheduledAt,
    status: (post.postAction === PostAction.PUBLISH_NOW
      ? "PUBLISHED"
      : post.postAction === PostAction.SCHEDULE
        ? "SCHEDULED"
        : "DRAFT") as PostStatus,
    mediaUrls: post.mediaUrls.map(
      (media) => media.uploadedUrl || media.preview
    ),
  } as CalendarPost;
}

/**
 * Checks if a post is currently in an approval process
 *
 * @param postId The post ID to check
 * @returns Boolean indicating if the post is in approval
 */
export async function isPostInApprovalProcess(
  postId: string
): Promise<boolean> {
  try {
    // Get approval instance for this post if it exists
    const approvalInstances =
      await standaloneClient.post.getApprovalInstances.query({
        postId,
      });
    return approvalInstances.length > 0;
  } catch (error) {
    console.error("Error checking post approval status:", error);
    return false;
  }
}

/**
 * Gets the current approval status of a post
 *
 * @param postId The post ID to check
 * @returns Object with approval status information
 */
export async function getPostApprovalStatus(postId: string): Promise<{
  inApproval: boolean;
  status: string;
  currentStep?: string;
  approvers?: string[];
}> {
  try {
    // Get approval instance for this post if it exists
    const approvalInstances =
      await standaloneClient.post.getApprovalInstances.query({
        postId,
      });

    if (approvalInstances.length === 0) {
      return { inApproval: false, status: "NOT_IN_APPROVAL" };
    }

    const instance = approvalInstances[0];

    return {
      inApproval: true,
      status: instance.status,
      currentStep: instance.currentStepOrder
        ? `Step ${instance.currentStepOrder}`
        : "Completed",
      approvers: instance.assignments?.map(
        (
          assignment: ApprovalAssignment & {
            user: {
              name: string | null;
              email: string;
            } | null;
          }
        ) => assignment.user?.name || assignment.user?.email || "Unknown"
      ),
    };
  } catch (error) {
    console.error("Error getting post approval status:", error);
    return { inApproval: false, status: "ERROR" };
  }
}
