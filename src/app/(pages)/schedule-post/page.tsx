"use client";
import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Facebook,
  Instagram,
  Linkedin,
  PenLine,
  Twitter,
  Wand,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import AICaptionGenerator from "@/components/ai-caption-generator";
import { useRouter } from "next/navigation";
import { MultiSelect } from "@/components/multi-select";
import { mockAccounts } from "./mock";
import { useScheduleForm } from "./hooks/use-schedule-form";
import { FileUploadArea } from "./components/file-upload-area";

const SchedulePost: React.FC = () => {
  const router = useRouter();
  const {
    content,
    setContent,
    date,
    setDate,
    time,
    setTime,
    isSubmitting,
    handleSubmit,
  } = useScheduleForm();

  const accounts = mockAccounts.map((account) => {
    const IconComponent =
      account.platform === "instagram"
        ? Instagram
        : account.platform === "twitter"
        ? Twitter
        : account.platform === "facebook"
        ? Facebook
        : account.platform === "linkedin"
        ? Linkedin
        : account.platform === "tiktok"
        ? Facebook
        : undefined;

    return {
      label: account.username,
      icon: IconComponent,
      value: account.platform,
    };
  });

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Schedule New Post</h1>
        <p className="text-muted-foreground mt-2">
          Create and schedule your social media post with AI assistance
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-[2fr,1fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PenLine size={20} />
                Create Post
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-6">
              <MultiSelect
                placeholder="Pilih Akun"
                variant="secondary"
                animation={2}
                maxCount={5}
                options={accounts}
                onValueChange={() => {}}
              />

              <form onSubmit={handleSubmit}>
                <div className="space-y-2">
                  <Label htmlFor="content">Content</Label>
                  <Textarea
                    id="content"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="What would you like to share?"
                    className="min-h-[120px] resize-none"
                  />
                  <div className="flex justify-end text-xs text-muted-foreground">
                    <span>{content.length}/280 characters</span>
                  </div>
                </div>

                <FileUploadArea />

                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div className="space-y-2">
                    <Label>Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left",
                            !date && "text-muted-foreground"
                          )}
                        >
                          {date ? format(date, "PPP") : "Select date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={date}
                          onSelect={setDate}
                          initialFocus
                          className={cn("p-3 pointer-events-auto")}
                          disabled={(date) => date < new Date()}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="time">Time</Label>
                    <Input
                      id="time"
                      type="time"
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                    />
                  </div>
                </div>

                <CardFooter className="flex justify-between px-0 mt-6">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.push("/dashboard")}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting || !content.trim() || !date}
                  >
                    {isSubmitting ? "Scheduling..." : "Schedule Post"}
                  </Button>
                </CardFooter>
              </form>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wand className="h-5 w-5" />
                AI Assistant
              </CardTitle>
              <CardDescription>
                Buat caption dan hashtag menarik untuk konten sosial media Anda
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AICaptionGenerator />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default SchedulePost;
