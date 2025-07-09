import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { trpc } from "@/lib/trpc/client";
import { api } from "@/lib/utils/api";
import { Loader2, ArrowRight } from "lucide-react";
import Link from "next/link";

export function NextApprovalSuggestion() {
  const { data: nextApproval, isLoading } =
    trpc.approval.getNextPendingApproval.useQuery(undefined, {
      retry: false,
      refetchOnWindowFocus: false,
    });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!nextApproval) {
    return (
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>All Caught Up! 🎉</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">
            There are no more posts waiting for your approval at the moment.
          </p>
        </CardContent>
        <CardFooter>
          <Link href="/dashboard">
            <Button variant="outline" className="gap-2">
              Return to Dashboard
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="mt-8">
      <CardHeader>
        <CardTitle>Review Next Post</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-gray-600 mb-4">
          There's another post waiting for your review from{" "}
          {nextApproval.instance.post?.user.name ||
            nextApproval.instance.post?.user.email}
          .
        </p>
        <div className="text-sm text-gray-500">
          <p>Workflow: {nextApproval.instance.workflow.name}</p>
          <p>Step: {nextApproval.step.name}</p>
          <p>Created: {new Date(nextApproval.createdAt).toLocaleString()}</p>
        </div>
      </CardContent>
      <CardFooter>
        <Link href={`/approvals?assignment=${nextApproval.id}`}>
          <Button className="gap-2">
            Review Next Post
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}
