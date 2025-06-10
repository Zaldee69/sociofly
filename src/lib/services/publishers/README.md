# Publishers Architecture Refactoring

## 📋 Overview

This directory contains the refactored social media publisher architecture that eliminates redundancy and provides a clean, maintainable structure for publishing content across multiple platforms.

## 🏗️ Architecture

### Before Refactoring (Issues)

- **Duplicated interfaces**: `PublishResult` and `SocialAccountWithRelations` defined in multiple files
- **Wrapper classes**: Unnecessary wrapper classes for static methods
- **Inconsistent architecture**: Mix of static and instance methods
- **Scattered types**: Type definitions spread across multiple files
- **No common functionality**: Repeated rate limiting and error handling code

### After Refactoring (Benefits)

- **Centralized types**: All interfaces in `types.ts`
- **Base class**: Common functionality in `BasePublisher`
- **Factory pattern**: Clean publisher instantiation via `PublisherFactory`
- **Consistent interface**: All publishers implement `SocialMediaPublisher`
- **Shared utilities**: Rate limiting, error handling, and retry logic

## 📁 File Structure

```
src/lib/services/publishers/
├── types.ts                          # Central type definitions
├── base-publisher.ts                 # Base class with common functionality
├── publisher-factory.ts              # Factory for managing publishers
├── facebook-publisher-refactored.ts  # Facebook implementation
├── instagram-publisher-refactored.ts # Instagram implementation
└── README.md                         # This documentation
```

## 🔧 Core Components

### 1. Types (`types.ts`)

Centralized interface definitions:

- `PublishResult`: Standard response format
- `SocialAccountWithRelations`: Extended social account interface
- `SocialMediaPublisher`: Publisher interface contract
- `RateLimitConfig`: Rate limiting configuration
- `PublisherFactory`: Factory interface

### 2. Base Publisher (`base-publisher.ts`)

Abstract base class providing:

- **Rate limiting**: Configurable delays and retry mechanisms
- **Error handling**: Common error detection and token validation
- **Utility methods**: Helper methods for creating responses
- **Retry logic**: Exponential backoff for rate limit errors

### 3. Publisher Factory (`publisher-factory.ts`)

Singleton factory that:

- **Manages instances**: Creates and manages publisher instances
- **Platform routing**: Routes requests to appropriate publishers
- **Validation**: Checks platform support
- **Extensibility**: Easy addition of new platforms

### 4. Platform Publishers

Each platform inherits from `BasePublisher` and implements:

- `publish()`: Platform-specific publishing logic
- `validateToken()`: Token validation for the platform
- Platform-specific methods (e.g., carousel posts, page publishing)

## 🚀 Usage

### Publishing a Post

```typescript
import { publisherFactory } from "./publishers/publisher-factory";

// Get publisher for specific platform
const publisher = publisherFactory.getPublisher(SocialPlatform.FACEBOOK);

// Publish content
const result = await publisher.publish(socialAccount, content, mediaUrls);
```

### Using the Service

```typescript
import { PostPublisherService } from "./post-publisher-refactored";

// Publish to all platforms
const results = await PostPublisherService.publishToAllPlatforms(postId);

// Publish to specific platform
const result = await PostPublisherService.publishToSocialMedia(
  postId,
  socialAccountId
);
```

## ✅ Migration Guide

### What Changed

1. **Old files**: `facebook-publisher.ts`, `instagram-publisher.ts`, `post-publisher.ts`
2. **New files**: Files with `-refactored` suffix and new architecture files
3. **Import changes**: Update imports to use refactored services

### Migration Steps

1. Update imports from old services to refactored ones
2. Replace direct publisher usage with factory pattern
3. Use the new centralized types
4. Test functionality with new architecture

### Breaking Changes

- Static methods converted to instance methods
- Interface changes for better type safety
- Factory pattern required for publisher instantiation

## 🎯 Benefits

### 1. **Reduced Redundancy**

- Single source of truth for interfaces
- Shared functionality in base class
- No duplicate error handling logic

### 2. **Better Maintainability**

- Clear separation of concerns
- Consistent architecture across platforms
- Easy to add new platforms

### 3. **Improved Error Handling**

- Centralized error detection
- Consistent retry mechanisms
- Better rate limit handling

### 4. **Type Safety**

- Centralized type definitions
- Strong typing throughout
- Better IDE support

### 5. **Performance**

- Singleton factory pattern
- Optimized retry logic
- Better parallel processing

## 🔜 Future Improvements

1. **Platform Support**: Add Twitter, LinkedIn, TikTok implementations
2. **Analytics**: Enhanced tracking and reporting
3. **Caching**: Token and response caching
4. **Monitoring**: Health checks and metrics
5. **Testing**: Comprehensive test suite

## 📚 Related Files

- `scheduler.service.ts`: Updated to use refactored publisher service
- `post-publisher-refactored.ts`: New service using factory pattern
- Original files kept for reference during migration

## 🤝 Contributing

When adding new platforms:

1. Create new publisher class extending `BasePublisher`
2. Implement required methods (`publish`, `validateToken`)
3. Add platform to factory in `publisher-factory.ts`
4. Update type definitions if needed
5. Add comprehensive tests
