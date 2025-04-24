import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function useScheduleForm() {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [time, setTime] = useState("12:00");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!content.trim()) {
      toast.error("Please add content to your post");
      return;
    }

    if (!date) {
      toast.error("Please select a date for your post");
      return;
    }

    setIsSubmitting(true);

    const [hours, minutes] = time.split(":").map(Number);
    const scheduledDate = new Date(date);
    scheduledDate.setHours(hours, minutes);

    setTimeout(() => {
      setIsSubmitting(false);
      toast.success("Post scheduled successfully!");
      router.push("/dashboard");
    }, 1000);
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
  };
} 