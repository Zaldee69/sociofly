# 🚨 Cron Jobs Troubleshooting Guide

## Masalah Umum: Jobs Hilang/Berhenti

### 🔍 **Penyebab Utama**

1. **Application Restart** - Next.js development server restart
2. **Memory Management** - Node.js garbage collection
3. **Environment Variables** - Missing `ENABLE_CRON_JOBS=true`
4. **Process Termination** - System atau container restart

### ⚡ **Solusi Cepat**

#### 1. Restart via Dashboard (Recommended)

1. Buka `/admin/cron` atau `/admin`
2. Klik **"Restart All Jobs"** button merah
3. Tunggu hingga status berubah menjadi "Running"

#### 2. Restart via API Call

```bash
# Via curl
curl -X POST localhost:3000/api/cron-manager \
  -H "Content-Type: application/json" \
  -d '{"action": "initialize", "apiKey": "test-scheduler-key"}'

# Via browser console (di halaman admin)
fetch('/api/cron-manager', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'initialize',
    apiKey: 'test-scheduler-key'
  })
}).then(r => r.json()).then(console.log)
```

#### 3. Check Status

```bash
curl "localhost:3000/api/cron-manager?action=status&apiKey=test-scheduler-key"
```

### 🛠️ **Perbaikan Permanen**

#### 1. Set Environment Variables

Buat file `.env.local`:

```env
ENABLE_CRON_JOBS=true
CRON_API_KEY=test-scheduler-key
NEXT_PUBLIC_CRON_API_KEY=test-scheduler-key
```

#### 2. Auto-restart dengan PM2 (Production)

```bash
npm install -g pm2
pm2 start ecosystem.config.js
pm2 startup
pm2 save
```

#### 3. Docker dengan Restart Policy

```yaml
# docker-compose.yml
services:
  app:
    restart: unless-stopped
    environment:
      - ENABLE_CRON_JOBS=true
```

### 📊 **Monitoring Status**

#### Health Check Indicators:

- ✅ **Green**: Semua jobs running
- 🟡 **Yellow**: Sebagian jobs running
- 🔴 **Red**: Tidak ada jobs running
- 🟠 **Orange**: Jobs pending (started tapi belum complete)

#### Quick Status Check:

```bash
# Check if jobs are running
curl -s "localhost:3000/api/cron-manager?action=status&apiKey=test-scheduler-key" | grep -o '"running":true' | wc -l

# Check execution stats
curl -s "localhost:3000/api/cron-manager?action=stats&apiKey=test-scheduler-key" | grep -o '"totalLogs":[0-9]*'
```

### 🔧 **Advanced Troubleshooting**

#### 1. Check Application Logs

```bash
# Development
npm run dev | grep -i cron

# Production
pm2 logs app | grep -i cron
```

#### 2. Manual Job Trigger

```bash
# Test individual jobs
curl -X POST localhost:3000/api/cron-manager \
  -H "Content-Type: application/json" \
  -d '{"action": "trigger", "jobName": "system_health_check", "apiKey": "test-scheduler-key"}'
```

#### 3. Database Check

```sql
-- Check recent cron activity
SELECT name, status, message, "executedAt"
FROM "CronLog"
ORDER BY "executedAt" DESC
LIMIT 20;

-- Check job statistics
SELECT name, COUNT(*) as total, status
FROM "CronLog"
WHERE "executedAt" > NOW() - INTERVAL '1 hour'
GROUP BY name, status;
```

### 🚀 **Prevention Strategies**

#### 1. Auto-restart on Development

Add to `package.json`:

```json
{
  "scripts": {
    "dev": "ENABLE_CRON_JOBS=true next dev",
    "dev:cron": "ENABLE_CRON_JOBS=true next dev"
  }
}
```

#### 2. Health Check Endpoint

Monitor via: `GET /api/cron-manager?action=stats`

#### 3. Automated Alerts

Set up monitoring dengan tools seperti:

- Uptime Robot
- Better Stack
- New Relic
- DataDog

### 📞 **Emergency Commands**

```bash
# Quick restart all jobs
curl -X POST localhost:3000/api/cron-manager -H "Content-Type: application/json" -d '{"action": "initialize", "apiKey": "test-scheduler-key"}'

# Check status
curl "localhost:3000/api/cron-manager?action=status&apiKey=test-scheduler-key"

# Stop all jobs (if needed)
curl -X POST localhost:3000/api/cron-manager -H "Content-Type: application/json" -d '{"action": "stop", "apiKey": "test-scheduler-key"}'
```

### 🔍 **Expected Job List**

Jobs yang harus running:

- `publish_due_posts` - Every 5 minutes
- `process_edge_cases` - Every hour
- `check_expired_tokens` - Daily at 2 AM
- `system_health_check` - Every 15 minutes
- `cleanup_old_logs` - Weekly on Sunday

Total: **5 jobs** harus dalam status "running": true

---

## 📋 **Checklist Ketika Jobs Hilang**

- [ ] Cek dashboard `/admin/cron`
- [ ] Klik "Restart All Jobs" button
- [ ] Tunggu 1-2 menit untuk refresh
- [ ] Verify 5/5 jobs running
- [ ] Monitor success rate statistics
- [ ] Check logs untuk error messages
- [ ] Test manual trigger untuk job tertentu
- [ ] Document kapan terjadinya untuk pattern analysis

Jika masih bermasalah, restart aplikasi dengan `npm run dev` atau `pm2 restart app`.
