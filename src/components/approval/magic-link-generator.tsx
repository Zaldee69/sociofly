"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Copy, ExternalLink, Mail, Clock } from "lucide-react";
import { toast } from "sonner";

interface MagicLinkGeneratorProps {
  assignmentId: string;
  children?: React.ReactNode;
}

export function MagicLinkGenerator({
  assignmentId,
  children,
}: MagicLinkGeneratorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [reviewerEmail, setReviewerEmail] = useState("");
  const [expiresInHours, setExpiresInHours] = useState(72);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);

  const generateMagicLink = trpc.approvalRequest.generateMagicLink.useMutation({
    onSuccess: (data) => {
      setGeneratedLink(data.magicLink);
      setExpiresAt(data.expiresAt);
      toast.success("Magic link generated successfully!");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleGenerateLink = async () => {
    if (!reviewerEmail.trim()) {
      toast.error("Please enter reviewer email");
      return;
    }

    await generateMagicLink.mutateAsync({
      assignmentId,
      reviewerEmail: reviewerEmail.trim(),
      expiresInHours,
    });
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied to clipboard!");
    } catch (error) {
      toast.error("Failed to copy to clipboard");
    }
  };

  const sendEmail = () => {
    const subject = encodeURIComponent("Content Approval Request");
    const body = encodeURIComponent(
      `Hi,\n\nYou have been requested to review content for approval.\n\nPlease click the link below to access the review:\n${generatedLink}\n\nThis link will expire on ${expiresAt?.toLocaleString()}.\n\nBest regards`
    );
    window.open(`mailto:${reviewerEmail}?subject=${subject}&body=${body}`);
  };

  const reset = () => {
    setReviewerEmail("");
    setExpiresInHours(72);
    setGeneratedLink(null);
    setExpiresAt(null);
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        setIsOpen(open);
        if (!open) reset();
      }}
    >
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline" size="sm">
            <ExternalLink className="h-4 w-4 mr-2" />
            Generate Magic Link
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Generate Magic Link for External Reviewer</DialogTitle>
        </DialogHeader>

        {!generatedLink ? (
          <div className="space-y-4">
            <div>
              <Label htmlFor="reviewerEmail">Reviewer Email</Label>
              <Input
                id="reviewerEmail"
                type="email"
                value={reviewerEmail}
                onChange={(e) => setReviewerEmail(e.target.value)}
                placeholder="reviewer@example.com"
              />
            </div>

            <div>
              <Label htmlFor="expiresIn">Link Expires In</Label>
              <Select
                value={expiresInHours.toString()}
                onValueChange={(value) => setExpiresInHours(parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="24">24 hours</SelectItem>
                  <SelectItem value="48">48 hours</SelectItem>
                  <SelectItem value="72">72 hours (3 days)</SelectItem>
                  <SelectItem value="168">1 week</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={handleGenerateLink}
              disabled={generateMagicLink.isPending || !reviewerEmail.trim()}
              className="w-full"
            >
              {generateMagicLink.isPending
                ? "Generating..."
                : "Generate Magic Link"}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-green-600 flex items-center gap-2">
                  <ExternalLink className="h-5 w-5" />
                  Magic Link Generated
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">Reviewer Email</Label>
                  <p className="text-sm text-gray-600">{reviewerEmail}</p>
                </div>

                <div>
                  <Label className="text-sm font-medium">Expires At</Label>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Clock className="h-4 w-4" />
                    {expiresAt?.toLocaleString()}
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium">Magic Link</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Input value={generatedLink} readOnly className="text-xs" />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyToClipboard(generatedLink)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button onClick={sendEmail} className="flex-1">
                    <Mail className="h-4 w-4 mr-2" />
                    Send Email
                  </Button>
                  <Button
                    onClick={() => copyToClipboard(generatedLink)}
                    variant="outline"
                    className="flex-1"
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copy Link
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Button onClick={reset} variant="outline" className="w-full">
              Generate Another Link
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
