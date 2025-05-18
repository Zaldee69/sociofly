import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { trpc } from "@/lib/trpc/client";
import type { FileWithPreview, SocialAccount } from "../types";
import { eventSchema } from "../schema";

export function useAddEventDialog(
  startDate?: Date,
  startTime?: { hour: number; minute: number }
) {
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

  const { data: socialAccounts } = trpc.onboarding.getSocialAccounts.useQuery();

  const handleFileSelect = (files: FileWithPreview[]) => {
    setSelectedFiles((prev) => [...prev, ...files]);
  };

  const removeFile = (fileToRemove: FileWithPreview) => {
    URL.revokeObjectURL(fileToRemove.preview);
    setSelectedFiles((files) => files.filter((file) => file !== fileToRemove));
  };

  const onSubmit = (_values: any) => {
    form.reset();
  };

  useEffect(() => {
    return () => {
      selectedFiles.forEach((file) => {
        URL.revokeObjectURL(file.preview);
      });
    };
  }, [selectedFiles]);

  return {
    form,
    isOpen,
    setIsOpen,
    isUploadDialogOpen,
    setIsUploadDialogOpen,
    selectedAccounts,
    setSelectedAccounts,
    selectedFiles,
    accountPostPreview,
    setAccountPostPreview,
    socialAccounts,
    handleFileSelect,
    removeFile,
    onSubmit,
    resetForm: form.reset,
  };
}

export function useSocialAccounts() {
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

  return {
    socialAccounts,
    groupedAccounts,
  };
}
