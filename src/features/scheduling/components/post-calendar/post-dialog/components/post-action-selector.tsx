import { Check, ChevronDown, RefreshCw } from "lucide-react";
import { useState } from "react";
import { buttonVariants } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { PostAction } from "../schema";
import { usePostApprovalStatus } from "./approval-status";

interface TAction {
  value: PostAction | "RESUBMIT";
  title: string;
  description: string;
}

const normalActions: TAction[] = [
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

const resubmitAction: TAction = {
  value: "RESUBMIT",
  title: "Resubmit for Review",
  description: "Resubmit this post for review from rejection stage",
};

interface PostActionSelectorProps {
  currentAction: PostAction;
  isUploading: boolean;
  onActionChange: (action: PostAction) => void;
  postId?: string; // Add postId to detect rejection status
}

export function PostActionSelector({
  currentAction,
  isUploading,
  onActionChange,
  postId,
}: PostActionSelectorProps) {
  const [isOpenPopover, setIsOpenPopover] = useState(false);

  // Check if post is rejected
  const { isRejected } = usePostApprovalStatus(postId || "");

  // If post is rejected, show resubmit action as primary
  const actions = isRejected
    ? [resubmitAction, ...normalActions]
    : normalActions;
  const defaultAction = isRejected
    ? resubmitAction
    : actions.find((a) => a.value === currentAction);

  const handleActionSelect = (actionValue: string) => {
    if (actionValue === "RESUBMIT") {
      // For resubmit, we'll use REQUEST_REVIEW action but the submit handler will detect rejection
      onActionChange(PostAction.REQUEST_REVIEW);
    } else {
      onActionChange(actionValue as PostAction);
    }
    setIsOpenPopover(false);
  };

  return (
    <div className={buttonVariants({ className: "pr-0" })}>
      <button
        form="event-form"
        type="submit"
        className="cursor-pointer flex items-center gap-2"
        disabled={isUploading}
      >
        {isRejected && <RefreshCw className="w-4 h-4" />}
        {isUploading
          ? "Uploading Media..."
          : isRejected
            ? resubmitAction.title
            : defaultAction?.title}
      </button>
      <Popover open={isOpenPopover} onOpenChange={setIsOpenPopover}>
        <PopoverTrigger asChild>
          <button className="p-2 border-l">
            <ChevronDown className="w-4 h-4" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="p-0" align="end" side="top" sideOffset={10}>
          <Command>
            <CommandList>
              <CommandGroup>
                {actions.map((actionItem) => (
                  <CommandItem
                    className="justify-between"
                    key={actionItem.value}
                    value={actionItem.value}
                    onSelect={handleActionSelect}
                  >
                    <div className="flex items-center gap-2">
                      {actionItem.value === "RESUBMIT" && (
                        <RefreshCw className="w-4 h-4" />
                      )}
                      <div>
                        <p
                          className={cn({
                            "font-semibold":
                              (isRejected && actionItem.value === "RESUBMIT") ||
                              (!isRejected &&
                                actionItem.value === currentAction),
                          })}
                        >
                          {actionItem.title}
                        </p>
                        <p
                          className={cn(
                            "text-xs italic text-muted-foreground",
                            {
                              "font-medium":
                                (isRejected &&
                                  actionItem.value === "RESUBMIT") ||
                                (!isRejected &&
                                  actionItem.value === currentAction),
                            }
                          )}
                        >
                          {actionItem.description}
                        </p>
                      </div>
                    </div>
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        (isRejected && actionItem.value === "RESUBMIT") ||
                          (!isRejected && actionItem.value === currentAction)
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
  );
}
