#!/bin/bash
# Script untuk memperbaiki import generalUtils yang masih tersisa di seluruh codebase

echo "Memperbaiki import generalUtils yang masih tersisa..."

# Backup files
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="backup_remaining_imports_${TIMESTAMP}"
mkdir -p $BACKUP_DIR
cp -r src $BACKUP_DIR/
echo "Backup disimpan di $BACKUP_DIR"

# Perbaiki import generalUtils
echo "Mengupdate import generalUtils di seluruh codebase..."

# Pola: import { generalUtils } from "@/lib/utils" -> import { cn } from "@/lib/utils"
find src -type f -name "*.tsx" -o -name "*.ts" | xargs sed -i '' 's|import { generalUtils } from "@/lib/utils"|import { cn } from "@/lib/utils"|g'
find src -type f -name "*.tsx" -o -name "*.ts" | xargs sed -i '' 's|const { cn } = generalUtils;||g'

# Cari kasus penggunaan lain dari generalUtils
echo "Mencari penggunaan lain dari generalUtils..."
grep -r "generalUtils" src --include="*.tsx" --include="*.ts"

echo "Selesai! Import generalUtils yang masih tersisa telah diperbaiki."
echo "Periksa output di atas untuk kasus penggunaan lain dari generalUtils yang mungkin masih tersisa." 