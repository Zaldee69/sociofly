#!/bin/bash
# Script untuk memperbaiki import path dengan nama file case-sensitive

echo "Memperbaiki import path case-sensitive..."

# Backup files
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="backup_case_${TIMESTAMP}"
mkdir -p $BACKUP_DIR
cp -r src $BACKUP_DIR/
echo "Backup disimpan di $BACKUP_DIR"

# Perbaiki import paths
echo "Mengupdate import paths untuk komponen case-sensitive..."

# Fix BigCalendar to big-calendar
find src -type f -name "*.tsx" -o -name "*.ts" | xargs sed -i '' 's|components/BigCalendar|components/big-calendar|g'

# Find other potential case-sensitive issues
echo "Mencari potensi masalah case-sensitive lainnya..."
UPPERCASE_FILES=$(find src -name "*[A-Z]*.tsx" -o -name "*[A-Z]*.ts" | wc -l | xargs)
if [ "$UPPERCASE_FILES" -gt 0 ]; then
  echo "⚠️ Peringatan: Ada $UPPERCASE_FILES file dengan huruf kapital yang bisa jadi masalah"
  echo "File-file tersebut:"
  find src -name "*[A-Z]*.tsx" -o -name "*[A-Z]*.ts" | head -10
  echo "... dan lainnya. Sesuaikan secara manual jika diperlukan."
fi

echo "Selesai! Import path case-sensitive telah diperbaiki." 