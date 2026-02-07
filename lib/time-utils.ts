/**
 * Time utilities for ZEP synchronization
 * ZEP uses 15-minute intervals, so we need to round times appropriately
 */

/**
 * Round a time to the nearest 15-minute interval using midpoint rounding.
 * - < 7.5 minutes past interval -> round down
 * - >= 7.5 minutes past interval -> round up
 *
 * Examples:
 * - 09:07 -> 09:00 (7 min < 7.5)
 * - 09:08 -> 09:15 (8 min >= 7.5)
 * - 09:22 -> 09:15 (7 min < 7.5 past :15)
 * - 09:23 -> 09:30 (8 min >= 7.5 past :15)
 */
export function roundToNearest15Min(date: Date): Date {
  const minutes = date.getMinutes();
  const remainder = minutes % 15;

  let roundedMinutes: number;
  if (remainder < 7.5) {
    // Round down
    roundedMinutes = minutes - remainder;
  } else {
    // Round up
    roundedMinutes = minutes + (15 - remainder);
  }

  const result = new Date(date);

  // Handle rollover to next hour
  if (roundedMinutes >= 60) {
    result.setHours(result.getHours() + 1);
    result.setMinutes(0);
  } else {
    result.setMinutes(roundedMinutes);
  }

  result.setSeconds(0);
  result.setMilliseconds(0);
  return result;
}

/**
 * Format a date's time as HH:mm, rounded to nearest 15 minutes.
 * Uses German locale (24-hour format).
 */
export function formatTimeRounded(date: Date): string {
  const rounded = roundToNearest15Min(date);
  return rounded.toLocaleTimeString('de-DE', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Parse a ZEP time string (HH:mm:ss or HH:mm) to a Date object on a given date.
 * Returns a Date with the time set to the parsed value.
 */
export function parseZepTime(timeStr: string, baseDate?: Date): Date {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const result = baseDate ? new Date(baseDate) : new Date();
  result.setHours(hours, minutes, 0, 0);
  return result;
}

/**
 * Check if two times match (comparing hours and minutes only).
 * Times can be Date objects or HH:mm:ss strings.
 */
export function timesMatch(time1: Date | string, time2: Date | string): boolean {
  const getHoursMinutes = (t: Date | string): string => {
    if (typeof t === 'string') {
      return t.slice(0, 5); // "HH:mm:ss" -> "HH:mm"
    }
    return t.toLocaleTimeString('de-DE', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return getHoursMinutes(time1) === getHoursMinutes(time2);
}

/**
 * Check if two time ranges match (start-to-start and end-to-end).
 */
export function timeRangesMatch(
  start1: Date | string,
  end1: Date | string,
  start2: Date | string,
  end2: Date | string,
): boolean {
  return timesMatch(start1, start2) && timesMatch(end1, end2);
}

/**
 * Calculate display times for a time range.
 * ZEP requires times to be on 15-minute boundaries (12:00, 12:15, 12:30, 12:45).
 * Always rounds using midpoint rounding to preserve duration as much as possible.
 * Example: 12:40-12:55 (15 min) -> 12:45-13:00 (15 min)
 *
 * Returns start/end as formatted strings (HH:mm) and duration in minutes.
 */
export function calculateDisplayTimes(
  startDate: Date,
  endDate: Date,
): {
  startFormatted: string;
  endFormatted: string;
  durationMinutes: number;
  durationHours: number;
  durationMins: number;
  wasRounded: boolean;
} {
  // Always round to 15-minute boundaries for ZEP compatibility
  const displayStart = roundToNearest15Min(startDate);
  const displayEnd = roundToNearest15Min(endDate);

  // Check if rounding changed the times
  const wasRounded =
    startDate.getMinutes() !== displayStart.getMinutes() ||
    startDate.getHours() !== displayStart.getHours() ||
    endDate.getMinutes() !== displayEnd.getMinutes() ||
    endDate.getHours() !== displayEnd.getHours();

  const displayDurationMs = displayEnd.getTime() - displayStart.getTime();
  const displayDurationMinutes = displayDurationMs / 1000 / 60;
  const displayHours = Math.floor(displayDurationMinutes / 60);
  const displayMins = Math.round(displayDurationMinutes % 60);

  const formatTime = (d: Date) =>
    d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });

  return {
    startFormatted: formatTime(displayStart),
    endFormatted: formatTime(displayEnd),
    durationMinutes: displayDurationMinutes,
    durationHours: displayHours,
    durationMins: displayMins,
    wasRounded,
  };
}
