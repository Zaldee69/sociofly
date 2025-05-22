#!/bin/bash
# Script untuk memperbaiki path import contexts

echo "Memperbaiki import path contexts..."

# Backup files
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="backup_contexts_${TIMESTAMP}"
mkdir -p $BACKUP_DIR
cp -r src $BACKUP_DIR/
echo "Backup disimpan di $BACKUP_DIR"

# Perbaiki import paths
echo "Mengupdate import paths untuk contexts..."

# Ubah ~/features/shared/contexts menjadi @/lib/contexts
find src -type f -name "*.tsx" -o -name "*.ts" | xargs sed -i '' 's|~/features/shared/contexts|@/lib/contexts|g'

# Ubah ~/server/trpc/client menjadi @/lib/trpc/client
find src -type f -name "*.tsx" -o -name "*.ts" | xargs sed -i '' 's|~/server/trpc/client|@/lib/trpc/client|g'

echo "Selesai! Import path contexts dan trpc client telah diperbaiki." 