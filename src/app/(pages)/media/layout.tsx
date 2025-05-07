import { FileProvider } from "../schedule-post/contexts/file-context";

export default function MediaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <FileProvider>{children}</FileProvider>;
}
