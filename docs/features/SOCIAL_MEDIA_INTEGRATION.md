# 🚀 Social Media Publishing Integration

## Overview

Sistem ini mengintegrasikan penjadwalan otomatis dengan publikasi ke berbagai platform social media, termasuk Facebook, Twitter, Instagram, LinkedIn, dan TikTok. Facebook menggunakan SDK resmi, sementara platform lain menggunakan placeholder yang siap untuk implementasi API.

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Cron Jobs     │───▶│ SchedulerService │───▶│ PostPublisher   │
│                 │    │                  │    │   Service       │
│ • Every 5min    │    │ • processDue     │    │                 │
│ • Every hour    │    │   Publications   │    │ ┌─────────────┐ │
│ • Daily         │    │ • processEdge    │    │ │ Facebook    │ │
│ • Every 15min   │    │   Cases          │    │ │ Publisher   │ │
│ • Weekly        │    │ • checkExpired   │    │ │ (Real SDK)  │ │
└─────────────────┘    │   Tokens         │    │ └─────────────┘ │
                       │ • systemHealth   │    │                 │
                       └──────────────────┘    │ ┌─────────────┐ │
                                              │ │ Other       │ │
                                              │ │ Publishers  │ │
                                              │ │ (Placeholder│ │
                                              │ └─────────────┘ │
                                              └─────────────────┘
```

## Components

### 1. CronManager

**Location**: `src/lib/services/cron-manager.ts`

Mengelola 5 cron jobs utama:

- `publish_due_posts` - Setiap 5 menit
- `process_edge_cases` - Setiap jam
- `check_expired_tokens` - Harian jam 2 pagi
- `system_health_check` - Setiap 15 menit
- `cleanup_old_logs` - Mingguan hari Minggu jam 3 pagi

### 2. SchedulerService

**Location**: `src/lib/services/scheduler.service.ts`

Service utama yang mengkoordinasi:

- **processDuePublications()** - Cek dan publish posts yang sudah waktunya
- **processApprovalEdgeCases()** - Handle edge cases approval
- **checkExpiredTokens()** - Cek token yang expired
- **getApprovalSystemHealth()** - Monitor kesehatan sistem

### 3. PostPublisherService

**Location**: `src/lib/services/post-publisher.ts`

Service publikasi yang mendukung:

- **publishToSocialMedia()** - Publish ke satu platform
- **publishToAllPlatforms()** - Publish ke semua platform terkait
- Menggunakan factory pattern untuk berbagai publisher

### 4. FacebookPublisher (Real Implementation)

**Location**: `src/lib/services/publishers/facebook-publisher.ts`

Implementasi nyata menggunakan Facebook Business SDK:

- ✅ Token validation
- ✅ Page publishing
- ✅ Profile publishing
- ✅ Media support (photo)
- ✅ Error handling
- ✅ Token refresh

## Facebook Integration

### Prerequisites

```bash
npm install facebook-nodejs-business-sdk @types/facebook-nodejs-business-sdk
```

### Configuration

Facebook Publisher memerlukan:

- Valid Facebook access token
- Page access token (untuk page posting)
- Proper permissions: `pages_manage_posts`, `publish_to_groups`, etc.

### Usage Examples

```typescript
// Direct Facebook publishing
const result = await FacebookPublisher.publish(
  socialAccount,
  content,
  mediaUrls
);

// Via PostPublisherService (recommended)
const results = await PostPublisherService.publishToAllPlatforms(postId);

// Token validation
const isValid = await FacebookPublisher.validateToken(socialAccount);
```

## Database Schema

### SocialAccount Model

```prisma
model SocialAccount {
  id             String     @id @default(cuid())
  accessToken    String     // Facebook access token
  refreshToken   String?    // For token refresh
  expiresAt      DateTime?  // Token expiration
  platform       SocialPlatform
  profileId      String?    // Facebook Page ID (for pages)
  name           String?    // Account display name
  // ... other fields
}
```

### Post & PostSocialAccount

```prisma
model Post {
  status             PostStatus @default(DRAFT)
  scheduledAt        DateTime
  postSocialAccounts PostSocialAccount[]
  // ... other fields
}

model PostSocialAccount {
  status      PostStatus @default(DRAFT)
  publishedAt DateTime?
  // Relations to Post and SocialAccount
}
```

## Error Handling

### Facebook Errors

- **Token expired** - Auto-marks account as needing reauth
- **Permission denied** - Logs error and fails gracefully
- **API rate limits** - Respects Facebook rate limiting
- **Invalid page** - Clear error messages

### General Errors

- **Network issues** - Retry logic (future enhancement)
- **Database errors** - Transaction rollback
- **Missing data** - Validation and clear error messages

## Monitoring & Logging

### CronLog Table

Semua aktivitas cron job dicatat:

```sql
SELECT name, status, message, "executedAt"
FROM "CronLog"
ORDER BY "executedAt" DESC;
```

### Dashboard Monitoring

- `/admin/cron` - Monitor cron job status
- `/admin/system-health` - System health overview
- Real-time status updates
- Success rate tracking

## Environment Variables

```bash
# Required for cron jobs
ENABLE_CRON_JOBS=true
CRON_API_KEY=your-api-key

# Optional
TZ=Asia/Jakarta
```

## Testing

### Integration Test

```bash
npm run test:integration
```

Tests semua komponen:

- ✅ SchedulerService functionality
- ✅ PostPublisherService integration
- ✅ Facebook token validation
- ✅ Edge case processing
- ✅ System health check
- ✅ Database statistics

### Cron Test

```bash
npm run test:cron
```

### Manual Testing

```bash
# Restart cron jobs
npm run cron:restart

# Check status
npm run cron:status

# View statistics
npm run cron:stats
```

## API Endpoints

### Cron Management

```bash
# Initialize all jobs
POST /api/cron-manager
{
  "action": "initialize",
  "apiKey": "your-key"
}

# Get job status
GET /api/cron-manager?action=status&apiKey=your-key

# Trigger specific job
POST /api/cron-manager
{
  "action": "trigger",
  "jobName": "publish_due_posts",
  "apiKey": "your-key"
}
```

## Future Enhancements

### Planned Integrations

1. **Twitter API v2**

   - OAuth 2.0 implementation
   - Tweet publishing
   - Media upload

2. **Instagram Basic Display API**

   - Photo/video posting
   - Story publishing
   - Hashtag optimization

3. **LinkedIn API**

   - Company page posting
   - Personal timeline
   - Document sharing

4. **TikTok for Developers**
   - Video upload
   - Content management
   - Analytics

### Additional Features

- [ ] Retry logic for failed posts
- [ ] Bulk publishing
- [ ] Posting analytics
- [ ] A/B testing for content
- [ ] Auto-hashtag suggestions
- [ ] Cross-platform content optimization

## Troubleshooting

### Common Issues

1. **Cron jobs not running**

   ```bash
   npm run cron:restart
   ```

2. **Facebook token expired**

   - Check `/admin/system-health`
   - Reconnect Facebook account
   - Verify page permissions

3. **Posts stuck in scheduling**
   - Check approval status
   - Run edge case processing
   - Manual retry via dashboard

### Debug Commands

```bash
# Check system health
curl "localhost:3000/api/cron-manager?action=stats&apiKey=test-scheduler-key"

# View recent logs
npx prisma studio # Navigate to CronLog table

# Manual job trigger
curl -X POST localhost:3000/api/cron-manager \
  -H "Content-Type: application/json" \
  -d '{"action": "trigger", "jobName": "system_health_check", "apiKey": "test-scheduler-key"}'
```

## Security Considerations

- ✅ API key protection
- ✅ Token encryption in database
- ✅ Permission validation
- ✅ Rate limiting compliance
- ✅ Error logging without sensitive data

---

**Status**: ✅ Facebook integration complete, other platforms ready for implementation  
**Last Updated**: December 2024
