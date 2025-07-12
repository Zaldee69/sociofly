# Redis Optimization Scripts

Kumpulan script untuk monitoring, troubleshooting, dan optimasi Redis command rate yang tinggi.

## 🚨 Quick Emergency Response

Jika Redis command rate sangat tinggi (>35 commands/sec):

```bash
# 1. Apply emergency throttling immediately
yarn redis:throttle

# 2. Monitor real-time untuk melihat improvement
yarn redis:monitor-live

# 3. Setelah stabil, resume normal operations
yarn redis:resume
```

## 📊 Monitoring Tools

### Real-time Redis Monitor
```bash
# Monitor dengan interval default (10 detik)
yarn redis:monitor-live

# Monitor dengan interval custom (5 detik)
npx tsx scripts/redis-monitor.ts 5
```

**Features:**
- Real-time command rate monitoring
- Color-coded alerts (🟢 Normal, 🟡 Warning, 🔴 Critical, 🆘 Emergency)
- Queue size monitoring
- Memory usage tracking
- Summary report saat exit

**Thresholds:**
- 🟢 Normal: <20 commands/sec
- 🟡 Warning: 20-34 commands/sec
- 🔴 Critical: 35-49 commands/sec
- 🆘 Emergency: ≥50 commands/sec

### Legacy Monitoring
```bash
# Monitor command rate (legacy)
yarn redis:monitor-rate

# Redis diagnostics
yarn redis:diagnostics
```

## 🔧 Optimization Tools

### Automated Analysis & Optimization
```bash
# Analyze current Redis state
yarn redis:analyze

# Analyze and apply optimizations (with manual confirmation)
yarn redis:optimize

# Auto-apply all recommended optimizations
yarn redis:optimize-auto
```

**Optimization Categories:**
- **Polling**: Reduce polling frequency
- **Workers**: Optimize worker concurrency
- **Queues**: Implement queue cleanup
- **Memory**: Optimize memory usage
- **Configuration**: Update optimization configs

### Manual Configuration Reset
```bash
# Reset to default (non-optimized) configuration
yarn redis:reset
```
⚠️ **Warning:** Ini akan meningkatkan Redis load secara signifikan!

## 🆘 Emergency Response

### Emergency Throttling
```bash
# Apply emergency throttling
yarn redis:throttle

# Resume normal operations
yarn redis:resume
```

**Emergency Actions (berdasarkan severity):**

#### Low Severity (20-25 commands/sec)
- Pause non-critical queues (reports, maintenance, social-sync)

#### Medium Severity (25-35 commands/sec)
- Apply emergency rate limiting
- Pause non-critical queues

#### High Severity (35-50 commands/sec)
- Reduce workers to minimum
- Emergency queue cleanup
- Apply all medium severity actions

#### Critical Severity (>50 commands/sec)
- **PAUSE ALL QUEUES** temporarily
- Apply all previous actions
- Requires immediate investigation

## 📋 Usage Scenarios

### Scenario 1: Daily Monitoring
```bash
# Start monitoring di background
yarn redis:monitor-live &

# Check analysis
yarn redis:analyze
```

### Scenario 2: Performance Issues
```bash
# 1. Analyze current state
yarn redis:analyze

# 2. Apply optimizations
yarn redis:optimize-auto

# 3. Monitor results
yarn redis:monitor-live
```

### Scenario 3: Emergency Response
```bash
# 1. Immediate throttling
yarn redis:throttle

# 2. Monitor improvement
yarn redis:monitor-live

# 3. If still high, investigate further
yarn redis:analyze

# 4. Resume when stable
yarn redis:resume
```

### Scenario 4: Testing Optimizations
```bash
# 1. Baseline measurement
yarn redis:monitor-live &

# 2. Apply optimizations
yarn redis:optimize-auto

# 3. Monitor for 10-15 minutes
# 4. If issues, reset and try different approach
yarn redis:reset
```

## 🔍 Troubleshooting

### Command Rate Masih Tinggi
1. **Check for new polling sources:**
   ```bash
   grep -r "setInterval" src/
   grep -r "useEffect.*\[\]" src/
   ```

2. **Verify optimizations applied:**
   ```bash
   grep -A 5 "getRefreshInterval" src/features/cron/components/cron-job-monitor.tsx
   ```

3. **Check queue sizes:**
   ```bash
   yarn redis:analyze
   ```

### Memory Usage Tinggi
1. **Emergency cleanup:**
   ```bash
   yarn redis:throttle
   ```

2. **Check job retention:**
   - Review `removeOnComplete` dan `removeOnFail` settings
   - Consider reducing job history retention

### Performance Degradation
1. **Full analysis:**
   ```bash
   yarn redis:analyze
   ```

2. **Targeted optimization:**
   ```bash
   yarn redis:optimize
   ```

## 📊 Expected Results

### Before Optimization
- Command rate: 25-40+ commands/second
- Polling intervals: 1-5 seconds
- Memory usage: Growing

### After Optimization
- Command rate: <15 commands/second
- Polling intervals: 15-120 seconds
- Memory usage: Stable
- Functionality: Maintained

### Optimization Impact
- **Cron Monitor**: ~60% reduction
- **Dashboard Polling**: ~60% reduction
- **Health Checks**: ~50% reduction
- **Redis Monitoring**: ~50% reduction
- **Overall**: 40-60% load reduction

## ⚙️ Configuration Files

Optimasi diterapkan pada:
- `src/features/cron/components/cron-job-monitor.tsx`
- `src/features/post/components/post-monitoring-dashboard.tsx`
- `src/features/system/components/approval-system-health.tsx`
- `src/lib/queue/redis-performance-monitor.ts`
- `src/lib/queue/redis-dashboard.ts`
- `src/lib/queue/redis-optimization-config.ts`

## 📚 Documentation

Lihat dokumentasi lengkap di:
- `docs/redis-optimization-guide.md` - Panduan lengkap optimasi
- `redis-polling-optimization.md` - Detail optimasi polling

## 🚀 Best Practices

1. **Monitor regularly:** Jalankan `yarn redis:monitor-live` secara berkala
2. **Analyze weekly:** Gunakan `yarn redis:analyze` untuk review mingguan
3. **Emergency preparedness:** Familiarize dengan `yarn redis:throttle`
4. **Document changes:** Catat setiap perubahan konfigurasi
5. **Test optimizations:** Selalu monitor setelah apply optimizations

## 📞 Support

Jika mengalami masalah:
1. Check logs aplikasi dan Redis
2. Run `yarn redis:analyze` untuk diagnostics
3. Apply emergency measures jika command rate >35/sec
4. Document issues untuk analisis lebih lanjut

---

**Last Updated:** December 2024  
**Scripts Version:** 1.0.0