/**
 * Date Utility Functions
 */

import {
  format,
  parseISO,
  isValid,
  addDays,
  addMonths,
  addYears,
  formatDistance,
} from "date-fns";
import {
  DEFAULT_DATE_FORMAT,
  DEFAULT_TIME_FORMAT,
  DEFAULT_DATETIME_FORMAT,
} from "@/config/constants";

/**
 * Format a date string or Date object to a readable format
 */
export function formatDate(
  date: string | Date | null | undefined,
  formatStr = DEFAULT_DATE_FORMAT
): string {
  if (!date) return "";

  const dateObj = typeof date === "string" ? parseISO(date) : date;
  if (!isValid(dateObj)) return "";

  return format(dateObj, formatStr);
}

/**
 * Format a date string or Date object to a time format
 */
export function formatTime(
  date: string | Date | null | undefined,
  formatStr = DEFAULT_TIME_FORMAT
): string {
  if (!date) return "";

  const dateObj = typeof date === "string" ? parseISO(date) : date;
  if (!isValid(dateObj)) return "";

  return format(dateObj, formatStr);
}

/**
 * Format a date string or Date object to a date and time format
 */
export function formatDateTime(
  date: string | Date | null | undefined,
  formatStr = DEFAULT_DATETIME_FORMAT
): string {
  if (!date) return "";

  const dateObj = typeof date === "string" ? parseISO(date) : date;
  if (!isValid(dateObj)) return "";

  return format(dateObj, formatStr);
}

/**
 * Get a relative time string (e.g. "2 hours ago", "in 3 days")
 */
export function getRelativeTime(
  date: string | Date | null | undefined
): string {
  if (!date) return "";

  const dateObj = typeof date === "string" ? parseISO(date) : date;
  if (!isValid(dateObj)) return "";

  return formatDistance(dateObj, new Date(), { addSuffix: true });
}

/**
 * Add days to a date
 */
export function addDaysToDate(date: Date, days: number): Date {
  return addDays(date, days);
}

/**
 * Add months to a date
 */
export function addMonthsToDate(date: Date, months: number): Date {
  return addMonths(date, months);
}

/**
 * Add years to a date
 */
export function addYearsToDate(date: Date, years: number): Date {
  return addYears(date, years);
}

/**
 * Get start of day
 */
export function getStartOfDay(date: Date): Date {
  const newDate = new Date(date);
  newDate.setHours(0, 0, 0, 0);
  return newDate;
}

/**
 * Get end of day
 */
export function getEndOfDay(date: Date): Date {
  const newDate = new Date(date);
  newDate.setHours(23, 59, 59, 999);
  return newDate;
}
