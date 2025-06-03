"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CheckCircle,
  XCircle,
  Clock,
  User,
  Calendar,
  MessageSquare,
  Eye,
} from "lucide-react";
import { toast } from "sonner";
import { ApprovalStatus } from "@prisma/client";
import { PostPreview } from "@/features/scheduling/components/post-calendar/post-dialog/components/post-preview";
import {
  FileWithStablePreview,
  SocialAccount,
} from "@/features/scheduling/components/post-calendar/post-dialog/types";

export default function ApprovalsPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const assignmentId = searchParams.get("assignment");

  const [feedback, setFeedback] = useState("");
  const [reviewerName, setReviewerName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // For magic link access
  const {
    data: magicLinkData,
    isLoading: isLoadingMagicLink,
    error: magicLinkError,
  } = trpc.approvalRequest.verifyMagicLink.useQuery(
    { token: token! },
    { enabled: !!token }
  );

  // For regular logged-in access
  const { data: regularAssignment, isLoading: isLoadingRegular } =
    trpc.approvalRequest.getAssignmentById.useQuery(
      { assignmentId: assignmentId! },
      { enabled: !token && !!assignmentId }
    );

  console.log("regularAssignment", regularAssignment);

  const submitMagicLinkReview =
    trpc.approvalRequest.submitMagicLinkReview.useMutation({
      onSuccess: (result) => {
        toast.success(
          `Review submitted successfully! Status: ${result.status}`
        );
        setIsSubmitting(false);
      },
      onError: (error) => {
        toast.error(error.message);
        setIsSubmitting(false);
      },
    });

  const submitRegularReview = trpc.approvalRequest.reviewAssignment.useMutation(
    {
      onSuccess: (result) => {
        toast.success(
          `Review submitted successfully! Status: ${result.status}`
        );
        setIsSubmitting(false);
      },
      onError: (error) => {
        toast.error(error.message);
        setIsSubmitting(false);
      },
    }
  );

  const handleSubmitReview = async (approve: boolean) => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      if (token) {
        // Magic link review
        await submitMagicLinkReview.mutateAsync({
          token,
          approve,
          feedback: feedback.trim() || undefined,
          reviewerName: reviewerName.trim() || undefined,
        });
      } else if (assignmentId) {
        // Regular review
        await submitRegularReview.mutateAsync({
          assignmentId,
          approve,
          feedback: feedback.trim() || undefined,
        });
      }
    } catch (error) {
      // Error handling is done in mutation callbacks
    }
  };

  // Loading states
  if (token && isLoadingMagicLink) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Clock className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Verifying access...</p>
        </div>
      </div>
    );
  }

  // Error states
  if (token && magicLinkError) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600 flex items-center gap-2">
              <XCircle className="h-5 w-5" />
              Access Denied
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">
              {magicLinkError.message || "Invalid or expired link"}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Get assignment data
  const assignment = token ? magicLinkData?.assignment : regularAssignment;

  if (!assignment || !assignment.instance.post) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Assignment Not Found</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">
              The approval assignment could not be found or you don't have
              access to it.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const post = assignment.instance.post;

  // Check if already reviewed
  if (assignment.status !== ApprovalStatus.PENDING) {
    const statusConfig = {
      [ApprovalStatus.APPROVED]: {
        icon: CheckCircle,
        color: "text-green-600",
        bg: "bg-green-50",
        text: "Approved",
      },
      [ApprovalStatus.REJECTED]: {
        icon: XCircle,
        color: "text-red-600",
        bg: "bg-red-50",
        text: "Rejected",
      },
      [ApprovalStatus.IN_PROGRESS]: {
        icon: Clock,
        color: "text-yellow-600",
        bg: "bg-yellow-50",
        text: "In Progress",
      },
      [ApprovalStatus.COMPLETED]: {
        icon: CheckCircle,
        color: "text-blue-600",
        bg: "bg-blue-50",
        text: "Completed",
      },
    };

    const config = statusConfig[assignment.status];
    const Icon = config.icon;

    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <CardTitle className={`flex items-center gap-2 ${config.color}`}>
              <Icon className="h-5 w-5" />
              Already Reviewed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`p-4 rounded-lg ${config.bg} mb-4`}>
              <p className={`font-medium ${config.color}`}>
                This assignment has been {config.text.toLowerCase()}
              </p>
              {assignment.feedback && (
                <p className="text-gray-600 mt-2">
                  <strong>Feedback:</strong> {assignment.feedback}
                </p>
              )}
              {assignment.completedAt && (
                <p className="text-gray-500 text-sm mt-2">
                  Completed on:{" "}
                  {new Date(assignment.completedAt).toLocaleString()}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Content Approval Request
          </h1>
          <p className="text-gray-600">
            {token
              ? `Review requested for ${magicLinkData?.reviewerEmail}`
              : "Please review the content below"}
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Post Preview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  Post Preview
                  {post.postSocialAccounts &&
                    post.postSocialAccounts.length > 1 && (
                      <Badge variant="outline" className="ml-auto">
                        {post.postSocialAccounts.length} Platforms
                      </Badge>
                    )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {(() => {
                  // Transform post data for PostPreview component
                  const selectedFiles: FileWithStablePreview[] =
                    post.mediaUrls?.map(
                      (url, index) =>
                        ({
                          stableId: `media-${index}`,
                          name: `media-${index}.jpg`,
                          preview: url,
                          // Required File properties (mock values for preview)
                          lastModified: Date.now(),
                          webkitRelativePath: "",
                          size: 0,
                          type: "image/jpeg",
                          arrayBuffer: async () => new ArrayBuffer(0),
                          slice: () => new Blob(),
                          stream: () => new ReadableStream(),
                          text: async () => "",
                        }) as FileWithStablePreview
                    ) || [];

                  // Get all social accounts
                  const socialAccounts =
                    post.postSocialAccounts?.map((psa) => psa.socialAccount) ||
                    [];

                  // If only one social account, show single preview
                  if (socialAccounts.length <= 1) {
                    const firstSocialAccount = socialAccounts[0];
                    const accountPostPreview: SocialAccount | undefined =
                      firstSocialAccount
                        ? {
                            id: firstSocialAccount.id,
                            name: firstSocialAccount.name,
                            platform: firstSocialAccount.platform,
                            profilePicture: firstSocialAccount.profilePicture,
                          }
                        : undefined;

                    return (
                      <div className="flex justify-center">
                        <PostPreview
                          description={post.content}
                          selectedFiles={selectedFiles}
                          accountPostPreview={accountPostPreview}
                        />
                      </div>
                    );
                  }

                  // If multiple social accounts, show tabs
                  return (
                    <Tabs defaultValue="0" className="w-full">
                      <TabsList className="grid w-full grid-cols-2 lg:grid-cols-3 mb-6">
                        {socialAccounts.map((account, index) => (
                          <TabsTrigger
                            key={account.id}
                            value={index.toString()}
                            className="flex items-center gap-2"
                          >
                            <span className="capitalize">
                              {account.platform.toLowerCase()}
                            </span>
                            {account.name && (
                              <span className="text-xs text-muted-foreground truncate max-w-20">
                                {account.name}
                              </span>
                            )}
                          </TabsTrigger>
                        ))}
                      </TabsList>

                      {socialAccounts.map((account, index) => {
                        const accountPostPreview: SocialAccount = {
                          id: account.id,
                          name: account.name,
                          platform: account.platform,
                          profilePicture: account.profilePicture,
                        };

                        return (
                          <TabsContent
                            key={account.id}
                            value={index.toString()}
                            className="mt-0"
                          >
                            <div className="flex justify-center">
                              <div className="w-full max-w-sm">
                                <div className="mb-3 text-center">
                                  <Badge variant="secondary" className="mb-2">
                                    {account.platform} -{" "}
                                    {account.name || account.profileId}
                                  </Badge>
                                </div>
                                <PostPreview
                                  description={post.content}
                                  selectedFiles={selectedFiles}
                                  accountPostPreview={accountPostPreview}
                                />
                              </div>
                            </div>
                          </TabsContent>
                        );
                      })}
                    </Tabs>
                  );
                })()}
              </CardContent>
            </Card>

            {/* Content Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Content Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Post Content */}
                <div>
                  <Label className="text-sm font-medium text-gray-700">
                    Content
                  </Label>
                  <div className="mt-1 p-4 bg-gray-50 rounded-lg border">
                    <p className="whitespace-pre-wrap">{post.content}</p>
                  </div>
                </div>

                {/* Media URLs */}
                {post.mediaUrls && post.mediaUrls.length > 0 && (
                  <div>
                    <Label className="text-sm font-medium text-gray-700">
                      Media Files ({post.mediaUrls.length})
                    </Label>
                    <div className="mt-1 grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {post.mediaUrls.map((url, index) => (
                        <div key={index} className="relative aspect-square">
                          <img
                            src={url}
                            alt={`Media ${index + 1}`}
                            className="w-full h-full object-cover rounded-lg border"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Social Accounts */}
                {post.postSocialAccounts &&
                  post.postSocialAccounts.length > 0 && (
                    <div>
                      <Label className="text-sm font-medium text-gray-700">
                        Publishing to
                      </Label>
                      <div className="mt-1 flex flex-wrap gap-2">
                        {post.postSocialAccounts.map((psa) => (
                          <Badge key={psa.id} variant="secondary">
                            {psa.socialAccount.platform} -{" "}
                            {psa.socialAccount.name ||
                              psa.socialAccount.profileId}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                {/* Author Info */}
                <div>
                  <Label className="text-sm font-medium text-gray-700">
                    Author
                  </Label>
                  <div className="mt-1 flex items-center gap-2">
                    <User className="h-4 w-4 text-gray-400" />
                    <span>{post.user.name || post.user.email}</span>
                  </div>
                </div>

                {/* Created Date */}
                <div>
                  <Label className="text-sm font-medium text-gray-700">
                    Created
                  </Label>
                  <div className="mt-1 flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <span>
                      {new Date(assignment.createdAt).toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Scheduled Date */}
                {post.scheduledAt && (
                  <div>
                    <Label className="text-sm font-medium text-gray-700">
                      Scheduled for
                    </Label>
                    <div className="mt-1 flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <span>{new Date(post.scheduledAt).toLocaleString()}</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Review Panel */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>Submit Review</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Reviewer Name (for magic link only) */}
                {token && (
                  <div>
                    <Label htmlFor="reviewerName">Your Name (Optional)</Label>
                    <Input
                      id="reviewerName"
                      value={reviewerName}
                      onChange={(e) => setReviewerName(e.target.value)}
                      placeholder="Enter your name"
                    />
                  </div>
                )}

                {/* Feedback */}
                <div>
                  <Label htmlFor="feedback">Feedback (Optional)</Label>
                  <Textarea
                    id="feedback"
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    placeholder="Add your comments or feedback..."
                    rows={4}
                  />
                </div>

                <Separator />

                {/* Action Buttons */}
                <div className="space-y-3">
                  <Button
                    onClick={() => handleSubmitReview(true)}
                    disabled={isSubmitting}
                    className="w-full bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    {isSubmitting ? "Submitting..." : "Approve"}
                  </Button>

                  <Button
                    onClick={() => handleSubmitReview(false)}
                    disabled={isSubmitting}
                    variant="destructive"
                    className="w-full"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    {isSubmitting ? "Submitting..." : "Reject"}
                  </Button>
                </div>

                {/* Workflow Info */}
                <div className="pt-4 border-t">
                  <div className="text-sm text-gray-600 space-y-1">
                    <p>
                      <strong>Workflow:</strong>{" "}
                      {assignment.instance.workflow.name}
                    </p>
                    <p>
                      <strong>Step:</strong> {assignment.step.name}
                    </p>
                    <p>
                      <strong>Role:</strong> {assignment.step.role}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
