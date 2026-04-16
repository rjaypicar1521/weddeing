/**
 * Date and time formatting utilities for guest invitation views.
 */

/**
 * Formats wedding date safely with user-friendly fallback.
 */
export function formatWeddingDate(value: string | undefined): string {
  if (!value) return 'Wedding Date';
  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) return value;
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(parsedDate);
}

/**
 * Formats HH:mm values to locale clock format safely.
 */
export function formatWeddingTime(value: string | undefined): string {
  if (!value) return 'Time TBA';
  const [hoursRaw, minutesRaw] = value.split(':');
  const hours = Number(hoursRaw);
  const minutes = Number(minutesRaw);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return value;
  const base = new Date();
  base.setHours(hours, minutes, 0, 0);
  return new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(base);
}

/**
 * Handles either 24-hour or AM/PM schedule time string values.
 */
export function formatScheduleTime(value: string | undefined): string {
  if (!value) return '--:--';

  const normalized = value.trim();
  const meridiemMatch = normalized.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (meridiemMatch) {
    const [, hours, minutes, meridiem] = meridiemMatch;
    const base = new Date();
    let hour = Number(hours);
    if (meridiem.toUpperCase() === 'PM' && hour < 12) hour += 12;
    if (meridiem.toUpperCase() === 'AM' && hour === 12) hour = 0;
    base.setHours(hour, Number(minutes), 0, 0);
    return new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(base);
  }

  return formatWeddingTime(normalized);
}

/**
 * Formats an ISO timestamp as relative date string.
 */
export function formatRelativeDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'just now';

  const secondsDiff = Math.floor((date.getTime() - Date.now()) / 1000);
  const formatter = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

  const absolute = Math.abs(secondsDiff);
  if (absolute < 60) return formatter.format(secondsDiff, 'second');

  const minutes = Math.round(secondsDiff / 60);
  if (Math.abs(minutes) < 60) return formatter.format(minutes, 'minute');

  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return formatter.format(hours, 'hour');

  const days = Math.round(hours / 24);
  if (Math.abs(days) < 30) return formatter.format(days, 'day');

  const months = Math.round(days / 30);
  if (Math.abs(months) < 12) return formatter.format(months, 'month');

  const years = Math.round(months / 12);
  return formatter.format(years, 'year');
}

