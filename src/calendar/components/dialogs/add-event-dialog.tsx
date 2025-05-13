"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { useCalendar } from "@/calendar/contexts/calendar-context";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { TimeInput } from "@/components/ui/time-input";
import { SingleDayPicker } from "@/components/ui/single-day-picker";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Form,
  FormField,
  FormLabel,
  FormItem,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectItem,
  SelectContent,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import {
  Facebook,
  Instagram,
  Linkedin,
  PenLine,
  Twitter,
  Wand,
  Sparkles,
  Upload,
  ImagePlus,
  Hash,
  MapPin,
  WandSparkles,
  Image,
  Video,
  FolderOpen,
  UploadCloud,
  PlusCircle,
  X,
  Ellipsis,
  Trash,
  Edit,
} from "lucide-react";
import { eventSchema } from "@/calendar/schemas";

import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarSeparator,
  MenubarShortcut,
  MenubarSubTrigger,
  MenubarSub,
  MenubarTrigger,
  MenubarSubContent,
  MenubarCheckboxItem,
  MenubarRadioGroup,
  MenubarRadioItem,
} from "@/components/ui/menubar";

import type { TimeValue } from "react-aria-components";
import type { TEventFormData } from "@/calendar/schemas";
import { useState, useEffect } from "react";
import { MultiSelect } from "@/components/multi-select";
import { MediaThumbnail } from "@/app/(pages)/media/components/media-thumbnail";
import { trpc } from "@/lib/trpc/client";
import { format } from "date-fns";
import { FileUploadArea } from "@/app/(pages)/schedule-post/components/file-upload-area";
import { useOrganization } from "@/contexts/organization-context";

interface IProps {
  children: React.ReactNode;
  startDate?: Date;
  startTime?: { hour: number; minute: number };
}

interface FileWithPreview extends File {
  preview: string;
}

export function AddEventDialog({ children, startDate, startTime }: IProps) {
  // const { users } = useCalendar();

  const { selectedOrganization } = useOrganization();

  const [isOpen, setIsOpen] = useState(false);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<FileWithPreview[]>([]);
  const form = useForm<TEventFormData>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      title: "",
      description: "",
      startDate: typeof startDate !== "undefined" ? startDate : undefined,
      startTime: typeof startTime !== "undefined" ? startTime : undefined,
    },
  });

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

  const { data: mediaData, isLoading: isLoadingMedia } =
    trpc.media.getAll.useQuery(
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
        staleTime: 1000 * 30, // Cache for 30 seconds
      }
    );

  const onSubmit = (_values: TEventFormData) => {
    // TO DO: Create use-add-event hook
    form.reset();
  };
  const media = mediaData?.items || [];

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter((file) => {
      const isValid = file.type.startsWith("image/");
      const isValidSize = file.size <= 10 * 1024 * 1024; // 10MB
      return isValid && isValidSize;
    });

    const filesWithPreview = validFiles.map((file) =>
      Object.assign(file, {
        preview: URL.createObjectURL(file),
      })
    );

    setSelectedFiles((prev) => [...prev, ...filesWithPreview]);

    setIsUploadDialogOpen(false);
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const files = Array.from(e.dataTransfer.files);
    const validFiles = files.filter((file) => {
      const isValid = file.type.startsWith("image/");
      const isValidSize = file.size <= 10 * 1024 * 1024; // 10MB
      return isValid && isValidSize;
    });

    const filesWithPreview = validFiles.map((file) =>
      Object.assign(file, {
        preview: URL.createObjectURL(file),
      })
    );

    setSelectedFiles((prev) => [...prev, ...filesWithPreview]);
  };

  const removeFile = (fileToRemove: FileWithPreview) => {
    URL.revokeObjectURL(fileToRemove.preview);
    setSelectedFiles((files) => files.filter((file) => file !== fileToRemove));
  };

  // Cleanup previews when component unmounts
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

      <DialogContent className="min-w-7xl">
        <DialogHeader>
          <DialogTitle>Buat Post</DialogTitle>
        </DialogHeader>

        <div className="flex gap-4">
          <div className="w-7/12">
            <MultiSelect
              className="w-fit"
              placeholder="Pilih Akun"
              variant="secondary"
              animation={2}
              maxCount={5}
              options={accounts}
              value={selectedAccounts}
              onValueChange={setSelectedAccounts}
              grouped
            />

            <Dialog
              open={isUploadDialogOpen}
              onOpenChange={setIsUploadDialogOpen}
            >
              <DialogContent className="max-w-5xl min-w-[600px]">
                <DialogHeader>
                  <DialogTitle>Upload Media</DialogTitle>
                  <DialogDescription>
                    Upload media to include in your post. You can upload
                    multiple files at once.
                  </DialogDescription>
                </DialogHeader>
                <div className="mt-4">
                  <div
                    className="border-2 border-dashed border-input rounded-lg p-8 text-center"
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onDrop={handleFileDrop}
                  >
                    <label>
                      <div className="flex flex-col items-center gap-2">
                        <Upload className="h-10 w-10 text-muted-foreground" />
                        <div className="text-sm text-muted-foreground">
                          <span className="font-medium">Click to upload</span>{" "}
                          or drag and drop
                        </div>
                        <div className="text-xs text-muted-foreground">
                          PNG, JPG, GIF up to 10MB
                        </div>
                      </div>
                      <input
                        type="file"
                        className="hidden"
                        multiple
                        accept="image/*"
                        onChange={handleFileSelect}
                      />
                    </label>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <div className="mt-4 border border-input rounded-md p-2 min-h-80 flex flex-col">
              <Textarea
                className="resize-none border-none active:border-none focus-visible:border-none focus-visible:ring-0 shadow-none p-0 min-h-[150px] max-h-[250px]"
                rows={10}
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
                          <DropdownMenu modal={false}>
                            <DropdownMenuTrigger className="absolute cursor-pointer -top-2 -right-2 p-1 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                              <Ellipsis className="h-4 w-4 text-white" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent side="right">
                              <DropdownMenuItem>
                                {" "}
                                <Edit /> Edit Image
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-red-500 hover:!text-red-500"
                                onClick={() => removeFile(file)}
                              >
                                <Trash className="h-4 w-4 text-red-500" />{" "}
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-4">
                  <Menubar className="border-none shadow-none !p-1">
                    <MenubarMenu>
                      <MenubarTrigger>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild className="cursor-pointer">
                              <ImagePlus size={20} />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Add Multmedia</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </MenubarTrigger>
                      <MenubarContent>
                        <MenubarItem
                          onClick={() => setIsUploadDialogOpen(true)}
                        >
                          <Image className="text-black" /> Add Image
                        </MenubarItem>
                        <MenubarItem>
                          <Video className="text-black" /> Add Video
                        </MenubarItem>
                        <MenubarSeparator />
                        <MenubarSub>
                          <MenubarSubTrigger>
                            <FolderOpen size={16} className="mr-2" />
                            Media Library
                          </MenubarSubTrigger>
                          <MenubarSubContent
                            sideOffset={10}
                            className="max-w-[450px] overflow-y-auto mb-10"
                          >
                            <div className="grid grid-cols-3 gap-4">
                              {media.map((item) => (
                                <div
                                  key={item.id}
                                  className={`group relative cursor-pointer rounded-md overflow-hidden border max-w-40`}
                                >
                                  <div className="aspect-square">
                                    <MediaThumbnail item={item} />
                                  </div>
                                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <Button
                                      variant="outline"
                                      size="icon"
                                      className="bg-white/80 hover:bg-white"
                                    >
                                      <PlusCircle size={18} />
                                    </Button>
                                  </div>
                                  <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white p-2">
                                    <div className="text-sm truncate">
                                      {item.name}
                                    </div>
                                    <div className="text-xs opacity-80 flex justify-between">
                                      <span>
                                        {format(
                                          new Date(item.createdAt),
                                          "MMM d, yyyy"
                                        )}
                                      </span>
                                      <span>
                                        {(item.size / 1024 / 1024).toFixed(1)}{" "}
                                        MB
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </MenubarSubContent>
                        </MenubarSub>
                        <MenubarSeparator />
                        <MenubarItem>
                          Print... <MenubarShortcut>⌘P</MenubarShortcut>
                        </MenubarItem>
                      </MenubarContent>
                    </MenubarMenu>
                    <MenubarMenu>
                      <MenubarTrigger>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Hash size={20} />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Add Hashtag</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </MenubarTrigger>
                      <MenubarContent>
                        <MenubarItem>
                          Undo <MenubarShortcut>⌘Z</MenubarShortcut>
                        </MenubarItem>
                        <MenubarItem>
                          Redo <MenubarShortcut>⇧⌘Z</MenubarShortcut>
                        </MenubarItem>
                        <MenubarSeparator />
                        <MenubarSub>
                          <MenubarSubTrigger>Find</MenubarSubTrigger>
                          <MenubarSubContent>
                            <MenubarItem>Search the web</MenubarItem>
                            <MenubarSeparator />
                            <MenubarItem>Find...</MenubarItem>
                            <MenubarItem>Find Next</MenubarItem>
                            <MenubarItem>Find Previous</MenubarItem>
                          </MenubarSubContent>
                        </MenubarSub>
                        <MenubarSeparator />
                        <MenubarItem>Cut</MenubarItem>
                        <MenubarItem>Copy</MenubarItem>
                        <MenubarItem>Paste</MenubarItem>
                      </MenubarContent>
                    </MenubarMenu>
                    <MenubarMenu>
                      <MenubarTrigger>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <MapPin size={20} />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Add Location</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </MenubarTrigger>
                      <MenubarContent>
                        <MenubarCheckboxItem>
                          Always Show Bookmarks Bar
                        </MenubarCheckboxItem>
                        <MenubarCheckboxItem checked>
                          Always Show Full URLs
                        </MenubarCheckboxItem>
                        <MenubarSeparator />
                        <MenubarItem inset>
                          Reload <MenubarShortcut>⌘R</MenubarShortcut>
                        </MenubarItem>
                        <MenubarItem disabled inset>
                          Force Reload <MenubarShortcut>⇧⌘R</MenubarShortcut>
                        </MenubarItem>
                        <MenubarSeparator />
                        <MenubarItem inset>Toggle Fullscreen</MenubarItem>
                        <MenubarSeparator />
                        <MenubarItem inset>Hide Sidebar</MenubarItem>
                      </MenubarContent>
                    </MenubarMenu>
                    <MenubarMenu>
                      <MenubarTrigger>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <WandSparkles size={20} />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Generate Post With AI</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </MenubarTrigger>
                      <MenubarContent>
                        <MenubarRadioGroup value="benoit">
                          <MenubarRadioItem value="andy">Andy</MenubarRadioItem>
                          <MenubarRadioItem value="benoit">
                            Benoit
                          </MenubarRadioItem>
                          <MenubarRadioItem value="Luis">Luis</MenubarRadioItem>
                        </MenubarRadioGroup>
                        <MenubarSeparator />
                        <MenubarItem inset>Edit...</MenubarItem>
                        <MenubarSeparator />
                        <MenubarItem inset>Add Profile...</MenubarItem>
                      </MenubarContent>
                    </MenubarMenu>
                  </Menubar>
                </div>
              </div>
            </div>

            <DialogFooter className="mt-4">
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </DialogClose>

              <Button form="event-form" type="submit">
                Create Event
              </Button>
            </DialogFooter>
          </div>
          <div>
            <div className="w-full">jajsha</div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
