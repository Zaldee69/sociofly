#!/bin/bash
# Script untuk memperbaiki path import komponen

echo "Memperbaiki import path komponen..."

# Backup files
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="backup_components_${TIMESTAMP}"
mkdir -p $BACKUP_DIR
cp -r src $BACKUP_DIR/
echo "Backup disimpan di $BACKUP_DIR"

# Perbaiki import paths
echo "Mengupdate import paths untuk komponen..."

# Ubah @/components/ menjadi ~/components/
find src -type f -name "*.tsx" -o -name "*.ts" | xargs sed -i '' 's|@/components/|~/components/|g'

# Ubah @/components/icons menjadi ~/components/icons
find src -type f -name "*.tsx" -o -name "*.ts" | xargs sed -i '' 's|@/components/icons|~/components/icons|g'

# Ubah @/components/multi-select menjadi ~/components/multi-select
find src -type f -name "*.tsx" -o -name "*.ts" | xargs sed -i '' 's|@/components/multi-select|~/components/multi-select|g'

echo "Selesai! Import path komponen telah diperbaiki." 