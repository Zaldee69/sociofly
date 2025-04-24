import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result?.toString() || "");
  });
};

export function formatFileSize(size: number) {
  const fSExt = ["Bytes", "KB", "MB", "GB"];
  let i = 0;

  while (size > 900) {
    size /= 1024;
    i++;
  }
  if (i > 1) {
    return `${size.toFixed(1)} ${fSExt[i]}`;
  } else {
    return `${Math.round(size)} ${fSExt[i]}`;
  }
}
