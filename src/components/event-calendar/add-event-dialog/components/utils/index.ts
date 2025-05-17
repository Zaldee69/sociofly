import { Instagram, Twitter, Facebook } from "lucide-react";
import type { SocialPlatform } from "@prisma/client";

export function getSocialIcon(platform: SocialPlatform) {
  return platform === "INSTAGRAM"
    ? Instagram
    : platform === "TWITTER"
      ? Twitter
      : platform === "FACEBOOK"
        ? Facebook
        : undefined;
}

export function formatHashtags(input: string) {
  const escaped = input
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br />");

  return escaped.replace(/(#\w+)/g, `<span class="hashtag">$1</span>`);
}

export function validateFile(file: File) {
  const isValid = file.type.startsWith("image/");
  const isValidSize = file.size <= 10 * 1024 * 1024; // 10MB
  return isValid && isValidSize;
}

export function createFileWithPreview(file: File) {
  return Object.assign(file, {
    preview: URL.createObjectURL(file),
  });
}
