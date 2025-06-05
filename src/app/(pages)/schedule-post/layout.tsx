import { FileProvider } from "@/components/file-management/file-context";

interface SchedulePostLayoutProps {
  children: React.ReactNode;
}

export default function SchedulePostLayout({
  children,
}: SchedulePostLayoutProps) {
  return <FileProvider>{children}</FileProvider>;
}
