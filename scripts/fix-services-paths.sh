#!/bin/bash
# Script untuk memperbaiki path import services

echo "Memperbaiki import path services..."

# Backup files
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="backup_services_${TIMESTAMP}"
mkdir -p $BACKUP_DIR
cp -r src $BACKUP_DIR/
echo "Backup disimpan di $BACKUP_DIR"

# Perbaiki import paths
echo "Mengupdate import paths untuk services..."

# Fix ~/server/services/* to @/lib/services/*
find src -type f -name "*.tsx" -o -name "*.ts" | xargs sed -i '' 's|~/server/services/|@/lib/services/|g'

echo "Selesai! Import path services telah diperbaiki." 