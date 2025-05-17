import { SocialPlatform } from "@prisma/client";
import { TimeValue } from "react-aria-components";
import { CalendarEvent } from "../../types";

export interface AddEventDialogProps {
  event: CalendarEvent | null;
  startDate?: Date;
  startTime?: { hour: number; minute: number };
  isOpen: boolean;
  onClose: () => void;
  onSave: (event: CalendarEvent) => void;
  onDelete: (eventId: string) => void;
}

export interface FileWithPreview extends File {
  preview: string;
}

export interface SocialAccount {
  platform: SocialPlatform;
  name: string | null;
  profilePicture: string | null;
  id: string;
}

export interface SocialAccountGroup {
  label: string;
  value: string;
  icon: any;
  group: boolean;
  children: {
    label: string;
    value: string;
    icon: any;
    profile_picture_url: string;
  }[];
}

export interface FileWithPreview extends File {
  preview: string;
}

export interface FileWithStablePreview extends FileWithPreview {
  stableId: string;
}
