import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAuthStore } from "@/lib/stores/use-auth-store";
import { useFiles } from "../contexts/file-context";
import { z } from "zod";

interface PostResponse {
  success: boolean;
  post_id: string;
  error?: string;
}

const scheduleFormSchema = z.object({
  content: z.string().min(1, "Content is required").max(2200, "Content must be less than 2200 characters"),
  date: z.date({
    required_error: "Date is required",
    invalid_type_error: "Invalid date",
  }),
  time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format"),
  selectedAccounts: z.array(z.string()).min(1, "Please select at least one account"),
});

type ScheduleFormData = z.infer<typeof scheduleFormSchema>;

export function useScheduleForm() {
  const [content, setContent] = useState("");
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [time, setTime] = useState("12:00");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<PostResponse | null>(null);
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const [validationErrors, setValidationErrors] = useState<Partial<Record<keyof ScheduleFormData, string>>>({});
  const client = useAuthStore();

  const { files } = useFiles();

  const validateForm = (): boolean => {
    try {
      scheduleFormSchema.parse({
        content,
        date,
        time,
        selectedAccounts,
      });
      setValidationErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors: Partial<Record<keyof ScheduleFormData, string>> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            errors[err.path[0] as keyof ScheduleFormData] = err.message;
          }
        });
        setValidationErrors(errors);
      }
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    const [hours, minutes] = time.split(":").map(Number);
    const scheduledDate = new Date(date!);
    scheduledDate.setHours(hours, minutes);

    // Convert to Jakarta time (UTC+7)
    const jakartaDate = new Date(scheduledDate.getTime() + (7 * 60 * 60 * 1000));

    console.log(files);

    try {
      const response = await fetch("/api/schedule/facebook", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: client.user?.id,
          content,
          scheduled_time: jakartaDate.toISOString(),
          media_ids: files.map((file) => file.id),
          platforms: selectedAccounts,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setData(data);
        toast.success("Post scheduled successfully");
      } else {
        console.log(data);
        setError(data.error);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    content,
    setContent,
    date,
    setDate,
    time,
    setTime,
    isSubmitting,
    handleSubmit,
    error,
    data,
    validationErrors,
    selectedAccounts,
    setSelectedAccounts,
  };
} 