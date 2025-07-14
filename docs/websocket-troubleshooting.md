# WebSocket Troubleshooting Guide

## Masalah: "WebSocket server not available"

### Deskripsi Masalah

Error ini terjadi ketika sistem mencoba mengirim notifikasi real-time melalui WebSocket, tetapi WebSocket server belum diinisialisasi atau tidak tersedia.

```
WebSocket server not available
📝 WebSocket delivery failed, saving to database for user cmcyex54l0003vxwkek8kq2hd
```

### Penyebab

1. **WebSocket server tidak diinisialisasi**: Fungsi `initializeWebSocket()` hanya menandai status sebagai "initialized" tanpa benar-benar membuat server.
2. **Tidak ada HTTP server**: WebSocket membutuhkan HTTP server untuk berjalan, tetapi Next.js menggunakan server internal yang tidak dapat diakses.
3. **Port configuration**: WebSocket client mencoba terhubung ke port yang salah.

### Solusi yang Diterapkan

#### 1. Perbaikan WebSocket Middleware

File: `src/lib/websocket/websocket-middleware.ts`

**Sebelum:**

```typescript
export async function initializeWebSocket() {
  // Hanya menandai sebagai initialized tanpa membuat server
  isWebSocketInitialized = true;
  console.log("WebSocket server marked for initialization");
}
```

**Sesudah:**

```typescript
export async function initializeWebSocket() {
  try {
    // Membuat HTTP server untuk WebSocket
    const { createServer } = await import("http");
    httpServer = createServer();

    // Inisialisasi WebSocket server dengan HTTP server
    const webSocketServer = initializeWebSocketServer(httpServer);

    if (webSocketServer) {
      // Menjalankan HTTP server pada port terpisah
      const wsPort = process.env.WEBSOCKET_PORT || 3001;
      httpServer.listen(wsPort, () => {
        console.log(`🚀 WebSocket server listening on port ${wsPort}`);
      });

      isWebSocketInitialized = true;
    }
  } catch (error) {
    console.error("Failed to initialize WebSocket server:", error);
  }
}
```

#### 2. Update WebSocket Client Configuration

File: `src/lib/hooks/use-websocket.ts`

**Perubahan:**

- Client sekarang terhubung ke port WebSocket yang terpisah (3001) bukan port aplikasi utama (3000)
- Menambahkan konfigurasi environment variables untuk WebSocket URL

```typescript
// Use WebSocket port (3001) instead of main app port (3000)
const wsPort = process.env.NEXT_PUBLIC_WEBSOCKET_PORT || "3001";
const wsUrl =
  process.env.NEXT_PUBLIC_WEBSOCKET_URL || `http://localhost:${wsPort}`;

const socket = io(wsUrl, {
  transports: ["websocket", "polling"],
  // ... other options
});
```

#### 3. Environment Variables

File: `.env.example`

Menambahkan konfigurasi environment variables:

```env
# WebSocket Configuration
WEBSOCKET_PORT=3001
NEXT_PUBLIC_WEBSOCKET_PORT=3001
NEXT_PUBLIC_WEBSOCKET_URL=http://localhost:3001
```

### Cara Menggunakan

1. **Setup Environment Variables**

   ```bash
   cp .env.example .env.local
   ```

   Pastikan variabel WebSocket sudah dikonfigurasi:

   ```env
   WEBSOCKET_PORT=3001
   NEXT_PUBLIC_WEBSOCKET_PORT=3001
   NEXT_PUBLIC_WEBSOCKET_URL=http://localhost:3001
   ```

2. **Restart Development Server**

   ```bash
   npm run dev
   # atau
   yarn dev
   ```

3. **Verifikasi WebSocket Connection**
   - Buka browser console
   - Cari log: `🚀 WebSocket server listening on port 3001`
   - Cari log: `🔌 WebSocket connected`

### Monitoring dan Debugging

#### 1. Check WebSocket Status

```bash
curl http://localhost:3000/api/websocket
```

#### 2. Check WebSocket Stats

```bash
curl http://localhost:3000/api/websocket/stats
```

#### 3. Check WebSocket Health

```bash
curl http://localhost:3000/api/websocket/health
```

### Fallback Mechanism

Jika WebSocket gagal, sistem akan:

1. **Primary**: Mencoba mengirim via WebSocket
2. **Fallback**: Menyimpan notifikasi ke database
3. **Recovery**: User akan menerima notifikasi saat terhubung kembali

### Production Deployment

Untuk production, pastikan:

1. **Environment Variables** dikonfigurasi dengan benar
2. **Firewall** mengizinkan akses ke port WebSocket
3. **Load Balancer** dikonfigurasi untuk WebSocket (sticky sessions)
4. **SSL/TLS** dikonfigurasi untuk WebSocket Secure (WSS)

```env
# Production Example
WEBSOCKET_PORT=3001
NEXT_PUBLIC_WEBSOCKET_URL=wss://your-domain.com:3001
```

### Troubleshooting Lanjutan

#### Error: "EADDRINUSE"

```bash
# Check port usage
lsof -i :3001

# Kill process if needed
kill -9 <PID>
```

#### Error: "Connection refused"

1. Pastikan WebSocket server berjalan
2. Check firewall settings
3. Verify port configuration

#### Error: "CORS issues"

Pastikan CORS dikonfigurasi dengan benar di WebSocket server:

```typescript
this.io = new SocketIOServer(server, {
  cors: {
    origin: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});
```

#### Error: "until: not found" (Exit Code 127)

**Masalah**: Container restart dengan error `/usr/local/bin/docker-entrypoint.sh: exec: line 11: until: not found`

**Penyebab**: Command `until` tidak tersedia di Alpine Linux yang menggunakan ash shell, bukan bash.

**Solusi**: Gunakan `while ! condition` sebagai pengganti `until condition`

```yaml
# ❌ Tidak kompatibel dengan Alpine Linux
command: "until nc -z redis 6379; do echo 'Waiting for Redis...'; sleep 2; done && echo 'Redis ready' && node server.js"

# ✅ Kompatibel dengan Alpine Linux
command: "sh -c 'while ! nc -z redis 6379; do echo \"Waiting for Redis...\"; sleep 2; done && echo \"Redis ready\" && node server.js'"
```

**File yang diperbaiki**:
- `docker-compose.dev.yml`
- `.github/workflows/ci-cd.yml`

**Verifikasi perbaikan**:
```bash
# Check container status
docker-compose -f docker-compose.dev.yml ps

# Check logs
docker-compose -f docker-compose.dev.yml logs app
docker-compose -f docker-compose.dev.yml logs websocket
```

### Logs untuk Monitoring

**Successful Connection:**

```
🚀 WebSocket server listening on port 3001
🔌 WebSocket client connected: <socket-id>
✅ User authenticated: <user-id>
📨 Real-time notification sent to user <user-id>
```

**Failed Connection:**

```
⚠️ WebSocket server not available
📝 WebSocket delivery failed, saving to database for user <user-id>
```
