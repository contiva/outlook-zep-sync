/**
 * Normalize Teams meeting join URL to a consistent key.
 * Extracts the meeting ID from various URL formats.
 *
 * Example URLs:
 * - https://teams.microsoft.com/l/meetup-join/19%3ameeting_ABC123...
 * - https://teams.microsoft.com/l/meetup-join/19:meeting_ABC123...
 *
 * @param url - The Teams join URL from calendar event or call record
 * @returns Normalized meeting ID (lowercase) or null if invalid
 */
export function normalizeJoinUrl(url?: string): string | null {
  if (!url) return null;
  // Match the meeting ID pattern in Teams URLs
  // The pattern matches either % encoded or : separator
  const match = url.match(/19[:%]meeting_([a-zA-Z0-9-]+)/i);
  return match ? match[1].toLowerCase() : url.toLowerCase();
}

/**
 * Actual duration data for a meeting call
 */
export interface ActualDuration {
  actualStart: string; // ISO datetime
  actualEnd: string; // ISO datetime
}

/**
 * Map of duration keys (normalizedUrl + date) to their actual durations
 */
export type ActualDurationsMap = Map<string, ActualDuration>;

/**
 * Create a unique key for duration lookup combining meeting URL and date.
 * This is necessary because recurring meetings share the same joinUrl,
 * but each occurrence has a different actual duration.
 *
 * @param normalizedUrl - The normalized meeting URL
 * @param date - The date string (YYYY-MM-DD format)
 * @returns Combined key for duration lookup
 */
export function getDurationKey(normalizedUrl: string, date: string): string {
  return `${normalizedUrl}_${date}`;
}

/**
 * Extract the date from a duration key.
 *
 * @param key - The duration key (normalizedUrl_YYYY-MM-DD)
 * @returns The date part (YYYY-MM-DD) or null if invalid
 */
export function getDateFromDurationKey(key: string): string | null {
  const parts = key.split('_');
  const datePart = parts[parts.length - 1];
  // Validate it looks like a date
  if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
    return datePart;
  }
  return null;
}
