#!/bin/bash
# restructure.sh
# Script untuk melakukan restrukturisasi codebase

# Fungsi untuk logging
log() {
  echo -e "\033[0;32m[RESTRUCTURE]\033[0m $1"
}

error() {
  echo -e "\033[0;31m[ERROR]\033[0m $1"
}

# Pastikan berjalan di root proyek
if [ ! -f "package.json" ]; then
  error "Script harus dijalankan dari root proyek"
  exit 1
fi

# Konfirmasi sebelum melanjutkan
read -p "Script ini akan melakukan restrukturisasi codebase. Pastikan Anda telah melakukan backup atau commit terbaru. Lanjutkan? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  log "Restrukturisasi dibatalkan."
  exit 0
fi

# Membuat timestamp untuk log
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
LOG_FILE="restructure_${TIMESTAMP}.log"

# Membuat backup
log "Membuat backup codebase..."
BACKUP_DIR="backup_${TIMESTAMP}"
mkdir -p $BACKUP_DIR
cp -r src $BACKUP_DIR/
cp package.json tsconfig.json $BACKUP_DIR/
log "Backup selesai: $BACKUP_DIR"

# 1. Pembersihan file yang tidak diperlukan
log "Menghapus file .DS_Store..."
find . -name ".DS_Store" -delete

# 2. Membuat struktur direktori baru
log "Membuat struktur direktori baru..."
mkdir -p src/features/{auth,scheduling,social}/{components,hooks,api,utils}
mkdir -p src/components/{layout,forms,common}
mkdir -p src/utils
mkdir -p src/lib/{db,trpc,auth,api}
mkdir -p src/config
mkdir -p scripts

# 3. Memindahkan file
log "Memindahkan file komponen layout..."
cp src/components/app-sidebar.tsx src/components/layout/Sidebar.tsx 2>/dev/null || log "app-sidebar.tsx tidak ditemukan"
cp src/components/nav-user.tsx src/components/layout/NavUser.tsx 2>/dev/null || log "nav-user.tsx tidak ditemukan"
cp src/components/team-switcher.tsx src/components/layout/TeamSwitcher.tsx 2>/dev/null || log "team-switcher.tsx tidak ditemukan"

log "Memindahkan file komponen scheduling..."
cp src/components/big-calendar.tsx src/features/scheduling/components/BigCalendar.tsx 2>/dev/null || log "big-calendar.tsx tidak ditemukan"

log "Memindahkan file komponen social..."
cp src/components/hashtag-search.tsx src/features/social/components/HashtagSearch.tsx 2>/dev/null || log "hashtag-search.tsx tidak ditemukan"
cp src/components/hashtag-browser.tsx src/features/social/components/HashtagBrowser.tsx 2>/dev/null || log "hashtag-browser.tsx tidak ditemukan"

# 4. Memindahkan utils
log "Memindahkan utils..."
cp src/lib/utils.ts src/utils/general.ts 2>/dev/null || log "utils.ts tidak ditemukan"
cp src/lib/audio-utils.ts src/utils/audio.ts 2>/dev/null || log "audio-utils.ts tidak ditemukan"
cp -r src/lib/utils/* src/utils/ 2>/dev/null || log "Tidak ada file di lib/utils/"

# 5. Memindahkan config
log "Memindahkan config..."
cp src/lib/config/industry-config.ts src/config/industry.ts 2>/dev/null || log "industry-config.ts tidak ditemukan"

# 6. Memindahkan permissions
log "Memindahkan permissions ke server..."
mkdir -p src/server/permissions
cp -r src/lib/permissions/* src/server/permissions/ 2>/dev/null || log "Tidak ada file di lib/permissions/"

# 7. Membuat file baru
log "Membuat utility files baru..."
touch src/utils/index.ts src/utils/date.ts src/utils/formatting.ts

log "Membuat config files baru..."
touch src/config/constants.ts src/config/env.ts

# 8. Update tsconfig.json untuk path aliases
log "Memperbarui tsconfig.json untuk alias paths..."
# Ini lebih baik dilakukan manual karena kompleks untuk shell script

# 9. Menjalankan update imports script
log "Menjalankan script update imports..."
node scripts/update-imports.js

# 10. Informasi selanjutnya
log "Restrukturisasi selesai!"
log "Langkah selanjutnya:"
log "1. Update import paths yang belum terhandle otomatis"
log "2. Jalankan aplikasi untuk memastikan tidak ada yang rusak"
log "3. Review dan perbaiki issues yang ditemukan"
log "4. Lanjutkan migrasi file-file lainnya sesuai rencana"

echo
log "Backup codebase tersimpan di: $BACKUP_DIR"
log "Log tersimpan di: $LOG_FILE" 