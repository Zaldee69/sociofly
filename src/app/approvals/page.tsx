"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CheckCircle,
  XCircle,
  Loader2,
  UserCircle,
  CalendarCheck,
  FileText,
  Image as ImageIcon,
  Share2,
  Info,
  SendHorizonal,
  FileCheck,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import { ApprovalStatus } from "@prisma/client";
import { PostPreview } from "@/features/scheduling/components/post-calendar/post-dialog/components/post-preview";
import {
  FileWithStablePreview,
  SocialAccount,
} from "@/features/scheduling/components/post-calendar/post-dialog/types";
import { NextApprovalSuggestion } from "@/components/approval/next-approval-suggestion";
import Link from "next/link";

export default function ApprovalsPage() {
  const searchParams = useSearchParams();
  const token = searchParams?.get("token");
  const assignmentId = searchParams?.get("assignment");

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

  // Get assignment data
  const assignment = token ? magicLinkData?.assignment : regularAssignment;

  // Error states for magic link
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

  // Show loading state
  if (isLoadingMagicLink || isLoadingRegular) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading approval request...</p>
        </div>
      </div>
    );
  }

  // Show not found if no assignment is found
  if (!assignment) {
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

  // Show error if post is deleted
  if (!assignment.instance.post) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-4xl mx-auto space-y-6">
          <Card className="w-full">
            <CardHeader>
              <CardTitle className="text-red-600 flex items-center gap-2">
                <XCircle className="h-5 w-5" />
                Post Not Available
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="p-4 rounded-lg bg-red-50">
                <p className="text-red-600 font-medium">
                  The post associated with this approval request has been
                  deleted.
                </p>
                <p className="text-gray-600 mt-2">
                  This can happen if the content creator removed the post before
                  it was approved.
                </p>
              </div>
              <div className="mt-4 text-sm text-gray-500">
                <p>Workflow: {assignment.instance.workflow.name}</p>
                <p>Step: {assignment.step.name}</p>
                <p>
                  Created: {new Date(assignment.createdAt).toLocaleString()}
                </p>
              </div>
            </CardContent>
          </Card>

          <NextApprovalSuggestion />
        </div>
      </div>
    );
  }

  const { post } = assignment.instance;

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
        icon: Loader2,
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
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-4xl mx-auto space-y-6">
          <Card className="w-full">
            <CardHeader>
              <CardTitle className={`flex items-center gap-2 ${config.color}`}>
                <Icon className="h-5 w-5" />
                Already Reviewed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`p-4 rounded-lg ${config.bg}`}>
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

          <NextApprovalSuggestion />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-slate-50">
      <div className="container max-w-6xl mx-auto px-4 py-12">
        {/* Header Section */}
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-3">
            Content Approval Request
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            {token
              ? `Review requested for ${magicLinkData?.reviewerEmail}`
              : "Please review and approve the content below"}
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-12">
          {/* Main Content - Post Preview & Details */}
          <div className="lg:col-span-8 space-y-8">
            {/* Post Preview Card */}
            <Card className="overflow-hidden border-indigo-100">
              <div className="absolute right-0 top-0 h-full w-1/3 bg-gradient-to-l from-indigo-50 to-transparent" />
              <CardHeader className="relative z-10 border-b bg-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-indigo-100">
                      <FileCheck className="h-5 w-5 text-indigo-600" />
                    </div>
                    <CardTitle>Post Preview</CardTitle>
                  </div>
                  {post.postSocialAccounts &&
                    post.postSocialAccounts.length > 1 && (
                      <Badge
                        variant="outline"
                        className="bg-indigo-50 text-indigo-700"
                      >
                        {post.postSocialAccounts.length} Platforms
                      </Badge>
                    )}
                </div>
              </CardHeader>
              <CardContent className="relative z-10 p-6">
                {(() => {
                  // Transform post data for PostPreview component
                  const selectedFiles: FileWithStablePreview[] =
                    post.mediaUrls?.map(
                      (url, index) =>
                        ({
                          stableId: `media-${index}`,
                          name: `media-${index}.jpg`,
                          preview: url,
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

            {/* Content Details Card */}
            <Card className="overflow-hidden border-violet-100">
              <div className="absolute right-0 top-0 h-full w-1/3 bg-gradient-to-l from-violet-50 to-transparent" />
              <CardHeader className="relative z-10 border-b bg-white">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-violet-100">
                    <FileText className="h-5 w-5 text-violet-600" />
                  </div>
                  <CardTitle>Content Details</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="relative z-10 p-6 space-y-8">
                {/* Post Content */}
                <div>
                  <Label className="text-sm font-medium text-slate-700">
                    Content
                  </Label>
                  <div className="mt-2 p-4 bg-white rounded-lg border shadow-sm">
                    <p className="whitespace-pre-wrap">{post.content}</p>
                  </div>
                </div>

                {/* Media URLs */}
                {post.mediaUrls && post.mediaUrls.length > 0 && (
                  <div>
                    <Label className="text-sm font-medium text-slate-700">
                      Media Files ({post.mediaUrls.length})
                    </Label>
                    <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-4">
                      {post.mediaUrls.map((url, index) => (
                        <div
                          key={index}
                          className="relative aspect-square group"
                        >
                          <img
                            src={url}
                            alt={`Media ${index + 1}`}
                            className="w-full h-full object-cover rounded-lg border shadow-sm transition-all duration-200 group-hover:shadow-md group-hover:scale-[1.02]"
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
                      <Label className="text-sm font-medium text-slate-700">
                        Publishing to
                      </Label>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {post.postSocialAccounts.map((psa) => (
                          <Badge
                            key={psa.id}
                            variant="secondary"
                            className="bg-slate-100 text-slate-700 hover:bg-slate-200"
                          >
                            {psa.socialAccount.platform} -{" "}
                            {psa.socialAccount.name ||
                              psa.socialAccount.profileId}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                {/* Metadata Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t">
                  <div className="bg-slate-50 p-4 rounded-lg">
                    <Label className="text-sm font-medium text-slate-700">
                      Author
                    </Label>
                    <div className="mt-2 flex items-center gap-3">
                      <div className="p-2 rounded-full bg-slate-200">
                        <UserCircle className="h-5 w-5 text-slate-600" />
                      </div>
                      <span className="text-slate-900">
                        {post.user.name || post.user.email}
                      </span>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-lg">
                    <Label className="text-sm font-medium text-slate-700">
                      Created
                    </Label>
                    <div className="mt-2 flex items-center gap-3">
                      <div className="p-2 rounded-full bg-slate-200">
                        <CalendarCheck className="h-5 w-5 text-slate-600" />
                      </div>
                      <span className="text-slate-900">
                        {new Date(assignment.createdAt).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {post.scheduledAt && (
                    <div className="md:col-span-2 bg-slate-50 p-4 rounded-lg">
                      <Label className="text-sm font-medium text-slate-700">
                        Scheduled for
                      </Label>
                      <div className="mt-2 flex items-center gap-3">
                        <div className="p-2 rounded-full bg-slate-200">
                          <Share2 className="h-5 w-5 text-slate-600" />
                        </div>
                        <span className="text-slate-900">
                          {new Date(post.scheduledAt).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar - Review Panel */}
          <div className="lg:col-span-4">
            <div className="lg:sticky lg:top-24 space-y-6">
              <Card className="overflow-hidden border-green-100">
                <div className="absolute right-0 top-0 h-full w-1/3 bg-gradient-to-l from-green-50 to-transparent" />
                <CardHeader className="relative z-10 border-b bg-white">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-green-100">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    </div>
                    <CardTitle>Submit Review</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="relative z-10 p-6 space-y-6">
                  {/* Reviewer Name (for magic link only) */}
                  {token && (
                    <div>
                      <Label htmlFor="reviewerName">Your Name (Optional)</Label>
                      <Input
                        id="reviewerName"
                        value={reviewerName}
                        onChange={(e) => setReviewerName(e.target.value)}
                        placeholder="Enter your name"
                        className="mt-2"
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
                      className="mt-2"
                    />
                  </div>

                  <Separator className="my-6" />

                  {/* Action Buttons */}
                  <div className="space-y-3">
                    <Button
                      onClick={() => handleSubmitReview(true)}
                      disabled={isSubmitting}
                      className="w-full bg-green-600 hover:bg-green-700 text-white h-11"
                    >
                      <CheckCircle className="h-5 w-5 mr-2" />
                      {isSubmitting ? "Submitting..." : "Approve"}
                    </Button>

                    <Button
                      onClick={() => handleSubmitReview(false)}
                      disabled={isSubmitting}
                      variant="destructive"
                      className="w-full h-11"
                    >
                      <XCircle className="h-5 w-5 mr-2" />
                      {isSubmitting ? "Submitting..." : "Reject"}
                    </Button>
                  </div>

                  {/* Workflow Info */}
                  <div className="pt-6 border-t">
                    <div className="bg-slate-50 rounded-lg p-4">
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <div className="p-1.5 rounded-full bg-slate-200">
                            <Info className="h-4 w-4 text-slate-600" />
                          </div>
                          <div>
                            <Label className="text-xs text-slate-500">
                              Workflow
                            </Label>
                            <p className="text-sm font-medium text-slate-900">
                              {assignment.instance.workflow.name}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="p-1.5 rounded-full bg-slate-200">
                            <SendHorizonal className="h-4 w-4 text-slate-600" />
                          </div>
                          <div>
                            <Label className="text-xs text-slate-500">
                              Step
                            </Label>
                            <p className="text-sm font-medium text-slate-900">
                              {assignment.step.name}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="p-1.5 rounded-full bg-slate-200">
                            <UserCircle className="h-4 w-4 text-slate-600" />
                          </div>
                          <div>
                            <Label className="text-xs text-slate-500">
                              Role
                            </Label>
                            <p className="text-sm font-medium text-slate-900">
                              {assignment.step.role}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
