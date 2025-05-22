# My Scheduler App

Aplikasi untuk mengelola dan menjadwalkan konten media sosial dengan fitur kolaborasi tim.

## Fitur Utama

- **Manajemen Tim**

  - Buat dan kelola tim kolaborasi
  - Sistem berbasis peran (OWNER, MANAGER, SUPERVISOR, CONTENT_CREATOR, dll)
  - Manajemen anggota tim dan undangan

- **Alur Kerja Persetujuan**

  - Konfigurasi alur persetujuan untuk konten
  - Langkah-langkah yang dapat disesuaikan berdasarkan peran
  - Visualisasi alur kerja dengan antarmuka drag-and-drop

- **Integrasi Media Sosial**

  - Hubungkan akun dari berbagai platform (Facebook, Instagram, Twitter, dll)
  - Jadwalkan postingan untuk platform tertentu
  - Kelola konten untuk masing-masing platform

- **Manajemen Konten**
  - Kalender penerbitan
  - Perpustakaan media terintegrasi
  - Editor konten untuk berbagai format

## Teknologi

- **Frontend**: Next.js, React, TypeScript, Tailwind CSS
- **Backend**: tRPC, Prisma, PostgreSQL
- **Autentikasi**: Clerk
- **Deployment**: Vercel dan Supabase

## Dokumentasi Pengembangan

- [Panduan Migrasi Team](./TEAM_MIGRATION.md) - Panduan tentang migrasi dari "organization" ke "team"

## Memulai

### Prasyarat

- Node.js 18+ dan npm
- PostgreSQL (atau akses ke database Supabase)
- Akun Clerk untuk Autentikasi

### Instalasi

1. Clone repositori

   ```bash
   git clone <repository-url>
   cd my-scheduler-app
   ```

2. Instal dependensi

   ```bash
   npm install
   ```

3. Salin file .env.example menjadi .env dan isi dengan nilai yang sesuai

   ```bash
   cp .env.example .env
   ```

4. Jalankan migrasi database

   ```bash
   npx prisma migrate dev
   ```

5. Jalankan server pengembangan

   ```bash
   npm run dev
   ```

6. Buka [http://localhost:3000](http://localhost:3000) di browser Anda

## Struktur Folder

- **`src/app`**: Komponen dan halaman Next.js
- **`src/components`**: Komponen UI yang dapat digunakan kembali
- **`src/lib`**: Utilitas, hooks, dan adapter
- **`src/server`**: Logika server, definisi TRPC, dan router
- **`prisma`**: Skema dan migrasi database
- **`docs`**: Dokumentasi pengembangan

## Kontribusi

Silakan baca [CONTRIBUTING.md](./CONTRIBUTING.md) untuk detail tentang kode etik dan proses pengajuan pull request.

## Lisensi

Proyek ini dilisensikan di bawah Lisensi MIT - lihat file [LICENSE](./LICENSE) untuk detailnya.
