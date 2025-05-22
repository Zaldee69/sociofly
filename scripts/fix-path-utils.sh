#!/bin/bash
# Script untuk memperbaiki import path di UI components

echo "Memperbaiki import path di UI components..."

# Backup files
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="backup_path_utils_${TIMESTAMP}"
mkdir -p $BACKUP_DIR
cp -r src/components/ui $BACKUP_DIR/
echo "Backup disimpan di $BACKUP_DIR"

# Perbaiki import path di komponen UI
echo "Mengupdate import path di komponen UI..."

# Ganti @/lib/utils dengan ../../../lib/utils
find src/components/ui -type f -name "*.tsx" | xargs sed -i '' 's|import { cn } from "@/lib/utils"|import { cn } from "../../../lib/utils"|g'

echo "Selesai! Import path di komponen UI telah diperbaiki." 