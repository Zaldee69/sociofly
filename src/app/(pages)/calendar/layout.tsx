import { CalendarProvider } from "@/features/scheduling/components/post-calendar/calendar-context";
import { FileProvider } from "../schedule-post/contexts/file-context";

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <FileProvider>
      <CalendarProvider>
        <div className="mx-auto flex w-full flex-col gap-4">{children}</div>
      </CalendarProvider>
    </FileProvider>
  );
}
