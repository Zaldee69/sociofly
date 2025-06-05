import { CalendarProvider } from "@/features/scheduling/components/post-calendar/calendar-context";
import { FileProvider } from "@/components/file-management/file-context";

interface CalendarLayoutProps {
  children: React.ReactNode;
}

export default function CalendarLayout({ children }: CalendarLayoutProps) {
  return (
    <FileProvider>
      <CalendarProvider>
        <div className="mx-auto flex w-full flex-col gap-4">{children}</div>
      </CalendarProvider>
    </FileProvider>
  );
}
