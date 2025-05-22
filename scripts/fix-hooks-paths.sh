#!/bin/bash
# Script untuk memperbaiki import hooks dari @/hooks

echo "Memperbaiki import hooks dari @/hooks..."

# Backup files
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="backup_hooks_paths_${TIMESTAMP}"
mkdir -p $BACKUP_DIR
cp -r src $BACKUP_DIR/
echo "Backup disimpan di $BACKUP_DIR"

# @/hooks/use-permissions menjadi ~/server/permissions/use-permissions
find src -type f -name "*.tsx" -o -name "*.ts" | xargs sed -i '' 's|@/hooks/use-permissions|~/server/permissions/use-permissions|g'

# @/hooks menjadi ~/features/shared/hooks
find src -type f -name "*.tsx" -o -name "*.ts" | xargs sed -i '' 's|@/hooks|~/features/shared/hooks|g'

# Mencari semua komponen yang masih menggunakan pattern lama
REMAINING_PATHS=$(grep -r "@/hooks" src/ --include="*.tsx" --include="*.ts" | wc -l | xargs)
if [ "$REMAINING_PATHS" -gt 0 ]; then
  echo "⚠️ Peringatan: Masih ada $REMAINING_PATHS file yang menggunakan @/hooks"
  echo "File-file tersebut:"
  grep -r "@/hooks" src/ --include="*.tsx" --include="*.ts" | head -10
  echo "... dan lainnya. Periksa kembali secara manual."
else
  echo "✓ Semua import hooks berhasil diperbaiki"
fi

echo "Selesai! Import hooks dari @/hooks telah diperbaiki."