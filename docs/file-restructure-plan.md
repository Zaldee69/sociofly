# File Restructuring Plan

Dokumen ini menjelaskan langkah-langkah untuk merestrukturisasi proyek My Scheduler App agar lebih terorganisir, mudah dirawat, dan skalabel.

## Masalah pada Struktur Saat Ini

1. **Duplikasi direktori**: Terdapat duplikasi seperti `contexts` yang ada di root dan di `lib`.
2. **Organisasi utils yang tersebar**: Utility functions tersebar di beberapa tempat (`src/utils`, `src/lib/utils`, dll).
3. **Direktori dengan fungsi tumpang tindih**: Beberapa direktori memiliki fungsi serupa tapi terpisah.
4. **File .DS_Store** yang tidak perlu.
5. **Kurangnya pemisahan yang jelas antar domain fungsional**: Code untuk fitur tertentu tersebar di seluruh codebase.

## Rencana Restrukturisasi

### 1. Pembersihan File Tidak Perlu

```bash
# Menghapus file .DS_Store
find . -name ".DS_Store" -delete
```

### 2. Konsolidasi Direktori Utils

Pindahkan semua utility functions ke lokasi baru yang terstruktur dengan baik:

```
src/utils/
├── date.ts            # Utility functions terkait tanggal/waktu
├── formatting.ts      # Utility functions untuk formatting data
├── validation.ts      # Utility functions untuk validasi
├── api.ts             # Utility functions terkait API
└── ...
```

### 3. Pembuatan Struktur Features

Buat direktori `features` baru yang mengorganisir kode berdasarkan domain bisnis:

```
src/features/
├── auth/              # Autentikasi dan otorisasi
├── scheduling/        # Fitur penjadwalan
│   ├── components/    # Komponen React untuk scheduling
│   ├── hooks/         # Custom hooks untuk scheduling
│   ├── api/           # API endpoints untuk scheduling
│   ├── utils/         # Utilities khusus untuk scheduling
│   └── types.ts       # Type definitions untuk scheduling
├── social/            # Fitur social media
│   ├── components/    # Komponen terkait social media
│   ├── hooks/         # Custom hooks untuk social media
│   ├── api/           # API endpoints untuk social media
│   ├── utils/         # Utilities khusus untuk social media
│   └── types.ts       # Type definitions untuk social media
└── ...
```

### 4. Restrukturisasi Components

Reorganisasi direktori components untuk lebih jelas dan memisahkan UI dari komponen bisnis:

```
src/components/
├── layout/            # Komponen layout umum
│   ├── AppLayout.tsx  # Layout utama aplikasi
│   ├── Sidebar.tsx    # Sidebar
│   └── Header.tsx     # Header
├── ui/                # Komponen UI dasar (dari shadcn/ui)
├── forms/             # Komponen form yang dapat digunakan kembali
└── common/            # Komponen umum lainnya
```

Komponen spesifik fitur dipindahkan ke direktori fitur terkait.

### 5. Konsolidasi Types

Pindahkan semua type definitions ke direktori `types` yang terorganisir:

```
src/types/
├── api.ts             # Type definitions untuk API
├── auth.ts            # Type definitions untuk auth
├── scheduling.ts      # Type definitions untuk scheduling
├── social.ts          # Type definitions untuk social media
└── ...
```

### 6. Reorganisasi Lib

Struktur ulang direktori `lib` untuk fungsi yang lebih jelas:

```
src/lib/
├── db/                # Database utilities dan adapters
├── trpc/              # tRPC setup
├── auth/              # Auth utilities
└── api/               # API utilities dan adapters
```

### 7. Migrasi Server-side Code

Pastikan semua kode server-side ditempatkan dengan benar:

```
src/server/
├── api/               # API handlers
├── auth/              # Auth utilities dan middlewares
├── permissions/       # Permission logic
└── ...
```

## Langkah-langkah Implementasi

1. **Backup Codebase**: Lakukan backup atau buat branch baru sebelum memulai restructuring.

2. **Migrasi Bertahap**: Lakukan migrasi satu direktori pada satu waktu, pastikan aplikasi tetap berfungsi setelah setiap tahap.

3. **Update Imports**: Setelah memindahkan file, perbarui semua import paths yang terkena dampak.

4. **Testing**: Lakukan pengujian menyeluruh setelah setiap tahap untuk memastikan tidak ada yang rusak.

5. **Dokumentasi**: Update dokumentasi dan komentar kode untuk mencerminkan struktur baru.

## Manfaat Restrukturisasi

1. **Maintainability**: Kode lebih mudah dipelihara karena lebih terorganisir.
2. **Scalability**: Struktur yang lebih jelas memudahkan penambahan fitur baru.
3. **Developer Experience**: Lebih mudah bagi developer baru untuk memahami codebase.
4. **Performance**: Potensial untuk lazy loading berdasarkan fitur.
5. **Testing**: Lebih mudah untuk menulis dan mengorganisir test.

## Timeline

Direkomendasikan untuk menyelesaikan restructuring ini dalam beberapa sprint:

- **Sprint 1**: Pembersihan file tidak perlu dan konsolidasi utils.
- **Sprint 2**: Pembuatan struktur features dan migrasi komponen.
- **Sprint 3**: Konsolidasi types dan reorganisasi lib.
- **Sprint 4**: Testing komprehensif dan perbaikan bug.

## Kesimpulan

Restrukturisasi ini mengadopsi pendekatan yang lebih feature-driven, yang akan membuat codebase lebih terorganisir dan mudah dikembangkan. Meskipun memerlukan upaya signifikan di awal, manfaat jangka panjangnya akan jauh melebihi biaya implementasi.
