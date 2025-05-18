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

import { useOrganization } from "@/contexts/organization-context";
import { trpc } from "@/lib/trpc/client";

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

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

import { MediaUploader } from "./components/media-uploader";
import { PostPreview } from "./components/post-preview";
import { PostToolbar } from "./components/post-toolbar";
import type { AddPostDialogProps, SocialAccount } from "./types";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { eventSchema } from "./schema";

interface FileWithStablePreview extends File {
  preview: string;
  stableId: string;
}

interface TActions {
  value: string;
  title: string;
  description: string;
}

const actions: TActions[] = [
  {
    value: "post_now",
    title: "Publish Sekarang",
    description: "Buat postingan dan publish sekarang",
  },
  {
    value: "schedule",
    title: "Jadwalkan",
    description: "Buat postingan dan jadwalkan untuk publish nanti",
  },
  {
    value: "save_as_draft",
    title: "Simpan Sebagai Draft",
    description: "Buat postingan dan simpan sebagai draft",
  },
  {
    value: "request_review",
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
  const { selectedOrganization } = useOrganization();
  const [isOpenPopover, setIsOpenPopover] = useState(false);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [selectedAccounts, setSelectedAccounts] = useState<SocialAccount[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<FileWithStablePreview[]>(
    []
  );
  const [accountPostPreview, setAccountPostPreview] = useState(
    selectedAccounts[0]
  );
  const [action, setAction] = useState<TActions>(actions[0]);

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
    console.log(_values);
    form.reset();
  };

  const handleFileSelect = (files: File[] | FileWithStablePreview[]) => {
    // Check if files already have preview & stableId (from MediaUploader)
    if (files.length > 0 && "preview" in files[0]) {
      setSelectedFiles((prev) => [
        ...prev,
        ...(files as FileWithStablePreview[]),
      ]);
      return;
    }

    // Handle files from regular file upload
    const filesWithPreview = (files as File[]).map((file) => {
      const preview = URL.createObjectURL(file);
      return Object.assign(file, {
        preview,
        stableId: crypto.randomUUID(),
      }) as FileWithStablePreview;
    });
    setSelectedFiles((prev) => [...prev, ...filesWithPreview]);
  };

  const removeFile = (fileToRemove: FileWithStablePreview) => {
    console.log(fileToRemove);
    URL.revokeObjectURL(fileToRemove.preview);
    setSelectedFiles((files) =>
      files.filter((file) => file.stableId !== fileToRemove.stableId)
    );
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setSelectedFiles((files) => {
        const oldIndex = files.findIndex((file) => file.stableId === active.id);
        const newIndex = files.findIndex((file) => file.stableId === over.id);

        // Use spread to create a new array but maintain file references
        return arrayMove([...files], oldIndex, newIndex);
      });
    }
  };

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

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

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
              value={selectedAccounts.map((acc) => `${acc.platform}_${acc.id}`)}
              onValueChange={(values) => {
                const selected = values
                  .map((value) => {
                    const [platform, id] = value.split("_");
                    return socialAccounts?.find(
                      (acc) => acc.platform === platform && acc.id === id
                    );
                  })
                  .filter((acc): acc is NonNullable<typeof acc> => acc != null);
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

            <Form {...form}>
              <form
                id="event-form"
                onSubmit={form.handleSubmit(onSubmit)}
                className="contents"
              >
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
                          const currentDescription =
                            form.getValues("description");
                          // Append hashtag with a space before it if needed
                          const newDescription = currentDescription
                            ? `${currentDescription}${currentDescription.endsWith(" ") ? "" : " "}#${hashtag}`
                            : `#${hashtag}`;
                          // Update the form field
                          form.setValue("description", newDescription, {
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
                      >
                        {actions.find((a) => a.value === action.value)?.title}
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
                                      setAction(
                                        actions.find(
                                          (a) => a.value === currentValue
                                        )!
                                      );
                                      setIsOpenPopover(false);
                                    }}
                                  >
                                    <div>
                                      <p
                                        className={cn({
                                          "font-semibold":
                                            actionItem.value === action.value,
                                        })}
                                      >
                                        {actionItem.title}
                                      </p>
                                      <p
                                        className={cn(
                                          "text-xs italic text-muted-foreground",
                                          {
                                            "font-medium":
                                              actionItem.value === action.value,
                                          }
                                        )}
                                      >
                                        {actionItem.description}
                                      </p>
                                    </div>
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        actionItem.value === action.value
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
              {selectedAccounts.map((account) => (
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
              ))}
            </div>

            <div
              className="container overflow-auto"
              style={{ maxHeight: "calc(90vh - 120px)" }}
            >
              <PostPreview
                description={description || ""}
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
