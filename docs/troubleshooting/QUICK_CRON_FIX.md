# 🚨 Quick Cron Jobs Fix

## Problem: Cron Jobs Hilang (0/0 jobs running)

### ⚡ **SOLUSI CEPAT (Quick Fix)**

```bash
# 1. Cek server berjalan atau tidak
npm run cron:status

# 2. Jika error "connection refused":
npm run dev:cron
# Tunggu 10 detik, lalu:
npm run cron:restart

# 3. Jika server sudah jalan tapi jobs 0/0:
npm run cron:restart

# 4. Jika mendapat 401 Unauthorized:
# Pastikan middleware.ts sudah mengexclude /api/cron-manager
```

### 🔐 **MASALAH MIDDLEWARE AUTHENTICATION**

**Gejala**: API cron-manager mendapat `401 Unauthorized` atau `x-clerk-auth-reason: dev-browser-missing`

**Penyebab**: Clerk middleware memblokir akses ke API cron-manager

**Solusi**: Pastikan di `src/middleware.ts` ada bypass untuk cron routes:

```typescript
// Skip authentication entirely for cron API routes
if (
  req.nextUrl.pathname.startsWith("/api/cron-manager") ||
  req.nextUrl.pathname.startsWith("/api/cron/")
) {
  console.log(`🔓 Bypassing Clerk auth for: ${req.nextUrl.pathname}`);
  return NextResponse.next();
}
```

### 🔄 **SOLUSI OTOMATIS (Auto-Restart)**

```bash
# Gunakan script auto-monitoring:
npm run dev:auto
```

Script ini akan:

- ✅ Start server dengan cron enabled
- ✅ Auto-initialize cron jobs
- ✅ Monitor setiap menit
- ✅ Auto-restart jika jobs berhenti

### 📊 **CHECK STATUS**

```bash
# Status lengkap
npm run cron:status

# Statistics detail
npm run cron:stats

# Monitor real-time (setiap 30 detik)
npm run cron:monitor
```

### 🧪 **TEST INTEGRATION**

```bash
# Test semua komponen
npm run test:integration
```

Expected output:

```
✅ Due posts processed: X success, Y failed, Z skipped
✅ Publisher integration test complete
✅ Edge cases processed: N reports generated
💚 System Health Score: 90/100
```

---

## 🔍 **DIAGNOSIS MASALAH**

### **Penyebab Umum:**

1. **Server restart** - Development server di-restart
2. **Environment variables** - `ENABLE_CRON_JOBS` tidak di-set
3. **Memory management** - Node.js garbage collection
4. **Process termination** - Terminal/app ditutup
5. **⚠️ Middleware blocking** - Clerk middleware memblokir API cron

### **Cara Cek Issue:**

```bash
# 1. Cek apakah server respond
curl -I localhost:3000

# 2. Test API cron tanpa auth
curl "localhost:3000/api/cron-manager?action=status&apiKey=test-scheduler-key"

# 3. Lihat headers response
curl -v "localhost:3000/api/cron-manager?action=status&apiKey=test-scheduler-key"
```

**Expected**: `HTTP/1.1 200 OK` dan JSON response  
**Problem**: `HTTP/1.1 401 Unauthorized` atau `x-clerk-auth-reason`

### **Solusi Permanen:**

1. Gunakan `npm run dev:auto` untuk development
2. Set environment variables di production
3. Gunakan PM2 untuk production deployment
4. **Pastikan middleware bypass cron routes**

---

## 📝 **USEFUL COMMANDS**

```bash
# Development
npm run dev:auto          # Auto-monitoring startup
npm run dev:cron         # Manual startup with cron

# Management
npm run cron:restart     # Restart jobs
npm run cron:status      # Check status
npm run cron:stats       # View statistics
npm run cron:stop        # Stop all jobs

# Testing
npm run test:integration # Full system test
npm run test:cron       # Cron system test

# Monitoring
npm run cron:monitor    # Watch status (30s interval)

# Debug API
curl -v "localhost:3000/api/cron-manager?action=status&apiKey=test-scheduler-key"
curl -I localhost:3000/api/cron-manager
```

---

## 🛠️ **TROUBLESHOOTING CHECKLIST**

- [ ] ✅ Server running (`curl -I localhost:3000`)
- [ ] ✅ Environment vars set (`ENABLE_CRON_JOBS=true`)
- [ ] ✅ Middleware bypass cron routes
- [ ] ✅ API key correct (`test-scheduler-key`)
- [ ] ✅ No 401 errors in API calls
- [ ] ✅ 5/5 jobs running
- [ ] ✅ Success rate > 80%

**💡 TIP**: Jika masalah terus berulang, restart terminal dan gunakan `npm run dev:auto`
