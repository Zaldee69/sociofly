import { Check, ChevronDown } from "lucide-react";
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

interface TAction {
  value: PostAction;
  title: string;
  description: string;
}

const actions: TAction[] = [
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

interface PostActionSelectorProps {
  currentAction: PostAction;
  isUploading: boolean;
  onActionChange: (action: PostAction) => void;
}

export function PostActionSelector({
  currentAction,
  isUploading,
  onActionChange,
}: PostActionSelectorProps) {
  const [isOpenPopover, setIsOpenPopover] = useState(false);

  return (
    <div className={buttonVariants({ className: "pr-0" })}>
      <button
        form="event-form"
        type="submit"
        className="cursor-pointer"
        disabled={isUploading}
      >
        {isUploading
          ? "Uploading Media..."
          : actions.find((a) => a.value === currentAction)?.title}
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
                    onSelect={(currentValue) => {
                      const selectedAction = actions.find(
                        (a) => a.value === currentValue
                      )!;
                      onActionChange(selectedAction.value);
                      setIsOpenPopover(false);
                    }}
                  >
                    <div>
                      <p
                        className={cn({
                          "font-semibold": actionItem.value === currentAction,
                        })}
                      >
                        {actionItem.title}
                      </p>
                      <p
                        className={cn("text-xs italic text-muted-foreground", {
                          "font-medium": actionItem.value === currentAction,
                        })}
                      >
                        {actionItem.description}
                      </p>
                    </div>
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        actionItem.value === currentAction
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
