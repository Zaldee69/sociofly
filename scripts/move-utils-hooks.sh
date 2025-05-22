#!/bin/bash
# Script untuk memindahkan hooks dari utils/hooks ke lib/hooks

echo "Memindahkan hooks dari utils/hooks ke lib/hooks..."

# Backup files
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="backup_move_hooks_${TIMESTAMP}"
mkdir -p $BACKUP_DIR
cp -r src $BACKUP_DIR/
echo "Backup disimpan di $BACKUP_DIR"

# 1. Salin semua file hooks dari utils/hooks ke lib/hooks
cp src/utils/hooks/use-*.ts src/lib/hooks/
echo "File hooks disalin ke src/lib/hooks/"

# 2. Perbarui file index.ts di lib/hooks untuk mengekspor semua hooks
echo "Memperbarui file index.ts di lib/hooks..."

# Buat file index.ts yang baru di lib/hooks
cat > src/lib/hooks/index.ts << 'EOF'
/**
 * Hooks Barrel File
 * Re-export all hooks for easier imports
 */

// Former lib/hooks exports
export * from "./use-permissions";
export * from "./use-teams";
export * from "./use-audio-recording";

// Moved from utils/hooks
export * from "./use-autosize-textarea";
export * from "./use-auto-scroll";
export * from "./use-copy-to-clipboard";
export * from "./use-keyboard-shortcut";
export * from "./use-mobile";

EOF

# 3. Perbarui semua import dari utils/hooks ke lib/hooks
echo "Memperbarui import paths..."

# Pola 1: import { useXxx } from "@/utils/hooks";
find src -type f -name "*.tsx" -o -name "*.ts" | xargs sed -i '' 's|import { useIsMobile } from "@/utils/hooks"|import { useIsMobile } from "@/lib/hooks"|g'
find src -type f -name "*.tsx" -o -name "*.ts" | xargs sed -i '' 's|import { useAutoSizeTextarea } from "@/utils/hooks"|import { useAutoSizeTextarea } from "@/lib/hooks"|g'
find src -type f -name "*.tsx" -o -name "*.ts" | xargs sed -i '' 's|import { useAutoScroll } from "@/utils/hooks"|import { useAutoScroll } from "@/lib/hooks"|g'
find src -type f -name "*.tsx" -o -name "*.ts" | xargs sed -i '' 's|import { useCopyToClipboard } from "@/utils/hooks"|import { useCopyToClipboard } from "@/lib/hooks"|g'
find src -type f -name "*.tsx" -o -name "*.ts" | xargs sed -i '' 's|import { useKeyboardShortcut } from "@/utils/hooks"|import { useKeyboardShortcut } from "@/lib/hooks"|g'

# Pola 2: import { ... } from "@/utils/hooks/use-xxx";
find src -type f -name "*.tsx" -o -name "*.ts" | xargs sed -i '' 's|import { useIsMobile } from "@/utils/hooks/use-mobile"|import { useIsMobile } from "@/lib/hooks"|g'
find src -type f -name "*.tsx" -o -name "*.ts" | xargs sed -i '' 's|import { useAutoSizeTextarea } from "@/utils/hooks/use-autosize-textarea"|import { useAutoSizeTextarea } from "@/lib/hooks"|g'
find src -type f -name "*.tsx" -o -name "*.ts" | xargs sed -i '' 's|import { useAutoScroll } from "@/utils/hooks/use-auto-scroll"|import { useAutoScroll } from "@/lib/hooks"|g'
find src -type f -name "*.tsx" -o -name "*.ts" | xargs sed -i '' 's|import { useCopyToClipboard } from "@/utils/hooks/use-copy-to-clipboard"|import { useCopyToClipboard } from "@/lib/hooks"|g'
find src -type f -name "*.tsx" -o -name "*.ts" | xargs sed -i '' 's|import { useKeyboardShortcut } from "@/utils/hooks/use-keyboard-shortcut"|import { useKeyboardShortcut } from "@/lib/hooks"|g'

echo "Selesai! Hooks sudah dipindahkan dan import telah diperbarui."
echo "Jika semua berjalan dengan baik, Anda dapat menghapus direktori src/utils/hooks dengan menjalankan: rm -rf src/utils/hooks" 