# Manual Cron Job Trigger Troubleshooting Guide

## 🎯 **Masalah Yang Diselesaikan**

Ketika manual trigger job di halaman `/admin/cron` tidak memberikan feedback yang jelas, berikut adalah panduan lengkap untuk troubleshooting dan monitoring.

## ✅ **Konfirmasi: Manual Trigger BEKERJA**

Berdasarkan testing yang telah dilakukan, **manual trigger sebenarnya berfungsi dengan baik**. Masalah utamanya adalah **kurangnya feedback visual** di dashboard.

### Test Results:

```bash
# Job berhasil di-queue
✅ Job queued successfully!
   Job ID: 898
   Queue: maintenance
   Job Type: system_health_check

# Job berhasil dieksekusi (completed count naik dari 26 ke 27)
✅ Job likely completed in queue: maintenance
```

## 🛠️ **Solusi Yang Telah Diimplementasikan**

### 1. **Enhanced CronJobMonitor Component**

- ✅ Toast notifications untuk feedback real-time
- ✅ Execution logs dengan status tracking
- ✅ Queue metrics monitoring
- ✅ Visual indicators untuk job progress

### 2. **Real-time Job Execution Monitor**

- ✅ Floating monitor widget di halaman admin
- ✅ Live queue change detection
- ✅ Detailed execution logs
- ✅ Status tracking (queued → processing → completed/failed)

### 3. **Testing Tools**

- ✅ `npm run test:manual-trigger` - Test individual jobs
- ✅ `npm run test:trigger-all` - Test multiple jobs
- ✅ Real-time monitoring script

## 🔧 **Cara Menggunakan Fitur Baru**

### 1. **Di Dashboard Admin (`/admin/cron`)**

1. **Buka halaman**: `http://localhost:3000/admin/cron`
2. **Aktifkan Job Monitor**: Klik tombol "Job Monitor" di pojok kanan bawah
3. **Start Live Monitoring**: Klik icon mata (👁️) untuk monitoring real-time
4. **Trigger Job**: Klik tombol ⚡ di kolom Actions
5. **Lihat Feedback**:
   - Toast notification akan muncul
   - Execution log akan ditampilkan di monitor
   - Status akan update secara real-time

### 2. **Via Command Line Testing**

```bash
# Test single job
npm run test:manual-trigger

# Test specific job
npm run test:manual-trigger publish_due_posts

# Test multiple jobs
npm run test:trigger-all

# Monitor queue status
npm run jobs:status
```

## 📊 **Monitoring & Debugging**

### 1. **Real-time Queue Metrics**

```bash
# Check current queue status
curl 'localhost:3000/api/cron-manager?action=queue_metrics&apiKey=test-scheduler-key'

# Expected response:
{
  "success": true,
  "result": {
    "maintenance": {
      "waiting": 0,
      "active": 0,
      "completed": 27,  // This should increase after job execution
      "failed": 2,
      "delayed": 6,
      "paused": 0
    }
  }
}
```

### 2. **Job Execution Flow**

```
1. User clicks ⚡ button
   ↓
2. Job queued in Redis (jobId generated)
   ↓
3. BullMQ worker picks up job
   ↓
4. JobProcessor.process() executes
   ↓
5. SchedulerService method runs
   ↓
6. Queue metrics updated (completed++)
   ↓
7. Monitor detects change & shows feedback
```

### 3. **Common Issues & Solutions**

#### **Issue: "Job queued but no feedback"**

**Solution**:

- Aktifkan Job Monitor di dashboard
- Pastikan live monitoring aktif (icon mata hijau)
- Check browser console untuk error

#### **Issue: "Job fails silently"**

**Solution**:

```bash
# Check failed jobs in queue
npm run jobs:status

# Look for failed count increase in specific queues
# Check server logs for error details
```

#### **Issue: "Redis connection problems"**

**Solution**:

```bash
# Test Redis connection
npm run redis:test

# Check Redis status
redis-cli ping

# Restart Redis if needed
brew services restart redis
```

## 🎯 **Job Types & Expected Behavior**

| Job Name                      | Queue       | Expected Duration | What It Does                  |
| ----------------------------- | ----------- | ----------------- | ----------------------------- |
| `system_health_check`         | maintenance | ~1-2s             | Quick system health check     |
| `publish_due_posts`           | scheduler   | ~3-10s            | Publishes scheduled posts     |
| `check_expired_tokens`        | maintenance | ~2-5s             | Validates social media tokens |
| `cleanup_old_logs`            | maintenance | ~1-3s             | Cleans old cron logs          |
| `analyze_engagement_hotspots` | social-sync | ~5-15s            | Analyzes engagement patterns  |
| `fetch_account_insights`      | social-sync | ~10-30s           | Fetches social media insights |
| `collect_posts_analytics`     | social-sync | ~5-20s            | Collects post analytics       |

## 🚀 **Best Practices**

### 1. **Before Manual Triggering**

- ✅ Check if job is already running (avoid duplicate execution)
- ✅ Verify Redis connection is healthy
- ✅ Ensure no system maintenance in progress

### 2. **During Manual Triggering**

- ✅ Activate Job Monitor for real-time feedback
- ✅ Wait for completion before triggering again
- ✅ Monitor queue metrics for changes

### 3. **After Manual Triggering**

- ✅ Verify job completed successfully
- ✅ Check execution logs for any warnings
- ✅ Review job statistics for performance

## 🔍 **Advanced Debugging**

### 1. **Server Logs**

```bash
# In development
npm run dev | grep -i cron

# Look for these patterns:
# "🔄 Processing job: system_health_check"
# "✅ Job completed: system_health_check"
# "❌ Job failed: system_health_check"
```

### 2. **Database Logs**

```sql
-- Check recent cron activity
SELECT name, status, message, "executedAt"
FROM "CronLog"
WHERE name = 'system_health_check'
ORDER BY "executedAt" DESC
LIMIT 10;
```

### 3. **Redis Debugging**

```bash
# Check Redis keys
redis-cli keys "*bull*"

# Monitor Redis commands
redis-cli monitor

# Check memory usage
redis-cli info memory
```

## 📈 **Performance Optimization**

### 1. **Queue Configuration**

- Maintenance queue: 1 worker (sequential processing)
- Scheduler queue: 3 workers (parallel processing)
- Social-sync queue: 3 workers (parallel processing)

### 2. **Job Retry Configuration**

- Default attempts: 3
- Backoff: Exponential (2s, 4s, 8s)
- Timeout: 30s per job

### 3. **Memory Management**

- Keep last 50 completed jobs
- Keep last 20 failed jobs
- Auto-cleanup old logs weekly

## 🎉 **Success Indicators**

Ketika manual trigger bekerja dengan baik, Anda akan melihat:

1. ✅ **Toast notification**: "Job [name] queued successfully!"
2. ✅ **Execution log entry**: Status berubah dari queued → processing → completed
3. ✅ **Queue metrics update**: Completed count bertambah
4. ✅ **Success toast**: "Job [name] completed successfully!"
5. ✅ **Execution time**: Ditampilkan dalam ms

## 🆘 **Emergency Commands**

```bash
# Restart all cron jobs
curl -X POST localhost:3000/api/cron-manager \
  -H "Content-Type: application/json" \
  -d '{"action": "initialize", "apiKey": "test-scheduler-key"}'

# Stop all jobs (emergency)
curl -X POST localhost:3000/api/cron-manager \
  -H "Content-Type: application/json" \
  -d '{"action": "stop_all", "apiKey": "test-scheduler-key"}'

# Check system health
npm run jobs:health
```

---

## 📞 **Support**

Jika masih mengalami masalah:

1. **Check this guide first** ✅
2. **Run diagnostic tools**: `npm run test:manual-trigger`
3. **Check server logs** for detailed error messages
4. **Verify Redis connection**: `npm run redis:test`
5. **Review queue metrics**: `npm run jobs:status`

**Remember**: Manual trigger memang bekerja, yang diperlukan hanya feedback visual yang lebih baik! 🎯
