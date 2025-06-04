# Cron Job Setup Documentation

## Overview

Sistem cron job yang terintegrasi dengan `node-cron` untuk menjalankan tugas-tugas otomatis seperti:

- ✅ **Publish Due Posts** - Mempublikasi post yang sudah waktunya (setiap 5 menit)
- 🔍 **Process Edge Cases** - Menangani edge cases approval system (setiap jam)
- 🔐 **Check Expired Tokens** - Cek token social media yang expired (harian)
- 📊 **System Health Check** - Monitor kesehatan sistem (setiap 15 menit)
- 🧹 **Cleanup Old Logs** - Bersihkan log lama (mingguan)

## Quick Start

### 1. Environment Variables

Tambahkan ke file `.env`:

```bash
# Cron Job Configuration
CRON_API_KEY=your-secure-cron-api-key
NEXT_PUBLIC_CRON_API_KEY=your-secure-cron-api-key

# Cron Job Controls (set to "false" to disable specific jobs)
ENABLE_CRON_JOBS=true
CRON_PUBLISH_ENABLED=true
CRON_EDGE_CASES_ENABLED=true
CRON_TOKEN_CHECK_ENABLED=true
CRON_HEALTH_CHECK_ENABLED=true
CRON_CLEANUP_ENABLED=true

# Timezone for cron jobs
TZ=Asia/Jakarta
```

### 2. Enable di Development

Secara default, cron jobs hanya berjalan di production. Untuk enable di development:

```bash
ENABLE_CRON_JOBS=true
```

### 3. Start Development Server

```bash
npm run dev
```

Cron jobs akan otomatis diinisialisasi jika `ENABLE_CRON_JOBS=true`.

## Manual Control via API

### 1. Check Status

```bash
curl "http://localhost:3000/api/cron-manager?action=status&apiKey=your-key"
```

### 2. Get Statistics

```bash
curl "http://localhost:3000/api/cron-manager?action=stats&hours=24&apiKey=your-key"
```

### 3. Trigger Job Manually

```bash
curl -X POST http://localhost:3000/api/cron-manager \
  -H "Content-Type: application/json" \
  -d '{
    "action": "trigger",
    "jobName": "publish_due_posts",
    "apiKey": "your-key"
  }'
```

### 4. Stop/Start Jobs

```bash
# Stop specific job
curl -X POST http://localhost:3000/api/cron-manager \
  -H "Content-Type: application/json" \
  -d '{
    "action": "stop",
    "jobName": "publish_due_posts",
    "apiKey": "your-key"
  }'

# Start specific job
curl -X POST http://localhost:3000/api/cron-manager \
  -H "Content-Type: application/json" \
  -d '{
    "action": "start",
    "jobName": "publish_due_posts",
    "apiKey": "your-key"
  }'
```

## Dashboard Monitoring

Akses dashboard monitoring melalui halaman admin:

- **`/admin`** - Dashboard utama dengan semua monitoring
- **`/admin/cron`** - Dedicated cron jobs monitoring
- **`/admin/system-health`** - Dedicated approval system health

### Features:

- 📊 Monitor status semua cron jobs
- 📈 Lihat statistik execution (success rate, last run, dll)
- ⚡ Manual trigger jobs
- ⏸️ Start/stop jobs secara manual
- 🚨 Alert jika ada jobs yang tidak berjalan

### Admin Layout:

Halaman admin dilengkapi dengan sidebar navigation untuk mudah berpindah antar halaman monitoring.

## Job Schedules

| Job Name               | Schedule       | Description                                         |
| ---------------------- | -------------- | --------------------------------------------------- |
| `publish_due_posts`    | `*/5 * * * *`  | Setiap 5 menit - Publikasi post yang sudah waktunya |
| `process_edge_cases`   | `0 */1 * * *`  | Setiap jam - Proses edge cases approval             |
| `check_expired_tokens` | `0 2 * * *`    | Harian jam 2 pagi - Cek token expired               |
| `system_health_check`  | `*/15 * * * *` | Setiap 15 menit - Monitor kesehatan sistem          |
| `cleanup_old_logs`     | `0 3 * * 0`    | Mingguan Minggu jam 3 pagi - Bersihkan log lama     |

## Programmatic Usage

### Initialize Cron Manager

```typescript
import { CronManager } from "@/lib/services/cron-manager";

// Initialize all jobs
await CronManager.initialize();

// Get job status
const status = CronManager.getJobStatus();

// Get statistics
const stats = await CronManager.getJobStatistics(24); // last 24 hours

// Trigger specific job
const result = await CronManager.triggerJob("publish_due_posts");

// Stop/start jobs
CronManager.stopJob("publish_due_posts");
CronManager.startJob("publish_due_posts");

// Stop all jobs
CronManager.stopAll();
```

### Manual Job Execution

```typescript
import { SchedulerService } from "@/lib/services/scheduler.service";

// Publish due posts
const publishResult = await SchedulerService.processDuePublications();

// Process edge cases
const edgeCaseResult = await SchedulerService.processApprovalEdgeCases();

// Check expired tokens
const tokenResult = await SchedulerService.checkExpiredTokens();

// Get system health
const health = await SchedulerService.getApprovalSystemHealth();
```

## Logging & Monitoring

### Database Logs

Semua execution dicatat di tabel `CronLog`:

```sql
SELECT * FROM CronLog
WHERE name = 'publish_due_posts'
ORDER BY executedAt DESC
LIMIT 10;
```

### Console Logs

```
🕒 Initializing Cron Manager...
🕒 Registered cron job: publish_due_posts (*/5 * * * *) - Publish posts that are due for publication
🕒 Registered cron job: process_edge_cases (0 */1 * * *) - Process approval system edge cases
✅ Cron Manager initialized successfully

🚀 Executing cron job: publish_due_posts
✅ Completed cron job: publish_due_posts (1234ms)
```

### Health Monitoring

System health score (0-100) berdasarkan:

- Overdue posts: -10 poin per post (max -50)
- Stuck approvals: -15 poin per approval (max -30)
- Expired tokens: -5 poin per token (max -20)

## Production Deployment

### 1. Environment Variables

```bash
# Production settings
NODE_ENV=production
ENABLE_CRON_JOBS=true  # Optional, defaults to true in production

# Timezone
TZ=Asia/Jakarta

# API Security
CRON_API_KEY=secure-random-key-here
NEXT_PUBLIC_CRON_API_KEY=secure-random-key-here
```

### 2. Process Monitoring

Cron jobs berjalan di dalam proses Next.js. Pastikan:

- Process manager (PM2/Docker) restart otomatis jika crash
- Health check endpoint tersedia
- Log monitoring setup

### 3. External Monitoring (Optional)

Setup external cron monitoring service seperti:

```bash
# Health check setiap 5 menit
*/5 * * * * curl -f http://your-domain.com/api/cron-manager?action=status&apiKey=your-key || echo "Cron health check failed"
```

## Troubleshooting

### 1. Cron Jobs Tidak Berjalan

```bash
# Check console logs saat startup
✅ Cron Manager initialized successfully

# Check environment variables
echo $ENABLE_CRON_JOBS
echo $NODE_ENV
```

### 2. Job Execution Errors

```bash
# Check CronLog table
SELECT * FROM CronLog WHERE status = 'ERROR' ORDER BY executedAt DESC;

# Check specific job logs
SELECT * FROM CronLog WHERE name = 'publish_due_posts' AND status = 'ERROR';
```

### 3. Performance Issues

```bash
# Check execution times
SELECT name, message FROM CronLog
WHERE message LIKE '%completed successfully in%'
ORDER BY executedAt DESC;

# Monitor resource usage
# - Database connections
# - Memory usage
# - CPU usage during job execution
```

### 4. Manual Recovery

```typescript
// Force initialize if needed
await CronManager.initialize();

// Manual trigger critical jobs
await CronManager.triggerJob("publish_due_posts");
await CronManager.triggerJob("process_edge_cases");

// Check system health
const health = await SchedulerService.getApprovalSystemHealth();
console.log(health);
```

## Best Practices

### 1. Job Execution

- ✅ Jobs are idempotent (safe to run multiple times)
- ✅ Error handling with graceful degradation
- ✅ Timeout protection (jobs won't run forever)
- ✅ Database transaction safety

### 2. Monitoring

- 📊 Dashboard monitoring for admins
- 🚨 Alert system for critical failures
- 📝 Comprehensive logging for debugging
- 📈 Performance metrics tracking

### 3. Security

- 🔐 API key protection for manual triggers
- 🛡️ Rate limiting on manual endpoints
- 🔒 Role-based access for dashboard
- 🚫 No sensitive data in logs

### 4. Scalability

- 🔄 Jobs designed for horizontal scaling
- ⚡ Efficient database queries
- 🎯 Targeted execution (only process what's needed)
- 📊 Health score-based prioritization

## Advanced Configuration

### Custom Job Schedules

Ubah schedule di `CronManager`:

```typescript
const jobConfigs: CronJobConfig[] = [
  {
    name: "publish_due_posts",
    schedule: "*/2 * * * *", // Every 2 minutes instead of 5
    description: "Publish posts that are due for publication",
    enabled: process.env.CRON_PUBLISH_ENABLED !== "false",
    handler: this.handlePublishDuePosts,
  },
  // ... other jobs
];
```

### Add Custom Jobs

```typescript
{
  name: "custom_cleanup",
  schedule: "0 4 * * *", // Daily at 4 AM
  description: "Custom cleanup job",
  enabled: process.env.CRON_CUSTOM_ENABLED !== "false",
  handler: this.handleCustomCleanup,
},
```

### Job Dependencies

```typescript
private static async handlePublishDuePosts(): Promise<any> {
  // Run health check first
  await this.handleSystemHealthCheck();

  // Then publish posts
  return await SchedulerService.processDuePublications();
}
```
