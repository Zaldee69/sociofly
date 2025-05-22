#!/bin/bash
# Script untuk memperbaiki import cn di seluruh codebase

echo "Memperbaiki import cn di seluruh codebase..."

# Backup files
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="backup_imports_${TIMESTAMP}"
mkdir -p $BACKUP_DIR
cp -r src $BACKUP_DIR/
echo "Backup disimpan di $BACKUP_DIR"

# Case 1: import { cn } from "~/utils"
echo "Memperbaiki import cn dari ~/utils..."
PATTERN_1="import { cn } from \"~/utils\""
FILES_1=$(find src -type f -name "*.tsx" -o -name "*.ts" | xargs grep -l "$PATTERN_1" | grep -v "node_modules" | grep -v ".next")

for FILE in $FILES_1; do
  echo "Memperbaiki $FILE..."
  sed -i '' 's/import { cn } from "~\/utils";/import { generalUtils } from "~\/utils";\nconst { cn } = generalUtils;/g' "$FILE"
done

# Case 2: import { cn } from '@/lib/utils'
echo "Memperbaiki import cn dari @/lib/utils..."
PATTERN_2="import { cn } from \"@/lib/utils\""
FILES_2=$(find src -type f -name "*.tsx" -o -name "*.ts" | xargs grep -l "$PATTERN_2" | grep -v "node_modules" | grep -v ".next")

for FILE in $FILES_2; do
  echo "Memperbaiki $FILE..."
  sed -i '' 's/import { cn } from "@\/lib\/utils";/import { generalUtils } from "~\/utils";\nconst { cn } = generalUtils;/g' "$FILE"
done

# Case 3: import { cn } dari '~/utils'
echo "Memperbaiki import cn dengan single quotes..."
PATTERN_3="import { cn } from '~/utils'"
FILES_3=$(find src -type f -name "*.tsx" -o -name "*.ts" | xargs grep -l "$PATTERN_3" | grep -v "node_modules" | grep -v ".next")

for FILE in $FILES_3; do
  echo "Memperbaiki $FILE..."
  sed -i '' "s/import { cn } from '~\/utils';/import { generalUtils } from '~\/utils';\nconst { cn } = generalUtils;/g" "$FILE"
done

# Case 4: import { cn } dari '@/lib/utils'
echo "Memperbaiki import cn dengan single quotes dari @/lib/utils..."
PATTERN_4="import { cn } from '@/lib/utils'"
FILES_4=$(find src -type f -name "*.tsx" -o -name "*.ts" | xargs grep -l "$PATTERN_4" | grep -v "node_modules" | grep -v ".next")

for FILE in $FILES_4; do
  echo "Memperbaiki $FILE..."
  sed -i '' "s/import { cn } from '@\/lib\/utils';/import { generalUtils } from '~\/utils';\nconst { cn } = generalUtils;/g" "$FILE"
done

echo "Selesai! Import cn telah diperbaiki di seluruh codebase."

# Script untuk memperbaiki import di file UI components

echo "Memperbaiki import di file UI components..."

# Backup files
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="backup_ui_imports_${TIMESTAMP}"
mkdir -p $BACKUP_DIR
cp -r src $BACKUP_DIR/
echo "Backup disimpan di $BACKUP_DIR"

# Perbaiki import generalUtils di komponen UI
echo "Mengupdate import di file UI components..."

# Pola: import { generalUtils } from "@/lib/utils" -> import { cn } from "@/lib/utils"
find src/components/ui -type f -name "*.tsx" | xargs sed -i '' 's|import { generalUtils } from "@/lib/utils"|import { cn } from "@/lib/utils"|g'
find src/components/ui -type f -name "*.tsx" | xargs sed -i '' 's|const { cn } = generalUtils;||g'

echo "Selesai! Import di file UI components telah diperbaiki." 