# Real Social Media Analytics Integration

## Overview

This document outlines the implementation of real social media analytics integration for Facebook and Instagram platforms, replacing the previous mock analytics system with actual data from platform APIs.

## Features Implemented

### 🎯 Core Features

- **Real-time analytics collection** from Facebook and Instagram
- **Advanced rate limiting** with exponential backoff and queuing
- **Comprehensive error handling** for each platform
- **Data normalization** across different platforms
- **Automatic retry mechanisms** with jitter
- **Batch processing** for multiple posts
- **Database persistence** of analytics data

### 🔧 Technical Components

#### 1. Rate Limiting System (`rate-limiter.ts`)

- **Per-platform rate limits**: Facebook (200/hour), Instagram (200/hour)
- **Request queuing** with priority support
- **Exponential backoff** with jitter
- **Automatic retry** for rate-limited requests
- **Burst limit protection**

```typescript
// Platform-specific limits
FACEBOOK: {
  requests_per_hour: 200,
  requests_per_day: 4800,
  burst_limit: 50,
  window_size: 3600,
}
```

#### 2. Data Normalization (`data-normalizer.ts`)

- **Platform-agnostic data structure**
- **Data validation** and anomaly detection
- **Engagement rate calculation**
- **Historical data aggregation**
- **Cross-platform comparison**

#### 3. Facebook Integration (`facebook-client.ts`)

- **Graph API v18.0** integration
- **Access token validation**
- **Post insights collection**
- **Batch analytics processing**
- **Page posts discovery**

#### 4. Instagram Integration (`instagram-client.ts`)

- **Instagram Graph API** integration
- **Media-type specific insights** (photo vs video)
- **Business account support**
- **Comprehensive metrics collection**

#### 5. Main Service (`real-analytics-service.ts`)

- **Multi-platform orchestration**
- **Database integration**
- **Scheduled collection**
- **Error aggregation**
- **Analytics data formatting**

## API Endpoints

### tRPC Routes (`real-analytics.ts`)

#### 1. Collect Post Analytics

```typescript
trpc.realAnalytics.collectPostAnalytics.mutate({
  postId: "post-id",
});
```

#### 2. Batch Analytics Collection

```typescript
trpc.realAnalytics.collectBatchAnalytics.mutate({
  postIds: ["post1", "post2"],
  teamId: "team-id",
});
```

#### 3. Get Stored Analytics

```typescript
trpc.realAnalytics.getStoredAnalytics.query({
  postId: "post-id",
});
```

#### 4. Platform Connection Status

```typescript
trpc.realAnalytics.getPlatformStatus.query({
  teamId: "team-id",
});
```

#### 5. Collection Statistics

```typescript
trpc.realAnalytics.getCollectionStats.query({
  teamId: "team-id",
  days: 30,
});
```

## Database Schema

### PostAnalytics Table

```sql
CREATE TABLE PostAnalytics (
  id STRING PRIMARY KEY,
  postSocialAccountId STRING,
  views INTEGER,
  likes INTEGER,
  comments INTEGER,
  shares INTEGER,
  clicks INTEGER,
  reach INTEGER,
  impressions INTEGER,
  engagement FLOAT,
  recordedAt TIMESTAMP
);
```

## Rate Limiting Strategy

### Request Flow

1. **Rate Check**: Verify if request can proceed immediately
2. **Queue Management**: Queue requests that exceed limits
3. **Priority Processing**: Process high-priority requests first
4. **Exponential Backoff**: Implement delays for failed requests
5. **Error Recovery**: Handle platform-specific errors

### Error Types

- `RATE_LIMIT`: 429 responses from platforms
- `AUTH_ERROR`: Invalid/expired tokens
- `API_ERROR`: Platform API issues
- `NETWORK_ERROR`: Connection problems

## Data Collection Process

### 1. Manual Collection

```typescript
const result = await realAnalyticsService.collectPostAnalytics(postId);
```

### 2. Scheduled Collection

```typescript
// Runs automatically for all published posts from last 30 days
await realAnalyticsService.scheduleAnalyticsCollection();
```

### 3. Batch Processing

```typescript
const result = await realAnalyticsService.collectBatchAnalytics(postIds);
```

## Platform-Specific Implementation

### Facebook Analytics

**Metrics Collected:**

- Post impressions
- Post reach
- Engaged users
- Post clicks
- Reactions (likes)
- Comments count
- Shares count
- Video views

**Required Scopes:**

- `pages_read_engagement`
- `pages_show_list`
- `read_insights`
- `business_management`

### Instagram Analytics

**Metrics Collected:**

- Impressions
- Reach
- Engagement
- Likes
- Comments
- Shares
- Saves
- Video views (for videos)

**Required Scopes:**

- `instagram_basic`
- `instagram_manage_insights`
- `business_management`
- `pages_read_engagement`

## Error Handling

### Retry Strategy

```typescript
{
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 30000,
  backoffMultiplier: 2,
  jitterEnabled: true,
}
```

### Error Classification

1. **Retryable Errors**: Network issues, 5xx errors, rate limits
2. **Non-retryable Errors**: 4xx errors (except 429), auth failures
3. **Fatal Errors**: Invalid configuration, missing credentials

## Security Considerations

### Access Token Management

- **Encrypted storage** of credentials (to be implemented)
- **Token expiration** handling
- **Scope validation**
- **Refresh token rotation**

### Rate Limiting Protection

- **Request queuing** prevents API abuse
- **Exponential backoff** reduces server load
- **Burst protection** prevents sudden spikes

## Performance Optimizations

### Caching Strategy

- **Database caching** of recent analytics
- **Request deduplication**
- **Batch processing** for efficiency

### Concurrent Processing

- **Chunked requests** (10 posts per batch)
- **Platform parallelization**
- **Memory management** for large datasets

## Usage Examples

### Basic Usage

```typescript
// Collect analytics for a single post
const analytics = await trpc.realAnalytics.collectPostAnalytics.mutate({
  postId: "cm123456",
});

// Get stored analytics
const data = await trpc.realAnalytics.getStoredAnalytics.query({
  postId: "cm123456",
});
```

### Advanced Usage

```typescript
// Batch collection with error handling
const batchResult = await trpc.realAnalytics.collectBatchAnalytics.mutate({
  postIds: publishedPosts.map((p) => p.id),
  teamId: currentTeam.id,
});

console.log(`Success: ${batchResult.successCount}/${batchResult.totalPosts}`);
console.log(`Errors: ${batchResult.errors.length}`);
```

## Integration with Existing System

### Frontend Integration

The real analytics system integrates seamlessly with the existing post detail page:

```typescript
// Use real analytics when available, fallback to mock
const analyticsData =
  post.status === "PUBLISHED"
    ? await trpc.realAnalytics.getStoredAnalytics.query({ postId })
    : generateMockAnalytics(platform);
```

### Scheduling Integration

Analytics collection can be automated using cron jobs or scheduled functions:

```typescript
// In your scheduler (Vercel Cron, etc.)
await trpc.realAnalytics.triggerScheduledCollection.mutate();
```

## Monitoring and Debugging

### Logging

- **Request logging** with timestamps
- **Error aggregation** by platform
- **Performance metrics** collection
- **Rate limit monitoring**

### Debug Tools

```typescript
// Enable debug logging
const result = await realAnalyticsService.collectPostAnalytics(postId);
console.log("Debug info:", {
  postId,
  success: result.success,
  errors: result.errors,
  rateLimitInfo: result.rateLimitInfo,
});
```

## Future Enhancements

### Phase 2: Additional Platforms

- Twitter/X integration
- LinkedIn analytics
- TikTok metrics
- YouTube analytics

### Phase 3: Advanced Features

- **Real-time webhooks** for instant updates
- **Predictive analytics** using historical data
- **Custom reporting** and dashboards
- **Analytics alerts** for significant changes

### Phase 4: Enterprise Features

- **White-label analytics** for agencies
- **Client reporting** automation
- **Advanced segmentation**
- **Custom metrics** calculation

## Troubleshooting

### Common Issues

#### 1. Rate Limits Exceeded

```
Error: Rate limit exceeded for FACEBOOK:insights
Solution: Wait for rate limit reset or implement larger delays
```

#### 2. Invalid Access Token

```
Error: Invalid or expired access token
Solution: Refresh tokens or re-authenticate users
```

#### 3. Missing Platform Post ID

```
Error: No platformPostId found for post
Solution: Ensure posts are properly published with platform IDs stored
```

### Debug Commands

```bash
# Check analytics data
npm run analytics:check

# Collect analytics manually
npm run analytics:collect

# Seed test data
npm run analytics:seed
```

## Conclusion

This real analytics integration provides a robust foundation for collecting authentic social media metrics while maintaining system reliability through comprehensive error handling and rate limiting. The modular architecture allows for easy extension to additional platforms and features.
