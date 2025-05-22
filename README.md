# My Scheduler App

A modern scheduling app for team collaboration and social media management.

## Recommended File Structure

```
my-scheduler-app/
├── .next/                    # Next.js build output
├── node_modules/             # Dependencies
├── prisma/                   # Database schema and migrations
│   ├── migrations/           # Database migrations
│   └── schema.prisma         # Prisma schema
├── public/                   # Static assets
│   └── ...
├── src/
│   ├── app/                  # Next.js App Router
│   │   ├── (auth)/           # Authentication routes
│   │   ├── (pages)/          # Public pages
│   │   ├── admin/            # Admin pages
│   │   ├── api/              # API routes
│   │   │   ├── auth/         # Auth API endpoints
│   │   │   ├── trpc/         # tRPC API endpoints
│   │   │   └── ...
│   │   ├── error/            # Error pages
│   │   ├── onboarding/       # Onboarding flow
│   │   └── ...
│   ├── components/           # React components
│   │   ├── analytics/        # Analytics components
│   │   ├── dashboard/        # Dashboard components
│   │   ├── icons/            # Icon components
│   │   ├── layout/           # Layout components
│   │   ├── scheduling/       # Scheduling components
│   │   ├── social/           # Social media components
│   │   ├── ui/               # UI components (shadcn/ui)
│   │   └── ...
│   ├── config/               # Application configuration
│   │   ├── constants.ts      # Constants
│   │   ├── env.ts            # Environment variables
│   │   └── ...
│   ├── features/             # Feature-specific code
│   │   ├── auth/             # Authentication
│   │   ├── scheduling/       # Scheduling
│   │   ├── social/           # Social media
│   │   └── ...
│   ├── lib/                  # Library code
│   │   ├── db/               # Database utilities
│   │   ├── trpc/             # tRPC setup
│   │   ├── validations/      # Validation schemas
│   │   └── ...
│   ├── server/               # Server-side code
│   │   ├── api/              # API handlers
│   │   ├── auth/             # Auth utilities
│   │   ├── permissions/      # Permission logic
│   │   └── ...
│   ├── types/                # TypeScript types
│   │   ├── api.ts            # API types
│   │   ├── auth.ts           # Auth types
│   │   └── ...
│   ├── utils/                # Utility functions
│   │   ├── date.ts           # Date utilities
│   │   ├── formatting.ts     # Formatting utilities
│   │   └── ...
│   └── middleware.ts         # Next.js middleware
├── .eslintrc.json            # ESLint configuration
├── .gitignore                # Git ignore file
├── components.json           # shadcn/ui components config
├── next.config.js            # Next.js configuration
├── package.json              # Dependencies and scripts
├── postcss.config.mjs        # PostCSS configuration
├── tailwind.config.ts        # Tailwind configuration
├── tsconfig.json             # TypeScript configuration
└── ...
```

## Main Features

- Team collaboration
- Social media scheduling
- Content approval workflows
- Media management
- Analytics

## Running Restrukturisasi Script

Untuk menjalankan script restrukturisasi yang akan menyusun ulang codebase sesuai dengan struktur yang direkomendasikan:

```bash
# Menggunakan NPM script
npm run restructure

# Atau menjalankan script langsung
bash scripts/restructure.sh
```

Script ini akan:

1. Membuat backup codebase terlebih dahulu
2. Menghapus file yang tidak perlu (.DS_Store, dll)
3. Membuat struktur direktori baru
4. Memindahkan file ke lokasi yang sesuai
5. Memperbarui import paths

Jika Anda hanya ingin memperbarui import paths:

```bash
npm run update-imports
```

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
