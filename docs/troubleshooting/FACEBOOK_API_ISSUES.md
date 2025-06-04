# Facebook API Troubleshooting Guide

Panduan untuk mengatasi masalah umum dengan Facebook Graph API integration.

## 🚨 Common Facebook API Errors

### Error #100: Tried accessing nonexisting field (accounts) on node type (Page)

**Symptoms:**

```
Error [FacebookRequestError]: (#100) Tried accessing nonexisting field (accounts) on node type (Page)
Status: 400
URL: https://graph.facebook.com/v22.0/me/accounts?fields=id,name,access_token
```

**Root Cause:**

- Menggunakan Page Access Token untuk mengakses `/me/accounts` endpoint
- Endpoint `/me/accounts` hanya bisa diakses dengan User Access Token
- Page Access Token tidak memiliki akses ke field `accounts`

**Solutions:**

#### 1. **Identify Token Type**

```bash
# Test token type
curl "https://graph.facebook.com/me?access_token=YOUR_TOKEN"

# User token response:
{
  "id": "USER_ID",
  "name": "User Name"
}

# Page token response:
{
  "id": "PAGE_ID",
  "name": "Page Name",
  "category": "..."
}
```

#### 2. **Use Correct Token for Each Operation**

```typescript
// ✅ Correct approach
if (tokenType === "PAGE") {
  // Use Page token directly for page operations
  const page = new Page(pageId);
  await page.createFeed({ message: content });
} else {
  // Use User token to get page tokens first
  const user = new User("me");
  const pages = await user.getAccounts();
  // Then use individual page tokens
}
```

#### 3. **Update Implementation**

Fixed implementation now handles both token types:

```typescript
// Try direct page access first (for Page tokens)
try {
  const page = new Page(socialAccount.profileId);
  await page.read(["id", "name"]);
  // Success - use this token directly
} catch (pageError) {
  // Fallback to user accounts method (for User tokens)
  const user = new User("me");
  const pages = await user.getAccounts();
}
```

## 🔧 Facebook Token Management

### Token Types

| Token Type        | Use Case                           | Permissions Needed                            |
| ----------------- | ---------------------------------- | --------------------------------------------- |
| User Access Token | Get user's pages, personal posting | `pages_show_list`, `publish_to_groups`        |
| Page Access Token | Direct page posting                | `pages_manage_posts`, `pages_read_engagement` |

### Token Permissions

**Required Permissions:**

- `pages_show_list` - List user's pages
- `pages_manage_posts` - Publish to pages
- `pages_read_engagement` - Read page metrics
- `publish_to_groups` - Post to user timeline

**Get Permissions:**

```bash
curl "https://graph.facebook.com/me/permissions?access_token=YOUR_TOKEN"
```

### Token Refresh

```typescript
// Refresh long-lived token
const refreshedToken = await FacebookPublisher.refreshPageToken(socialAccount);
if (refreshedToken) {
  // Update database with new token
  await prisma.socialAccount.update({
    where: { id: socialAccount.id },
    data: { accessToken: refreshedToken },
  });
}
```

## 🛠️ Debugging Facebook Issues

### 1. **Token Validation**

```bash
# Validate token
curl "https://graph.facebook.com/debug_token?input_token=YOUR_TOKEN&access_token=APP_TOKEN"
```

**Response Analysis:**

```json
{
  "data": {
    "app_id": "YOUR_APP_ID",
    "type": "PAGE", // or "USER"
    "expires_at": 1640995200,
    "is_valid": true,
    "metadata": {
      "page_id": "PAGE_ID" // Only for page tokens
    }
  }
}
```

### 2. **Test API Endpoints**

```bash
# Test user endpoint (User tokens only)
curl "https://graph.facebook.com/me?access_token=USER_TOKEN"

# Test page endpoint (Page tokens)
curl "https://graph.facebook.com/PAGE_ID?access_token=PAGE_TOKEN"

# Test posting (Page tokens)
curl -X POST "https://graph.facebook.com/PAGE_ID/feed" \
  -d "message=Test post" \
  -d "access_token=PAGE_TOKEN"
```

### 3. **Log Analysis**

```typescript
// Enhanced logging
console.log("Token type:", tokenInfo.data.type);
console.log("Token expires:", new Date(tokenInfo.data.expires_at * 1000));
console.log("Token permissions:", tokenInfo.data.scopes);
```

## 🔄 Common Fixes

### Fix 1: Token Type Mismatch

```typescript
// Before (problematic)
const user = new User("me");
const pages = await user.getAccounts(); // Fails with Page token

// After (fixed)
const tokenType = await this.getTokenType(accessToken);
if (tokenType === "PAGE") {
  // Use page token directly
  const page = new Page(pageId);
  await page.createFeed({ message: content });
} else {
  // Use user token to get pages
  const user = new User("me");
  const pages = await user.getAccounts();
}
```

### Fix 2: Missing Permissions

```typescript
// Check permissions before API calls
const permissions = await this.getTokenPermissions(accessToken);
const requiredPermissions = ["pages_manage_posts", "pages_show_list"];

const missingPermissions = requiredPermissions.filter(
  (perm) => !permissions.includes(perm)
);

if (missingPermissions.length > 0) {
  throw new Error(`Missing permissions: ${missingPermissions.join(", ")}`);
}
```

### Fix 3: Expired Token Handling

```typescript
// Auto-refresh expired tokens
if (error.code === 190) {
  // Token expired
  const refreshedToken = await this.refreshToken(socialAccount);
  if (refreshedToken) {
    // Retry with new token
    return this.publishToFacebook(
      { ...socialAccount, accessToken: refreshedToken },
      content,
      mediaUrls
    );
  }
}
```

## ⚠️ Prevention Best Practices

### 1. **Token Storage**

```typescript
// Store token metadata
interface FacebookToken {
  accessToken: string;
  tokenType: "USER" | "PAGE";
  expiresAt: Date;
  permissions: string[];
  pageId?: string; // For page tokens
}
```

### 2. **Validation Before Use**

```typescript
// Always validate before API calls
const isValid = await FacebookPublisher.validateToken(socialAccount);
if (!isValid) {
  throw new Error("Facebook token is invalid or expired");
}
```

### 3. **Graceful Error Handling**

```typescript
try {
  await FacebookPublisher.publish(socialAccount, content);
} catch (error) {
  if (error.code === 100) {
    // Handle field access error
    console.error("Field access error - check token type");
  } else if (error.code === 190) {
    // Handle expired token
    console.error("Token expired - refresh needed");
  }

  // Log and continue with other platforms
  await this.publishToOtherPlatforms(content);
}
```

## 📚 Related Documentation

- [Social Media Integration](../features/SOCIAL_MEDIA_INTEGRATION.md)
- [Facebook Graph API Documentation](https://developers.facebook.com/docs/graph-api/)
- [Facebook Access Tokens Guide](https://developers.facebook.com/docs/facebook-login/access-tokens/)

## 🎯 Database-Stored Page Token Setup

### Recommended Setup for Page Posting

Untuk aplikasi yang menyimpan Page token di database dan melakukan posting ke Facebook Page:

#### 1. **Database Schema**

```sql
-- SocialAccount table structure
CREATE TABLE "SocialAccount" (
  id TEXT PRIMARY KEY,
  platform TEXT NOT NULL, -- "FACEBOOK"
  accessToken TEXT NOT NULL, -- Page Access Token
  profileId TEXT, -- Facebook Page ID
  name TEXT, -- Page name for display
  -- other fields...
);
```

#### 2. **Page Token Acquisition**

```typescript
// Get Page Access Token (one-time setup)
async function getPageAccessToken(userAccessToken: string, pageId: string) {
  const user = new User("me");
  const pages = await user.getAccounts(["id", "name", "access_token"]);

  const targetPage = pages.find((page) => page.id === pageId);
  if (!targetPage) {
    throw new Error(`Page ${pageId} not found`);
  }

  // Store in database
  await prisma.socialAccount.create({
    data: {
      platform: "FACEBOOK",
      accessToken: targetPage.access_token, // Page token
      profileId: pageId, // Page ID
      name: targetPage.name,
      // other fields...
    },
  });

  return targetPage.access_token;
}
```

#### 3. **Optimized Publishing**

```typescript
// Direct page posting (no fallback needed)
const result = await FacebookPublisher.publish(
  socialAccount, // Contains Page token + Page ID
  "Your post content",
  [] // media URLs (optional)
);
```

### Page Token Validation

```typescript
// Validate Page token before publishing
const validation = await FacebookPublisher.validatePageToken(
  socialAccount.accessToken,
  socialAccount.profileId
);

if (!validation.isValid) {
  console.error("Page token invalid:", validation.error);
  // Handle token refresh or re-authentication
}
```

### Required Permissions for Page Tokens

- ✅ `pages_manage_posts` - Required for posting
- ✅ `pages_read_engagement` - For analytics (optional)
- ✅ Long-lived token recommended (60 days validity)

### Benefits of Page Token Approach

- 🚀 **Faster Publishing**: Direct page access, no user accounts lookup
- 🔒 **More Secure**: Token specific to one page only
- 📊 **Better Analytics**: Page-specific insights
- ⚡ **No Rate Limits**: Better rate limiting compared to User tokens

---

**Last Updated**: December 2024  
**Status**: Active Issue Resolution  
**Facebook API Version**: v22.0
