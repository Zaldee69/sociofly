#!/bin/bash
# Script untuk membersihkan file-file duplikat setelah restrukturisasi

echo "Membersihkan file-file duplikat..."

# Backup files
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="backup_cleanup_${TIMESTAMP}"
mkdir -p $BACKUP_DIR
cp -r src $BACKUP_DIR/
echo "Backup disimpan di $BACKUP_DIR"

# 1. Hapus komponen duplikat di src/components
echo "Menghapus duplicate post-calendar di src/components..."
if [ -d "src/components/post-calendar" ]; then
  rm -rf src/components/post-calendar
  echo "✓ Direktori src/components/post-calendar dihapus"
fi

echo "Menghapus file hashtag duplikat di src/components..."
if [ -f "src/components/hashtag-browser.tsx" ]; then
  rm -f src/components/hashtag-browser.tsx
  echo "✓ File src/components/hashtag-browser.tsx dihapus"
fi

if [ -f "src/components/hashtag-search.tsx" ]; then
  rm -f src/components/hashtag-search.tsx
  echo "✓ File src/components/hashtag-search.tsx dihapus"
fi

# 2. Membersihkan struktur post-dialog duplikat dalam features/scheduling
echo "Menghapus struktur post-dialog duplikat di src/features/scheduling/components..."
if [ -d "src/features/scheduling/components/post-dialog" ]; then
  rm -rf src/features/scheduling/components/post-dialog
  echo "✓ Direktori src/features/scheduling/components/post-dialog dihapus"
fi

# 3. Menghapus file komponen duplikat di luar post-calendar
echo "Menghapus file komponen duplikat di luar post-calendar..."
FILES_TO_REMOVE=(
  "src/features/scheduling/components/draggable-post.tsx"
  "src/features/scheduling/components/post-calendar.tsx"
  "src/features/scheduling/components/post-item.tsx"
  "src/features/scheduling/components/post-popup.tsx"
  "src/features/scheduling/components/day-view.tsx"
  "src/features/scheduling/components/week-view.tsx"
  "src/features/scheduling/components/month-view.tsx"
  "src/features/scheduling/components/agenda-view.tsx"
  "src/features/scheduling/components/droppable-cell.tsx"
)

for FILE in "${FILES_TO_REMOVE[@]}"; do
  if [ -f "$FILE" ]; then
    rm -f "$FILE"
    echo "✓ File $FILE dihapus"
  fi
done

# 4. Pastikan semua file komponen UI menggunakan import cn yang benar
echo "Memastikan import cn sudah benar di semua file..."
./scripts/fix-ui-imports.sh >/dev/null 2>&1
echo "✓ Import cn diperbaiki"

echo "Selesai! Duplikasi file telah dibersihkan." 