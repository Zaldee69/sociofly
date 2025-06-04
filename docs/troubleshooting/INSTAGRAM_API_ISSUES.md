# Instagram API Troubleshooting Guide

Panduan lengkap untuk mengatasi masalah Instagram API integration menggunakan Facebook Graph API.

## 🚨 Common Instagram API Errors

### 1. "Instagram account not found"

**Error Message:**

```
Error: Instagram account ID (profileId) is required
```

**Cause:** Instagram Business Account ID tidak ditemukan atau tidak valid.

**Solutions:**

```bash
# Step 1: Get Instagram accounts from Facebook Page
npm run instagram:get-accounts

# Step 2: Verify environment variables
npm run instagram:validate

# Step 3: Check database configuration
# Ensure profileId matches Instagram Business Account ID
```

### 2. "Invalid OAuth access token"

**Error Message:**

```
Error: Invalid OAuth access token - Token expired or invalid
```

**Cause:** Page Access Token tidak valid atau expired.

**Solutions:**

```bash
# Get new Page Access Token
npm run facebook:get-page-tokens

# Update Instagram token (same as Page token)
export INSTAGRAM_ACCESS_TOKEN="new_page_token"

# Test token validity
npm run test:instagram
```

### 3. "Instagram posts require media"

**Error Message:**

```
Error: Instagram posts require at least one image or video
```

**Cause:** Instagram API tidak mendukung text-only posts.

**Solutions:**

- Selalu sertakan minimal 1 image atau video
- Gunakan high-quality media (min 1080x1080 untuk square posts)
- Support format: JPG, PNG, MP4, MOV

### 4. "Video processing failed"

**Error Message:**

```
Error: Video processing timeout after maximum attempts
```

**Cause:** Video processing di Instagram servers gagal atau timeout.

**Solutions:**

```typescript
// Check video requirements
- Format: MP4, MOV
- Duration: Max 60 seconds for feed posts
- Resolution: Minimum 720p
- File size: Max 100MB
- Aspect ratio: 1:1, 4:5, 9:16
```

## 🔧 Setup & Configuration

### Instagram Business Account Setup

```bash
# 1. Convert to Business Account
# - Go to Instagram app settings
# - Account > Switch to Professional Account
# - Choose Business

# 2. Connect to Facebook Page
# - Go to Facebook Page Settings
# - Instagram tab
# - Connect Account
```

### Environment Variables

```bash
# Required for Instagram API
INSTAGRAM_ACCESS_TOKEN=your_page_access_token
INSTAGRAM_ACCOUNT_ID=your_instagram_business_id

# Optional for testing
TEST_IMAGE_URL=https://example.com/test.jpg
TEST_VIDEO_URL=https://example.com/test.mp4

# Facebook Page (needed to get Instagram accounts)
PAGE_ACCESS_TOKEN=your_page_token
FACEBOOK_PAGE_ID=your_facebook_page_id
```

### Database Schema

```sql
-- Instagram account in SocialAccount table
INSERT INTO "SocialAccount" (
  "id",
  "platform",
  "accessToken",
  "profileId",  -- Instagram Business Account ID
  "name",       -- Instagram username
  "isActive",
  "userId",
  "teamId"
) VALUES (
  'instagram_account_id',
  'INSTAGRAM',
  'page_access_token',
  'instagram_business_account_id',
  '@instagram_username',
  true,
  'user_id',
  'team_id'
);
```

## 📝 Content Guidelines

### Image Requirements

```typescript
// Image specifications
const imageSpecs = {
  minResolution: "1080x1080", // Square posts
  supportedRatios: ["1:1", "4:5", "1.91:1"], // Square, Portrait, Landscape
  formats: ["JPG", "PNG"],
  maxFileSize: "30MB",
  quality: "High resolution recommended",
};
```

### Video Requirements

```typescript
// Video specifications
const videoSpecs = {
  formats: ["MP4", "MOV"],
  maxDuration: "60 seconds", // Feed posts
  minResolution: "720p",
  maxFileSize: "100MB",
  aspectRatios: ["1:1", "4:5", "9:16"], // Square, Portrait, Stories
  codecs: ["H.264", "H.265"],
};
```

### Caption Guidelines

```typescript
// Caption best practices
const captionGuidelines = {
  maxLength: 2200, // characters
  hashtags: "30 max per post",
  mentions: "20 max per post",
  emojis: "Encouraged for engagement",
  lineBreaks: "Use \\n for formatting",
};
```

## 🛠️ Testing & Debugging

### Quick Test Commands

```bash
# Validate Instagram setup
npm run instagram:validate

# Get Instagram accounts from Facebook Pages
npm run instagram:get-accounts

# Test Instagram API integration
npm run test:instagram

# Test with specific media URLs
export TEST_IMAGE_URL="https://picsum.photos/1080/1080"
export TEST_VIDEO_URL="https://sample-videos.com/zip/10/mp4/SampleVideo_720x480_1mb.mp4"
npm run test:instagram
```

### Debug Instagram API Calls

```typescript
// Enable debug logging
const debugInstagram = async () => {
  console.log("🔍 Debugging Instagram API...");

  // Test account info
  const accountInfo = await InstagramPublisher.getAccountInfo(
    process.env.INSTAGRAM_ACCESS_TOKEN!,
    process.env.INSTAGRAM_ACCOUNT_ID!
  );
  console.log("Account Info:", accountInfo);

  // Test token validation
  const isValid = await InstagramPublisher.validateToken(socialAccount);
  console.log("Token Valid:", isValid);

  // Test publishing (dry run)
  const result = await InstagramPublisher.publish(
    socialAccount,
    "Test post from API",
    ["https://picsum.photos/1080/1080"]
  );
  console.log("Publish Result:", result);
};
```

### Manual API Testing

```bash
# Test Instagram account access
curl "https://graph.facebook.com/v22.0/INSTAGRAM_ACCOUNT_ID?fields=id,username,account_type&access_token=PAGE_ACCESS_TOKEN"

# Test media container creation
curl -X POST "https://graph.facebook.com/v22.0/INSTAGRAM_ACCOUNT_ID/media" \
  -H "Content-Type: application/json" \
  -d '{
    "image_url": "https://picsum.photos/1080/1080",
    "caption": "Test post from API",
    "access_token": "PAGE_ACCESS_TOKEN"
  }'

# Check container status
curl "https://graph.facebook.com/v22.0/CONTAINER_ID?fields=status_code&access_token=PAGE_ACCESS_TOKEN"

# Publish media
curl -X POST "https://graph.facebook.com/v22.0/INSTAGRAM_ACCOUNT_ID/media_publish" \
  -H "Content-Type: application/json" \
  -d '{
    "creation_id": "CONTAINER_ID",
    "access_token": "PAGE_ACCESS_TOKEN"
  }'
```

## 🔐 Permissions & Tokens

### Required Facebook App Permissions

```javascript
// Facebook App permissions for Instagram
const requiredPermissions = [
  "pages_show_list", // List Pages
  "pages_read_engagement", // Read Page insights
  "pages_manage_posts", // Manage Page posts
  "instagram_basic", // Basic Instagram access
  "instagram_content_publish", // Publish Instagram content
];
```

### Token Management

```typescript
// Instagram token is actually a Page Access Token
const tokenManagement = {
  type: "Page Access Token",
  source: "Facebook Page",
  expiration: "2 months (default)",
  refresh: "Use Facebook token refresh flow",
  permissions: "Inherited from Facebook Page",
};

// Refresh Instagram token (actually refreshes Page token)
const refreshInstagramToken = async (socialAccount) => {
  // Instagram uses same token as Facebook Page
  return FacebookPublisher.refreshToken(socialAccount);
};
```

## 📱 Instagram Features Support

### Supported Features

- ✅ **Single Image Posts** - High-quality images with captions
- ✅ **Single Video Posts** - MP4/MOV videos up to 60 seconds
- ✅ **Carousel Posts** - 2-10 images/videos in single post
- ✅ **Video Processing** - Automatic status checking and waiting
- ✅ **Media Type Detection** - Auto-detect image vs video
- ✅ **Caption Support** - Full caption with hashtags and mentions

### Unsupported Features

- ❌ **Text-only Posts** - Instagram requires media
- ❌ **Stories** - Requires separate API endpoints
- ❌ **Reels** - Different API endpoints and requirements
- ❌ **Live Videos** - Not supported via API
- ❌ **Shopping Tags** - Requires additional setup

### Coming Soon

- 🔄 **Stories API** - Planned for future versions
- 🔄 **Reels API** - Under development
- 🔄 **Instagram Shopping** - Business feature integration

## 🚨 Emergency Procedures

### Instagram API Down

```bash
# Check Instagram API status
curl "https://graph.facebook.com/v22.0/INSTAGRAM_ACCOUNT_ID?access_token=PAGE_ACCESS_TOKEN"

# Check Facebook API status
curl "https://graph.facebook.com/v22.0/me?access_token=PAGE_ACCESS_TOKEN"

# Fallback: Queue for later
# Posts will be queued and retried automatically
```

### Token Expired

```bash
# 1. Get new Page Access Token
npm run facebook:get-page-tokens

# 2. Update Instagram token
export INSTAGRAM_ACCESS_TOKEN="new_page_token"

# 3. Update database
UPDATE "SocialAccount"
SET "accessToken" = 'new_page_token'
WHERE "platform" = 'INSTAGRAM';

# 4. Test new token
npm run test:instagram
```

### Account Connection Lost

```bash
# 1. Check Facebook Page connection
npm run instagram:get-accounts

# 2. Reconnect Instagram to Facebook Page
# - Go to Facebook Page Settings
# - Instagram tab
# - Reconnect account

# 3. Update account ID if changed
npm run instagram:validate
```

## 📊 Performance Optimization

### Best Practices

```typescript
// Optimize Instagram posting
const optimizationTips = {
  mediaQuality: "Use high-resolution images (1080x1080+)",
  videoFormat: "Use H.264 codec for best compatibility",
  batchPosting: "Use carousel for multiple images",
  timing: "Post during optimal engagement hours",
  captions: "Keep under 125 characters for better visibility",
  hashtags: "Use 5-10 relevant hashtags",
  scheduling: "Schedule posts during peak hours",
};
```

### Error Handling

```typescript
// Robust error handling for Instagram
const handleInstagramError = (error: any) => {
  if (error.message.includes("OAuth")) {
    return "Instagram token expired - refresh required";
  } else if (error.message.includes("media")) {
    return "Media processing failed - check format and size";
  } else if (error.message.includes("account")) {
    return "Instagram account connection lost - reconnect required";
  } else {
    return "Unknown Instagram error - check logs";
  }
};
```

## 📚 Related Documentation

- **[Facebook API Issues](FACEBOOK_API_ISSUES.md)** - Facebook API troubleshooting
- **[Social Media Integration](../features/SOCIAL_MEDIA_INTEGRATION.md)** - Complete social media setup
- **[Instagram Business Setup](https://business.instagram.com/getting-started)** - Official Instagram guide

## 🔗 External Resources

- [Instagram Graph API Documentation](https://developers.facebook.com/docs/instagram-api/)
- [Facebook Page Access Tokens](https://developers.facebook.com/docs/pages/access-tokens/)
- [Instagram Media Publishing](https://developers.facebook.com/docs/instagram-api/content-publishing)
- [Instagram Content Guidelines](https://help.instagram.com/478745558852511)

---

**Last Updated**: December 2024  
**Status**: Active Instagram Integration  
**API Version**: Facebook Graph API v22.0
