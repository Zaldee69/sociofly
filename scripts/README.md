# Scripts Utility

Direktori ini berisi berbagai script utility untuk membantu pengembangan dan pemeliharaan proyek.

## Script yang Tersedia

### 1. Restructure Script

**Nama File:** `restructure.sh`

**Deskripsi:** Script bash untuk melakukan restrukturisasi codebase sesuai dengan rencana restrukturisasi yang telah didokumentasikan di `docs/file-restructure-plan.md`.

**Penggunaan:**

```bash
bash scripts/restructure.sh
```

**Apa yang Dilakukan:**

- Membuat backup codebase sebelum restrukturisasi
- Menghapus file .DS_Store yang tidak diperlukan
- Membuat struktur direktori baru
- Memindahkan komponen, utils, dan konfigurasi ke lokasi baru
- Memperbarui import paths (melalui update-imports.js)

**Catatan:** Script ini akan meminta konfirmasi sebelum menjalankan restrukturisasi. Pastikan untuk melakukan backup atau commit perubahan terbaru sebelum menjalankannya.

### 2. Update Imports Script

**Nama File:** `update-imports.js`

**Deskripsi:** Script Node.js untuk memperbarui path import di seluruh codebase setelah restrukturisasi.

**Penggunaan:**

```bash
node scripts/update-imports.js
```

**Apa yang Dilakukan:**

- Membuat backup codebase
- Menemukan semua file TypeScript/JavaScript
- Memperbarui path import berdasarkan mapping yang ditentukan
- Menampilkan laporan tentang file yang diperbarui

**Catatan:** Script ini berjalan otomatis sebagai bagian dari restructure.sh, tetapi dapat dijalankan secara terpisah jika diperlukan.

## Cara Menambahkan Script Baru

Untuk menambahkan script utility baru:

1. Buat file script di direktori `scripts/`
2. Pastikan file memiliki shebang line yang sesuai (contoh: `#!/bin/bash` untuk script bash)
3. Beri permission eksekusi: `chmod +x scripts/your-script.sh`
4. Dokumentasikan script di file README ini
5. Jika script akan dijalankan melalui npm, tambahkan di `package.json`:
   ```json
   "scripts": {
     "your-script": "bash scripts/your-script.sh"
   }
   ```
