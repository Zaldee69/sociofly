import { SocialPlatform } from "@prisma/client";
import { TimeValue } from "react-aria-components";

export interface AddEventDialogProps {
  children: React.ReactNode;
  startDate?: Date;
  startTime?: { hour: number; minute: number };
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
