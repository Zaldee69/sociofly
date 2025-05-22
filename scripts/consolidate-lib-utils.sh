#!/bin/bash
# Script untuk mengkonsolidasikan utilitas yang tersebar di src/lib

echo "Mengkonsolidasikan utilitas yang tersebar di src/lib..."

# Backup files
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="backup_lib_utils_consolidation_${TIMESTAMP}"
mkdir -p $BACKUP_DIR
cp -r src $BACKUP_DIR/
echo "Backup disimpan di $BACKUP_DIR"

# 1. Konsolidasi lib/utils.ts dan lib/audio-utils.ts ke lib/utils/
echo "Konsolidasi utilitas di src/lib ke src/lib/utils/..."

# Buat file yang berisi fungsi dari lib/utils.ts ke lib/utils/general-lib.ts
cat > src/lib/utils/general-lib.ts << 'EOF'
/**
 * General utilities from lib/utils.ts
 */
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
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

export function getBaseUrl() {
  if (typeof window !== "undefined") {
    // browser should use relative path
    return "";
  }

  if (process.env.VERCEL_URL) {
    // reference for vercel.com
    return `https://${process.env.VERCEL_URL}`;
  }

  if (process.env.RENDER_INTERNAL_HOSTNAME) {
    // reference for render.com
    return `http://${process.env.RENDER_INTERNAL_HOSTNAME}:${process.env.PORT}`;
  }

  // assume localhost
  return `http://localhost:${process.env.PORT ?? 3000}`;
}

export function mergeButtonRefs<T extends HTMLButtonElement>(
  refs: Array<React.MutableRefObject<T> | React.LegacyRef<T>>
): React.RefCallback<T> {
  return (value) => {
    for (const ref of refs) {
      if (typeof ref === "function") {
        ref(value);
      } else if (ref != null) {
        (ref as React.MutableRefObject<T | null>).current = value;
      }
    }
  };
}
EOF

# 2. Perbarui file index.ts untuk mengekspor fungsi dari general-lib.ts
echo "Memperbarui file index.ts untuk mengekspor fungsi dari general-lib.ts..."

cat > src/lib/utils/index.ts << 'EOF'
/**
 * Utils Barrel File
 * Export utility functions by category for easier imports
 */

import * as dateUtils from "./date";
import * as formatUtils from "./formatting";
import * as generalUtils from "./general";
import * as audioUtils from "./audio";

// Reexport utility functions from general-lib.ts
export { 
  cn, fileToBase64, formatFileSize, getBaseUrl, mergeButtonRefs 
} from "./general-lib";

export { 
  dateUtils, formatUtils, generalUtils, audioUtils
};

// Individual exports for selective imports
export * from "./date";
export * from "./formatting";
export * from "./general";
export * from "./audio";
export * from "./extract-hashtags";
export * from "./rate-limit";
export * from "./uploadthing";
export * from "./facebook";
EOF

# 3. Perbarui import untuk lib/utils.ts dan lib/audio-utils.ts
echo "Memperbarui import untuk lib/utils.ts dan lib/audio-utils.ts..."

# Perbarui import dari lib/utils.ts
find src -type f -name "*.tsx" -o -name "*.ts" | xargs sed -i '' 's|import { cn } from "@/lib/utils"|import { cn } from "@/lib/utils"|g'
find src -type f -name "*.tsx" -o -name "*.ts" | xargs sed -i '' 's|import { fileToBase64 } from "@/lib/utils"|import { fileToBase64 } from "@/lib/utils"|g'
find src -type f -name "*.tsx" -o -name "*.ts" | xargs sed -i '' 's|import { formatFileSize } from "@/lib/utils"|import { formatFileSize } from "@/lib/utils"|g'
find src -type f -name "*.tsx" -o -name "*.ts" | xargs sed -i '' 's|import { getBaseUrl } from "@/lib/utils"|import { getBaseUrl } from "@/lib/utils"|g'
find src -type f -name "*.tsx" -o -name "*.ts" | xargs sed -i '' 's|import { mergeButtonRefs } from "@/lib/utils"|import { mergeButtonRefs } from "@/lib/utils"|g'

# Perbarui import dari lib/audio-utils.ts
find src -type f -name "*.tsx" -o -name "*.ts" | xargs sed -i '' 's|import { recordAudio } from "@/lib/audio-utils"|import { recordAudio } from "@/lib/utils/audio"|g'

echo "Selesai! Utilitas di src/lib telah dikonsolidasikan di src/lib/utils/."
echo "Perhatian: File asli (lib/utils.ts dan lib/audio-utils.ts) tidak dihapus untuk keamanan. Periksa dengan seksama hasilnya dan hapus file lama jika sudah sesuai." 