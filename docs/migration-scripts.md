# Script Migrasi untuk Restrukturisasi

Dokumen ini berisi script bash yang dapat membantu proses restrukturisasi codebase.

## 1. Script Pembersihan

```bash
#!/bin/bash
# cleanup.sh
# Script untuk menghapus file yang tidak diperlukan

# Menghapus semua file .DS_Store
echo "Menghapus file .DS_Store..."
find . -name ".DS_Store" -delete

echo "Pembersihan selesai."
```

## 2. Script Persiapan Direktori

```bash
#!/bin/bash
# prepare-dirs.sh
# Script untuk membuat struktur direktori baru

# Membuat direktori features dan sub-direktori
echo "Membuat struktur direktori features..."
mkdir -p src/features/auth/{components,hooks,api,utils}
mkdir -p src/features/scheduling/{components,hooks,api,utils}
mkdir -p src/features/social/{components,hooks,api,utils}

# Membuat struktur direktori components baru
echo "Membuat struktur direktori components baru..."
mkdir -p src/components/{layout,forms,common}

# Membuat struktur direktori utils
echo "Membuat struktur direktori utils..."
mkdir -p src/utils

# Membuat struktur direktori lib baru
echo "Membuat struktur direktori lib baru..."
mkdir -p src/lib/{db,trpc,auth,api}

echo "Persiapan direktori selesai."
```

## 3. Script Migrasi Utils

```bash
#!/bin/bash
# migrate-utils.sh
# Script untuk memigrasikan utility functions

# Migrasi utils dari src/lib/utils ke src/utils
echo "Memigrasikan utilities dari lib/utils ke utils..."
cp -r src/lib/utils/* src/utils/
# Pastikan untuk menyesuaikan imports setelah migrasi

echo "Migrasi utils selesai."
```

## 4. Script Migrasi Komponen

```bash
#!/bin/bash
# migrate-components.sh
# Script untuk memigrasikan komponen-komponen

# Memindahkan komponen layout
echo "Memigrasikan komponen layout..."
# Contoh: memindahkan file app-sidebar.tsx ke components/layout
cp src/components/app-sidebar.tsx src/components/layout/Sidebar.tsx
# Pastikan untuk menyesuaikan imports setelah migrasi

# Memindahkan komponen scheduling-dashboard ke features/scheduling/components
echo "Memigrasikan komponen scheduling..."
cp -r src/components/scheduling-dashboard/* src/features/scheduling/components/
# Pastikan untuk menyesuaikan imports setelah migrasi

echo "Migrasi komponen selesai."
```

## 5. Script Migrasi Types

```bash
#!/bin/bash
# migrate-types.sh
# Script untuk memigrasikan type definitions

# Migrasi types dari berbagai tempat ke src/types
echo "Memigrasikan types..."
cp -r src/types/* src/types/
# Pastikan untuk menyesuaikan imports setelah migrasi

echo "Migrasi types selesai."
```

## Catatan Penting

1. **Backup Terlebih Dahulu**: Selalu lakukan backup atau gunakan version control (commit dan create branch) sebelum menjalankan script.

2. **Jalankan Secara Bertahap**: Jalankan script satu per satu dan pastikan aplikasi masih berfungsi setelah setiap langkah.

3. **Update Imports**: Script di atas hanya memindahkan file, Anda masih perlu memperbarui import path secara manual.

4. **Review Code**: Lakukan review kode setelah migrasi untuk memastikan semua bekerja dengan benar.

5. **Testing**: Jalankan semua test untuk memastikan perubahan tidak merusak fungsionalitas.

## Contoh Perintah Find dan Replace untuk Update Imports

```bash
# Contoh untuk mengupdate imports dari src/lib/utils ke src/utils
find ./src -type f -name "*.ts*" -exec sed -i '' 's|from ".*lib/utils|from "~/utils|g' {} \;

# Contoh untuk mengupdate imports dari src/components/scheduling-dashboard ke src/features/scheduling/components
find ./src -type f -name "*.ts*" -exec sed -i '' 's|from ".*components/scheduling-dashboard|from "~/features/scheduling/components|g' {} \;
```

Sesuaikan command find dan replace di atas sesuai dengan kebutuhan migrasi Anda.

## Script Pelaporan

```bash
#!/bin/bash
# report.sh
# Script untuk membuat laporan setelah migrasi

echo "Membuat laporan migrasi..."

echo "Total file JavaScript/TypeScript:"
find ./src -type f -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" | wc -l

echo "Distribusi file berdasarkan direktori:"
find ./src -type f -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" | sed 's/\/[^/]*$//' | sort | uniq -c | sort -nr

echo "Laporan selesai."
```

Gunakan script ini setelah proses migrasi untuk mendapatkan gambaran distribusi file dalam struktur baru.
