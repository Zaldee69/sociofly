# Approval System Edge Cases Documentation

## Overview

Sistem approval untuk post scheduling dapat mengalami berbagai edge cases yang perlu ditangani secara otomatis untuk memastikan pengalaman pengguna yang optimal. Dokumentasi ini menjelaskan edge cases yang mungkin terjadi dan bagaimana sistem menanganinya.

## Edge Cases yang Ditangani

### 1. **Posts dengan Waktu Posting Sudah Lewat (Expired Scheduled Posts)**

**Masalah**: Post yang memerlukan approval tetapi waktu posting yang dijadwalkan sudah terlewat

**Kondisi**:

- Status post: `DRAFT` (masih dalam proses approval)
- Waktu posting (`scheduledAt`) sudah lewat dari waktu sekarang
- Ada approval instance dengan status `IN_PROGRESS`

**Strategi Penanganan**:

- **0-2 jam terlambat**: Kirim reminder urgent ke approver yang tertunda
- **2-24 jam terlambat**: Auto-reschedule post ke 2 jam ke depan + notifikasi ke author
- **>24 jam terlambat**: Tandai post sebagai expired (`FAILED`) + butuh action manual dari author

**Implementasi**:

```typescript
// Contoh penggunaan
await ApprovalEdgeCaseHandler.handleExpiredScheduledPosts();
```

### 2. **Approval yang Terjebak/Stuck**

**Masalah**: Approval yang tidak ada aktivitas dalam waktu lama

**Kondisi**:

- Approval instance dengan status `IN_PROGRESS`
- Dibuat lebih dari 48 jam yang lalu
- Semua assignment masih `PENDING` tanpa ada yang selesai

**Strategi Penanganan**:

- Eskalasi ke manager atau owner team
- Buat assignment baru untuk manager
- Kirim notifikasi eskalasi

### 3. **Approver yang Tidak Aktif/Hilang**

**Masalah**: User yang ditugaskan untuk approval sudah tidak aktif atau dihapus

**Kondisi**:

- Assignment dengan status `PENDING`
- User yang assigned sudah tidak ada (deleted/deactivated)
- Atau tidak ada user aktif dengan role yang diperlukan

**Strategi Penanganan**:

- Reassign ke team manager atau owner
- Update assignment dengan user yang valid

### 4. **Posts Approved tapi Waktu Posting Sudah Lewat**

**Masalah**: Post sudah disetujui tetapi waktu posting sudah terlewat

**Kondisi**:

- Status post: `DRAFT` (belum dipublish)
- Waktu posting sudah lewat
- Ada approval instance dengan status `APPROVED`

**Strategi Penanganan**:

- **≤6 jam terlambat**: Auto-publish langsung
- **>6 jam terlambat**: Minta reconfirmation dari author

### 5. **Social Accounts Tidak Valid**

**Masalah**: Post dijadwalkan untuk social account yang tokennya expired atau tidak aktif

**Kondisi**:

- Post dengan status `SCHEDULED` atau `DRAFT`
- Social account memiliki token yang expired (`expiresAt < now`)

**Strategi Penanganan**:

- Kirim notifikasi ke author untuk reconnect account
- List account mana saja yang perlu direconnect

## Monitoring dan Health Score

### Health Score Calculation

Health score dihitung berdasarkan:

- **Base Score**: 100
- **Deduction**:
  - Overdue posts: -10 poin per post (max -50)
  - Stuck approvals: -15 poin per approval (max -30)
  - Expired tokens: -5 poin per token (max -20)

### Health Score Categories

- **80-100**: Excellent (hijau) - Semua sistem normal
- **60-79**: Good (kuning) - Masalah minor terdeteksi
- **30-59**: Needs Attention (orange) - Beberapa masalah perlu perhatian
- **0-29**: Critical (merah) - Masalah kritis perlu action segera

## Penggunaan

### 1. Manual Trigger (Dashboard)

```typescript
// Komponen dashboard untuk admin
import { ApprovalSystemHealth } from "@/components/dashboard/approval-system-health";

function AdminDashboard() {
  return (
    <div>
      <ApprovalSystemHealth />
    </div>
  );
}
```

### 2. Cron Job Integration

```bash
# Cron job setiap jam untuk edge case processing
curl -X POST http://localhost:3000/api/cron \
  -H "Content-Type: application/json" \
  -d '{
    "action": "process_approval_edge_cases",
    "apiKey": "your-cron-api-key"
  }'

# Health check
curl -X POST http://localhost:3000/api/cron \
  -H "Content-Type: application/json" \
  -d '{
    "action": "get_system_health",
    "apiKey": "your-cron-api-key"
  }'
```

### 3. Programmatic Usage

```typescript
import { ApprovalEdgeCaseHandler } from "@/lib/services/approval-edge-case-handler";
import { SchedulerService } from "@/lib/services/scheduler.service";

// Jalankan semua edge case checks
const reports = await ApprovalEdgeCaseHandler.runAllEdgeCaseChecks();

// Get health metrics
const health = await SchedulerService.getApprovalSystemHealth();

// Process dalam cron job
const result = await SchedulerService.processApprovalEdgeCases();
```

## Email Notifications

Sistem akan mengirim email notifikasi untuk:

### Untuk Approvers:

- **Urgent reminder**: Ketika post sudah overdue 0-2 jam
- **Eskalasi**: Ketika approval stuck dan dieskalasi ke manager

### Untuk Authors:

- **Auto-reschedule**: Ketika post di-reschedule otomatis
- **Expired post**: Ketika post ditandai expired
- **Reconfirmation needed**: Ketika approved post lewat waktu >6 jam
- **Invalid social accounts**: Ketika ada account yang perlu reconnect

## Best Practices

### 1. Preventive Measures

- **Set realistic approval times**: Jangan schedule post terlalu dekat dengan waktu approval
- **Multiple approvers**: Setup multiple people dengan role yang sama untuk redundancy
- **Token monitoring**: Regular check untuk expired social account tokens

### 2. Monitoring

- **Dashboard review**: Check approval system health secara berkala
- **Cron job setup**: Setup automated edge case processing setiap jam
- **Alert thresholds**: Set up monitoring untuk health score < 60

### 3. Response Time

- **Urgent reminders**: Respond dalam 2 jam untuk urgent approvals
- **Stuck escalations**: Manager harus respond dalam 24 jam untuk eskalasi
- **Token renewals**: Renew social account tokens sebelum expired

## Configuration

### Environment Variables

```env
# Cron job API key untuk security
CRON_API_KEY=your-secure-api-key

# Email service configuration
SMTP_HOST=your-smtp-host
SMTP_PORT=587
SMTP_USER=your-email
SMTP_PASS=your-password

# Frontend cron API key (for dashboard)
NEXT_PUBLIC_CRON_API_KEY=your-secure-api-key
```

### Cron Job Schedule (Recommended)

```bash
# Publish due posts - every 5 minutes
*/5 * * * * curl -X POST https://your-domain.com/api/cron -H "Content-Type: application/json" -d '{"action":"publish_due_posts","apiKey":"your-key"}'

# Process edge cases - every hour
0 * * * * curl -X POST https://your-domain.com/api/cron -H "Content-Type: application/json" -d '{"action":"process_approval_edge_cases","apiKey":"your-key"}'

# Check expired tokens - daily at 2 AM
0 2 * * * curl -X POST https://your-domain.com/api/cron -H "Content-Type: application/json" -d '{"action":"check_expired_tokens","apiKey":"your-key"}'
```

## Troubleshooting

### Common Issues

1. **High volume of overdue posts**

   - Check if approvers are receiving notifications
   - Verify approval workflow configuration
   - Consider adjusting approval timeframes

2. **Frequent stuck approvals**

   - Review team member availability
   - Consider adding more approvers
   - Check if workflow steps are realistic

3. **Many expired tokens**
   - Implement token refresh mechanism
   - Set up proactive renewal reminders
   - Monitor social platform API changes

### Debug Commands

```typescript
// Check specific post approval status
const status = await ApprovalEdgeCaseHandler.getPostApprovalStatus(postId);

// Manual health check
const health = await SchedulerService.getApprovalSystemHealth();

// Check specific edge case type
const expiredPosts =
  await ApprovalEdgeCaseHandler.handleExpiredScheduledPosts();
```

## Logs dan Monitoring

Semua edge case processing akan dicatat di:

- `CronLog` table untuk tracking execution
- Console logs untuk development debugging
- Email notifications untuk stakeholders

Log format:

```json
{
  "name": "edge_case_expired_scheduled_posts",
  "status": "INFO",
  "message": "Found and processed 3 cases of type: expired_scheduled_posts",
  "createdAt": "2024-01-01T10:00:00Z"
}
```
