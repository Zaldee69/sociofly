#!/bin/bash
# Script untuk memperbaiki path import dari @/lib menjadi ~/server atau ~/utils

echo "Memperbaiki import path dari @/lib..."

# Backup files
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="backup_lib_paths_${TIMESTAMP}"
mkdir -p $BACKUP_DIR
cp -r src $BACKUP_DIR/
echo "Backup disimpan di $BACKUP_DIR"

# Perbaiki import umum
echo "Memperbaiki import path umum..."

# @/lib/trpc/client menjadi ~/server/trpc/client
find src -type f -name "*.tsx" -o -name "*.ts" | xargs sed -i '' 's|@/lib/trpc/client|~/server/trpc/client|g'

# @/lib/contexts menjadi ~/features/shared/contexts
find src -type f -name "*.tsx" -o -name "*.ts" | xargs sed -i '' 's|@/lib/contexts|~/features/shared/contexts|g'

# @/lib/services menjadi ~/server/services
find src -type f -name "*.tsx" -o -name "*.ts" | xargs sed -i '' 's|@/lib/services|~/server/services|g'

# @/lib/utils menjadi ~/utils 
find src -type f -name "*.tsx" -o -name "*.ts" | xargs sed -i '' 's|@/lib/utils|~/utils|g'

# @/lib/prisma/client menjadi ~/server/prisma/client
find src -type f -name "*.tsx" -o -name "*.ts" | xargs sed -i '' 's|@/lib/prisma/client|~/server/prisma/client|g'

# @/lib/hooks menjadi ~/features/shared/hooks
find src -type f -name "*.tsx" -o -name "*.ts" | xargs sed -i '' 's|@/lib/hooks|~/features/shared/hooks|g'

# @/lib/email menjadi ~/server/email
find src -type f -name "*.tsx" -o -name "*.ts" | xargs sed -i '' 's|@/lib/email|~/server/email|g'

# @/lib/social-publisher menjadi ~/server/social-publisher
find src -type f -name "*.tsx" -o -name "*.ts" | xargs sed -i '' 's|@/lib/social-publisher|~/server/social-publisher|g'

# @/lib/auth-utils menjadi ~/features/auth/utils
find src -type f -name "*.tsx" -o -name "*.ts" | xargs sed -i '' 's|@/lib/auth-utils|~/features/auth/utils|g'

# Menghapus komentar yang berisi ~/utils/@/lib
find src -type f -name "*.tsx" -o -name "*.ts" | xargs sed -i '' 's|// import { createClient } from "~/utils/@/lib";|// Commented import removed during restructuring|g'

# Mencari semua komponen yang masih menggunakan pattern lama
REMAINING_PATHS=$(grep -r "@/lib" src/ --include="*.tsx" --include="*.ts" | wc -l | xargs)
if [ "$REMAINING_PATHS" -gt 0 ]; then
  echo "⚠️ Peringatan: Masih ada $REMAINING_PATHS file yang menggunakan @/lib"
  echo "File-file tersebut:"
  grep -r "@/lib" src/ --include="*.tsx" --include="*.ts" | head -10
  echo "... dan lainnya. Periksa kembali secara manual."
else
  echo "✓ Semua import @/lib berhasil diperbaiki"
fi

echo "Selesai! Path import dari @/lib telah diperbaiki." 