// ZEP Client-side Utilities and Types
// API calls are handled via Next.js API routes using SOAP (see lib/zep-soap.ts)

export interface ZepAttendance {
  id?: number;
  date: string; // ISO date format: "2026-01-30T00:00:00.000000Z"
  from: string; // Time format: "09:00:00"
  to: string; // Time format: "17:00:00"
  employee_id: string; // username like "rfels"
  duration?: number;
  note: string | null;
  billable: boolean;
  activity_id: string; // Activity name like "be", "ew", "re"
  project_id: number;
  project_task_id: number;
  work_location_id?: string | null;
  // SOAP-specific fields
  projektNr?: string;
  vorgangNr?: string;
}

// Helper: Format time for ZEP API (HH:mm:ss)
export function formatZepTime(date: Date): string {
  return date.toTimeString().slice(0, 8);
}

// Helper: Round time down to nearest 15-minute interval (for start times)
// 9:05 -> 9:00, 9:14 -> 9:00, 9:15 -> 9:15
export function roundTimeDown(date: Date): Date {
  const rounded = new Date(date);
  const minutes = rounded.getMinutes();
  const roundedMinutes = Math.floor(minutes / 15) * 15;
  rounded.setMinutes(roundedMinutes, 0, 0);
  return rounded;
}

// Helper: Round time up to nearest 15-minute interval (for end times)
// 9:05 -> 9:15, 9:15 -> 9:15, 9:16 -> 9:30
export function roundTimeUp(date: Date): Date {
  const rounded = new Date(date);
  const minutes = rounded.getMinutes();
  const remainder = minutes % 15;
  
  if (remainder === 0) {
    // Already on a 15-minute boundary
    rounded.setSeconds(0, 0);
    return rounded;
  }
  
  const roundedMinutes = Math.ceil(minutes / 15) * 15;
  
  if (roundedMinutes === 60) {
    // Roll over to next hour
    rounded.setHours(rounded.getHours() + 1, 0, 0, 0);
  } else {
    rounded.setMinutes(roundedMinutes, 0, 0);
  }
  
  return rounded;
}

// Helper: Format start time for ZEP (rounded down to 15-min interval)
export function formatZepStartTime(date: Date): string {
  return formatZepTime(roundTimeDown(date));
}

// Helper: Format end time for ZEP (rounded up to 15-min interval)
export function formatZepEndTime(date: Date): string {
  return formatZepTime(roundTimeUp(date));
}

// Helper: Round time to nearest 15-minute interval using midpoint rounding
// This preserves duration better than always rounding start down / end up
// Examples: 12:40 -> 12:45, 12:37 -> 12:30, 12:55 -> 13:00
function roundToNearest15Min(date: Date): Date {
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

// Helper: Calculate ZEP times for a time range
// ZEP requires times to be on 15-minute boundaries (12:00, 12:15, 12:30, 12:45)
// Uses midpoint rounding to preserve duration as much as possible
// Example: 12:40-12:55 (15 min) -> 12:45-13:00 (15 min) instead of 12:30-13:00 (30 min)
export function calculateZepTimes(startDate: Date, endDate: Date): { start: string; end: string } {
  // Always round to 15-minute boundaries using midpoint rounding
  const roundedStart = roundToNearest15Min(startDate);
  const roundedEnd = roundToNearest15Min(endDate);

  return {
    start: formatZepTime(roundedStart),
    end: formatZepTime(roundedEnd),
  };
}

// Duplicate Detection Types
export interface DuplicateCheckResult {
  hasDuplicate: boolean;
  type: 'exact' | 'timeOverlap' | 'similarSubject' | 'rescheduled' | null;
  existingEntry?: ZepAttendance;
  message?: string;
  // For rescheduled appointments: the ZEP entry that needs time correction
  zepEntryId?: number;
  originalTime?: { from: string; to: string; date: string };
  newTime?: { from: string; to: string; date: string };
}

// Levenshtein distance for fuzzy string matching
function levenshteinDistance(str1: string, str2: string): number {
  const m = str1.length;
  const n = str2.length;
  
  // Create distance matrix
  const dp: number[][] = Array(m + 1)
    .fill(null)
    .map(() => Array(n + 1).fill(0));
  
  // Initialize first row and column
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  
  // Fill the matrix
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(
          dp[i - 1][j],     // deletion
          dp[i][j - 1],     // insertion
          dp[i - 1][j - 1]  // substitution
        );
      }
    }
  }
  
  return dp[m][n];
}

// Check if two time ranges overlap
function timeRangesOverlap(
  start1: string,
  end1: string,
  start2: string,
  end2: string
): boolean {
  // Times are in HH:mm:ss format
  const toMinutes = (time: string): number => {
    const [h, m] = time.split(":").map(Number);
    return h * 60 + m;
  };
  
  const s1 = toMinutes(start1);
  const e1 = toMinutes(end1);
  const s2 = toMinutes(start2);
  const e2 = toMinutes(end2);
  
  // Overlap exists if one range starts before the other ends
  return s1 < e2 && s2 < e1;
}

// Check if an appointment was rescheduled (same subject, same day, different time)
// Only detects time changes within the same day - date changes are NOT considered rescheduled
// Returns the ZEP entry if found, null otherwise
export function findRescheduledEntry(
  appointment: {
    subject: string;
    customRemark?: string;
    startDateTime: string;
    endDateTime: string;
  },
  syncedEntries: ZepAttendance[]
): { entry: ZepAttendance; isTimeChanged: boolean } | null {
  if (!syncedEntries || syncedEntries.length === 0) {
    return null;
  }

  const aptDate = new Date(appointment.startDateTime);
  const aptDateStr = aptDate.toISOString().split("T")[0];
  const aptEndDate = new Date(appointment.endDateTime);
  // Use consistent midpoint rounding (same as calculateZepTimes)
  const zepTimes = calculateZepTimes(aptDate, aptEndDate);
  const aptFromTime = zepTimes.start;
  const aptToTime = zepTimes.end;
  const aptSubject = appointment.subject.toLowerCase().trim();
  const aptCustomRemark = (appointment.customRemark || "").toLowerCase().trim();

  if (!aptSubject) return null;

  // Only check entries on the SAME DAY
  for (const entry of syncedEntries) {
    const entrySubject = (entry.note || "").toLowerCase().trim();
    const entryDateStr = entry.date.split("T")[0];

    // Only consider entries on the same day
    if (entryDateStr !== aptDateStr) {
      continue;
    }

    // Check for exact subject match
    if (entrySubject === aptSubject || (aptCustomRemark && entrySubject === aptCustomRemark)) {
      const isTimeChanged = entry.from !== aptFromTime || entry.to !== aptToTime;

      // If subject matches and time is different, it's rescheduled (within same day)
      if (isTimeChanged) {
        return { entry, isTimeChanged };
      }
    }
  }

  return null;
}

// Check for potential duplicates in ZEP
export function checkForDuplicate(
  appointment: {
    subject: string;
    customRemark?: string;
    startDateTime: string; // ISO datetime
    endDateTime: string;   // ISO datetime
  },
  syncedEntries: ZepAttendance[],
  checkRescheduled: boolean = true // New option to check for rescheduled meetings
): DuplicateCheckResult {
  if (!syncedEntries || syncedEntries.length === 0) {
    return { hasDuplicate: false, type: null };
  }
  
  // Parse appointment date and times (use rounded times for comparison)
  const aptDate = new Date(appointment.startDateTime);
  const aptDateStr = aptDate.toISOString().split("T")[0];
  const aptEndDate = new Date(appointment.endDateTime);

  // Use consistent midpoint rounding (same as calculateZepTimes)
  const zepTimes = calculateZepTimes(aptDate, aptEndDate);
  const aptFromTime = zepTimes.start;
  const aptToTime = zepTimes.end;
  const aptSubject = appointment.subject.toLowerCase().trim();
  const aptCustomRemark = (appointment.customRemark || "").toLowerCase().trim();

  // Filter entries for the same day
  const sameDayEntries = syncedEntries.filter((entry) => {
    const entryDate = entry.date.split("T")[0];
    return entryDate === aptDateStr;
  });
  
  // Check for exact match first (same day)
  for (const entry of sameDayEntries) {
    const entrySubject = (entry.note || "").toLowerCase().trim();
    
    if (
      (entrySubject === aptSubject || (aptCustomRemark && entrySubject === aptCustomRemark)) &&
      entry.from === aptFromTime &&
      entry.to === aptToTime
    ) {
      return {
        hasDuplicate: true,
        type: 'exact',
        existingEntry: entry,
        message: `Exakter Eintrag existiert bereits in ZEP (${entry.from.slice(0, 5)}-${entry.to.slice(0, 5)})`,
      };
    }
  }
  
  // Check for rescheduled meeting (same subject, same day, different time)
  // Only detects time changes within the same day
  if (checkRescheduled && aptSubject) {
    const rescheduled = findRescheduledEntry(appointment, syncedEntries);
    if (rescheduled) {
      const { entry } = rescheduled;
      
      return {
        hasDuplicate: true,
        type: 'rescheduled',
        existingEntry: entry,
        message: `Zeit geändert von ${entry.from.slice(0, 5)}-${entry.to.slice(0, 5)}`,
        zepEntryId: entry.id,
        originalTime: {
          from: entry.from,
          to: entry.to,
          date: aptDateStr, // Same day
        },
        newTime: {
          from: aptFromTime,
          to: aptToTime,
          date: aptDateStr, // Same day
        },
      };
    }
  }
  
  // Check for time overlap (only if no rescheduled match found)
  for (const entry of sameDayEntries) {
    if (timeRangesOverlap(aptFromTime, aptToTime, entry.from, entry.to)) {
      return {
        hasDuplicate: true,
        type: 'timeOverlap',
        existingEntry: entry,
        message: `Zeitüberschneidung mit "${entry.note || 'Eintrag'}" (${entry.from.slice(0, 5)}-${entry.to.slice(0, 5)})`,
      };
    }
  }
  
  // Check for similar subject (Levenshtein distance <= 3)
  for (const entry of sameDayEntries) {
    const entrySubject = (entry.note || "").toLowerCase().trim();
    
    if (entrySubject && aptSubject) {
      // Also check against customRemark for Levenshtein distance
      const remarkToCheck = aptCustomRemark || aptSubject;
      const distance = levenshteinDistance(remarkToCheck, entrySubject);
      
      // For short strings, use proportional threshold
      const threshold = Math.min(3, Math.floor(Math.min(aptSubject.length, entrySubject.length) * 0.3));
      
      if (distance <= threshold && distance > 0) {
        return {
          hasDuplicate: true,
          type: 'similarSubject',
          existingEntry: entry,
          message: `Ähnlicher Eintrag: "${entry.note}" (${entry.from.slice(0, 5)}-${entry.to.slice(0, 5)})`,
        };
      }
    }
  }
  
  return { hasDuplicate: false, type: null };
}

// Check multiple appointments for duplicates
export function checkAppointmentsForDuplicates(
  appointments: Array<{
    id: string;
    subject: string;
    customRemark?: string;
    startDateTime: string;
    endDateTime: string;
  }>,
  syncedEntries: ZepAttendance[]
): Map<string, DuplicateCheckResult> {
  const results = new Map<string, DuplicateCheckResult>();

  for (const apt of appointments) {
    const result = checkForDuplicate(
      {
        subject: apt.subject,
        customRemark: apt.customRemark,
        startDateTime: apt.startDateTime,
        endDateTime: apt.endDateTime,
      },
      syncedEntries
    );
    
    if (result.hasDuplicate) {
      results.set(apt.id, result);
    }
  }
  
  return results;
}
