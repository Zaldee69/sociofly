#!/bin/bash
# Script untuk mengubah semua import dari ~/ menjadi @/

echo "Mengubah semua import dari ~/ menjadi @/..."

# Backup files
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="backup_tilde_imports_${TIMESTAMP}"
mkdir -p $BACKUP_DIR
cp -r src $BACKUP_DIR/
echo "Backup disimpan di $BACKUP_DIR"

# Perbaiki import paths
echo "Mengupdate import paths..."

# Cari semua file .ts dan .tsx
# 1. Ganti from "~/ menjadi from "@/
find src -type f -name "*.tsx" -o -name "*.ts" | xargs sed -i '' 's|from "~/|from "@/|g'

# 2. Ganti import "~/ menjadi import "@/
find src -type f -name "*.tsx" -o -name "*.ts" | xargs sed -i '' 's|import "~/|import "@/|g'

# 3. Ganti string import dengan ~/ menjadi @/ dalam require
find src -type f -name "*.tsx" -o -name "*.ts" | xargs sed -i '' 's|require("~/|require("@/|g'

# 4. Ganti string path dengan ~/ menjadi @/ dalam import dinamis
find src -type f -name "*.tsx" -o -name "*.ts" | xargs sed -i '' 's|import("~/|import("@/|g'

# 5. Ganti dalam JSX juga (untuk path asset dll)
find src -type f -name "*.tsx" -o -name "*.ts" | xargs sed -i '' 's|"~/|"@/|g'

echo "Selesai! Semua import dengan notasi ~/ telah diubah menjadi @/" 