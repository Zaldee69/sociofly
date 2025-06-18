# Analytics System Documentation

## Overview

Sistem analytics yang terintegrasi untuk mengumpulkan, memproses, dan menampilkan data insights dari Instagram dan Facebook. Sistem ini menggunakan scheduler otomatis dan dapat di-trigger secara manual.

## Features

### 📊 **Data Collection**

- **Account Analytics**: Followers, engagement rate, media count, growth metrics
- **Post Analytics**: Views, likes, comments, shares, reach, impressions
- **Stories Analytics**: Completion rate, navigation patterns (Instagram only)
- **Audience Insights**: Demographics, active hours, behavioral data
- **Hashtag Analytics**: Performance tracking, trending analysis (Instagram only)
- **Link Analytics**: CTA performance, click tracking, conversions

### 🔄 **Automated Scheduler**

- Runs every 6 hours automatically
- Platform-specific collection (Instagram gets Stories + Hashtags)
- Error handling and retry mechanisms
- Background job processing with BullMQ

### 🎯 **Manual Triggers**

- Team-level collection
- Account-specific collection
- Status monitoring
- Real-time data updates

## Quick Start

### 1. Start Analytics Scheduler

```bash
# Start the background scheduler
npm run analytics:scheduler
```

### 2. Manual Collection

```bash
# Trigger for all teams
npm run analytics:trigger all

# Check status
npm run analytics:trigger status
```

### 3. View Analytics

Navigate to `/analytics` in your app to see the dashboard with real data.

## Usage Commands

```bash
# Start scheduler (runs continuously)
npm run analytics:scheduler

# Manual triggers
npm run analytics:trigger team <team-id>     # Specific team
npm run analytics:trigger account <acc-id>   # Specific account
npm run analytics:trigger all               # All teams
npm run analytics:trigger status            # Check status
```

## API Integration

### Trigger Collection via API

```bash
curl -X POST http://localhost:3000/api/scheduled-tasks/collect-analytics \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-token" \
  -d '{"action": "schedule-all"}'
```

### Frontend Integration

```typescript
// Trigger collection from UI
const triggerCollection =
  trpc.realAnalytics.triggerAccountAnalyticsCollection.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      refetchInsights();
    },
  });

// Get insights data
const { data: insights } = trpc.realAnalytics.getAccountInsights.useQuery({
  socialAccountId: selectedAccount,
});
```

## System Components

### 1. AccountAnalyticsScheduler

- Main scheduler service
- Handles job queuing and processing
- Platform-specific data collection
- Error handling and retries

### 2. tRPC Router (realAnalytics)

- `getAccountInsights` - Get account metrics
- `triggerAccountAnalyticsCollection` - Manual trigger
- `getCollectionStats` - Collection status

### 3. API Endpoints

- `POST /api/scheduled-tasks/collect-analytics` - Schedule collection
- `GET /api/scheduled-tasks/collect-analytics` - Get status

### 4. Analytics Components

- **OverviewSection** - Key metrics and growth
- **PostPerformance** - Content analysis
- **StoriesPerformance** - Instagram Stories (Instagram only)
- **AudienceInsights** - Demographics and behavior
- **HashtagAnalytics** - Hashtag performance (Instagram only)
- **LinkAnalytics** - CTA and conversion tracking

## Data Collection

The system collects different types of analytics based on platform:

### All Platforms

- Account insights (followers, engagement)
- Post analytics (likes, comments, reach)
- Audience insights (demographics, behavior)
- Link analytics (clicks, conversions)

### Instagram Only

- Stories analytics (completion rates, navigation)
- Hashtag analytics (reach, discovery metrics)

### Mock Data for Development

The system generates realistic mock data for development and testing:

```typescript
// Example account insights
{
  followersCount: 5420,
  mediaCount: 287,
  engagementRate: 3.2,
  avgReachPerPost: 1250,
  followersGrowthPercent: 2.5
}
```

## Monitoring

### Check Collection Status

```bash
npm run analytics:trigger status
```

Output shows:

- Recent collections (last 24 hours)
- Accounts with data (last 7 days)
- Collection details per account

### Logs

The scheduler provides detailed logging:

```
🔄 Starting analytics collection for @my_instagram (INSTAGRAM)
✅ Account insights collected for @my_instagram
✅ Post analytics collected for @my_instagram
✅ Stories analytics collected for @my_instagram
✅ Audience insights collected for @my_instagram
✅ Hashtag analytics collected for @my_instagram
✅ Link analytics collected for @my_instagram
✅ Analytics collection completed for @my_instagram. Errors: 0
```

## Database Schema

Enhanced analytics models include:

- **AccountAnalytics** - Account-level metrics and growth
- **PostAnalytics** - Enhanced with content format, CTR, saves
- **StoryAnalytics** - Instagram Stories performance
- **AudienceInsights** - Demographics and behavioral data
- **HashtagAnalytics** - Hashtag performance tracking
- **LinkAnalytics** - Link and CTA performance

## Configuration

### Environment Variables

```env
# Enable scheduler
ENABLE_CRON_JOBS=true

# Redis for job queue
REDIS_URL=redis://localhost:6379

# API tokens (for real data)
INSTAGRAM_ACCESS_TOKEN=your_token
FACEBOOK_ACCESS_TOKEN=your_token
```

## Troubleshooting

### Common Issues

1. **Scheduler not starting**

   - Check Redis connection: `npm run test:redis`
   - Verify environment variables

2. **No data being collected**

   - Check status: `npm run analytics:trigger status`
   - Manually trigger: `npm run analytics:trigger all`

3. **Analytics page shows no data**
   - Click "Update Data" button in UI
   - Wait 5-10 seconds for collection to complete
   - Refresh the page

### Error Handling

The system includes:

- Automatic retries for failed jobs
- Graceful error handling
- Fallback to mock data in development
- Detailed error logging

## Production Deployment

1. **Setup Redis**

   ```bash
   # Start Redis
   redis-server
   ```

2. **Run Database Migration**

   ```bash
   npx prisma migrate deploy
   ```

3. **Start Scheduler**

   ```bash
   npm run analytics:scheduler
   ```

4. **Monitor Performance**
   - Check Redis memory usage
   - Monitor job completion rates
   - Track data collection coverage

## Development Tips

1. **Use Mock Data**: The system automatically generates realistic mock data for development

2. **Test Manually**: Use trigger commands to test collection without waiting for scheduler

3. **Check Status**: Regularly check collection status to ensure system is working

4. **Monitor Logs**: Watch scheduler logs for errors and performance issues

## Future Enhancements

- Real-time data updates via WebSocket
- Advanced reporting and export features
- AI-powered insights and recommendations
- Competitor analysis automation
- Custom dashboard configurations
