/**
 * Platform Configuration
 * Centralized configuration for all social media platforms
 */

export interface PlatformConfig {
  name: string;
  apiVersion: string;
  baseUrl: string;
  rateLimit: {
    requests: number;
    timeWindow: number; // in milliseconds
  };
  features: {
    accounts: boolean;
    posts: boolean;
    stories: boolean;
    insights: boolean;
  };
}

export const PLATFORMS: Record<string, PlatformConfig> = {
  instagram: {
    name: "Instagram",
    apiVersion: "v22.0",
    baseUrl: "https://graph.facebook.com",
    rateLimit: {
      requests: 200,
      timeWindow: 60 * 60 * 1000, // 1 hour
    },
    features: {
      accounts: true,
      posts: true,
      stories: true,
      insights: true,
    },
  },

  facebook: {
    name: "Facebook",
    apiVersion: "v22.0",
    baseUrl: "https://graph.facebook.com",
    rateLimit: {
      requests: 200,
      timeWindow: 60 * 60 * 1000, // 1 hour
    },
    features: {
      accounts: true,
      posts: true,
      stories: false,
      insights: true,
    },
  },
};

export function getPlatformConfig(platform: string): PlatformConfig {
  const config = PLATFORMS[platform.toLowerCase()];
  if (!config) {
    throw new Error(`Unsupported platform: ${platform}`);
  }
  return config;
}
