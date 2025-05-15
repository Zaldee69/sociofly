"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Instagram, Twitter, Facebook } from "lucide-react";

import { useCalendar } from "@/calendar/contexts/calendar-context";
import { useOrganization } from "@/contexts/organization-context";
import { trpc } from "@/lib/trpc/client";
import { eventSchema } from "@/calendar/schemas";

import { Button } from "@/components/ui/button";
import { MultiSelect } from "@/components/multi-select";
import { DateTimePicker24hForm } from "@/components/ui/date-time-picker";
import { FacebookIcon } from "@/components/icons/social-media-icons";
import { InstagramIcon } from "@/components/icons/social-media-icons";
import {
  Form,
  FormField,
  FormControl,
  FormMessage,
  FormItem,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogHeader,
  DialogClose,
  DialogContent,
  DialogTrigger,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { MediaUploader } from "./components/media-uploader";
import { PostPreview } from "./components/post-preview";
import { PostToolbar } from "./components/post-toolbar";
import type {
  AddEventDialogProps,
  FileWithPreview,
  SocialAccount,
} from "./types";
import { buttonVariants } from "@/components/ui/button";

export function AddEventDialog({
  children,
  startDate,
  startTime,
}: AddEventDialogProps) {
  const { selectedOrganization } = useOrganization();
  const [isOpen, setIsOpen] = useState(false);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [selectedAccounts, setSelectedAccounts] = useState<SocialAccount[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<FileWithPreview[]>([]);
  const [accountPostPreview, setAccountPostPreview] = useState(
    selectedAccounts[0]
  );

  const form = useForm({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      title: "",
      description: "",
      startDate: typeof startDate !== "undefined" ? startDate : undefined,
      startTime: typeof startTime !== "undefined" ? startTime : undefined,
    },
  });

  const description = form.watch("description");

  const { data: socialAccounts } = trpc.onboarding.getSocialAccounts.useQuery();

  const groupedAccounts = socialAccounts?.reduce(
    (acc: Record<string, typeof socialAccounts>, account) => {
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
        label: platform.charAt(0) + platform.slice(1).toLocaleLowerCase(),
        value: platform,
        icon: IconComponent,
        group: true,
        children: (
          accounts as Array<{
            name: string;
            platform: string;
            id: string;
            profilePicture: string;
          }>
        ).map((account) => ({
          label: account.name,
          value: `${account.platform}_${account.id}`,
          icon: IconComponent,
          profile_picture_url: account.profilePicture,
        })),
      };
    }
  );

  const { data: mediaData } = trpc.media.getAll.useQuery(
    {
      filter: "all",
      search: "",
      organizationId: selectedOrganization?.id!,
      page: 1,
      limit: 10,
    },
    {
      enabled: !!selectedOrganization?.id,
      refetchOnWindowFocus: false,
      staleTime: 1000 * 30,
    }
  );

  const onSubmit = (_values: any) => {
    form.reset();
  };

  const handleFileSelect = (files: FileWithPreview[]) => {
    setSelectedFiles((prev) => [...prev, ...files]);
  };

  const removeFile = (fileToRemove: FileWithPreview) => {
    URL.revokeObjectURL(fileToRemove.preview);
    setSelectedFiles((files) => files.filter((file) => file !== fileToRemove));
  };

  useEffect(() => {
    return () => {
      selectedFiles.forEach((file) => {
        URL.revokeObjectURL(file.preview);
      });
    };
  }, [selectedFiles]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>

      <DialogContent className="min-w-7xl p-0">
        <Form {...form}>
          <form
            id="event-form"
            onSubmit={form.handleSubmit(onSubmit)}
            className="contents"
          >
            <div className="flex gap-4">
              <div className="w-7/12 pl-2.5 py-2.5">
                <h1 className="text-2xl font-bold mb-4">Buat Post</h1>
                <MultiSelect
                  className="w-fit"
                  placeholder="Pilih Akun"
                  variant="secondary"
                  animation={2}
                  maxCount={5}
                  options={accounts}
                  value={selectedAccounts.map(
                    (acc) => `${acc.platform}_${acc.id}`
                  )}
                  onValueChange={(values) => {
                    const selected = values
                      .map((value) => {
                        const [platform, id] = value.split("_");
                        return socialAccounts?.find(
                          (acc) => acc.platform === platform && acc.id === id
                        );
                      })
                      .filter(
                        (acc): acc is NonNullable<typeof acc> => acc != null
                      );
                    setSelectedAccounts(selected);
                    if (selected.length === 1) {
                      setAccountPostPreview(selected[0]);
                    }
                  }}
                  grouped
                />

                <MediaUploader
                  isOpen={isUploadDialogOpen}
                  onOpenChange={setIsUploadDialogOpen}
                  onFileSelect={handleFileSelect}
                />

                <div className="mt-4 border border-input rounded-md p-2 min-h-80 flex flex-col">
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Textarea
                            placeholder="What's on your mind?"
                            className="resize-none border-none active:border-none focus-visible:border-none focus-visible:ring-0 shadow-none p-0 min-h-[150px] max-h-[250px]"
                            rows={10}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex flex-col justify-end flex-1">
                    <div className="mt-5">
                      {selectedFiles.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {selectedFiles.map((file, index) => (
                            <div
                              key={index}
                              className="relative group border rounded-md w-fit"
                            >
                              <img
                                src={file.preview}
                                alt={file.name}
                                className="w-20 object-cover rounded-lg"
                              />
                              <Button
                                variant="destructive"
                                size="icon"
                                className="absolute -top-2 -right-2 h-5 w-5 opacity-0 group-hover:opacity-100"
                                onClick={() => removeFile(file)}
                              >
                                ×
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="mt-4">
                      <PostToolbar
                        onUploadClick={() => setIsUploadDialogOpen(true)}
                        onMediaSelect={(file) => handleFileSelect([file])}
                        media={mediaData?.items || []}
                      />
                    </div>
                  </div>
                </div>

                <DialogFooter className="mt-4 !justify-between">
                  <DialogClose asChild>
                    <Button type="button" variant="outline">
                      Cancel
                    </Button>
                  </DialogClose>

                  <div className="flex gap-2">
                    <DateTimePicker24hForm />
                    <Button form="event-form" type="submit">
                      Create Event
                    </Button>
                  </div>
                </DialogFooter>
              </div>

              <div className="w-5/12 bg-[#f7fafc] rounded-r-lg relative">
                <div className="w-full p-4 sticky top-0">
                  {selectedAccounts.map((account) => (
                    <TooltipProvider key={account.id}>
                      <Tooltip>
                        <TooltipTrigger
                          className={buttonVariants({
                            variant: "outline",
                            className:
                              "!rounded-full !p-2.5 flex-1 bg-black hover:bg-black/80",
                          })}
                        >
                          {account.platform === "FACEBOOK" ? (
                            <FacebookIcon className="fill-white" />
                          ) : account.platform === "INSTAGRAM" ? (
                            <InstagramIcon className="w-5 h-5 text-white" />
                          ) : account.platform === "TWITTER" ? (
                            <Twitter />
                          ) : null}
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{account.name}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ))}
                </div>

                <div className="container">
                  <PostPreview
                    description={description}
                    selectedFiles={selectedFiles}
                    accountPostPreview={accountPostPreview}
                  />
                </div>
              </div>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
