/**
 * tRPC Cache Configuration
 * Optimizes query performance by implementing intelligent caching strategies
 */

export const TRPC_CACHE_CONFIG = {
  // Post queries cache settings
  posts: {
    // Cache post list for 30 seconds
    staleTime: 30 * 1000, // 30 seconds
    cacheTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: true,
  },
  
  // Individual post cache settings
  post: {
    // Cache individual posts for 1 minute
    staleTime: 60 * 1000, // 1 minute
    cacheTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: true,
  },
  
  // Team data cache settings
  team: {
    // Cache team data for 5 minutes
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 15 * 60 * 1000, // 15 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: true,
  },
  
  // Social accounts cache settings
  socialAccounts: {
    // Cache social accounts for 2 minutes
    staleTime: 2 * 60 * 1000, // 2 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: true,
  },
  
  // Analytics cache settings
  analytics: {
    // Cache analytics for 10 minutes
    staleTime: 10 * 60 * 1000, // 10 minutes
    cacheTime: 30 * 60 * 1000, // 30 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  },
  
  // Default cache settings for other queries
  default: {
    staleTime: 60 * 1000, // 1 minute
    cacheTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    refetchOnReconnect: true,
  },
};

/**
 * Get cache configuration for a specific query type
 */
export function getCacheConfig(queryType: keyof typeof TRPC_CACHE_CONFIG) {
  return TRPC_CACHE_CONFIG[queryType] || TRPC_CACHE_CONFIG.default;
}

/**
 * Cache invalidation patterns
 */
export const CACHE_INVALIDATION = {
  // When to invalidate post caches
  posts: {
    onMutation: ['post.create', 'post.update', 'post.delete'],
    onSchedule: ['post.schedule', 'post.reschedule'],
    onPublish: ['post.publish', 'post.unpublish'],
  },
  
  // When to invalidate team caches
  team: {
    onMutation: ['team.create', 'team.update', 'team.delete'],
    onMembership: ['team.addMember', 'team.removeMember', 'team.updateRole'],
  },
  
  // When to invalidate social account caches
  socialAccounts: {
    onMutation: ['socialAccount.connect', 'socialAccount.disconnect', 'socialAccount.update'],
  },
};

/**
 * Performance monitoring thresholds
 */
export const PERFORMANCE_THRESHOLDS = {
  // Query performance warnings
  queryTime: {
    warning: 1000, // 1 second
    critical: 3000, // 3 seconds
    emergency: 5000, // 5 seconds
  },
  
  // Cache hit rate thresholds
  cacheHitRate: {
    good: 0.8, // 80%
    warning: 0.6, // 60%
    critical: 0.4, // 40%
  },
};