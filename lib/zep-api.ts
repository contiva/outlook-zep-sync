// ZEP API Base URL for Contiva
export const ZEP_BASE_URL = "https://www.zep-online.de/zepcontiva/next";

export interface ZepProjectStatus {
  id: string;
  name: string;
  bookable: boolean;
}

export interface ZepProject {
  id: number;
  name: string;
  description: string;
  project_status_id: string;
  status: ZepProjectStatus;
  customer_id: string | null;
  start_date: string | null;
  end_date: string | null;
}

export interface ZepTask {
  id: number;
  name: string;
  description: string | null;
  status: string | null;
  project_id: number;
  start_date: string | null;
  end_date: string | null;
}

export interface ZepActivity {
  name: string;
  description: string;
  is_travel: boolean;
}

export interface ZepEmployee {
  username: string;
  firstname: string;
  lastname: string;
  email: string | null;
}

export interface ZepEmployeeProject {
  id: number;
  employee_id: string;
  project_id: number;
  from: string | null; // ISO date or null
  to: string | null; // ISO date or null
  note: string | null;
  availability: number | null;
}

// Closed task statuses (case-insensitive)
const CLOSED_STATUSES = ["abgeschlossen", "geschlossen", "erledigt", "fertig"];

function isTaskClosed(status: string | null): boolean {
  if (!status) return false;
  return CLOSED_STATUSES.includes(status.toLowerCase());
}

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
}

export interface ZepPaginatedResponse<T> {
  data: T[];
  links: {
    first: string;
    last: string;
    prev: string | null;
    next: string | null;
  };
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}

async function fetchZepApi<T>(
  endpoint: string,
  token: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${ZEP_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`ZEP API error ${response.status}: ${errorText}`);
  }

  return response.json();
}

// Fetch all pages of a paginated endpoint (optimized with per_page=100)
async function fetchAllPages<T>(
  endpoint: string,
  token: string
): Promise<T[]> {
  const separator = endpoint.includes("?") ? "&" : "?";
  const firstPageUrl = `${endpoint}${separator}per_page=100`;
  
  const response = await fetchZepApi<ZepPaginatedResponse<T>>(firstPageUrl, token);
  
  // If all data fits in one page, return immediately
  if (response.meta.current_page >= response.meta.last_page) {
    return response.data;
  }
  
  // Otherwise fetch remaining pages in parallel
  const allItems = [...response.data];
  const remainingPages = [];
  for (let page = 2; page <= response.meta.last_page; page++) {
    remainingPages.push(
      fetchZepApi<ZepPaginatedResponse<T>>(`${firstPageUrl}&page=${page}`, token)
    );
  }
  
  const results = await Promise.all(remainingPages);
  results.forEach((r) => allItems.push(...r.data));
  
  return allItems;
}

// Get all projects (only bookable ones for time entry)
export async function getZepProjects(token: string): Promise<ZepProject[]> {
  const projects = await fetchAllPages<ZepProject>("/api/v1/projects", token);
  // Filter to only show bookable projects
  return projects.filter((p) => p.status?.bookable === true);
}

// Get tasks for a specific project
// Filters out closed tasks (abgeschlossen, geschlossen, erledigt, fertig) and expired tasks
export async function getZepProjectTasks(
  token: string,
  projectId: number
): Promise<ZepTask[]> {
  // Fetch all tasks for the project
  const tasks = await fetchAllPages<ZepTask>(
    `/api/v1/projects/${projectId}/tasks`,
    token
  );

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Filter tasks
  return tasks.filter((t) => {
    // Exclude closed tasks
    if (isTaskClosed(t.status)) return false;

    // Check task end_date (hide expired)
    if (t.end_date) {
      const taskEndDate = new Date(t.end_date);
      taskEndDate.setHours(0, 0, 0, 0);
      if (taskEndDate < today) return false;
    }

    return true;
  });
}

// Get all activities
export async function getZepActivities(token: string): Promise<ZepActivity[]> {
  const response = await fetchZepApi<ZepPaginatedResponse<ZepActivity>>(
    "/api/v1/activities",
    token
  );
  return response.data;
}

// Get current employee info
export async function getZepEmployees(token: string): Promise<ZepEmployee[]> {
  return fetchAllPages<ZepEmployee>("/api/v1/employees", token);
}

// Get projects assigned to a specific employee
export async function getZepEmployeeProjects(
  token: string,
  employeeId: string
): Promise<ZepEmployeeProject[]> {
  return fetchAllPages<ZepEmployeeProject>(
    `/api/v1/employees/${employeeId}/projects`,
    token
  );
}

// Get projects for employee, filtered by date range
export async function getZepProjectsForEmployee(
  token: string,
  employeeId: string,
  startDate?: string,
  endDate?: string
): Promise<ZepProject[]> {
  // First get all employee project assignments
  const assignments = await getZepEmployeeProjects(token, employeeId);
  
  // Filter assignments by date range if provided
  const validAssignments = assignments.filter((a) => {
    // If no date filter, include all
    if (!startDate && !endDate) return true;
    
    const assignmentFrom = a.from ? new Date(a.from) : null;
    const assignmentTo = a.to ? new Date(a.to) : null;
    const rangeStart = startDate ? new Date(startDate) : null;
    const rangeEnd = endDate ? new Date(endDate) : null;
    
    // If assignment has no date restrictions, it's always valid
    if (!assignmentFrom && !assignmentTo) return true;
    
    // Check if date ranges overlap
    // Assignment is valid if: assignmentFrom <= rangeEnd AND assignmentTo >= rangeStart
    const fromOk = !assignmentFrom || !rangeEnd || assignmentFrom <= rangeEnd;
    const toOk = !assignmentTo || !rangeStart || assignmentTo >= rangeStart;
    
    return fromOk && toOk;
  });
  
  // Get unique project IDs
  const projectIds = [...new Set(validAssignments.map((a) => a.project_id))];
  
  // Get all projects and filter to assigned ones
  const allProjects = await getZepProjects(token);
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return allProjects.filter((p) => {
    // Must be in assigned projects
    if (!projectIds.includes(p.id)) return false;

    // Hide expired projects
    if (p.end_date) {
      const projectEndDate = new Date(p.end_date);
      projectEndDate.setHours(0, 0, 0, 0);
      if (projectEndDate < today) return false;
    }

    return true;
  });
}

// Get attendances (time entries) for an employee in a date range
export async function getZepAttendances(
  token: string,
  employeeId: string,
  startDate: string,
  endDate: string
): Promise<ZepAttendance[]> {
  // ZEP API uses start_date, end_date, employee_id as query params (not filter[])
  const params = new URLSearchParams({
    employee_id: employeeId,
    start_date: startDate,
    end_date: endDate,
    limit: "100",
  });
  
  // For a month, one page should be enough (max ~100 entries)
  const response = await fetchZepApi<ZepPaginatedResponse<ZepAttendance>>(
    `/api/v1/attendances?${params.toString()}`,
    token
  );
  
  // If all data fits in one page, return immediately
  if (response.meta.current_page >= response.meta.last_page) {
    return response.data;
  }
  
  // Otherwise fetch remaining pages
  const allItems = [...response.data];
  for (let page = 2; page <= response.meta.last_page; page++) {
    const nextResponse = await fetchZepApi<ZepPaginatedResponse<ZepAttendance>>(
      `/api/v1/attendances?${params.toString()}&page=${page}`,
      token
    );
    allItems.push(...nextResponse.data);
  }
  
  return allItems;
}

// Create a new attendance (time entry)
export async function createZepAttendance(
  token: string,
  attendance: Omit<ZepAttendance, "id" | "duration">
): Promise<ZepAttendance> {
  return fetchZepApi<ZepAttendance>("/api/v1/attendances", token, {
    method: "POST",
    body: JSON.stringify(attendance),
  });
}

// Helper: Format date for ZEP API (YYYY-MM-DD format required)
export function formatZepDate(date: Date): string {
  return date.toISOString().split("T")[0];
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

// Find employee by email address (case-insensitive)
export async function findEmployeeByEmail(
  token: string,
  email: string
): Promise<ZepEmployee | null> {
  const employees = await getZepEmployees(token);
  
  const normalizedEmail = email.toLowerCase();
  
  // Try exact email match first
  const exactMatch = employees.find(
    (emp) => emp.email?.toLowerCase() === normalizedEmail
  );
  
  if (exactMatch) {
    return exactMatch;
  }
  
  // Fallback: Try matching by constructed username pattern
  // e.g., robert.fels@domain.com -> look for username starting with 'rfels' or 'robert.fels'
  const localPart = email.split("@")[0].toLowerCase();
  const parts = localPart.split(".");
  
  if (parts.length >= 2) {
    const shortUsername = parts[0].charAt(0) + parts[parts.length - 1]; // rfels
    const matchByUsername = employees.find(
      (emp) => emp.username.toLowerCase() === shortUsername
    );
    if (matchByUsername) {
      return matchByUsername;
    }
  }
  
  return null;
}

// Duplicate Detection Types
export interface DuplicateCheckResult {
  hasDuplicate: boolean;
  type: 'exact' | 'timeOverlap' | 'similarSubject' | null;
  existingEntry?: ZepAttendance;
  message?: string;
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

// Check for potential duplicates in ZEP
export function checkForDuplicate(
  appointment: {
    subject: string;
    startDateTime: string; // ISO datetime
    endDateTime: string;   // ISO datetime
  },
  syncedEntries: ZepAttendance[]
): DuplicateCheckResult {
  if (!syncedEntries || syncedEntries.length === 0) {
    return { hasDuplicate: false, type: null };
  }
  
  // Parse appointment date and times (use rounded times for comparison)
  const aptDate = new Date(appointment.startDateTime);
  const aptDateStr = aptDate.toISOString().split("T")[0];
  const aptEndDate = new Date(appointment.endDateTime);
  
  // Use rounded times (same as when syncing to ZEP)
  const aptFromTime = formatZepStartTime(aptDate);
  const aptToTime = formatZepEndTime(aptEndDate);
  const aptSubject = appointment.subject.toLowerCase().trim();
  
  // Filter entries for the same day
  const sameDayEntries = syncedEntries.filter((entry) => {
    const entryDate = entry.date.split("T")[0];
    return entryDate === aptDateStr;
  });
  
  if (sameDayEntries.length === 0) {
    return { hasDuplicate: false, type: null };
  }
  
  // Check for exact match
  for (const entry of sameDayEntries) {
    const entrySubject = (entry.note || "").toLowerCase().trim();
    
    if (
      entrySubject === aptSubject &&
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
  
  // Check for time overlap
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
      const distance = levenshteinDistance(aptSubject, entrySubject);
      
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
