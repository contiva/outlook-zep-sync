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
  actualStart: string;  // ISO datetime
  actualEnd: string;    // ISO datetime
}

/**
 * Map of normalized join URLs to their actual durations
 */
export type ActualDurationsMap = Map<string, ActualDuration>;
