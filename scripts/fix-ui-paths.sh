#!/bin/bash
# Script untuk memperbaiki path import komponen UI dari @/components/ui menjadi ~/components/ui

echo "Memperbaiki import path komponen UI..."

# Backup files
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="backup_ui_paths_${TIMESTAMP}"
mkdir -p $BACKUP_DIR
cp -r src $BACKUP_DIR/
echo "Backup disimpan di $BACKUP_DIR"

# Perbaiki import @/components/ui menjadi ~/components/ui
echo "Mengganti @/components/ui menjadi ~/components/ui..."
find src -type f -name "*.tsx" | xargs sed -i '' 's|@/components/ui|~/components/ui|g'

# Mencari semua komponen yang masih menggunakan pattern lama
REMAINING_PATHS=$(grep -r "@/components/ui" src/ --include="*.tsx" | wc -l | xargs)
if [ "$REMAINING_PATHS" -gt 0 ]; then
  echo "⚠️ Peringatan: Masih ada $REMAINING_PATHS file yang menggunakan @/components/ui"
  echo "File-file tersebut:"
  grep -r "@/components/ui" src/ --include="*.tsx" | head -10
  echo "... dan lainnya. Periksa kembali secara manual."
else
  echo "✓ Semua import @/components/ui berhasil diperbaiki"
fi

echo "Selesai! Path import komponen UI telah diperbaiki." 