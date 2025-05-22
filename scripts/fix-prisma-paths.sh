#!/bin/bash
# Script untuk memperbaiki path import prisma client

echo "Memperbaiki import path prisma client..."

# Backup files
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="backup_prisma_${TIMESTAMP}"
mkdir -p $BACKUP_DIR
cp -r src $BACKUP_DIR/
echo "Backup disimpan di $BACKUP_DIR"

# Perbaiki import paths
echo "Mengupdate import paths untuk prisma client..."

# Ubah ~/server/prisma/client menjadi @/lib/prisma/client
find src -type f -name "*.tsx" -o -name "*.ts" | xargs sed -i '' 's|~/server/prisma/client|@/lib/prisma/client|g'

echo "Selesai! Import path prisma client telah diperbaiki." 