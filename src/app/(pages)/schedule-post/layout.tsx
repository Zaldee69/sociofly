import { FileProvider } from "./contexts/file-context";

export default function SchedulePostLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <FileProvider>{children}</FileProvider>;
}
