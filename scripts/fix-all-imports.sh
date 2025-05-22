#!/bin/bash
# Script untuk menjalankan semua perbaikan import sekaligus

echo "Menjalankan semua perbaikan import dan pembersihan duplikat sekaligus..."

# Backup files untuk seluruh proses
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="backup_all_fixes_${TIMESTAMP}"
mkdir -p $BACKUP_DIR
cp -r src $BACKUP_DIR/
echo "Backup disimpan di $BACKUP_DIR"

# 1. Perbaiki import cn
echo "1. Memperbaiki import cn..."
./scripts/fix-ui-imports.sh

# 2. Perbaiki path komponen UI
echo "2. Memperbaiki path komponen UI..."
./scripts/fix-ui-paths.sh

# 3. Perbaiki path dari @/lib
echo "3. Memperbaiki path dari @/lib..."
./scripts/fix-lib-paths.sh

# 4. Perbaiki path dari @/hooks
echo "4. Memperbaiki path dari @/hooks..."
./scripts/fix-hooks-paths.sh

# 5. Perbaiki path import dalam direktori server
echo "5. Memperbaiki path import dalam direktori server..."
./scripts/fix-server-imports.sh

# 6. Perbaiki path import contexts dan trpc client
echo "6. Memperbaiki path import contexts dan trpc client..."
./scripts/fix-contexts-paths.sh

# 7. Perbaiki path import prisma client
echo "7. Memperbaiki path import prisma client..."
./scripts/fix-prisma-paths.sh

# 8. Perbaiki path import komponen
echo "8. Memperbaiki path import komponen..."
./scripts/fix-components-paths.sh

# 9. Perbaiki path import case-sensitive
echo "9. Memperbaiki path import case-sensitive..."
./scripts/fix-case-sensitive-imports.sh

# 10. Perbaiki path import services
echo "10. Memperbaiki path import services..."
./scripts/fix-services-paths.sh

# 11. Membersihkan file-file duplikat
echo "11. Membersihkan file-file duplikat..."
./scripts/cleanup-duplicates.sh

echo "Selesai! Semua perbaikan import dan pembersihan duplikat telah dilakukan."
echo "Silakan jalankan 'npm run dev' untuk memeriksa hasilnya." 