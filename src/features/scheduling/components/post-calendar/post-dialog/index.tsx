"use client";

import { useState, useEffect, memo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Instagram, Twitter, Facebook, ChevronDown, Check } from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { PostStatus } from "@prisma/client";

import { useTeamContext } from "@/lib/contexts/team-context";
import { trpc } from "@/lib/trpc/client";
import { useUploadThing } from "@/lib/utils/uploadthing";
import { Button, buttonVariants } from "@/components/ui/button";
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

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { MediaUploader } from "./components/media-uploader";
import { PostPreview } from "./components/post-preview";
import { PostToolbar } from "./components/post-toolbar";
import { PostApprovalIntegration } from "./components/post-approval-integration";
import { submitPostWithApproval } from "./components/approval-workflow-integration";
import type { AddPostDialogProps, SocialAccount } from "./types";
import type { CalendarPost } from "../types";
import { cn } from "@/lib/utils";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { PostAction, PostFormValues, postSchema, MediaItem } from "./schema";

interface FileWithStablePreview extends File {
  preview: string;
  stableId: string;
}

interface TActions {
  value: PostAction;
  title: string;
  description: string;
}

const actions: TActions[] = [
  {
    value: PostAction.PUBLISH_NOW,
    title: "Publish Sekarang",
    description: "Buat postingan dan publish sekarang",
  },
  {
    value: PostAction.SCHEDULE,
    title: "Jadwalkan",
    description: "Buat postingan dan jadwalkan untuk publish nanti",
  },
  {
    value: PostAction.SAVE_AS_DRAFT,
    title: "Simpan Sebagai Draft",
    description: "Buat postingan dan simpan sebagai draft",
  },
  {
    value: PostAction.REQUEST_REVIEW,
    title: "Ajukan Review",
    description: "Buat postingan dan ajukan review kepada pengguna lain",
  },
];

const SortableImage = memo(
  ({
    file,
    index,
    onRemove,
  }: {
    file: FileWithStablePreview;
    index: number;
    onRemove: (file: FileWithStablePreview) => void;
  }) => {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({
      id: file.stableId,
    });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      zIndex: isDragging ? 1 : 0,
      opacity: isDragging ? 0.5 : 1,
      touchAction: "none",
    };

    return (
      <div className="relative group">
        <div
          ref={setNodeRef}
          style={style}
          className="border rounded-md w-fit cursor-move"
          {...attributes}
          {...listeners}
        >
          <img
            src={file.preview}
            alt={file.name}
            className="w-20 h-20 object-cover rounded-lg"
            draggable={false}
          />
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onRemove(file);
          }}
          className="absolute -top-2 -right-2 h-5 w-5 bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 z-50 rounded-full text-sm font-medium hover:cursor-pointer"
        >
          ×
        </button>
      </div>
    );
  }
);

SortableImage.displayName = "SortableImage";

export function AddPostDialog({
  startDate,
  startTime,
  isOpen,
  onClose,
  onSave,
  onDelete,
  post,
}: AddPostDialogProps) {
  const { currentTeamId } = useTeamContext();
  const [isOpenPopover, setIsOpenPopover] = useState(false);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<FileWithStablePreview[]>(
    []
  );
  const [isUploading, setIsUploading] = useState(false);

  const [accountPostPreview, setAccountPostPreview] = useState<
    SocialAccount | undefined
  >(undefined);
  const [reviewer, setReviewer] = useState<string>("");

  // Setup UploadThing hook
  const { startUpload } = useUploadThing("mediaUploader", {
    onClientUploadComplete: (res) => {
      if (!res) return;
      console.log("Upload completed:", res);
      setIsUploading(false);
    },
    onUploadError: (error) => {
      console.error("Error uploading:", error);
      setIsUploading(false);
    },
  });

  // @ts-ignore
  const form = useForm({
    resolver: zodResolver(postSchema),
    defaultValues: {
      content: "",
      mediaUrls: [],
      scheduledAt: startDate || new Date(),
      status: "DRAFT" as PostStatus,
      postAction: PostAction.PUBLISH_NOW,
      socialAccounts: [],
      needsApproval: false,
      approvalWorkflowId: undefined,
    },
  });

  const content = form.watch("content");
  const selectedAccounts = form.watch("socialAccounts");
  const postAction = form.watch("postAction");
  const mediaUrls = form.watch("mediaUrls");

  const { data: socialAccounts } = trpc.onboarding.getSocialAccounts.useQuery(
    {
      teamId: currentTeamId!,
    },
    {
      enabled: !!currentTeamId,
      refetchOnWindowFocus: false,
    }
  );

  const groupedAccounts = socialAccounts?.reduce(
    (acc: Record<string, typeof socialAccounts>, account: SocialAccount) => {
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
      teamId: currentTeamId!,
      page: 1,
      limit: 10,
    },
    {
      enabled: !!currentTeamId,
      refetchOnWindowFocus: false,
      staleTime: 1000 * 30,
    }
  );

  const handleFileSelect = (files: File[] | FileWithStablePreview[]) => {
    // Check if files already have preview & stableId (from MediaUploader)
    if (files.length > 0 && "preview" in files[0]) {
      const newFiles = files as FileWithStablePreview[];
      setSelectedFiles((prev) => [...prev, ...newFiles]);

      // Update mediaUrls in form with full metadata
      const currentMediaUrls = form.getValues("mediaUrls") || [];
      const newMediaItems: MediaItem[] = newFiles.map((file) => ({
        preview: file.preview,
        name: file.name,
        size: file.size,
        type: file.type,
        fileId: file.stableId,
      }));

      form.setValue("mediaUrls", [...currentMediaUrls, ...newMediaItems], {
        shouldDirty: true,
        shouldValidate: true,
      });
      return;
    }

    // Handle files from regular file upload
    const filesWithPreview = (files as File[]).map((file) => {
      const preview = URL.createObjectURL(file);
      const stableId = crypto.randomUUID();
      return Object.assign(file, {
        preview,
        stableId,
      }) as FileWithStablePreview;
    });

    setSelectedFiles((prev) => [...prev, ...filesWithPreview]);

    // Update mediaUrls in form with full metadata
    const currentMediaUrls = form.getValues("mediaUrls") || [];
    const newMediaItems: MediaItem[] = filesWithPreview.map((file) => ({
      preview: file.preview,
      name: file.name,
      size: file.size,
      type: file.type,
      fileId: file.stableId,
    }));

    form.setValue("mediaUrls", [...currentMediaUrls, ...newMediaItems], {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  const removeFile = (fileToRemove: FileWithStablePreview) => {
    URL.revokeObjectURL(fileToRemove.preview);

    // Remove from selectedFiles
    setSelectedFiles((files) =>
      files.filter((file) => file.stableId !== fileToRemove.stableId)
    );

    // Remove from mediaUrls in form
    const currentMediaUrls = form.getValues("mediaUrls") || [];
    const newMediaUrls = currentMediaUrls.filter(
      (item) => item.fileId !== fileToRemove.stableId
    );
    form.setValue("mediaUrls", newMediaUrls, {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setSelectedFiles((files) => {
        const oldIndex = files.findIndex((file) => file.stableId === active.id);
        const newIndex = files.findIndex((file) => file.stableId === over.id);

        // Use arrayMove to reorder the files array
        const newFiles = arrayMove([...files], oldIndex, newIndex);

        // Update mediaUrls in form to match the new order while preserving metadata
        const currentMediaUrls = form.getValues("mediaUrls") || [];
        const newMediaUrls = newFiles.map((file) => {
          // Find existing item or create new one
          const existingItem = currentMediaUrls.find(
            (item) => item.fileId === file.stableId
          );
          if (existingItem) return existingItem;

          // Create new item if not found
          return {
            preview: file.preview,
            name: file.name,
            size: file.size,
            type: file.type,
            fileId: file.stableId,
          };
        });

        form.setValue("mediaUrls", newMediaUrls, {
          shouldDirty: true,
          shouldValidate: true,
        });

        return newFiles;
      });
    }
  };

  // Sync between selectedFiles and mediaUrls if needed
  useEffect(() => {
    // Hanya jalankan jika mediaUrls ada dan selectedFiles kosong
    if (mediaUrls && mediaUrls.length > 0 && selectedFiles.length === 0) {
      // Create file-like objects from mediaItems
      const filesFromMedia = mediaUrls.map((item) => {
        // Create a mock file-like object
        return {
          name: item.name,
          size: item.size,
          type: item.type,
          preview: item.preview,
          stableId: item.fileId || crypto.randomUUID(),
        } as FileWithStablePreview;
      });

      setSelectedFiles(filesFromMedia);
    }
  }, [mediaUrls, selectedFiles.length]);

  const onSubmit = async (values: PostFormValues) => {
    console.log(values);
    try {
      if (!currentTeamId) {
        throw new Error("No team selected");
      }

      // First, upload any media that's still in blob URL format
      const mediaToUpload = values.mediaUrls.filter(
        (media) => media.preview.startsWith("blob:") && !media.uploadedUrl
      );

      // If we have files to upload
      if (mediaToUpload.length > 0) {
        // Show loading state or notification
        console.log("Uploading media files...");
        setIsUploading(true);

        // Extract the actual File objects from selectedFiles that need uploading
        const filesToUpload = mediaToUpload
          .map((media) => {
            return selectedFiles.find((file) => file.stableId === media.fileId);
          })
          .filter(Boolean) as FileWithStablePreview[];

        if (filesToUpload.length > 0) {
          try {
            // Upload files to UploadThing
            const uploadResult = await startUpload(
              filesToUpload.map((f) => f as unknown as File),
              { teamId: currentTeamId }
            );

            if (uploadResult) {
              // Update the media URLs with the uploaded URLs
              const updatedMediaUrls = [...values.mediaUrls];

              // Match the uploaded files with their original entries in mediaUrls
              uploadResult.forEach((result, index) => {
                if (result) {
                  const fileId = filesToUpload[index].stableId;
                  const mediaIndex = updatedMediaUrls.findIndex(
                    (m) => m.fileId === fileId
                  );

                  if (mediaIndex !== -1) {
                    updatedMediaUrls[mediaIndex] = {
                      ...updatedMediaUrls[mediaIndex],
                      uploadedUrl: result.url,
                    };
                  }
                }
              });

              // Update the form values with the uploaded media URLs
              values.mediaUrls = updatedMediaUrls;
            }
          } catch (error) {
            console.error("Error uploading media:", error);
            throw new Error("Failed to upload media");
          } finally {
            setIsUploading(false);
          }
        }
      }

      if (values.postAction === PostAction.REQUEST_REVIEW) {
        const account = values.socialAccounts.map((account) => {
          const [platform, id] = account.split("_");
          return {
            platform,
            id,
          };
        });

        values.socialAccounts = account.map((account) => {
          return `${account.id}`;
        });

        values.needsApproval = true;
        values.approvalWorkflowId = "cmazrs8yb0020vx9edn5yibnt";

        const result = await submitPostWithApproval(values, currentTeamId);
        if (result) {
          onSave?.(result);
          form.reset();
          onClose();
        }
      } else {
        // Create a CalendarPost from the form values
        const calendarPost: CalendarPost = {
          id: post?.id || `temp-${Date.now()}`, // Use existing ID or temp ID
          title:
            values.content.substring(0, 30) +
            (values.content.length > 30 ? "..." : ""),
          description: values.content,
          start: values.scheduledAt,
          end: values.scheduledAt,
        };

        onSave?.(calendarPost);
        form.reset();
        onClose();
      }
    } catch (error) {
      console.error("Error submitting post:", error);
    }
  };

  // Reset reviewer when action changes
  useEffect(() => {
    if (postAction !== PostAction.REQUEST_REVIEW) {
      setReviewer("");
    }
  }, [postAction]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Membersihkan preview URLs saat komponen unmount
  useEffect(() => {
    return () => {
      // Cleanup preview URLs when component unmounts
      selectedFiles.forEach((file) => {
        if (file.preview) {
          URL.revokeObjectURL(file.preview);
        }
      });
    };
  }, []);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="xl:min-w-7xl w-full p-0 max-h-[90vh] overflow-hidden">
        <DialogHeader className="hidden">
          <DialogTitle>Buat Post</DialogTitle>
          <DialogDescription>
            Buat post untuk akun yang dipilih
          </DialogDescription>
        </DialogHeader>

        <div className="block xl:flex gap-4 h-full max-h-[90vh] overflow-hidden pr-2 xl:pr-0">
          <div className="w-full xl:w-7/12 pl-2.5 py-2.5 overflow-y-auto">
            <h1 className="text-2xl font-bold mb-4">
              {post?.id ? "Edit Post" : "Buat Post"}
            </h1>
            <MultiSelect
              className="w-fit"
              placeholder="Pilih Akun"
              variant="secondary"
              animation={2}
              maxCount={5}
              options={accounts}
              value={selectedAccounts}
              onValueChange={(values) => {
                // Update form value
                form.setValue("socialAccounts", values, {
                  shouldDirty: true,
                  shouldValidate: true,
                });

                // Set preview account if it's the first selection or current preview is no longer selected
                if (
                  values.length === 1 ||
                  !values.includes(
                    `${accountPostPreview?.platform}_${accountPostPreview?.id}`
                  )
                ) {
                  const [platform, id] = values[0]?.split("_") || [];
                  const account = socialAccounts?.find(
                    (acc: SocialAccount) =>
                      acc.platform === platform && acc.id === id
                  );
                  if (account) {
                    const a = account;
                    setAccountPostPreview(account);
                  }
                }
              }}
              grouped
            />

            <MediaUploader
              isOpen={isUploadDialogOpen}
              onOpenChange={setIsUploadDialogOpen}
              onFileSelect={handleFileSelect}
            />

            <Form {...form}>
              <form
                id="event-form"
                onSubmit={form.handleSubmit(onSubmit)}
                className="contents"
              >
                <div className="mt-4 border border-input rounded-md p-2 min-h-80 flex flex-col">
                  {/* @ts-ignore */}
                  <FormField
                    control={form.control}
                    name="content"
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
                      </FormItem>
                    )}
                  />

                  <div className="flex flex-col justify-end flex-1">
                    <div className="mt-5">
                      {selectedFiles.length > 0 && (
                        <DndContext
                          sensors={sensors}
                          collisionDetection={closestCenter}
                          onDragEnd={handleDragEnd}
                        >
                          <SortableContext
                            items={selectedFiles.map((f) => f.stableId)}
                            strategy={rectSortingStrategy}
                          >
                            <div className="flex flex-wrap gap-2 aspect-auto">
                              {selectedFiles.map((file, index) => (
                                <SortableImage
                                  key={file.stableId}
                                  file={file}
                                  index={index}
                                  onRemove={removeFile}
                                />
                              ))}
                            </div>
                          </SortableContext>
                        </DndContext>
                      )}
                    </div>

                    <div className="mt-4">
                      <PostToolbar
                        onUploadClick={() => setIsUploadDialogOpen(true)}
                        onMediaSelect={(file) => handleFileSelect([file])}
                        media={mediaData?.items || []}
                        onHashtagSelect={(hashtag) => {
                          // Get current description text
                          const currentDescription = form.getValues("content");
                          // Append hashtag with a space before it if needed
                          const newDescription = currentDescription
                            ? `${currentDescription}${currentDescription.endsWith(" ") ? "" : " "}#${hashtag}`
                            : `#${hashtag}`;
                          // Update the form field
                          form.setValue("content", newDescription, {
                            shouldDirty: true,
                          });
                        }}
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

                    <div
                      className={buttonVariants({
                        className: "pr-0",
                      })}
                    >
                      <button
                        form="event-form"
                        type="submit"
                        className="cursor-pointer"
                        disabled={isUploading}
                      >
                        {isUploading
                          ? "Uploading Media..."
                          : actions.find((a) => a.value === postAction)?.title}
                      </button>
                      <Popover
                        open={isOpenPopover}
                        onOpenChange={setIsOpenPopover}
                      >
                        <PopoverTrigger asChild>
                          <button className="p-2 border-l">
                            <ChevronDown className="w-4 h-4" />
                          </button>
                        </PopoverTrigger>
                        <PopoverContent
                          className="p-0"
                          align="end"
                          side="top"
                          sideOffset={10}
                        >
                          <Command>
                            <CommandList>
                              <CommandGroup>
                                {actions.map((actionItem) => (
                                  <CommandItem
                                    className="justify-between"
                                    key={actionItem.value}
                                    value={actionItem.value}
                                    onSelect={(currentValue) => {
                                      const selectedAction = actions.find(
                                        (a) => a.value === currentValue
                                      )!;
                                      form.setValue(
                                        "postAction",
                                        selectedAction.value,
                                        {
                                          shouldDirty: true,
                                          shouldValidate: true,
                                        }
                                      );
                                      setIsOpenPopover(false);
                                    }}
                                  >
                                    <div>
                                      <p
                                        className={cn({
                                          "font-semibold":
                                            actionItem.value === postAction,
                                        })}
                                      >
                                        {actionItem.title}
                                      </p>
                                      <p
                                        className={cn(
                                          "text-xs italic text-muted-foreground",
                                          {
                                            "font-medium":
                                              actionItem.value === postAction,
                                          }
                                        )}
                                      >
                                        {actionItem.description}
                                      </p>
                                    </div>
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        actionItem.value === postAction
                                          ? "opacity-100"
                                          : "opacity-0"
                                      )}
                                    />
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                </DialogFooter>
              </form>
            </Form>
          </div>

          <div className="w-5/12 bg-[#f7fafc] rounded-r-lg relative hidden xl:block h-full overflow-hidden">
            <div className="w-full p-4 sticky top-0 z-10 bg-[#f7fafc]">
              {selectedAccounts.map((accountValue) => {
                const [platform, id] = accountValue.split("_");
                const account = socialAccounts?.find(
                  (acc: SocialAccount) =>
                    acc.platform === platform && acc.id === id
                );

                if (!account) return null;

                return (
                  <TooltipProvider key={account.id}>
                    <Tooltip>
                      <TooltipTrigger
                        type="button"
                        onClick={() => {
                          setAccountPostPreview(account);
                        }}
                        className={buttonVariants({
                          variant: "outline",
                          className: cn(
                            "!rounded-full !p-2.5 flex-1 mr-1",
                            accountPostPreview?.id === account.id
                              ? "bg-black hover:bg-black/80"
                              : "bg-gray-200 hover:bg-gray-300"
                          ),
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
                );
              })}
            </div>

            <div
              className="container overflow-auto"
              style={{ maxHeight: "calc(90vh - 120px)" }}
            >
              <PostPreview
                description={content || ""}
                selectedFiles={selectedFiles}
                accountPostPreview={accountPostPreview}
              />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
