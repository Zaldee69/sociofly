#!/bin/bash
# Script untuk memperbaiki path import dalam direktori server

echo "Memperbaiki import path dalam direktori server..."

# Backup files
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="backup_server_imports_${TIMESTAMP}"
mkdir -p $BACKUP_DIR
cp -r src/server $BACKUP_DIR/
echo "Backup disimpan di $BACKUP_DIR"

# Perbaiki path @/server/* menjadi ~/server/*
echo "Memperbaiki import @/server/* menjadi ~/server/*..."
find src/server -type f -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's|@/server/|~/server/|g'

# Perbaiki path @/lib/email ke lokasi yang benar
echo "Memperbaiki import path email services..."
find src/server -type f -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's|@/lib/email/|~/lib/email/|g'

# Mencari semua file yang masih menggunakan pattern lama
REMAINING_SERVER_PATHS=$(grep -r "@/server/" src/server/ --include="*.ts" --include="*.tsx" | wc -l | xargs)
if [ "$REMAINING_SERVER_PATHS" -gt 0 ]; then
  echo "⚠️ Peringatan: Masih ada $REMAINING_SERVER_PATHS file yang menggunakan @/server/"
  echo "File-file tersebut:"
  grep -r "@/server/" src/server/ --include="*.ts" --include="*.tsx" | head -10
  echo "... dan lainnya. Periksa kembali secara manual."
else
  echo "✓ Semua import @/server/ berhasil diperbaiki"
fi

# Mencari semua file yang masih menggunakan pattern @/lib/email
REMAINING_EMAIL_PATHS=$(grep -r "@/lib/email" src/server/ --include="*.ts" --include="*.tsx" | wc -l | xargs)
if [ "$REMAINING_EMAIL_PATHS" -gt 0 ]; then
  echo "⚠️ Peringatan: Masih ada $REMAINING_EMAIL_PATHS file yang menggunakan @/lib/email"
  echo "File-file tersebut:"
  grep -r "@/lib/email" src/server/ --include="*.ts" --include="*.tsx" | head -10
  echo "... dan lainnya. Periksa kembali secara manual."
else
  echo "✓ Semua import @/lib/email berhasil diperbaiki"
fi

echo "Selesai! Import path dalam direktori server telah diperbaiki." 