"use client";
import React, { useCallback, useState } from "react";
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
import { cn, fileToBase64 } from "@/lib/utils";
import { format } from "date-fns";
import { toast } from "sonner";
import AICaptionGenerator from "@/components/ai-caption-generator";
import { useRouter } from "next/navigation";
import { MultiSelect } from "@/components/multi-select";
import { useAuthStore } from "@/lib/stores/use-auth-store";
import { mockAccounts } from "./mock";
import { useDropzone } from "@uploadthing/react";
import {
  generateClientDropzoneAccept,
  generatePermittedFileTypes,
} from "uploadthing/client";
import { useUploadThing } from "@/lib/utils/uploadthing";
import { HTML5Backend } from "react-dnd-html5-backend";
import { DndProvider } from "react-dnd";
import DraggableImagePreview from "@/components/draggable-image-preview";
const SchedulePost: React.FC = () => {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [time, setTime] = useState("12:00");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [files, setFiles] = useState<File[]>([]);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    setFiles(acceptedFiles);
  }, []);

  const { startUpload, routeConfig } = useUploadThing("imageUploader", {
    onClientUploadComplete: () => {
      toast.success("uploaded successfully!");
    },
    onUploadError: () => {
      toast.error("error occurred while uploading");
    },
    onUploadBegin: (file) => {
      console.log("upload has begun for", file);
    },
  });

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    accept: generateClientDropzoneAccept(
      generatePermittedFileTypes(routeConfig).fileTypes
    ),
  });

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!content.trim()) {
      toast.error("Please add content to your post");
      return;
    }

    if (!date) {
      toast.error("Please select a date for your post");
      return;
    }

    setIsSubmitting(true);

    const [hours, minutes] = time.split(":").map(Number);
    const scheduledDate = new Date(date);
    scheduledDate.setHours(hours, minutes);

    setTimeout(() => {
      setIsSubmitting(false);
      toast.success("Post scheduled successfully!");
      router.push("/dashboard");
    }, 1000);
  };

  // const handleAICaptionSelect = (caption: string, hashtags: string[]) => {
  //   setContent(caption);
  //   toast.success("AI caption applied successfully!");
  // };

  return (
    <DndProvider backend={HTML5Backend}>
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

                  <DraggableImagePreview files={files} />

                  <div className="border-2 border-dashed rounded-md hover:border-primary/50 transition-colors h-[300px] mt-4">
                    <div
                      {...getRootProps()}
                      className="text-center p-6 h-full flex items-center justify-center"
                    >
                      <Input {...getInputProps()} />
                      <Label
                        htmlFor="image"
                        className="cursor-pointer justify-center"
                      >
                        <div className="flex flex-col items-center gap-2">
                          <div className="p-3 rounded-full bg-secondary">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className="w-6 h-6"
                            >
                              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7" />
                              <line x1="16" y1="5" x2="22" y2="5" />
                              <line x1="19" y1="2" x2="19" y2="8" />
                              <circle cx="9" cy="9" r="2" />
                              <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                            </svg>
                          </div>
                          <span className="text-sm font-medium">
                            Click to upload image/video
                          </span>
                          <span className="text-xs text-muted-foreground">
                            PNG, JPG, MP4 up to 10MB
                          </span>
                        </div>
                      </Label>
                    </div>
                  </div>

                  <div className="flex justify-end mt-4">
                    {files.length > 0 && (
                      <Button onClick={() => startUpload(files)}>
                        Upload {files.length} {files[0].name}
                      </Button>
                    )}
                  </div>

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
                  Buat caption dan hashtag menarik untuk konten sosial media
                  Anda
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AICaptionGenerator />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DndProvider>
  );
};

export default SchedulePost;
