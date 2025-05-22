#!/bin/bash
# Script untuk memperbaiki kasus spesifik penggunaan generalUtils di sidebar dan chat

echo "Memperbaiki kasus spesifik penggunaan generalUtils..."

# Backup files
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="backup_specific_files_${TIMESTAMP}"
mkdir -p $BACKUP_DIR
cp -r src/components/ui/sidebar.tsx src/components/ui/chat.tsx src/app/onboarding/page.tsx $BACKUP_DIR/
echo "Backup disimpan di $BACKUP_DIR"

# Perbaiki file src/components/ui/sidebar.tsx
echo "Memperbaiki file src/components/ui/sidebar.tsx..."
sed -i '' 's|const { cn, mergeButtonRefs } = generalUtils;|import { cn, mergeButtonRefs } from "@/lib/utils";|g' src/components/ui/sidebar.tsx

# Perbaiki file src/components/ui/chat.tsx
echo "Memperbaiki file src/components/ui/chat.tsx..."
sed -i '' 's|import { generalUtils } from "~/utils";|import { cn } from "@/lib/utils";|g' src/components/ui/chat.tsx
sed -i '' 's|const { cn } = generalUtils;||g' src/components/ui/chat.tsx

# Perbaiki file src/app/onboarding/page.tsx
echo "Memperbaiki file src/app/onboarding/page.tsx..."
sed -i '' 's|import { generalUtils } from "~/utils";|import { cn } from "@/lib/utils";|g' src/app/onboarding/page.tsx
sed -i '' 's|const { cn } = generalUtils;||g' src/app/onboarding/page.tsx

echo "Selesai! Kasus spesifik penggunaan generalUtils telah diperbaiki." 