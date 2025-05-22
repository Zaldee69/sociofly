#!/bin/bash
# Script untuk mengkonsolidasikan utilitas yang tersebar di beberapa lokasi

echo "Mengkonsolidasikan utilitas yang tersebar..."

# Backup files
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="backup_utils_consolidation_${TIMESTAMP}"
mkdir -p $BACKUP_DIR
cp -r src $BACKUP_DIR/
echo "Backup disimpan di $BACKUP_DIR"

# 1. Konsolidasi utils/audio.ts dan lib/audio-utils.ts
echo "Konsolidasi utilitas audio..."

# Buat direktori lib/utils jika belum ada
mkdir -p src/lib/utils

# Pindahkan audio.ts ke lib/utils/audio.ts
cp src/utils/audio.ts src/lib/utils/audio.ts
echo "Utilitas audio dipindahkan ke src/lib/utils/audio.ts"

# 2. Perbarui import untuk audio
echo "Memperbarui import untuk audio utils..."

# Perbarui import ke lib/utils/audio
find src -type f -name "*.tsx" -o -name "*.ts" | xargs sed -i '' 's|import { recordAudio } from "@/utils/audio"|import { recordAudio } from "@/lib/utils/audio"|g'
find src -type f -name "*.tsx" -o -name "*.ts" | xargs sed -i '' 's|import { recordAudio } from "@/lib/audio-utils"|import { recordAudio } from "@/lib/utils/audio"|g'

# 3. Pindahkan utilitas lainnya ke lib/utils
echo "Memindahkan utilitas lainnya ke lib/utils..."

# Pindahkan utilitas dari utils ke lib/utils
cp src/utils/date.ts src/lib/utils/date.ts
cp src/utils/formatting.ts src/lib/utils/formatting.ts
cp src/utils/general.ts src/lib/utils/general.ts
cp src/utils/extract-hashtags.ts src/lib/utils/extract-hashtags.ts
cp src/utils/rate-limit.ts src/lib/utils/rate-limit.ts
cp src/utils/uploadthing.ts src/lib/utils/uploadthing.ts
cp src/utils/facebook.ts src/lib/utils/facebook.ts

# 4. Perbarui index.ts untuk lib/utils
echo "Membuat file barrel untuk lib/utils..."

cat > src/lib/utils/index.ts << 'EOF'
/**
 * Utils Barrel File
 * Export utility functions by category for easier imports
 */

import * as dateUtils from "./date";
import * as formatUtils from "./formatting";
import * as generalUtils from "./general";
import * as audioUtils from "./audio";

// Reexport utility functions from lib/utils.ts
import { cn, fileToBase64, formatFileSize, getBaseUrl, mergeButtonRefs } from "../utils";

export { 
  dateUtils, formatUtils, generalUtils, audioUtils,
  cn, fileToBase64, formatFileSize, getBaseUrl, mergeButtonRefs 
};

// Individual exports for selective imports
export * from "./date";
export * from "./formatting";
export * from "./general";
export * from "./audio";
export * from "./extract-hashtags";
export * from "./rate-limit";
export * from "./uploadthing";
export * from "./facebook";
EOF

# 5. Perbarui import untuk utilitas lainnya
echo "Memperbarui import untuk utilitas lainnya..."

# Perbarui import untuk utilitas yang dipindahkan
find src -type f -name "*.tsx" -o -name "*.ts" | xargs sed -i '' 's|import { generalUtils } from "@/utils"|import { generalUtils } from "@/lib/utils"|g'
find src -type f -name "*.tsx" -o -name "*.ts" | xargs sed -i '' 's|import { dateUtils } from "@/utils"|import { dateUtils } from "@/lib/utils"|g'
find src -type f -name "*.tsx" -o -name "*.ts" | xargs sed -i '' 's|import { formatUtils } from "@/utils"|import { formatUtils } from "@/lib/utils"|g'
find src -type f -name "*.tsx" -o -name "*.ts" | xargs sed -i '' 's|import { audioUtils } from "@/utils"|import { audioUtils } from "@/lib/utils"|g'

# Perbarui import untuk fungsi spesifik
find src -type f -name "*.tsx" -o -name "*.ts" | xargs sed -i '' 's|import { extractHashtags } from "@/utils/extract-hashtags"|import { extractHashtags } from "@/lib/utils/extract-hashtags"|g'
find src -type f -name "*.tsx" -o -name "*.ts" | xargs sed -i '' 's|import { rateLimit } from "@/utils/rate-limit"|import { rateLimit } from "@/lib/utils/rate-limit"|g'
find src -type f -name "*.tsx" -o -name "*.ts" | xargs sed -i '' 's|import { uploadThingConfig } from "@/utils/uploadthing"|import { uploadThingConfig } from "@/lib/utils/uploadthing"|g'
find src -type f -name "*.tsx" -o -name "*.ts" | xargs sed -i '' 's|import { facebook } from "@/utils/facebook"|import { facebook } from "@/lib/utils/facebook"|g'

echo "Selesai! Utilitas telah dikonsolidasikan di src/lib/utils/."
echo "Perhatian: File asli di src/utils/ tidak dihapus untuk keamanan. Periksa dengan seksama hasilnya dan hapus file lama jika sudah sesuai." 