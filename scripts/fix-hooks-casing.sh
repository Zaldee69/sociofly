#!/bin/bash
# Script untuk memperbaiki import hooks dengan casing yang berbeda

echo "Memperbaiki import hooks dengan casing yang berbeda..."

# Backup files
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="backup_hooks_casing_${TIMESTAMP}"
mkdir -p $BACKUP_DIR
cp -r src $BACKUP_DIR/
echo "Backup disimpan di $BACKUP_DIR"

# Perbaiki import hooks dengan casing yang berbeda
echo "Mengupdate import hooks..."

# Perbaiki import useAutosizeTextArea dengan casing yang berbeda
find src -type f -name "*.tsx" -o -name "*.ts" | xargs sed -i '' 's|import { useAutosizeTextArea } from "@/utils/hooks"|import { useAutoSizeTextarea } from "@/lib/hooks"|g'

# Perbaiki sekaligus import lain dari utils/hooks yang masih tersisa
find src -type f -name "*.tsx" -o -name "*.ts" | xargs sed -i '' 's|from "@/utils/hooks"|from "@/lib/hooks"|g'

echo "Selesai! Import hooks dengan casing yang berbeda telah diperbaiki." 