"use client";
import React, { useState } from "react";
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
  Sparkles,
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
import { useScheduleForm } from "./hooks/use-schedule-form";
import { FileUploadArea } from "./components/file-upload-area";
import { AIContentProvider, useAIContent } from "./contexts/ai-content-context";
import { useKeyboardShortcut } from "@/hooks/use-keyboard-shortcut";

const socialAccounts = [
  {
    id: "acc_1",
    platform: "twitter",
    username: "twitter_user1",
    platform_user_id: "tw_123",
    accessToken: "tw_123456789abcdef",
    refreshToken: "tw_refresh_123456789abcdef",
    expiresAt: "2024-12-31T23:59:59Z",
    userId: "user_1",
    organizationId: "org_1",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
    profile_picture_url: "https://picsum.photos/200",
  },
  {
    id: "acc_2",
    platform: "facebook",
    username: "facebook_user1",
    platform_user_id: "fb_123",
    accessToken: "fb_123456789abcdef",
    refreshToken: "fb_refresh_123456789abcdef",
    expiresAt: "2024-12-31T23:59:59Z",
    userId: "user_1",
    organizationId: "org_1",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
    profile_picture_url: "https://picsum.photos/200",
  },
  {
    id: "acc_3",
    platform: "instagram",
    username: "instagram_user1",
    platform_user_id: "ig_123",
    accessToken: "ig_123456789abcdef",
    refreshToken: "ig_refresh_123456789abcdef",
    expiresAt: "2024-12-31T23:59:59Z",
    userId: "user_1",
    organizationId: "org_1",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
    profile_picture_url: "https://picsum.photos/200",
  },
  {
    id: "acc_4",
    platform: "linkedin",
    username: "linkedin_user1",
    platform_user_id: "li_123",
    accessToken: "li_123456789abcdef",
    refreshToken: "li_refresh_123456789abcdef",
    expiresAt: "2024-12-31T23:59:59Z",
    userId: "user_1",
    organizationId: "org_1",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
    profile_picture_url: "https://picsum.photos/200",
  },
];

const SchedulePostContent = () => {
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
    validationErrors,
    selectedAccounts,
    setSelectedAccounts,
  } = useScheduleForm();

  // Set default time to current time + 2 hours
  React.useEffect(() => {
    const now = new Date();
    now.setHours(now.getHours() + 1);
    const hours = now.getHours().toString().padStart(2, "0");
    const minutes = now.getMinutes().toString().padStart(2, "0");
    setTime(`${hours}:${minutes}`);
  }, [setTime]);

  const { setMainContent, setPrompt } = useAIContent();

  // Update main content when content changes
  React.useEffect(() => {
    setMainContent(content);
  }, [content, setMainContent]);

  // const client = useAuthStore();

  // const { socialAccounts } = useSocialAccount("all");

  // Group accounts by platform
  const groupedAccounts = socialAccounts?.reduce(
    (acc, account) => {
      const platform = account.platform;
      if (!acc[platform]) {
        acc[platform] = [];
      }
      acc[platform].push(account);
      return acc;
    },
    {} as Record<string, typeof socialAccounts>
  );

  const accounts = Object.entries(groupedAccounts || {}).map(
    ([platform, accounts]) => {
      const IconComponent =
        platform === "instagram"
          ? Instagram
          : platform === "twitter"
            ? Twitter
            : platform === "facebook"
              ? Facebook
              : undefined;

      return {
        label: platform.charAt(0).toUpperCase() + platform.slice(1),
        value: platform,
        icon: IconComponent,
        group: true,
        children: (
          accounts as Array<{
            username: string;
            platform: string;
            platform_user_id: string;
            profile_picture_url?: string;
          }>
        ).map((account) => ({
          label: account.username,
          value: `${account.platform}_${account.platform_user_id}`,
          icon: IconComponent,
          profile_picture_url: account.profile_picture_url,
        })),
      };
    }
  );

  const [selectedText, setSelectedText] = useState("");
  const [isAIOpen, setIsAIOpen] = useState(false);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  useKeyboardShortcut("k", () => {
    const selectedText = textareaRef.current?.value.substring(
      textareaRef.current?.selectionStart || 0,
      textareaRef.current?.selectionEnd || 0
    );

    if (selectedText) {
      setPrompt(selectedText.trim());
    }
    setIsAIOpen(true);

    // Focus the AI textarea when opened
    setTimeout(() => {
      const aiTextarea = document.querySelector(
        "[data-ai-textarea]"
      ) as HTMLTextAreaElement;
      if (aiTextarea) {
        aiTextarea.focus();
      }
    }, 0);
  });

  const handleAITrigger = () => {
    const selectedText = textareaRef.current?.value.substring(
      textareaRef.current?.selectionStart || 0,
      textareaRef.current?.selectionEnd || 0
    );

    if (selectedText) {
      setPrompt(selectedText.trim());
    }
    setIsAIOpen(true);
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    setMainContent(e.target.value);
  };

  // Add handler for selection
  const handleTextSelection = () => {
    const selection = window.getSelection();
    const selectedText = selection?.toString().trim();
    if (selectedText) {
      setSelectedText(selectedText);
    }
  };

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
              <div className="space-y-2">
                <Label>Select Accounts</Label>
                <MultiSelect
                  placeholder="Pilih Akun"
                  variant="secondary"
                  animation={2}
                  maxCount={5}
                  options={accounts}
                  value={selectedAccounts}
                  onValueChange={setSelectedAccounts}
                  grouped
                />
                {validationErrors.selectedAccounts && (
                  <p className="text-sm text-red-500">
                    {validationErrors.selectedAccounts}
                  </p>
                )}
              </div>

              <form onSubmit={handleSubmit} className="space-y-8">
                <Card>
                  <CardHeader>
                    <CardTitle>Schedule Post</CardTitle>
                    <CardDescription>
                      Create and schedule your social media post
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="content">Content</Label>
                        <div className="relative mt-2 group">
                          <Textarea
                            ref={textareaRef}
                            id="content"
                            name="content"
                            value={content}
                            onChange={handleContentChange}
                            onSelect={handleTextSelection}
                            placeholder="Write your post content here..."
                            className="min-h-[200px] resize-none pr-12"
                          />
                          {validationErrors.content && (
                            <p className="text-sm text-destructive mt-2">
                              {validationErrors.content}
                            </p>
                          )}

                          <Popover open={isAIOpen} onOpenChange={setIsAIOpen}>
                            <PopoverTrigger asChild>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={handleAITrigger}
                                className="absolute right-2 top-2 h-8 w-8 rounded-full bg-background shadow-sm hover:bg-accent opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <Sparkles className="h-4 w-4" />
                                <span className="sr-only">
                                  Open AI Assistant (⌘K)
                                </span>
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent
                              className="w-[400px] p-0"
                              align="end"
                              side="right"
                              sideOffset={5}
                            >
                              <div className="flex flex-col">
                                <div className="flex items-center justify-between border-b p-3">
                                  <div>
                                    <h4 className="text-sm font-medium">
                                      AI Assistant
                                    </h4>
                                    <p className="text-xs text-muted-foreground">
                                      {textareaRef.current?.selectionStart !==
                                      textareaRef.current?.selectionEnd
                                        ? "Edit selected text with AI"
                                        : "Generate engaging content"}
                                    </p>
                                  </div>
                                  <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                                    <span className="text-xs">⌘</span>K
                                  </kbd>
                                </div>
                                <div className="p-3">
                                  <AIContentProvider
                                    initialPrompt={selectedText}
                                  >
                                    <AICaptionGenerator />
                                  </AIContentProvider>
                                </div>
                              </div>
                            </PopoverContent>
                          </Popover>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Date</Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className={cn(
                                  "w-full justify-start text-left",
                                  !date && "text-muted-foreground",
                                  validationErrors.date && "border-red-500"
                                )}
                              >
                                {date ? format(date, "PPP") : "Select date"}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent
                              className="w-auto p-0"
                              align="start"
                            >
                              <Calendar
                                mode="single"
                                selected={date}
                                onSelect={setDate}
                                initialFocus
                                className={cn("p-3 pointer-events-auto")}
                                disabled={(date: Date) => date < new Date()}
                              />
                            </PopoverContent>
                          </Popover>
                          {validationErrors.date && (
                            <p className="text-sm text-red-500">
                              {validationErrors.date}
                            </p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="time">Time</Label>
                          <Input
                            id="time"
                            type="time"
                            value={time}
                            onChange={(e) => {
                              const selectedTime = e.target.value;
                              const [hours, minutes] = selectedTime
                                .split(":")
                                .map(Number);
                              const selectedDate = new Date();
                              selectedDate.setHours(hours, minutes);

                              const now = new Date();
                              if (selectedDate < now) {
                                return; // Prevent setting past time
                              }
                              setTime(selectedTime);
                            }}
                            min={new Date().toTimeString().slice(0, 5)}
                            className={cn(
                              validationErrors.time && "border-red-500"
                            )}
                          />
                          {validationErrors.time && (
                            <p className="text-sm text-red-500">
                              {validationErrors.time}
                            </p>
                          )}
                        </div>
                      </div>

                      <FileUploadArea />

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
                          disabled={
                            isSubmitting ||
                            !content.trim() ||
                            !date ||
                            selectedAccounts.length === 0
                          }
                        >
                          {isSubmitting ? "Scheduling..." : "Schedule Post"}
                        </Button>
                      </CardFooter>
                    </div>
                  </CardContent>
                </Card>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

const SchedulePost: React.FC = () => {
  return (
    <AIContentProvider
      onContentChange={(newContent) => {
        // Find the textarea element and update its value
        const textarea = document.querySelector(
          'textarea[name="content"]'
        ) as HTMLTextAreaElement;
        if (textarea) {
          textarea.value = newContent;
          // Trigger a change event to update React state
          const event = new Event("input", { bubbles: true });
          textarea.dispatchEvent(event);
        }
      }}
    >
      <SchedulePostContent />
    </AIContentProvider>
  );
};

export default SchedulePost;
