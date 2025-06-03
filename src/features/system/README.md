# System Feature

Feature ini berisi komponen-komponen untuk monitoring dan administrasi sistem.

## Components

### 🕒 CronJobMonitor

Dashboard untuk monitoring dan mengelola cron jobs:

- Real-time status monitoring
- Execution statistics & success rates
- Manual job triggers
- Start/stop job controls
- Health alerts

**Usage:**

```tsx
// src/app/admin/cron/page.tsx
import { CronJobMonitor } from "@/features/system";

export default function CronJobsPage() {
  return <CronJobMonitor />;
}
```

### 📊 ApprovalSystemHealth

Dashboard untuk monitoring kesehatan sistem approval:

- Health score calculation (0-100)
- Edge case detection & handling
- Pending approval metrics
- System recommendations

**Usage:**

```tsx
// src/app/admin/system-health/page.tsx
import { ApprovalSystemHealth } from "@/features/system";

export default function SystemHealthPage() {
  return <ApprovalSystemHealth />;
}
```

## Admin Pages

Komponen-komponen ini digunakan di halaman admin berikut:

- **`/admin`** - Dashboard utama (gabungan semua komponen)
- **`/admin/cron`** - Dedicated cron jobs monitoring
- **`/admin/system-health`** - Dedicated approval system health

## File Structure

```
src/
├── app/admin/                     # Admin pages (Next.js App Router)
│   ├── layout.tsx                 # Admin layout with navigation
│   ├── page.tsx                   # Main admin dashboard
│   ├── cron/page.tsx              # Cron jobs page
│   └── system-health/page.tsx     # System health page
├── features/system/               # System feature components
│   ├── components/
│   │   ├── cron-job-monitor.tsx       # Cron job dashboard
│   │   ├── approval-system-health.tsx # Approval system monitoring
│   │   └── index.ts                   # Component exports
│   ├── index.ts                       # Feature exports
│   └── README.md                      # This file
└── lib/services/                  # Backend services
    ├── cron-manager.ts            # Cron job management
    ├── scheduler.service.ts       # Task scheduling
    └── approval-edge-case-handler.ts # Edge case handling
```

## Related Services

- `@/lib/services/cron-manager` - Cron job management
- `@/lib/services/scheduler.service` - Task scheduling
- `@/lib/services/approval-edge-case-handler` - Edge case handling

## API Endpoints

- `GET/POST /api/cron-manager` - Cron job control API
- `GET /api/cron` - Legacy cron endpoint (deprecated)

## Documentation

See [CRON_SETUP.md](../../../CRON_SETUP.md) and [APPROVAL_EDGE_CASES.md](../../../APPROVAL_EDGE_CASES.md) for detailed setup and usage instructions.
