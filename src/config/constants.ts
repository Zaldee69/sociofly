/**
 * Application Constants
 */

// Auth
export const AUTH_COOKIE_EXPIRY = 30 * 24 * 60 * 60 * 1000; // 30 days

// API
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api";

// Feature Flags
export const FEATURES = {
  SOCIAL_MEDIA_SCHEDULING: true,
  TEAM_COLLABORATION: true,
  CONTENT_APPROVAL: true,
  ANALYTICS: true,
};

// Pagination
export const DEFAULT_PAGE_SIZE = 10;
export const MAX_PAGE_SIZE = 100;

// Date Format
export const DEFAULT_DATE_FORMAT = "dd MMM yyyy";
export const DEFAULT_TIME_FORMAT = "HH:mm";
export const DEFAULT_DATETIME_FORMAT = `${DEFAULT_DATE_FORMAT} ${DEFAULT_TIME_FORMAT}`;

// Media
export const ALLOWED_MEDIA_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "video/mp4",
];
export const MAX_MEDIA_SIZE = 10 * 1024 * 1024; // 10MB
