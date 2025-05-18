import { FileProvider } from "../schedule-post/contexts/file-context";
import { CalendarProvider } from "@/components/post-calendar/calendar-context";

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
