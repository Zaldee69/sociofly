# Best Practices untuk Struktur File

Dokumen ini berisi rekomendasi dan best practices untuk mempertahankan struktur file yang scalable dan maintainable dalam proyek My Scheduler App.

## Prinsip Dasar

1. **Feature-First Organization**: Organisasikan kode berdasarkan domain bisnis atau fitur, bukan berdasarkan jenis file.
2. **Colocation**: Letakkan file-file yang berkaitan dekat satu sama lain.
3. **Single Responsibility**: Setiap file harus memiliki tanggung jawab tunggal yang jelas.
4. **Optimized Import Paths**: Gunakan alias import untuk menyederhanakan path.
5. **Separation of Concerns**: Pisahkan UI, logika bisnis, dan akses data.

## Penempatan File Baru

Saat menambahkan file baru, ikuti panduan ini:

### Komponen UI

- **UI Umum**: Komponen UI dasar yang dapat digunakan di seluruh aplikasi → `src/components/ui/`
- **Komponen Layout**: Komponen yang menentukan struktur halaman → `src/components/layout/`
- **Komponen Form**: Komponen form yang dapat digunakan kembali → `src/components/forms/`
- **Komponen Spesifik Fitur**: Komponen yang hanya digunakan untuk fitur tertentu → `src/features/[feature]/components/`

### Logika Bisnis

- **Hooks**: Custom hooks yang spesifik untuk fitur → `src/features/[feature]/hooks/`
- **Utils**: Fungsi utilitas yang spesifik untuk fitur → `src/features/[feature]/utils/`
- **Context**: Context providers yang spesifik untuk fitur → `src/features/[feature]/context/`

### API dan Data

- **API Client**: Fungsi untuk berinteraksi dengan API → `src/lib/api/` atau `src/features/[feature]/api/`
- **Database Utils**: Utilitas dan adapters database → `src/lib/db/`
- **Data Fetching**: Server actions, API routes → `src/app/api/` atau `src/server/api/`

### Routing dan Pages

- **Pages**: Komponen halaman → `src/app/[route]/page.tsx`
- **Layouts**: Layout halaman → `src/app/[route]/layout.tsx`

## Konvensi Penamaan

1. **Komponen**: PascalCase (contoh: `UserCard.tsx`, `ProfileHeader.tsx`)
2. **Hooks**: camelCase diawali dengan `use` (contoh: `useUserData.ts`, `useAuth.ts`)
3. **Utility Functions**: camelCase (contoh: `formatDate.ts`, `validateEmail.ts`)
4. **Types/Interfaces**: PascalCase (contoh: `User.ts`, `PostData.ts`)
5. **Context**: PascalCase diakhiri dengan `Context` (contoh: `AuthContext.tsx`)

## Struktur Impor

Untuk menyederhanakan dan standardisasi impor, gunakan alias impor:

```json
// tsconfig.json
{
  "compilerOptions": {
    "paths": {
      "~/*": ["./src/*"],
      "~/components/*": ["./src/components/*"],
      "~/features/*": ["./src/features/*"],
      "~/lib/*": ["./src/lib/*"],
      "~/utils/*": ["./src/utils/*"],
      "~/types/*": ["./src/types/*"]
    }
  }
}
```

Kemudian gunakan alias ini dalam impor:

```typescript
// Contoh penggunaan alias impor
import { Button } from "~/components/ui/button";
import { useUserData } from "~/features/auth/hooks/useUserData";
import { formatDate } from "~/utils/date";
```

## Barrel Files (Indeks)

Untuk memudahkan impor dari direktori dengan banyak file, gunakan barrel files (index.ts):

```typescript
// src/components/ui/index.ts
export * from "./button";
export * from "./input";
export * from "./card";
// dst.

// Penggunaan:
import { Button, Input, Card } from "~/components/ui";
```

## Code Splitting dan Lazy Loading

Untuk mengoptimalkan performa, gunakan code splitting dan lazy loading:

```typescript
// Contoh lazy loading komponen
import { lazy } from "react";

const HeavyComponent = lazy(
  () => import("~/features/analytics/components/HeavyComponent")
);
```

## Testing

Susun file test berdekatan dengan file yang diuji:

```
src/features/auth/
├── components/
│   ├── LoginForm.tsx
│   └── LoginForm.test.tsx  // Test file bersama dengan component
```

## Dokumentasi

Sertakan file README.md di folder utama untuk menjelaskan tujuan dan struktur:

```
src/features/auth/
├── README.md  // Menjelaskan fitur auth, komponen, dan penggunaannya
├── components/
├── hooks/
└── utils/
```

## Circular Dependencies

Hindari ketergantungan sirkular dengan mengorganisir kode secara hierarkis. Jika komponen A mengimpor dari B, dan B mengimpor dari A, restrukturisasi kode untuk menghilangkan ketergantungan sirkular.

## Catatan Akhir

Struktur file yang baik akan berkembang seiring waktu. Secara berkala, evaluasi struktur dan lakukan refactoring jika diperlukan untuk memastikan kode tetap terorganisir dengan baik.

Ingat bahwa konsistensi adalah kunci. Penting untuk mengikuti konvensi yang sama di seluruh proyek, bahkan jika konvensi tersebut berbeda dari rekomendasi di sini.
