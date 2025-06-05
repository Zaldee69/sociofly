import { FileProvider } from "@/components/file-management/file-context";

interface MediaLayoutProps {
  children: React.ReactNode;
}

export default function MediaLayout({ children }: MediaLayoutProps) {
  return <FileProvider>{children}</FileProvider>;
}
