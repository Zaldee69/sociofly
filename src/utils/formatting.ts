/**
 * Formatting Utility Functions
 */

/**
 * Format a number to a currency string
 */
export function formatCurrency(
  value: number,
  options: { locale?: string; currency?: string } = {}
): string {
  const { locale = "en-US", currency = "USD" } = options;

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
  }).format(value);
}

/**
 * Format a number with thousand separators
 */
export function formatNumber(
  value: number,
  options: { locale?: string; maximumFractionDigits?: number } = {}
): string {
  const { locale = "en-US", maximumFractionDigits = 2 } = options;

  return new Intl.NumberFormat(locale, {
    maximumFractionDigits,
  }).format(value);
}

/**
 * Format a percentage
 */
export function formatPercentage(
  value: number,
  options: { locale?: string; maximumFractionDigits?: number } = {}
): string {
  const { locale = "en-US", maximumFractionDigits = 1 } = options;

  return new Intl.NumberFormat(locale, {
    style: "percent",
    maximumFractionDigits,
  }).format(value / 100);
}

/**
 * Format a file size
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Truncate text with ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;

  return `${text.slice(0, maxLength)}...`;
}

/**
 * Capitalize first letter of a string
 */
export function capitalizeFirstLetter(text: string): string {
  if (!text) return "";

  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * Convert camelCase or snake_case to Title Case
 */
export function toTitleCase(text: string): string {
  if (!text) return "";

  // Convert camelCase to space-separated words
  const spaceSeparated = text.replace(/([A-Z])/g, " $1").trim();

  // Convert snake_case to space-separated words
  const noUnderscores = spaceSeparated.replace(/_/g, " ");

  // Capitalize each word
  return noUnderscores
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}
