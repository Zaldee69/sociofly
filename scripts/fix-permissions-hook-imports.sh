#!/bin/bash
# Script untuk memperbarui semua import usePermissions ke lokasi baru

echo "Memperbarui imports untuk usePermissions hook..."

# Backup files
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="backup_permissions_hook_${TIMESTAMP}"
mkdir -p $BACKUP_DIR
cp -r src $BACKUP_DIR/
echo "Backup disimpan di $BACKUP_DIR"

# Perbaiki import paths
echo "Mengupdate import paths..."

# Option 1: Ganti dengan @/lib/hooks
find src -type f -name "*.tsx" -o -name "*.ts" | xargs sed -i '' 's|import { usePermissions } from "@/features/scheduling/hooks/use-permissions"|import { usePermissions } from "@/lib/hooks"|g'

# Option 2: Ganti dengan import langsung ke file
# find src -type f -name "*.tsx" -o -name "*.ts" | xargs sed -i '' 's|import { usePermissions } from "@/features/scheduling/hooks/use-permissions"|import { usePermissions } from "@/lib/hooks/use-permissions"|g'

echo "Selesai! Import usePermissions telah diperbarui." 