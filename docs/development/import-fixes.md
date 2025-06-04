# Memperbaiki Masalah Import Setelah Restrukturisasi

Dokumen ini memberikan panduan untuk memperbaiki masalah import yang umum muncul setelah restrukturisasi codebase.

## Solusi Cepat: Fix-All

Untuk memperbaiki semua masalah import dan file duplikat sekaligus:

```bash
npm run fix-all
```

Script ini akan menjalankan semua perbaikan dalam urutan yang tepat:

1. Memperbaiki import `cn`
2. Memperbaiki path komponen UI
3. Memperbaiki path dari `@/lib`
4. Membersihkan file-file duplikat

## Masalah Import `cn` dari Utils

Setelah restrukturisasi, fungsi `cn` tidak lagi diekspor langsung dari `~/utils` tetapi harus diakses melalui `generalUtils`:

### Masalah

```typescript
// ❌ Error: Module '"~/utils"' has no exported member 'cn'.
import { cn } from "~/utils";
```

### Solusi

```typescript
// ✅ Benar: Import dari generalUtils
import { generalUtils } from "~/utils";
const { cn } = generalUtils;
```

### Script Perbaikan

```bash
npm run fix-imports
```

## Masalah Path Komponen UI

File-file yang menggunakan path `@/components/ui` perlu diperbarui ke `~/components/ui`:

### Masalah

```typescript
// ❌ Error: Cannot find module '@/components/ui/button'
import { Button } from "@/components/ui/button";
```

### Solusi

```typescript
// ✅ Benar: Import dari ~/components/ui
import { Button } from "~/components/ui/button";
```

### Script Perbaikan

```bash
npm run fix-ui-paths
```

## Masalah Path @/lib

File-file yang menggunakan path `@/lib/*` perlu diperbarui ke lokasi baru:

### Masalah

```typescript
// ❌ Error: Cannot find module '@/lib/trpc/client'
import { trpc } from "@/lib/trpc/client";
```

### Solusi

```typescript
// ✅ Benar: Import dari lokasi baru
import { trpc } from "~/server/trpc/client";
```

### Script Perbaikan

```bash
npm run fix-lib-paths
```

## Masalah File Duplikat

Setelah restrukturisasi, beberapa file komponen muncul di beberapa lokasi:

### Script Perbaikan

```bash
npm run cleanup-duplicates
```

### File/Direktori yang Dihapus

- `src/components/post-calendar/`
- `src/components/hashtag-browser.tsx`
- `src/components/hashtag-search.tsx`
- `src/features/scheduling/components/post-dialog/`
- File-file individu duplikat seperti `draggable-post.tsx`, `post-item.tsx`, dll.

## Masalah Import Umum Lainnya

### Hooks dari `@/hooks/*`

```typescript
// ❌ Error: Cannot find module '@/hooks/use-permissions'
import { usePermissions } from "@/hooks/use-permissions";

// ✅ Benar: Import dari server/permissions
import { usePermissions } from "~/server/permissions/use-permissions";
```

### Format Utils

```typescript
// ❌ Error: Module '"~/utils"' has no exported member 'formatDate'.
import { formatDate } from "~/utils";

// ✅ Benar: Import dari dateUtils
import { dateUtils } from "~/utils";
const { formatDate } = dateUtils;
```

## Struktur Exports Baru

Berikut adalah struktur exports baru setelah restrukturisasi:

```typescript
// src/utils/index.ts
import * as dateUtils from "./date";
import * as formatUtils from "./formatting";
import * as generalUtils from "./general";
import * as audioUtils from "./audio";
import * as hooks from "./hooks";

export { dateUtils, formatUtils, generalUtils, audioUtils, hooks };
```

## Troubleshooting

Jika masih ada masalah import setelah menjalankan script:

1. Periksa error message untuk mengidentifikasi file dan modul yang bermasalah
2. Update import secara manual untuk file tersebut
3. Jika ada pola import baru yang bermasalah, tambahkan ke script yang sesuai
4. Jika menemukan file duplikat lain, tambahkan ke script `cleanup-duplicates.sh`
