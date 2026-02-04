"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { format, startOfMonth, endOfMonth, subMonths, isWeekend, addDays } from "date-fns";
import { LogOut, Keyboard, Loader2, Phone, ChevronLeft, ChevronRight } from "lucide-react";
import { useToast } from "@/components/Toast";
import Image from "next/image";
import DateRangePicker from "@/components/DateRangePicker";
import AppointmentList from "@/components/AppointmentList";
import CalendarHeatmap, { CalendarHeatmapLegend, HeatmapStats } from "@/components/CalendarHeatmap";
import { saveSyncRecords, SyncRecord } from "@/lib/sync-history";
import { checkAppointmentsForDuplicates, DuplicateCheckResult, ZepAttendance, calculateZepTimes } from "@/lib/zep-api";
import { ActualDuration, ActualDurationsMap, normalizeJoinUrl, getDurationKey } from "@/lib/teams-utils";
import { roundToNearest15Min, timesMatch } from "@/lib/time-utils";

// Helper: Determine billable status from project/task settings
// Values: 0=inherited(task only), 1=billable+editable, 2=billable+locked, 3=not billable+editable, 4=not billable+locked
// Note: ZEP SOAP API returns these as strings, so we convert to number
function determineBillable(projektFakt?: number | string, vorgangFakt?: number | string): boolean {
  const pFakt = projektFakt !== undefined ? Number(projektFakt) : undefined;
  const vFakt = vorgangFakt !== undefined ? Number(vorgangFakt) : undefined;
  
  // Task has own setting (not 0 = "inherited")
  if (vFakt !== undefined && vFakt !== 0) {
    return vFakt === 1 || vFakt === 2;
  }
  // Fallback to project setting
  if (pFakt !== undefined) {
    return pFakt === 1 || pFakt === 2;
  }
  // Default: billable
  return true;
}

// Helper: Determine if user can change billable status
// Values 1 and 3 are editable, values 2 and 4 are locked
// Note: ZEP SOAP API returns these as strings, so we convert to number
function canChangeBillable(projektFakt?: number | string, vorgangFakt?: number | string): boolean {
  const pFakt = projektFakt !== undefined ? Number(projektFakt) : undefined;
  const vFakt = vorgangFakt !== undefined ? Number(vorgangFakt) : undefined;
  
  // Task has own setting (not 0 = "inherited")
  if (vFakt !== undefined && vFakt !== 0) {
    return vFakt === 1 || vFakt === 3;
  }
  // Fallback to project setting
  if (pFakt !== undefined) {
    return pFakt === 1 || pFakt === 3;
  }
  // Default: editable
  return true;
}

// Zugeordnete Tätigkeit (zu Projekt oder Vorgang)
interface AssignedActivity {
  name: string;      // Tätigkeit-Kürzel
  standard: boolean; // true wenn Standard-Tätigkeit
}

interface Project {
  id: number;
  name: string;
  description: string;
  activities?: AssignedActivity[]; // Dem Projekt zugeordnete Tätigkeiten
  voreinstFakturierbarkeit?: number; // 1-4: Projekt-Level Fakturierbarkeit
  defaultFakt?: number; // 1-4: Projekt-Level Fakturierbarkeit (alternative)
}

interface Task {
  id: number;
  name: string;
  description: string | null;
  project_id: number;
  activities?: AssignedActivity[]; // Dem Vorgang zugeordnete Tätigkeiten (leer = erbt vom Projekt)
  defaultFakt?: number; // 0=vom Projekt geerbt, 1-4=eigene Einstellung
}

interface Activity {
  name: string;
  description: string;
}

interface Attendee {
  emailAddress: {
    name: string;
    address: string;
  };
  type: "required" | "optional" | "resource";
  status: {
    response: string;
  };
}

interface CalendarEvent {
  id: string;
  subject: string;
  start: { dateTime: string };
  end: { dateTime: string };
  attendees?: Attendee[];
  organizer?: {
    emailAddress: {
      name: string;
      address: string;
    };
  };
  isOrganizer?: boolean;
  seriesMasterId?: string;
  type?: 'calendar' | 'call' | 'singleInstance' | 'occurrence' | 'exception' | 'seriesMaster';
  callType?: 'Phone' | 'Video' | 'ScreenShare';
  direction?: 'incoming' | 'outgoing';
  isOnlineMeeting?: boolean;
  onlineMeetingProvider?: string;
  onlineMeeting?: { joinUrl?: string }; // Teams meeting join URL
  isCancelled?: boolean;
  lastModifiedDateTime?: string;
}

interface Appointment {
  id: string;
  subject: string;
  start: { dateTime: string };
  end: { dateTime: string };
  selected: boolean;
  projectId: number | null;
  taskId: number | null;
  activityId: string;
  billable: boolean;
  canChangeBillable: boolean; // false when task/project setting is locked (2 or 4)
  attendees?: Attendee[];
  organizer?: {
    emailAddress: {
      name: string;
      address: string;
    };
  };
  isOrganizer?: boolean;
  seriesMasterId?: string;
  type?: 'calendar' | 'call' | 'singleInstance' | 'occurrence' | 'exception' | 'seriesMaster';
  callType?: 'Phone' | 'Video' | 'ScreenShare';
  direction?: 'incoming' | 'outgoing';
  synced?: boolean; // true if already exists in ZEP
  isOnlineMeeting?: boolean;
  onlineMeetingProvider?: string;
  onlineMeeting?: { joinUrl?: string }; // Teams meeting join URL
  isCancelled?: boolean;
  lastModifiedDateTime?: string;
  useActualTime?: boolean; // true = use actual time from call records, false = use planned time
}

interface ZepEntry {
  id: number;
  date: string;
  from: string;
  to: string;
  note: string | null;
  employee_id: string;
  project_id: number;
  project_task_id: number;
  activity_id: string;
  billable: boolean;
  projektNr?: string;
  vorgangNr?: string;
}

// Modified entry for rebooking synced entries
export interface ModifiedEntry {
  zepId: number;
  outlookEventId: string;
  originalProjectId: number;
  originalTaskId: number;
  originalActivityId: string;
  originalBillable: boolean;
  newProjectId: number;
  newTaskId: number;
  newActivityId: string;
  newBillable: boolean;
  newProjektNr: string;
  newVorgangNr: string;
  // Original entry data needed for SOAP modify call
  userId: string;
  datum: string;
  von: string;
  bis: string;
  bemerkung?: string;
  // New time values (when user changes planned/actual time in edit mode)
  newVon?: string;
  newBis?: string;
}

// localStorage key for persisting work state
const STORAGE_KEY = "outlook-zep-sync-state";

// localStorage key for caching Outlook calendar data and ZEP entries
const CALENDAR_CACHE_KEY = "outlook-calendar-cache";
const ZEP_CACHE_KEY = "zep-entries-cache";
const PROJECTS_CACHE_KEY = "zep-projects-cache";

// Cache duration: 1 hour in milliseconds
const CACHE_DURATION_MS = 60 * 60 * 1000;

interface CalendarCacheEntry {
  appointments: CalendarEvent[];
  cachedAt: number;
}

interface CalendarCache {
  // Key format: "YYYY-MM-DD_YYYY-MM-DD" (startDate_endDate)
  [dateRange: string]: CalendarCacheEntry;
}

interface ZepCacheEntry {
  entries: ZepEntry[];
  cachedAt: number;
}

interface ZepCache {
  // Key format: "employeeId_YYYY-MM-DD_YYYY-MM-DD"
  [key: string]: ZepCacheEntry;
}

interface ProjectsCacheEntry {
  projects: Project[];
  cachedAt: number;
}

interface ProjectsCache {
  // Key format: "employeeId_date"
  [key: string]: ProjectsCacheEntry;
}

// Helper: Get the nth workday of a month (1-based)
function getNthWorkday(date: Date, n: number): Date {
  const start = startOfMonth(date);
  let workdays = 0;
  let current = start;
  
  while (workdays < n) {
    if (!isWeekend(current)) {
      workdays++;
      if (workdays === n) {
        return current;
      }
    }
    current = addDays(current, 1);
  }
  return current;
}

// Helper: Check if we should default to last month (before 5th workday of current month)
function shouldDefaultToLastMonth(): boolean {
  const today = new Date();
  const fifthWorkday = getNthWorkday(today, 5);
  return today <= fifthWorkday;
}

// Helper: Get default date range based on current date
function getDefaultDateRange(): { startDate: string; endDate: string } {
  const today = new Date();
  
  if (shouldDefaultToLastMonth()) {
    // Before 5th workday: default to last month
    const lastMonth = subMonths(today, 1);
    return {
      startDate: format(startOfMonth(lastMonth), "yyyy-MM-dd"),
      endDate: format(endOfMonth(lastMonth), "yyyy-MM-dd"),
    };
  } else {
    // After 5th workday: default to this month
    return {
      startDate: format(startOfMonth(today), "yyyy-MM-dd"),
      endDate: format(endOfMonth(today), "yyyy-MM-dd"),
    };
  }
}

// Helper: Get default filter date based on current date
// Returns today's date (yyyy-MM-dd) when showing current month, null otherwise
function getDefaultFilterDate(): string | null {
  if (shouldDefaultToLastMonth()) {
    // Before 5th workday: showing last month, no default filter
    return null;
  } else {
    // After 5th workday: showing current month, default to today
    return format(new Date(), "yyyy-MM-dd");
  }
}

interface PersistedState {
  startDate: string;
  endDate: string;
  appointments: Appointment[];
  filterDate: string | null;
  hideSoloMeetings: boolean;
  syncedEntries: ZepEntry[]; // Already synced entries from ZEP
  savedAt: number; // timestamp for cache invalidation
}

// Helper: Parse error message - remove HTML tags and clean up
function parseErrorMessage(error: string): string {
  return error
    // Replace <br />, <br/>, <br> with newlines for display
    .replace(/<br\s*\/?>/gi, " | ")
    // Remove any remaining HTML tags
    .replace(/<[^>]*>/g, "")
    // Clean up multiple spaces
    .replace(/\s+/g, " ")
    // Trim
    .trim();
}

// Helper: Check if an appointment is already synced to ZEP
// Uses rounded times (same as when syncing to ZEP) for accurate comparison
// Trims subject/note for comparison (Outlook may have trailing spaces that ZEP trims)
function isAppointmentSynced(apt: Appointment, syncedEntries: ZepEntry[]): boolean {
  if (!syncedEntries || syncedEntries.length === 0) {
    return false;
  }

  const aptDateStr = new Date(apt.start.dateTime).toISOString().split("T")[0];
  const aptSubject = (apt.subject || "").trim();

  // Check if any synced entry matches this appointment by subject and date
  // We don't check times strictly because the entry could have been synced with
  // planned time OR actual time - we just need to know if it exists
  const result = syncedEntries.some((entry) => {
    const entryDate = entry.date.split("T")[0];
    const entryNote = (entry.note || "").trim();
    return entryNote === aptSubject && entryDate === aptDateStr;
  });

  return result;
}

// Helper: Detect which time was synced to ZEP (planned or actual)
// Returns true if actual time was used, false if planned time was used
// Returns undefined if cannot be determined (appointment not synced or no actual duration data)
function detectSyncedTimePreference(
  apt: Appointment,
  syncedEntries: ZepEntry[],
  actualDuration: ActualDuration | undefined
): boolean | undefined {
  if (!syncedEntries || syncedEntries.length === 0) {
    return undefined;
  }

  const aptDateStr = new Date(apt.start.dateTime).toISOString().split("T")[0];
  const aptSubject = (apt.subject || "").trim();

  // Find the matching synced entry
  const syncedEntry = syncedEntries.find((entry) => {
    const entryDate = entry.date.split("T")[0];
    const entryNote = (entry.note || "").trim();
    return entryNote === aptSubject && entryDate === aptDateStr;
  });

  if (!syncedEntry) {
    return undefined;
  }

  // Get planned times (rounded)
  const plannedStart = new Date(apt.start.dateTime);
  const plannedEnd = new Date(apt.end.dateTime);
  const plannedStartRounded = roundToNearest15Min(plannedStart);
  const plannedEndRounded = roundToNearest15Min(plannedEnd);

  // Convert ZEP entry times to comparable format (HH:mm)
  const zepStartTime = syncedEntry.from.slice(0, 5);
  const zepEndTime = syncedEntry.to.slice(0, 5);

  // Format planned rounded times
  const plannedStartStr = plannedStartRounded.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
  const plannedEndStr = plannedEndRounded.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });

  // Check if ZEP times match planned times
  const matchesPlanned = timesMatch(zepStartTime, plannedStartStr) && timesMatch(zepEndTime, plannedEndStr);

  // If no actual duration data, we can't compare to actual
  if (!actualDuration) {
    return matchesPlanned ? false : undefined;
  }

  // Get actual times (rounded)
  const actualStart = new Date(actualDuration.actualStart);
  const actualEnd = new Date(actualDuration.actualEnd);
  const actualStartRounded = roundToNearest15Min(actualStart);
  const actualEndRounded = roundToNearest15Min(actualEnd);

  // Format actual rounded times
  const actualStartStr = actualStartRounded.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
  const actualEndStr = actualEndRounded.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });

  // Check if ZEP times match actual times
  const matchesActual = timesMatch(zepStartTime, actualStartStr) && timesMatch(zepEndTime, actualEndStr);

  // Determine which was used based on matches
  if (matchesActual && !matchesPlanned) {
    return true; // Actual time was used
  } else if (matchesPlanned && !matchesActual) {
    return false; // Planned time was used
  } else if (matchesActual && matchesPlanned) {
    // Both match (actual and planned were the same), default to planned
    return false;
  }

  // Neither matches exactly - return undefined
  return undefined;
}

// Helper to safely access localStorage (SSR-safe)
const getStoredState = (): PersistedState | null => {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    const state = JSON.parse(stored) as PersistedState;
    // Invalidate cache after 24 hours
    if (Date.now() - state.savedAt > 24 * 60 * 60 * 1000) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return state;
  } catch {
    return null;
  }
};

const saveState = (state: Omit<PersistedState, "savedAt">) => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...state, savedAt: Date.now() })
    );
  } catch {
    // Ignore storage errors (quota exceeded, etc.)
  }
};

// Calendar cache helper functions
const getCalendarCache = (): CalendarCache => {
  if (typeof window === "undefined") return {};
  try {
    const stored = localStorage.getItem(CALENDAR_CACHE_KEY);
    if (!stored) return {};
    return JSON.parse(stored) as CalendarCache;
  } catch {
    return {};
  }
};

const getCachedAppointments = (startDate: string, endDate: string): CalendarEvent[] | null => {
  const cache = getCalendarCache();
  const key = `${startDate}_${endDate}`;
  const entry = cache[key];
  
  if (!entry) return null;
  
  // Check if cache is still valid
  if (Date.now() - entry.cachedAt > CACHE_DURATION_MS) {
    // Cache expired, remove it
    delete cache[key];
    try {
      localStorage.setItem(CALENDAR_CACHE_KEY, JSON.stringify(cache));
    } catch {
      // Ignore storage errors
    }
    return null;
  }
  
  return entry.appointments;
};

const setCachedAppointments = (startDate: string, endDate: string, appointments: CalendarEvent[]) => {
  if (typeof window === "undefined") return;
  try {
    const cache = getCalendarCache();
    const key = `${startDate}_${endDate}`;
    cache[key] = {
      appointments,
      cachedAt: Date.now(),
    };
    localStorage.setItem(CALENDAR_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // Ignore storage errors (quota exceeded, etc.)
  }
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const invalidateCalendarCache = (startDate?: string, endDate?: string) => {
  if (typeof window === "undefined") return;
  try {
    if (startDate && endDate) {
      // Invalidate specific date range
      const cache = getCalendarCache();
      const key = `${startDate}_${endDate}`;
      delete cache[key];
      localStorage.setItem(CALENDAR_CACHE_KEY, JSON.stringify(cache));
    } else {
      // Invalidate all cache
      localStorage.removeItem(CALENDAR_CACHE_KEY);
    }
  } catch {
    // Ignore storage errors
  }
};

// ZEP cache helper functions
const getZepCache = (): ZepCache => {
  if (typeof window === "undefined") return {};
  try {
    const stored = localStorage.getItem(ZEP_CACHE_KEY);
    if (!stored) return {};
    return JSON.parse(stored) as ZepCache;
  } catch {
    return {};
  }
};

const getCachedZepEntries = (employeeId: string, startDate: string, endDate: string): ZepEntry[] | null => {
  const cache = getZepCache();
  const key = `${employeeId}_${startDate}_${endDate}`;
  const entry = cache[key];
  
  if (!entry) return null;
  
  // Check if cache is still valid
  if (Date.now() - entry.cachedAt > CACHE_DURATION_MS) {
    // Cache expired, remove it
    delete cache[key];
    try {
      localStorage.setItem(ZEP_CACHE_KEY, JSON.stringify(cache));
    } catch {
      // Ignore storage errors
    }
    return null;
  }
  
  return entry.entries;
};

const setCachedZepEntries = (employeeId: string, startDate: string, endDate: string, entries: ZepEntry[]) => {
  if (typeof window === "undefined") return;
  try {
    const cache = getZepCache();
    const key = `${employeeId}_${startDate}_${endDate}`;
    cache[key] = {
      entries,
      cachedAt: Date.now(),
    };
    localStorage.setItem(ZEP_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // Ignore storage errors (quota exceeded, etc.)
  }
};

const invalidateZepCache = (employeeId?: string, startDate?: string, endDate?: string) => {
  if (typeof window === "undefined") return;
  try {
    if (employeeId && startDate && endDate) {
      // Invalidate specific entry
      const cache = getZepCache();
      const key = `${employeeId}_${startDate}_${endDate}`;
      delete cache[key];
      localStorage.setItem(ZEP_CACHE_KEY, JSON.stringify(cache));
    } else {
      // Invalidate all cache
      localStorage.removeItem(ZEP_CACHE_KEY);
    }
  } catch {
    // Ignore storage errors
  }
};

// Projects cache helper functions
const getProjectsCache = (): ProjectsCache => {
  if (typeof window === "undefined") return {};
  try {
    const stored = localStorage.getItem(PROJECTS_CACHE_KEY);
    if (!stored) return {};
    return JSON.parse(stored) as ProjectsCache;
  } catch {
    return {};
  }
};

const getCachedProjects = (employeeId: string, date: string): Project[] | null => {
  const cache = getProjectsCache();
  const key = `${employeeId}_${date}`;
  const entry = cache[key];
  
  if (!entry) return null;
  
  // Check if cache is still valid
  if (Date.now() - entry.cachedAt > CACHE_DURATION_MS) {
    // Cache expired, remove it
    delete cache[key];
    try {
      localStorage.setItem(PROJECTS_CACHE_KEY, JSON.stringify(cache));
    } catch {
      // Ignore storage errors
    }
    return null;
  }
  
  return entry.projects;
};

const setCachedProjects = (employeeId: string, date: string, projects: Project[]) => {
  if (typeof window === "undefined") return;
  try {
    const cache = getProjectsCache();
    const key = `${employeeId}_${date}`;
    cache[key] = {
      projects,
      cachedAt: Date.now(),
    };
    localStorage.setItem(PROJECTS_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // Ignore storage errors (quota exceeded, etc.)
  }
};

export default function Dashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Load initial state from localStorage or use defaults
  const initialState = useMemo(() => {
    const stored = getStoredState();
    const defaultRange = getDefaultDateRange();
    const defaultFilterDate = getDefaultFilterDate();
    return {
      startDate: stored?.startDate ?? defaultRange.startDate,
      endDate: stored?.endDate ?? defaultRange.endDate,
      appointments: stored?.appointments ?? [],
      filterDate: stored?.filterDate ?? defaultFilterDate,
      hideSoloMeetings: stored?.hideSoloMeetings ?? true,
      syncedEntries: stored?.syncedEntries ?? [],
    };
  }, []); // Only run once on mount

  const [startDate, setStartDate] = useState(initialState.startDate);
  const [endDate, setEndDate] = useState(initialState.endDate);
  const [appointments, setAppointments] = useState<Appointment[]>(initialState.appointments);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Record<number, Task[]>>({});
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const [syncedEntries, setSyncedEntries] = useState<ZepEntry[]>(initialState.syncedEntries);
  const [submittedIds, setSubmittedIds] = useState<Set<string>>(new Set());
  const [filterDate, setFilterDate] = useState<string | null>(initialState.filterDate);
  const [hideSoloMeetings, setHideSoloMeetings] = useState(initialState.hideSoloMeetings);
  const [seriesFilterActive, setSeriesFilterActive] = useState(false);
  const [heatmapStats, setHeatmapStats] = useState<HeatmapStats>({ synced: 0, syncedWithChanges: 0, edited: 0, unprocessed: 0 });
  const [searchQuery, setSearchQuery] = useState("");
  const [zepEmployee, setZepEmployee] = useState<{ username: string; firstname: string; lastname: string; email: string } | null>(null);
  const [employeeLoading, setEmployeeLoading] = useState(false);
  const [employeeError, setEmployeeError] = useState<string | null>(null);
  const [duplicateWarnings, setDuplicateWarnings] = useState<Map<string, DuplicateCheckResult>>(new Map());
  const [loadingTasks, setLoadingTasks] = useState<Set<number>>(new Set());
  const [lastLoadedAt, setLastLoadedAt] = useState<Date | null>(
    initialState.appointments.length > 0 ? new Date(getStoredState()?.savedAt || Date.now()) : null
  );

  // State for single row sync
  const [syncingSingleId, setSyncingSingleId] = useState<string | null>(null);

  // State for editing synced entries (rebooking)
  const [editingAppointments, setEditingAppointments] = useState<Set<string>>(new Set());
  const [modifiedEntries, setModifiedEntries] = useState<Map<string, ModifiedEntry>>(new Map());
  
  // State for correcting rescheduled appointment times
  const [correctingTimeIds, setCorrectingTimeIds] = useState<Set<string>>(new Set());

  // State for saving single modified entry
  const [savingModifiedSingleId, setSavingModifiedSingleId] = useState<string | null>(null);

  // State for calls toggle
  const [callsEnabled, setCallsEnabled] = useState(false);
  const [callsLoading, setCallsLoading] = useState(false);
  const [calls, setCalls] = useState<Appointment[]>([]);

  // State for actual meeting durations (from call records)
  const [actualDurations, setActualDurations] = useState<ActualDurationsMap>(new Map());
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [durationsLoading, setDurationsLoading] = useState(false); // For potential future loading indicator

  const employeeId = zepEmployee?.username ?? "";

  // Ref to hold the loadAppointments function for keyboard shortcuts
  const loadAppointmentsRef = useRef<(() => void) | null>(null);



  // Helper: Get all series IDs that have 2+ occurrences
  const validSeriesIds = useMemo(() => {
    const seriesMap = new Map<string, number>();
    appointments.forEach((apt) => {
      if (apt.seriesMasterId && apt.type === "occurrence") {
        seriesMap.set(apt.seriesMasterId, (seriesMap.get(apt.seriesMasterId) || 0) + 1);
      }
    });
    return new Set(
      Array.from(seriesMap.entries())
        .filter(([, count]) => count >= 2)
        .map(([id]) => id)
    );
  }, [appointments]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    }
  }, [status, router]);


  // Persist state to localStorage whenever it changes
  useEffect(() => {
    // Only save if we have appointments or synced entries (don't overwrite with empty state on initial load)
    if (appointments.length > 0 || syncedEntries.length > 0) {
      saveState({
        startDate,
        endDate,
        appointments,
        filterDate,
        hideSoloMeetings,
        syncedEntries,
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally using .length to avoid re-renders on content changes
  }, [startDate, endDate, appointments, filterDate, hideSoloMeetings, syncedEntries.length]);

  // Check for potential duplicates when appointments or synced entries change
  useEffect(() => {
    if (appointments.length === 0 || syncedEntries.length === 0) {
      setDuplicateWarnings(new Map());
      return;
    }
    
    const appointmentsToCheck = appointments
      .filter((apt) => apt.selected && !isAppointmentSynced(apt, syncedEntries))
      .map((apt) => ({
        id: apt.id,
        subject: apt.subject,
        startDateTime: apt.start.dateTime,
        endDateTime: apt.end.dateTime,
      }));
    
    const warnings = checkAppointmentsForDuplicates(appointmentsToCheck, syncedEntries as unknown as ZepAttendance[]);
    setDuplicateWarnings(warnings);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally using .length to avoid re-renders on content changes
  }, [appointments, syncedEntries.length]);

  useEffect(() => {
    // Load activities (global, not per employee)
    fetch("/api/zep/activities")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setActivities(data);
        }
      })
      .catch(console.error);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input field
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) {
        return;
      }

      // Escape - clear filters
      if (e.key === "Escape") {
        if (filterDate || seriesFilterActive || searchQuery) {
          e.preventDefault();
          setFilterDate(null);
          setSeriesFilterActive(false);
          setSearchQuery("");
        }
      }

      // Ctrl/Cmd + R - Refresh/load appointments
      if ((e.ctrlKey || e.metaKey) && e.key === "r") {
        e.preventDefault();
        loadAppointmentsRef.current?.();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [filterDate, seriesFilterActive, searchQuery]);

  // Load ZEP employee info when session is available
  useEffect(() => {
    const loadEmployee = async () => {
      const email = session?.user?.email;
      if (!email) return;
      
      setEmployeeLoading(true);
      setEmployeeError(null);
      
      try {
        const res = await fetch(`/api/zep/employees?email=${encodeURIComponent(email)}`);
        
        if (res.ok) {
          const data = await res.json();
          setZepEmployee(data);
        } else if (res.status === 404) {
          setEmployeeError(`Kein ZEP-Benutzer für ${email} gefunden. Bitte kontaktiere den Administrator.`);
        } else {
          const error = await res.json();
          setEmployeeError(error.error || "Fehler beim Laden des ZEP-Benutzers");
        }
      } catch (error) {
        console.error("Failed to load ZEP employee:", error);
        setEmployeeError("Verbindung zu ZEP fehlgeschlagen");
      } finally {
        setEmployeeLoading(false);
      }
    };
    
    loadEmployee();
  }, [session?.user?.email]);

  // Auto-load appointments when page opens (after employee is loaded)
  const hasAutoLoaded = useRef(false);
  useEffect(() => {
    if (hasAutoLoaded.current) return;
    if (!zepEmployee) return; // Wait for employee to load
    
    hasAutoLoaded.current = true;
    loadAppointments();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zepEmployee]); // Only depend on zepEmployee, loadAppointments is stable via ref

  // Note: Synced entries are loaded together with appointments in loadAppointments()

  const loadTasksForProject = useCallback(async (projectId: number, options?: { skipFilter?: boolean }): Promise<Task[]> => {
    // Return cached tasks if available
    if (tasks[projectId]) return tasks[projectId];

    setLoadingTasks((prev) => new Set(prev).add(projectId));
    try {
      // Find projektNr from loaded projects (avoids extra SOAP call in backend)
      const project = projects.find(p => p.id === projectId);
      
      // Build URL with optional filters
      const params = new URLSearchParams();
      
      // Prefer projektNr over projectId (saves a SOAP call in the backend)
      if (project?.name) {
        params.set("projektNr", project.name);
      } else {
        params.set("projectId", projectId.toString());
      }
      
      // Apply employee and date filters for new appointments (not for rebooking)
      if (!options?.skipFilter && employeeId) {
        params.set("userId", employeeId);
        // Use today as reference date for filtering active tasks
        params.set("date", new Date().toISOString().split("T")[0]);
      }
      
      const res = await fetch(`/api/zep/tasks?${params.toString()}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setTasks((prev) => ({ ...prev, [projectId]: data }));
        return data;
      }
      return [];
    } catch (error) {
      console.error("Failed to load tasks:", error);
      return [];
    } finally {
      setLoadingTasks((prev) => {
        const next = new Set(prev);
        next.delete(projectId);
        return next;
      });
    }
  }, [tasks, employeeId, projects]);

  // Load tasks for projects that were restored from localStorage
  // This runs after projects are loaded and appointments/syncedEntries exist from localStorage
  useEffect(() => {
    if (projects.length === 0) return;
    if (appointments.length === 0 && syncedEntries.length === 0) return;
    
    // Find unique project IDs from appointments and syncedEntries that don't have tasks loaded yet
    const appointmentProjectIds = appointments
      .filter(apt => apt.projectId && !tasks[apt.projectId])
      .map(apt => apt.projectId!);
    
    const syncedProjectIds = syncedEntries
      .filter(entry => entry.project_id && !tasks[entry.project_id])
      .map(entry => entry.project_id);
    
    const projectIdsToLoad = [...new Set([...appointmentProjectIds, ...syncedProjectIds])];
    
    if (projectIdsToLoad.length === 0) return;
    
    // Load tasks for each project
    projectIdsToLoad.forEach(projectId => {
      loadTasksForProject(projectId);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projects.length]); // Only run when projects are loaded, not on every appointment/syncedEntry change

  const loadAppointments = async (overrideStartDate?: string, overrideEndDate?: string, forceRefresh?: boolean) => {
    const effectiveStartDate = overrideStartDate ?? startDate;
    const effectiveEndDate = overrideEndDate ?? endDate;
    
    setLoading(true);
    try {
      // Build projects URL with today's date for filtering bookable projects
      const today = new Date().toISOString().split("T")[0];

      // Check if we have cached data (unless force refresh)
      const cachedAppointments = forceRefresh ? null : getCachedAppointments(effectiveStartDate, effectiveEndDate);
      const cachedZepEntries = forceRefresh || !employeeId ? null : getCachedZepEntries(employeeId, effectiveStartDate, effectiveEndDate);
      const cachedProjects = forceRefresh || !employeeId ? null : getCachedProjects(employeeId, today);
      
      // Load appointments (from cache or API), ZEP entries (from cache or API), and projects (from cache or API) in parallel
      const [appointmentsData, zepData, projectsData] = await Promise.all([
        cachedAppointments 
          ? Promise.resolve(cachedAppointments)
          : fetch(`/api/calendar?startDate=${effectiveStartDate}&endDate=${effectiveEndDate}`).then(res => res.json()),
        cachedZepEntries
          ? Promise.resolve(cachedZepEntries)
          : employeeId 
            ? fetch(`/api/zep/timeentries?employeeId=${employeeId}&startDate=${effectiveStartDate}&endDate=${effectiveEndDate}`).then(res => res.json())
            : Promise.resolve(null),
        cachedProjects
          ? Promise.resolve(cachedProjects)
          : employeeId
            ? fetch(`/api/zep/employee-projects?${new URLSearchParams({ employeeId, date: today })}`).then(res => res.json())
            : Promise.resolve(null),
      ]);
      
      // Cache the appointments if we fetched them fresh
      if (!cachedAppointments && Array.isArray(appointmentsData)) {
        setCachedAppointments(effectiveStartDate, effectiveEndDate, appointmentsData);
      }
      
      // Cache the ZEP entries if we fetched them fresh
      if (!cachedZepEntries && employeeId && Array.isArray(zepData)) {
        setCachedZepEntries(employeeId, effectiveStartDate, effectiveEndDate, zepData);
      }
      
      // Cache the projects if we fetched them fresh
      if (!cachedProjects && employeeId && Array.isArray(projectsData)) {
        setCachedProjects(employeeId, today, projectsData);
      }

      if (Array.isArray(appointmentsData)) {
        const userEmail = session?.user?.email?.toLowerCase();
        
        // Get previously saved state to preserve user edits
        const savedState = getStoredState();
        const savedAppointmentsMap = new Map(
          (savedState?.appointments || []).map((apt) => [apt.id, apt])
        );
        
        setAppointments(
          appointmentsData.map((event: CalendarEvent) => {
            // Check if we have saved state for this appointment
            const saved = savedAppointmentsMap.get(event.id);
            
            if (saved) {
              // Preserve user's selections and assignments
              return {
                ...event,
                selected: saved.selected,
                projectId: saved.projectId,
                taskId: saved.taskId,
                activityId: saved.activityId,
                billable: saved.billable ?? true, // Default true for old saved data
                canChangeBillable: saved.canChangeBillable ?? true, // Default true for old saved data
              };
            }
            
            // New appointment - apply defaults
            const otherAttendees = (event.attendees || []).filter(
              (a: Attendee) => a.emailAddress.address.toLowerCase() !== userEmail
            );
            const hasMeetingAttendees = otherAttendees.length > 0;
            
            // Check if cancelled more than 24h before the meeting
            let shouldBeSelected = hasMeetingAttendees;
            if (event.isCancelled && event.lastModifiedDateTime) {
              const cancelledAt = new Date(event.lastModifiedDateTime);
              const meetingStart = new Date(event.start.dateTime);
              const hoursBeforeMeeting = (meetingStart.getTime() - cancelledAt.getTime()) / (1000 * 60 * 60);
              
              // If cancelled more than 24h before meeting, don't pre-select
              if (hoursBeforeMeeting > 24) {
                shouldBeSelected = false;
              }
            }
            
            return {
              ...event,
              selected: shouldBeSelected,
              projectId: null,
              taskId: null,
              activityId: "be", // Default: Beratung
              billable: true, // Default: fakturierbar
              canChangeBillable: true, // Default: änderbar (bis Task gewählt)
            };
          })
        );
      }

      // Load ZEP entries for sync status
      if (Array.isArray(zepData)) {
        setSyncedEntries(zepData);
        
        // Load tasks for all synced projects so we can display task names
        // Note: Skip filtering here since we need all tasks to display existing entries
        const syncedProjectIds = [...new Set(zepData.map((entry: ZepEntry) => entry.project_id))];
        syncedProjectIds.forEach((projectId) => {
          if (!tasks[projectId]) {
            // Load tasks in background without filtering (skipFilter: true)
            loadTasksForProject(projectId, { skipFilter: true });
          }
        });
      }

      // Set projects
      if (Array.isArray(projectsData)) {
        setProjects(projectsData);
      }
      
      // Update last loaded timestamp
      setLastLoadedAt(new Date());
    } catch (error) {
      console.error("Failed to load appointments:", error);
      toast({ text: "Fehler beim Laden der Termine", type: "error" });
    }
    setLoading(false);
  };

  // Update ref so keyboard shortcuts can call loadAppointments with force refresh
  loadAppointmentsRef.current = () => loadAppointments(undefined, undefined, true);

  // Load calls when toggle is enabled
  const loadCalls = useCallback(async () => {
    setCallsLoading(true);
    try {
      const res = await fetch(`/api/calls?startDate=${startDate}&endDate=${endDate}`);
      const data = await res.json();

      if (data.calls && Array.isArray(data.calls)) {
        // Map calls to Appointment format
        const mappedCalls: Appointment[] = data.calls.map((call: {
          id: string;
          subject: string;
          start: string;
          end: string;
          participants: string[];
          organizer: string;
          callType: 'Phone' | 'Video' | 'ScreenShare';
          direction: 'incoming' | 'outgoing';
        }) => ({
          id: call.id,
          subject: call.subject,
          start: { dateTime: call.start },
          end: { dateTime: call.end },
          attendees: call.participants.map((p: string) => ({
            emailAddress: { name: p, address: '' },
            type: 'required' as const,
            status: { response: 'none' },
          })),
          organizer: {
            emailAddress: { name: call.organizer, address: '' },
          },
          type: 'call' as const,
          callType: call.callType,
          direction: call.direction,
          selected: false,
          projectId: null,
          taskId: null,
          activityId: 'be', // Default: Beratung
          billable: true,
          canChangeBillable: true,
        }));
        setCalls(mappedCalls);
      }
    } catch (error) {
      console.error("Failed to load calls:", error);
      toast({ text: "Fehler beim Laden der Anrufe", type: "error" });
    } finally {
      setCallsLoading(false);
    }
  }, [startDate, endDate, toast]);

  // Load/clear calls when toggle changes
  useEffect(() => {
    if (callsEnabled) {
      loadCalls();
    } else {
      setCalls([]);
    }
  }, [callsEnabled, loadCalls]);

  // Check if we have appointments with online meetings (memoized to avoid re-renders)
  const hasOnlineMeetings = useMemo(() => {
    return appointments.some(apt => apt.isOnlineMeeting && apt.onlineMeeting?.joinUrl);
  }, [appointments]);

  // Load actual meeting durations after appointments are loaded
  // This runs in background and doesn't block the UI
  useEffect(() => {
    if (appointments.length === 0 || !hasOnlineMeetings) {
      setActualDurations(new Map());
      return;
    }

    const loadActualDurations = async () => {
      setDurationsLoading(true);
      try {
        const res = await fetch(
          `/api/calls/durations?startDate=${startDate}&endDate=${endDate}`
        );
        const data = await res.json();

        if (data.durations) {
          const durationsMap: ActualDurationsMap = new Map();
          for (const [key, value] of Object.entries(data.durations)) {
            durationsMap.set(key, value as ActualDuration);
          }
          setActualDurations(durationsMap);

          // Set useActualTime based on:
          // 1. If synced: detect which time was used from ZEP entry
          // 2. If not synced: prefer longer time (don't shortchange yourself)
          setAppointments((prev) =>
            prev.map((apt) => {
              // Only set default if useActualTime is not already defined
              if (apt.useActualTime !== undefined) return apt;

              // Check if this appointment has actual duration data
              if (apt.isOnlineMeeting && apt.onlineMeeting?.joinUrl) {
                const normalizedUrl = normalizeJoinUrl(apt.onlineMeeting.joinUrl);
                // Use date-specific key for recurring meetings (they share the same joinUrl)
                const aptDate = new Date(apt.start.dateTime).toISOString().split("T")[0];
                const durationKey = normalizedUrl ? getDurationKey(normalizedUrl, aptDate) : null;
                if (durationKey && durationsMap.has(durationKey)) {
                  const actual = durationsMap.get(durationKey)!;

                  // First, check if this appointment is already synced
                  // and detect which time was used
                  const detectedPreference = detectSyncedTimePreference(apt, syncedEntries, actual);
                  if (detectedPreference !== undefined) {
                    // Use the detected preference from the synced entry
                    return { ...apt, useActualTime: detectedPreference };
                  }

                  // Not synced - use heuristic: prefer longer time
                  const actualMs = new Date(actual.actualEnd).getTime() - new Date(actual.actualStart).getTime();
                  const plannedMs = new Date(apt.end.dateTime).getTime() - new Date(apt.start.dateTime).getTime();

                  // Use actual time only if meeting took longer than planned
                  // Otherwise use planned time (default to planned when shorter)
                  const useActual = actualMs > plannedMs;
                  return { ...apt, useActualTime: useActual };
                }
              }
              return apt;
            })
          );
        }
      } catch (error) {
        console.error("Failed to load actual durations:", error);
        // Don't show error message - this is a non-critical feature
      } finally {
        setDurationsLoading(false);
      }
    };

    loadActualDurations();
  // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally using .length to avoid re-renders on content changes
  }, [appointments.length, hasOnlineMeetings, startDate, endDate, syncedEntries.length]);

  // Merge appointments with calls, deduplicating overlapping entries
  const mergedAppointments = useMemo(() => {
    if (!callsEnabled || calls.length === 0) {
      return appointments;
    }

    // Helper to check if two time ranges overlap within ±5 minutes
    const hasTimeOverlap = (apt: Appointment, call: Appointment): boolean => {
      const aptStart = new Date(apt.start.dateTime).getTime();
      const aptEnd = new Date(apt.end.dateTime).getTime();
      const callStart = new Date(call.start.dateTime).getTime();
      const callEnd = new Date(call.end.dateTime).getTime();

      const tolerance = 5 * 60 * 1000; // 5 minutes in ms

      // Check if start times are within ±5 minutes
      return Math.abs(aptStart - callStart) <= tolerance ||
             Math.abs(aptEnd - callEnd) <= tolerance ||
             (aptStart <= callStart && aptEnd >= callEnd) ||
             (callStart <= aptStart && callEnd >= aptEnd);
    };

    // Helper to check if any participant name appears in appointment attendees
    const hasParticipantOverlap = (apt: Appointment, call: Appointment): boolean => {
      if (!apt.attendees || apt.attendees.length === 0) return false;
      if (!call.attendees || call.attendees.length === 0) return false;

      const aptNames = apt.attendees.map(a => a.emailAddress.name.toLowerCase());
      const callNames = call.attendees.map(a => a.emailAddress.name.toLowerCase());

      return callNames.some(callName =>
        aptNames.some(aptName =>
          aptName.includes(callName) || callName.includes(aptName)
        )
      );
    };

    // Filter out calls that have matching calendar appointments
    const uniqueCalls = calls.filter(call => {
      const hasMatchingAppointment = appointments.some(apt =>
        hasTimeOverlap(apt, call) && hasParticipantOverlap(apt, call)
      );
      return !hasMatchingAppointment;
    });

    // Merge and sort by start time
    const merged = [...appointments, ...uniqueCalls];
    merged.sort((a, b) =>
      new Date(a.start.dateTime).getTime() - new Date(b.start.dateTime).getTime()
    );

    return merged;
  }, [appointments, calls, callsEnabled]);

  // Filter merged appointments (includes calls when enabled)
  const filteredMergedAppointments = useMemo(() => {
    let filtered = mergedAppointments;

    // Filter by series if active
    if (seriesFilterActive) {
      filtered = filtered.filter(
        (apt) => apt.seriesMasterId && apt.type === "occurrence" && validSeriesIds.has(apt.seriesMasterId)
      );
    }

    // Filter by date if selected
    if (filterDate) {
      filtered = filtered.filter((apt) => apt.start.dateTime.startsWith(filterDate));
    }

    // Filter by search query (title or attendee name/email)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter((apt) => {
        // Match title
        if (apt.subject.toLowerCase().includes(query)) {
          return true;
        }
        // Match attendee name or email
        if (apt.attendees?.some(
          (a) =>
            a.emailAddress.name.toLowerCase().includes(query) ||
            a.emailAddress.address.toLowerCase().includes(query)
        )) {
          return true;
        }
        return false;
      });
    }

    // Filter out solo meetings if toggle is on, BUT keep selected ones visible
    if (hideSoloMeetings) {
      const userEmail = session?.user?.email?.toLowerCase();
      filtered = filtered.filter((apt) => {
        // Always show if manually selected
        if (apt.selected) return true;

        // Always show calls (they always have other participants)
        if (apt.type === 'call') return true;

        // Otherwise, only show if has other attendees
        const otherAttendees = (apt.attendees || []).filter(
          (a) => a.emailAddress.address.toLowerCase() !== userEmail
        );
        return otherAttendees.length > 0;
      });
    }

    return filtered;
  }, [mergedAppointments, filterDate, seriesFilterActive, validSeriesIds, searchQuery, hideSoloMeetings, session?.user?.email]);

  // Get unique sorted dates from appointments for day navigation
  const availableDates = useMemo(() => {
    const dates = new Set<string>();
    mergedAppointments.forEach(apt => {
      const date = apt.start.dateTime.split('T')[0];
      dates.add(date);
    });
    return Array.from(dates).sort();
  }, [mergedAppointments]);

  // Navigation to previous/next day
  const navigateDay = useCallback((direction: 'prev' | 'next') => {
    if (availableDates.length === 0) return;

    if (!filterDate) {
      // No filter set - go to first or last day
      setFilterDate(direction === 'prev' ? availableDates[availableDates.length - 1] : availableDates[0]);
      return;
    }

    const currentIndex = availableDates.indexOf(filterDate);
    if (currentIndex === -1) {
      // Current filter not in list - go to nearest
      setFilterDate(direction === 'prev' ? availableDates[availableDates.length - 1] : availableDates[0]);
      return;
    }

    const newIndex = direction === 'prev' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex >= 0 && newIndex < availableDates.length) {
      setFilterDate(availableDates[newIndex]);
    }
  }, [availableDates, filterDate]);

  const canNavigatePrev = availableDates.length > 0 && (!filterDate || availableDates.indexOf(filterDate) > 0);
  const canNavigateNext = availableDates.length > 0 && (!filterDate || availableDates.indexOf(filterDate) < availableDates.length - 1);

  // Focused appointment for keyboard navigation
  const [focusedAppointmentId, setFocusedAppointmentId] = useState<string | null>(null);

  // Get flat list of appointment IDs for up/down navigation
  const appointmentIds = useMemo(() => {
    return filteredMergedAppointments.map(apt => apt.id);
  }, [filteredMergedAppointments]);

  // Navigate between appointments
  const navigateAppointment = useCallback((direction: 'up' | 'down') => {
    if (appointmentIds.length === 0) return;

    if (!focusedAppointmentId) {
      // No focus - go to first or last
      setFocusedAppointmentId(direction === 'up' ? appointmentIds[appointmentIds.length - 1] : appointmentIds[0]);
      return;
    }

    const currentIndex = appointmentIds.indexOf(focusedAppointmentId);
    if (currentIndex === -1) {
      setFocusedAppointmentId(appointmentIds[0]);
      return;
    }

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex >= 0 && newIndex < appointmentIds.length) {
      setFocusedAppointmentId(appointmentIds[newIndex]);
    }
  }, [appointmentIds, focusedAppointmentId]);

  // Auto-scroll to focused appointment
  useEffect(() => {
    if (focusedAppointmentId) {
      const element = document.getElementById(`appointment-${focusedAppointmentId}`);
      element?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [focusedAppointmentId]);

  // Clear focus when appointments change
  useEffect(() => {
    if (focusedAppointmentId && !appointmentIds.includes(focusedAppointmentId)) {
      setFocusedAppointmentId(null);
    }
  }, [appointmentIds, focusedAppointmentId]);

  // Toggle appointment selection (moved here for useEffect dependency)
  const toggleAppointment = useCallback((id: string) => {
    // Check if this is a call
    const isCall = calls.some((c) => c.id === id);
    if (isCall) {
      setCalls((prev) =>
        prev.map((call) =>
          call.id === id ? { ...call, selected: !call.selected } : call
        )
      );
    } else {
      setAppointments((prev) =>
        prev.map((apt) =>
          apt.id === id ? { ...apt, selected: !apt.selected } : apt
        )
      );
    }
  }, [calls]);

  // Keyboard navigation for day and appointment switching
  useEffect(() => {
    const handleArrowKeys = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input field
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) {
        return;
      }

      // Arrow Left - previous day
      if (e.key === "ArrowLeft" && canNavigatePrev) {
        e.preventDefault();
        navigateDay('prev');
      }

      // Arrow Right - next day
      if (e.key === "ArrowRight" && canNavigateNext) {
        e.preventDefault();
        navigateDay('next');
      }

      // Arrow Up - previous appointment
      if (e.key === "ArrowUp") {
        e.preventDefault();
        navigateAppointment('up');
      }

      // Arrow Down - next appointment
      if (e.key === "ArrowDown") {
        e.preventDefault();
        navigateAppointment('down');
      }

      // Space or Enter - toggle selection of focused appointment
      if ((e.key === " " || e.key === "Enter") && focusedAppointmentId) {
        e.preventDefault();
        toggleAppointment(focusedAppointmentId);
      }
    };

    document.addEventListener("keydown", handleArrowKeys);
    return () => document.removeEventListener("keydown", handleArrowKeys);
  }, [canNavigatePrev, canNavigateNext, navigateDay, navigateAppointment, focusedAppointmentId, toggleAppointment]);

  // Handler für Preset-Buttons: setzt Datum UND lädt sofort
  const handleDateRangeChange = (newStartDate: string, newEndDate: string) => {
    setStartDate(newStartDate);
    setEndDate(newEndDate);
    // Sofort laden mit den neuen Werten (nicht warten auf State-Update)
    loadAppointments(newStartDate, newEndDate);
  };

  // Toggle alle Termine einer Serie
  const toggleSeries = (seriesId: string, selected: boolean) => {
    setAppointments((prev) =>
      prev.map((apt) =>
        apt.seriesMasterId === seriesId ? { ...apt, selected } : apt
      )
    );
  };

  // Alle nicht-gesyncten Termine auswählen/abwählen
  const selectAllAppointments = (selected: boolean) => {
    // Erstelle Set der IDs von gefilterten, sichtbaren Terminen (includes calls when enabled)
    const visibleIds = new Set(filteredMergedAppointments.map(a => a.id));

    setAppointments((prev) =>
      prev.map((apt) => {
        // Nur Termine ändern die in der gefilterten Liste sichtbar sind
        if (!visibleIds.has(apt.id)) return apt;
        // Bereits gesynced? Nicht ändern
        if (isAppointmentSynced(apt, syncedEntries)) return apt;
        return { ...apt, selected };
      })
    );

    // Also update calls if enabled
    if (callsEnabled) {
      setCalls((prev) =>
        prev.map((call) => {
          if (!visibleIds.has(call.id)) return call;
          // Calls cannot be synced yet, so just toggle them
          return { ...call, selected };
        })
      );
    }
  };

  // Reset: Projekt/Task/Tätigkeit-Zuweisungen zurücksetzen (Auswahl bleibt erhalten)
  const resetPendingSyncs = () => {
    setAppointments((prev) =>
      prev.map((apt) => {
        // Bereits gesynced? Nicht ändern
        if (isAppointmentSynced(apt, syncedEntries)) return apt;
        // Nur Zuweisungen zurücksetzen, selected bleibt unverändert
        return {
          ...apt,
          projectId: null,
          taskId: null,
          activityId: "be", // Default zurücksetzen
          billable: true, // Default zurücksetzen
          canChangeBillable: true, // Default zurücksetzen
          useActualTime: false, // Plan/Ist zurücksetzen auf geplante Zeit
        };
      })
    );
    // Also reset calls
    setCalls((prev) =>
      prev.map((call) => ({
        ...call,
        projectId: null,
        taskId: null,
        activityId: "be",
        billable: true,
        canChangeBillable: true,
        selected: false,
        useActualTime: false, // Plan/Ist zurücksetzen auf geplante Zeit
      }))
    );
    // Auch Editing-State zurücksetzen
    setEditingAppointments(new Set());
    setModifiedEntries(new Map());
  };

  const changeProject = async (id: string, projectId: number | null) => {
    // Check if this is a call
    const isCall = calls.some((c) => c.id === id);
    const setItems = isCall ? setCalls : setAppointments;

    if (projectId) {
      // Load tasks first to check if auto-selection is possible
      const loadedTasks = await loadTasksForProject(projectId);

      // Auto-select if there's exactly one task
      if (loadedTasks.length === 1) {
        const singleTask = loadedTasks[0];

        // Find standard activity for this task
        const project = projects.find((p) => p.id === projectId);
        const taskActivities = singleTask.activities || [];
        const projectActivities = project?.activities || [];
        const relevantActivities = taskActivities.length > 0 ? taskActivities : projectActivities;
        const standardActivity = relevantActivities.find((a) => a.standard);

        // Determine billable settings from task/project
        const projektFakt = project?.voreinstFakturierbarkeit ?? project?.defaultFakt;
        const vorgangFakt = singleTask.defaultFakt;
        const newBillable = determineBillable(projektFakt, vorgangFakt);
        const newCanChangeBillable = canChangeBillable(projektFakt, vorgangFakt);

        setItems((prev) =>
          prev.map((apt) =>
            apt.id === id
              ? {
                  ...apt,
                  projectId,
                  taskId: singleTask.id,
                  activityId: standardActivity?.name || apt.activityId,
                  billable: newBillable,
                  canChangeBillable: newCanChangeBillable,
                }
              : apt
          )
        );
      } else {
        // Multiple tasks or no tasks - just set project, clear task, reset billable settings
        setItems((prev) =>
          prev.map((apt) =>
            apt.id === id ? { ...apt, projectId, taskId: null, canChangeBillable: true } : apt
          )
        );
      }
    } else {
      // No project selected - clear everything, reset billable settings
      setItems((prev) =>
        prev.map((apt) =>
          apt.id === id ? { ...apt, projectId, taskId: null, canChangeBillable: true } : apt
        )
      );
    }
  };

  const changeTask = (id: string, taskId: number | null) => {
    // Check if this is a call
    const isCall = calls.some((c) => c.id === id);
    const setItems = isCall ? setCalls : setAppointments;

    setItems((prev) =>
      prev.map((apt) => {
        if (apt.id !== id) return apt;

        // Find standard activity for the selected task
        let newActivityId = apt.activityId;
        let newBillable = apt.billable;
        let newCanChangeBillable = apt.canChangeBillable;

        if (taskId && apt.projectId) {
          const projectTasks = tasks[apt.projectId] || [];
          const selectedTask = projectTasks.find((t) => t.id === taskId);
          const project = projects.find((p) => p.id === apt.projectId);

          // Check task activities first, then project activities
          const taskActivities = selectedTask?.activities || [];
          const projectActivities = project?.activities || [];

          // Use task activities if available, otherwise project activities
          const relevantActivities = taskActivities.length > 0 ? taskActivities : projectActivities;
          const standardActivity = relevantActivities.find((a) => a.standard);

          if (standardActivity) {
            newActivityId = standardActivity.name;
          }

          // Determine billable status and editability from task/project settings
          const projektFakt = project?.voreinstFakturierbarkeit ?? project?.defaultFakt;
          const vorgangFakt = selectedTask?.defaultFakt;
          newBillable = determineBillable(projektFakt, vorgangFakt);
          newCanChangeBillable = canChangeBillable(projektFakt, vorgangFakt);
        } else {
          // No task selected - reset to defaults
          newCanChangeBillable = true;
        }

        return { ...apt, taskId, activityId: newActivityId, billable: newBillable, canChangeBillable: newCanChangeBillable };
      })
    );
  };

  const changeActivity = (id: string, activityId: string) => {
    // Check if this is a call
    const isCall = calls.some((c) => c.id === id);
    const setItems = isCall ? setCalls : setAppointments;

    setItems((prev) =>
      prev.map((apt) => (apt.id === id ? { ...apt, activityId } : apt))
    );
  };

  const changeBillable = (id: string, billable: boolean) => {
    // Check if this is a call
    const isCall = calls.some((c) => c.id === id);
    const setItems = isCall ? setCalls : setAppointments;

    setItems((prev) =>
      prev.map((apt) => (apt.id === id ? { ...apt, billable } : apt))
    );
  };

  const changeUseActualTime = (id: string, useActual: boolean) => {
    // Check if this is a call
    const isCall = calls.some((c) => c.id === id);
    const setItems = isCall ? setCalls : setAppointments;

    setItems((prev) =>
      prev.map((apt) => (apt.id === id ? { ...apt, useActualTime: useActual } : apt))
    );
  };

  // Änderungen auf alle Termine einer Serie anwenden
  const applyToSeries = async (
    seriesId: string,
    projectId: number | null,
    taskId: number | null,
    activityId: string
  ) => {
    if (projectId) {
      await loadTasksForProject(projectId);
    }

    setAppointments((prev) =>
      prev.map((apt) =>
        apt.seriesMasterId === seriesId
          ? { ...apt, projectId, taskId, activityId }
          : apt
      )
    );
  };

  // =========================================================================
  // Functions for editing synced entries (rebooking)
  // =========================================================================

  // Start editing a synced appointment
  const startEditingSyncedAppointment = useCallback(async (appointmentId: string) => {
    // Find the synced entry to get the project ID
    const apt = appointments.find(a => a.id === appointmentId);
    if (apt) {
      const syncedEntry = syncedEntries.find(entry => {
        const entryDate = entry.date.split("T")[0];
        const aptDate = apt.start.dateTime.split("T")[0];
        return entryDate === aptDate && (entry.note?.trim() || "") === (apt.subject?.trim() || "");
      });

      if (syncedEntry) {
        // Load tasks for the project before enabling edit mode
        await loadTasksForProject(syncedEntry.project_id);

        // Get ZEP booked time
        const zepVon = syncedEntry.from.slice(0, 5);
        const zepBis = syncedEntry.to.slice(0, 5);

        // Calculate planned time (rounded)
        const outlookStart = new Date(apt.start.dateTime);
        const outlookEnd = new Date(apt.end.dateTime);
        const plannedZepTimes = calculateZepTimes(outlookStart, outlookEnd);
        const plannedVon = plannedZepTimes.start.slice(0, 5);
        const plannedBis = plannedZepTimes.end.slice(0, 5);

        // Calculate actual time if available (rounded)
        let actualVon: string | null = null;
        let actualBis: string | null = null;
        if (apt.isOnlineMeeting && apt.onlineMeeting?.joinUrl) {
          const normalizedUrl = normalizeJoinUrl(apt.onlineMeeting.joinUrl);
          if (normalizedUrl) {
            // Use date-specific key for recurring meetings (they share the same joinUrl)
            const aptDate = new Date(apt.start.dateTime).toISOString().split("T")[0];
            const durationKey = getDurationKey(normalizedUrl, aptDate);
            const actualDuration = actualDurations.get(durationKey);
            if (actualDuration) {
              // Use planned start + ROUNDED actual duration (so only end time changes)
              // First, calculate rounded duration from actual times
              const actualTimesRounded = calculateZepTimes(
                new Date(actualDuration.actualStart),
                new Date(actualDuration.actualEnd)
              );
              const [actStartH, actStartM] = actualTimesRounded.start.split(':').map(Number);
              const [actEndH, actEndM] = actualTimesRounded.end.split(':').map(Number);
              const roundedDurationMin = (actEndH * 60 + actEndM) - (actStartH * 60 + actStartM);

              const plannedStart = new Date(apt.start.dateTime);
              const adjustedEnd = new Date(plannedStart.getTime() + roundedDurationMin * 60 * 1000);
              const actualZepTimes = calculateZepTimes(plannedStart, adjustedEnd);
              actualVon = actualZepTimes.start.slice(0, 5);
              actualBis = actualZepTimes.end.slice(0, 5);
            }
          }
        }

        // Check if ZEP time matches either planned or actual time
        const matchesPlanned = zepVon === plannedVon && zepBis === plannedBis;
        const matchesActual = actualVon !== null && actualBis !== null && zepVon === actualVon && zepBis === actualBis;
        const timesNeedCorrection = !matchesPlanned && !matchesActual;

        // Calculate correct billable value based on projekt/vorgang settings
        const project = projects.find((p) => p.id === syncedEntry.project_id);
        const projectTasks = tasks[syncedEntry.project_id] || [];
        const task = projectTasks.find((t) => t.id === syncedEntry.project_task_id);
        const projektFakt = project?.voreinstFakturierbarkeit ?? project?.defaultFakt;
        const vorgangFakt = task?.defaultFakt;
        const isLocked = !canChangeBillable(projektFakt, vorgangFakt);
        const correctBillable = isLocked ? determineBillable(projektFakt, vorgangFakt) : syncedEntry.billable;
        const billableNeedsCorrection = isLocked && correctBillable !== syncedEntry.billable;

        // Create ModifiedEntry if times differ OR billable needs correction
        if (timesNeedCorrection || billableNeedsCorrection) {
          setModifiedEntries((prev) => {
            const next = new Map(prev);
            next.set(appointmentId, {
              zepId: syncedEntry.id,
              outlookEventId: appointmentId,
              originalProjectId: syncedEntry.project_id,
              originalTaskId: syncedEntry.project_task_id,
              originalActivityId: syncedEntry.activity_id,
              originalBillable: syncedEntry.billable,
              newProjectId: syncedEntry.project_id,
              newTaskId: syncedEntry.project_task_id,
              newActivityId: syncedEntry.activity_id,
              newBillable: correctBillable,
              newProjektNr: project?.name || syncedEntry.projektNr || "",
              newVorgangNr: task?.name || syncedEntry.vorgangNr || "",
              userId: syncedEntry.employee_id,
              datum: syncedEntry.date.split("T")[0],
              von: zepVon,
              bis: zepBis,
              bemerkung: syncedEntry.note || undefined,
              // Only set new times if they need correction (use planned time as the correction target)
              ...(timesNeedCorrection ? { newVon: plannedVon, newBis: plannedBis } : {}),
            });
            return next;
          });
        }
      }
    }

    setEditingAppointments((prev) => new Set(prev).add(appointmentId));
  }, [appointments, syncedEntries, loadTasksForProject, projects, tasks, actualDurations]);

  // Cancel editing a synced appointment
  const cancelEditingSyncedAppointment = useCallback((appointmentId: string) => {
    setEditingAppointments((prev) => {
      const next = new Set(prev);
      next.delete(appointmentId);
      return next;
    });
    setModifiedEntries((prev) => {
      const next = new Map(prev);
      next.delete(appointmentId);
      return next;
    });
  }, []);

  // Update a modified entry's project
  const updateModifiedProject = useCallback(async (
    appointmentId: string,
    apt: Appointment,
    syncedEntry: ZepEntry,
    projectId: number
  ) => {
    // Load tasks for the new project
    await loadTasksForProject(projectId);

    // Find the project to get projektNr
    const project = projects.find((p) => p.id === projectId);
    if (!project) return;

    setModifiedEntries((prev) => {
      const next = new Map(prev);
      const existing = next.get(appointmentId);

      if (existing) {
        // Update existing entry
        next.set(appointmentId, {
          ...existing,
          newProjectId: projectId,
          newTaskId: 0, // Reset task when project changes
          newProjektNr: project.name, // project.name is projektNr in our mapping
          newVorgangNr: "", // Will be set when task is selected
        });
      } else {
        // Create new modified entry
        next.set(appointmentId, {
          zepId: syncedEntry.id,
          outlookEventId: appointmentId,
          originalProjectId: syncedEntry.project_id,
          originalTaskId: syncedEntry.project_task_id,
          originalActivityId: syncedEntry.activity_id,
          originalBillable: syncedEntry.billable,
          newProjectId: projectId,
          newTaskId: 0,
          newActivityId: syncedEntry.activity_id,
          newBillable: syncedEntry.billable,
          newProjektNr: project.name,
          newVorgangNr: "",
          userId: syncedEntry.employee_id,
          datum: syncedEntry.date.split("T")[0],
          von: syncedEntry.from.slice(0, 5),
          bis: syncedEntry.to.slice(0, 5),
          bemerkung: syncedEntry.note || undefined,
        });
      }
      return next;
    });
  }, [projects, loadTasksForProject]);

  // Update a modified entry's task
  const updateModifiedTask = useCallback((
    appointmentId: string,
    taskId: number
  ) => {
    setModifiedEntries((prev) => {
      const next = new Map(prev);
      const existing = next.get(appointmentId);
      if (!existing) return prev;

      // Find the task to get vorgangNr
      const projectTasks = tasks[existing.newProjectId] || [];
      const task = projectTasks.find((t) => t.id === taskId);
      if (!task) return prev;

      next.set(appointmentId, {
        ...existing,
        newTaskId: taskId,
        newVorgangNr: task.name, // task.name is vorgangNr in our mapping
      });
      return next;
    });
  }, [tasks]);

  // Update a modified entry's activity
  const updateModifiedActivity = useCallback((
    appointmentId: string,
    apt: Appointment,
    syncedEntry: ZepEntry,
    activityId: string
  ) => {
    setModifiedEntries((prev) => {
      const next = new Map(prev);
      const existing = next.get(appointmentId);

      if (existing) {
        next.set(appointmentId, {
          ...existing,
          newActivityId: activityId,
        });
      } else {
        // Find current project/task info
        const project = projects.find((p) => p.id === syncedEntry.project_id);
        const projectTasks = tasks[syncedEntry.project_id] || [];
        const task = projectTasks.find((t) => t.id === syncedEntry.project_task_id);

        next.set(appointmentId, {
          zepId: syncedEntry.id,
          outlookEventId: appointmentId,
          originalProjectId: syncedEntry.project_id,
          originalTaskId: syncedEntry.project_task_id,
          originalActivityId: syncedEntry.activity_id,
          originalBillable: syncedEntry.billable,
          newProjectId: syncedEntry.project_id,
          newTaskId: syncedEntry.project_task_id,
          newActivityId: activityId,
          newBillable: syncedEntry.billable,
          newProjektNr: project?.name || syncedEntry.projektNr || "",
          newVorgangNr: task?.name || syncedEntry.vorgangNr || "",
          userId: syncedEntry.employee_id,
          datum: syncedEntry.date.split("T")[0],
          von: syncedEntry.from.slice(0, 5),
          bis: syncedEntry.to.slice(0, 5),
          bemerkung: syncedEntry.note || undefined,
        });
      }
      return next;
    });
  }, [projects, tasks]);

  // Update a modified entry's billable status
  const updateModifiedBillable = useCallback((
    appointmentId: string,
    apt: Appointment,
    syncedEntry: ZepEntry,
    billable: boolean
  ) => {
    setModifiedEntries((prev) => {
      const next = new Map(prev);
      const existing = next.get(appointmentId);

      if (existing) {
        next.set(appointmentId, {
          ...existing,
          newBillable: billable,
        });
      } else {
        // Find current project/task info
        const project = projects.find((p) => p.id === syncedEntry.project_id);
        const projectTasks = tasks[syncedEntry.project_id] || [];
        const task = projectTasks.find((t) => t.id === syncedEntry.project_task_id);

        next.set(appointmentId, {
          zepId: syncedEntry.id,
          outlookEventId: appointmentId,
          originalProjectId: syncedEntry.project_id,
          originalTaskId: syncedEntry.project_task_id,
          originalActivityId: syncedEntry.activity_id,
          originalBillable: syncedEntry.billable,
          newProjectId: syncedEntry.project_id,
          newTaskId: syncedEntry.project_task_id,
          newActivityId: syncedEntry.activity_id,
          newBillable: billable,
          newProjektNr: project?.name || syncedEntry.projektNr || "",
          newVorgangNr: task?.name || syncedEntry.vorgangNr || "",
          userId: syncedEntry.employee_id,
          datum: syncedEntry.date.split("T")[0],
          von: syncedEntry.from.slice(0, 5),
          bis: syncedEntry.to.slice(0, 5),
          bemerkung: syncedEntry.note || undefined,
        });
      }
      return next;
    });
  }, [projects, tasks]);

  // Update a modified entry's time (when user changes planned/actual time in edit mode)
  const updateModifiedTime = useCallback((
    appointmentId: string,
    apt: Appointment,
    syncedEntry: ZepEntry,
    useActualTime: boolean
  ) => {
    // Calculate the new times based on useActualTime toggle
    let startDt: Date;
    let endDt: Date;

    if (useActualTime && apt.isOnlineMeeting && apt.onlineMeeting?.joinUrl) {
      const normalizedUrl = normalizeJoinUrl(apt.onlineMeeting.joinUrl);
      // Use date-specific key for recurring meetings (they share the same joinUrl)
      const aptDate = new Date(apt.start.dateTime).toISOString().split("T")[0];
      const durationKey = normalizedUrl ? getDurationKey(normalizedUrl, aptDate) : null;
      const actualDuration = durationKey ? actualDurations.get(durationKey) : undefined;

      if (actualDuration) {
        // Use planned start time + ROUNDED actual duration (so only end time changes, not start)
        // First, calculate rounded duration from actual times
        const actualTimes = calculateZepTimes(
          new Date(actualDuration.actualStart),
          new Date(actualDuration.actualEnd)
        );
        const [actStartH, actStartM] = actualTimes.start.split(':').map(Number);
        const [actEndH, actEndM] = actualTimes.end.split(':').map(Number);
        const roundedDurationMinutes = (actEndH * 60 + actEndM) - (actStartH * 60 + actStartM);

        const plannedStart = new Date(apt.start.dateTime);
        startDt = plannedStart;
        endDt = new Date(plannedStart.getTime() + roundedDurationMinutes * 60 * 1000);
      } else {
        // No actual duration data, use planned time
        startDt = new Date(apt.start.dateTime);
        endDt = new Date(apt.end.dateTime);
      }
    } else {
      // Use planned time
      startDt = new Date(apt.start.dateTime);
      endDt = new Date(apt.end.dateTime);
    }

    // Calculate ZEP times (only rounds if duration is not a 15-min multiple)
    const zepTimes = calculateZepTimes(startDt, endDt);
    const calculatedVon = zepTimes.start.slice(0, 5);
    const calculatedBis = zepTimes.end.slice(0, 5);

    // Compare with current ZEP times - only set newVon/newBis if they differ
    const currentZepVon = syncedEntry.from.slice(0, 5);
    const currentZepBis = syncedEntry.to.slice(0, 5);
    const timesChanged = calculatedVon !== currentZepVon || calculatedBis !== currentZepBis;

    // Only set new times if they differ from current ZEP entry
    const newVon = timesChanged ? calculatedVon : undefined;
    const newBis = timesChanged ? calculatedBis : undefined;

    // Also update the appointment's useActualTime state
    setAppointments((prev) =>
      prev.map((a) => (a.id === appointmentId ? { ...a, useActualTime } : a))
    );

    setModifiedEntries((prev) => {
      const next = new Map(prev);
      const existing = next.get(appointmentId);

      if (existing) {
        next.set(appointmentId, {
          ...existing,
          newVon,
          newBis,
        });
      } else {
        // Find current project/task info
        const project = projects.find((p) => p.id === syncedEntry.project_id);
        const projectTasks = tasks[syncedEntry.project_id] || [];
        const task = projectTasks.find((t) => t.id === syncedEntry.project_task_id);

        next.set(appointmentId, {
          zepId: syncedEntry.id,
          outlookEventId: appointmentId,
          originalProjectId: syncedEntry.project_id,
          originalTaskId: syncedEntry.project_task_id,
          originalActivityId: syncedEntry.activity_id,
          originalBillable: syncedEntry.billable,
          newProjectId: syncedEntry.project_id,
          newTaskId: syncedEntry.project_task_id,
          newActivityId: syncedEntry.activity_id,
          newBillable: syncedEntry.billable,
          newProjektNr: project?.name || syncedEntry.projektNr || "",
          newVorgangNr: task?.name || syncedEntry.vorgangNr || "",
          userId: syncedEntry.employee_id,
          datum: syncedEntry.date.split("T")[0],
          von: syncedEntry.from.slice(0, 5),
          bis: syncedEntry.to.slice(0, 5),
          bemerkung: syncedEntry.note || undefined,
          newVon,
          newBis,
        });
      }
      return next;
    });
  }, [projects, tasks, actualDurations]);

  // Reload synced entries from ZEP
  const loadSyncedEntries = useCallback(async () => {
    if (!employeeId) return;
    try {
      // Invalidate cache first since we want fresh data after sync
      invalidateZepCache(employeeId, startDate, endDate);
      
      const res = await fetch(`/api/zep/timeentries?employeeId=${employeeId}&startDate=${startDate}&endDate=${endDate}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setSyncedEntries(data);
        // Cache the fresh data
        setCachedZepEntries(employeeId, startDate, endDate, data);
      }
    } catch (e) {
      console.error("Failed to reload synced entries:", e);
    }
  }, [employeeId, startDate, endDate]);

  // Correct time for a rescheduled appointment
  const correctRescheduledTime = useCallback(async (
    appointmentId: string,
    duplicateWarning: DuplicateCheckResult
  ) => {
    if (!duplicateWarning.zepEntryId || !duplicateWarning.existingEntry || !duplicateWarning.newTime) {
      toast({ text: "Fehlende Daten für Zeit-Korrektur", type: "error" });
      return;
    }

    const entry = duplicateWarning.existingEntry;
    
    setCorrectingTimeIds((prev) => new Set(prev).add(appointmentId));

    try {
      const response = await fetch("/api/zep/timeentries", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entries: [{
            id: String(duplicateWarning.zepEntryId),
            projektNr: entry.projektNr,
            vorgangNr: entry.vorgangNr,
            taetigkeit: entry.activity_id,
            userId: entry.employee_id,
            datum: duplicateWarning.newTime.date,
            von: duplicateWarning.newTime.from.slice(0, 5),
            bis: duplicateWarning.newTime.to.slice(0, 5),
            bemerkung: entry.note || undefined,
            istFakturierbar: entry.billable,
          }],
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Fehler beim Aktualisieren");
      }

      // Reload synced entries to reflect the change
      await loadSyncedEntries();
      
      // Remove the duplicate warning for this appointment
      setDuplicateWarnings((prev) => {
        const next = new Map(prev);
        next.delete(appointmentId);
        return next;
      });

      toast({
        text: `Zeit-Korrektur erfolgreich: ${duplicateWarning.newTime.from.slice(0, 5)}-${duplicateWarning.newTime.to.slice(0, 5)}`,
        type: "success"
      });
    } catch (error) {
      console.error("Time correction error:", error);
      toast({
        text: `Fehler bei Zeit-Korrektur: ${error instanceof Error ? error.message : "Unbekannter Fehler"}`,
        type: "error"
      });
    } finally {
      setCorrectingTimeIds((prev) => {
        const next = new Set(prev);
        next.delete(appointmentId);
        return next;
      });
    }
  }, [loadSyncedEntries, toast]);

  // Save a single modified entry (for inline sync button)
  const saveModifiedSingle = useCallback(async (modifiedEntry: ModifiedEntry) => {
    setSavingModifiedSingleId(modifiedEntry.outlookEventId);

    try {
      const response = await fetch("/api/zep/timeentries", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entries: [{
            id: String(modifiedEntry.zepId),
            projektNr: modifiedEntry.newProjektNr,
            vorgangNr: modifiedEntry.newVorgangNr,
            taetigkeit: modifiedEntry.newActivityId,
            userId: modifiedEntry.userId,
            datum: modifiedEntry.datum,
            von: modifiedEntry.newVon || modifiedEntry.von,
            bis: modifiedEntry.newBis || modifiedEntry.bis,
            bemerkung: modifiedEntry.bemerkung,
            istFakturierbar: modifiedEntry.newBillable,
          }],
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Fehler beim Speichern");
      }

      // Remove from editing state
      setEditingAppointments((prev) => {
        const next = new Set(prev);
        next.delete(modifiedEntry.outlookEventId);
        return next;
      });
      setModifiedEntries((prev) => {
        const next = new Map(prev);
        next.delete(modifiedEntry.outlookEventId);
        return next;
      });

      // Reload synced entries
      await loadSyncedEntries();

      toast({ text: "Änderung gespeichert", type: "success" });
    } catch (error) {
      console.error("Save modified entry error:", error);
      toast({
        text: `Fehler beim Speichern: ${error instanceof Error ? error.message : "Unbekannter Fehler"}`,
        type: "error",
      });
    } finally {
      setSavingModifiedSingleId(null);
    }
  }, [loadSyncedEntries, toast]);

  // Helper to get effective start/end times for an appointment
  // Uses actual time from call records if useActualTime is true and data is available
  const getEffectiveTime = useCallback((apt: Appointment): { startDt: Date; endDt: Date } => {
    // Check if we should use actual time
    if (apt.useActualTime && apt.isOnlineMeeting && apt.onlineMeeting?.joinUrl) {
      const normalizedUrl = normalizeJoinUrl(apt.onlineMeeting.joinUrl);
      if (normalizedUrl) {
        // Use date-specific key for recurring meetings (they share the same joinUrl)
        const aptDate = new Date(apt.start.dateTime).toISOString().split("T")[0];
        const durationKey = getDurationKey(normalizedUrl, aptDate);
        const actualDuration = actualDurations.get(durationKey);
        if (actualDuration) {
          // Use planned start + ROUNDED actual duration (so only end time changes)
          // First, calculate rounded duration from actual times
          const actualTimes = calculateZepTimes(
            new Date(actualDuration.actualStart),
            new Date(actualDuration.actualEnd)
          );
          const [startH, startM] = actualTimes.start.split(':').map(Number);
          const [endH, endM] = actualTimes.end.split(':').map(Number);
          const roundedDurationMinutes = (endH * 60 + endM) - (startH * 60 + startM);

          // Now apply rounded duration to planned start
          const plannedStart = new Date(apt.start.dateTime);
          return {
            startDt: plannedStart,
            endDt: new Date(plannedStart.getTime() + roundedDurationMinutes * 60 * 1000),
          };
        }
      }
    }
    // Default: use planned time
    return {
      startDt: new Date(apt.start.dateTime),
      endDt: new Date(apt.end.dateTime),
    };
  }, [actualDurations]);

  // Sync a single appointment directly
  const syncSingleAppointment = async (appointment: Appointment) => {
    if (!appointment.projectId || !appointment.taskId || !employeeId) {
      toast({ text: "Projekt und Task müssen ausgewählt sein.", type: "error" });
      return;
    }

    setSyncingSingleId(appointment.id);

    try {
      const { startDt, endDt } = getEffectiveTime(appointment);
      // Always use the Outlook appointment date, even when using actual times
      // This prevents booking to the wrong day if actualDuration has a different date
      const dateStr = new Date(appointment.start.dateTime).toISOString().split("T")[0];
      const zepTimes = calculateZepTimes(startDt, endDt);

      // Determine the correct billable value
      // If canChangeBillable is false, the value is locked by projekt/vorgang settings
      // and we should use the correct value from those settings, not the stored value
      let billableValue = appointment.billable;
      if (!appointment.canChangeBillable && appointment.projectId && appointment.taskId) {
        const project = projects.find((p) => p.id === appointment.projectId);
        const projectTasks = tasks[appointment.projectId] || [];
        const task = projectTasks.find((t) => t.id === appointment.taskId);
        const projektFakt = project?.voreinstFakturierbarkeit ?? project?.defaultFakt;
        const vorgangFakt = task?.defaultFakt;
        billableValue = determineBillable(projektFakt, vorgangFakt);
      }

      const entry = {
        date: dateStr,
        from: zepTimes.start,
        to: zepTimes.end,
        employee_id: employeeId,
        note: appointment.subject,
        billable: billableValue,
        activity_id: appointment.activityId,
        project_id: appointment.projectId,
        project_task_id: appointment.taskId,
      };

      // Debug: Log what we're sending
      console.log('syncSingleAppointment DEBUG:', JSON.stringify({
        useActualTime: appointment.useActualTime,
        plannedStart: appointment.start.dateTime,
        plannedEnd: appointment.end.dateTime,
        effectiveStart: startDt.toISOString(),
        effectiveEnd: endDt.toISOString(),
        entry
      }, null, 2));

      const res = await fetch("/api/zep/timeentries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entries: [entry] }),
      });

      const result = await res.json();
      console.log('syncSingleAppointment RESULT:', JSON.stringify(result, null, 2));

      if (result.succeeded > 0) {
        // Save sync history
        if (result.createdEntries && result.createdEntries.length > 0) {
          const syncRecords: SyncRecord[] = [{
            outlookEventId: appointment.id,
            zepAttendanceId: result.createdEntries[0].zepId,
            subject: appointment.subject,
            date: dateStr,
            syncedAt: new Date().toISOString(),
          }];
          saveSyncRecords(syncRecords);
        }

        // Track submitted ID for heatmap
        setSubmittedIds((prev) => new Set([...prev, appointment.id]));

        // Deselect the appointment
        setAppointments((prev) =>
          prev.map((a) =>
            a.id === appointment.id ? { ...a, selected: false } : a
          )
        );

        toast({ text: "Termin erfolgreich synchronisiert", type: "success" });

        // Reload synced entries
        await loadSyncedEntries();
      } else {
        const errorMsg = result.errors?.[0] ? parseErrorMessage(result.errors[0]) : "Unbekannter Fehler";
        toast({ text: `Fehler: ${errorMsg}`, type: "error" });
      }
    } catch (error) {
      console.error("Single sync error:", error);
      toast({ text: "Fehler bei der Synchronisierung", type: "error" });
    } finally {
      setSyncingSingleId(null);
    }
  };

  const submitToZep = async (appointmentsToSync: Appointment[], entriesToModify?: ModifiedEntry[]) => {
    // Use the appointments passed from the dialog (already filtered by user)
    const syncReadyAppointments = appointmentsToSync;
    const modificationsToSubmit = entriesToModify || Array.from(modifiedEntries.values()).filter(
      (e) => e.newProjektNr && e.newVorgangNr // Only submit complete modifications
    );
    
    if (syncReadyAppointments.length === 0 && modificationsToSubmit.length === 0) {
      toast({ text: "Keine Termine zum Synchronisieren oder Aktualisieren vorhanden.", type: "error" });
      return;
    }

    setSubmitting(true);
    
    let createSucceeded = 0;
    let createFailed = 0;
    let modifySucceeded = 0;
    let modifyFailed = 0;
    const allErrors: string[] = [];

    try {
      // 1. Create new entries
      if (syncReadyAppointments.length > 0) {
        const entries = syncReadyAppointments.map((apt) => {
          const { startDt, endDt } = getEffectiveTime(apt);
          // Always use the Outlook appointment date, even when using actual times
          const dateStr = new Date(apt.start.dateTime).toISOString().split("T")[0];
          const zepTimes = calculateZepTimes(startDt, endDt);

          // Determine the correct billable value
          // If canChangeBillable is false, use the value from projekt/vorgang settings
          let billableValue = apt.billable;
          if (!apt.canChangeBillable && apt.projectId && apt.taskId) {
            const project = projects.find((p) => p.id === apt.projectId);
            const projectTasks = tasks[apt.projectId] || [];
            const task = projectTasks.find((t) => t.id === apt.taskId);
            const projektFakt = project?.voreinstFakturierbarkeit ?? project?.defaultFakt;
            const vorgangFakt = task?.defaultFakt;
            billableValue = determineBillable(projektFakt, vorgangFakt);
          }

          return {
            date: dateStr,
            from: zepTimes.start,
            to: zepTimes.end,
            employee_id: employeeId,
            note: apt.subject,
            billable: billableValue,
            activity_id: apt.activityId,
            project_id: apt.projectId!,
            project_task_id: apt.taskId!,
          };
        });

        const res = await fetch("/api/zep/timeentries", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ entries }),
        });

        const result = await res.json();
        createSucceeded = result.succeeded || 0;
        createFailed = result.failed || 0;
        if (result.errors) allErrors.push(...result.errors.map(parseErrorMessage));

        if (result.succeeded > 0) {
          // Save sync history with ZEP IDs
          if (result.createdEntries && result.createdEntries.length > 0) {
            const syncRecords: SyncRecord[] = result.createdEntries.map(
              (entry: { index: number; zepId: number }) => {
                const apt = syncReadyAppointments[entry.index];
                return {
                  outlookEventId: apt.id,
                  zepAttendanceId: entry.zepId,
                  subject: apt.subject,
                  date: apt.start.dateTime.split("T")[0],
                  syncedAt: new Date().toISOString(),
                };
              }
            );
            saveSyncRecords(syncRecords);
          }
          
          // Track submitted IDs for heatmap
          const submittedAppointmentIds = new Set(syncReadyAppointments.map((a) => a.id));
          setSubmittedIds((prev) => new Set([...prev, ...submittedAppointmentIds]));
          
          // Deselect the submitted appointments
          setAppointments((prev) => 
            prev.map((a) => 
              submittedAppointmentIds.has(a.id) 
                ? { ...a, selected: false }
                : a
            )
          );
        }
      }

      // 2. Modify existing entries (rebooking)
      if (modificationsToSubmit.length > 0) {
        const modifyEntries = modificationsToSubmit.map((mod) => ({
          id: String(mod.zepId),
          projektNr: mod.newProjektNr,
          vorgangNr: mod.newVorgangNr,
          taetigkeit: mod.newActivityId,
          userId: mod.userId,
          datum: mod.datum,
          von: mod.newVon || mod.von, // Use new time if set, otherwise original
          bis: mod.newBis || mod.bis, // Use new time if set, otherwise original
          bemerkung: mod.bemerkung,
          istFakturierbar: mod.newBillable,
        }));

        const modRes = await fetch("/api/zep/timeentries", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ entries: modifyEntries }),
        });

        const modResult = await modRes.json();
        modifySucceeded = modResult.succeeded || 0;
        modifyFailed = modResult.failed || 0;
        if (modResult.errors) allErrors.push(...modResult.errors.map(parseErrorMessage));

        if (modResult.succeeded > 0) {
          // Clear modified entries that were successfully updated
          setModifiedEntries(new Map());
          setEditingAppointments(new Set());
        }
      }

      // Build success/error message
      const totalSucceeded = createSucceeded + modifySucceeded;
      const totalFailed = createFailed + modifyFailed;

      if (totalSucceeded > 0) {
        const parts: string[] = [];
        if (createSucceeded > 0) {
          const totalMinutes = syncReadyAppointments.reduce((acc, apt) => {
            const start = new Date(apt.start.dateTime);
            const end = new Date(apt.end.dateTime);
            return acc + (end.getTime() - start.getTime()) / 1000 / 60;
          }, 0);
          const hours = Math.floor(totalMinutes / 60);
          const mins = Math.round(totalMinutes % 60);
          parts.push(`${createSucceeded} neu erstellt (${hours}h ${mins}min)`);
        }
        if (modifySucceeded > 0) {
          parts.push(`${modifySucceeded} aktualisiert`);
        }
        
        toast({
          text: parts.join(", "),
          type: "success",
          details: allErrors.length > 0 ? allErrors : undefined,
        });
      } else if (totalFailed > 0) {
        toast({
          text: `${totalFailed} Fehler bei der Übertragung`,
          type: "error",
          details: allErrors,
        });
      }

      // Reload synced entries to update status display
      if (employeeId && totalSucceeded > 0) {
        // Invalidate ZEP cache and reload
        await loadSyncedEntries();
      }
    } catch (error) {
      console.error("Submit error:", error);
      toast({ text: "Fehler bei der Übertragung", type: "error" });
    }
    setSubmitting(false);
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">Laden...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src="/logo.png" alt="Logo" width={32} height={32} className="h-8 w-auto" />
            <h1 className="text-xl font-bold text-gray-900">
              <span className="font-montserrat">Outlook ZEP</span>{" "}
              <span className="font-inter font-light">Sync</span>
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">
              {session?.user?.name || session?.user?.email}
              {employeeLoading && (
                <span className="ml-1 text-gray-400">(Lade ZEP...)</span>
              )}
            </span>
            <div className="h-5 w-px bg-gray-200" />
            <div
              className="relative group"
              title="Tastaturkürzel"
            >
              <Keyboard size={16} className="text-gray-300 group-hover:text-blue-500 cursor-help transition-colors" />
              <div className="hidden group-hover:block absolute right-0 top-full mt-1 p-2 bg-gray-900 text-white text-xs rounded shadow-lg whitespace-nowrap z-50">
                <div className="font-medium mb-1">Tastaturkürzel</div>
                <div><kbd className="px-1 bg-gray-700 rounded">←</kbd> <kbd className="px-1 bg-gray-700 rounded">→</kbd> Tag wechseln</div>
                <div><kbd className="px-1 bg-gray-700 rounded">↑</kbd> <kbd className="px-1 bg-gray-700 rounded">↓</kbd> Termin wechseln</div>
                <div><kbd className="px-1 bg-gray-700 rounded">Space</kbd> Termin auswählen</div>
                <div><kbd className="px-1 bg-gray-700 rounded">Esc</kbd> Filter löschen</div>
                <div><kbd className="px-1 bg-gray-700 rounded">Strg+R</kbd> Termine laden</div>
              </div>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: "/?logout=true" })}
              className="text-gray-300 hover:text-blue-500 transition-colors"
              title="Abmelden"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      {employeeError && (
        <div className="max-w-6xl mx-auto px-4 pt-4">
          <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-800">
            <strong>ZEP-Fehler:</strong> {employeeError}
          </div>
        </div>
      )}

      <main className="max-w-6xl mx-auto px-4 pt-4 pb-8 space-y-1">
        {/* Combined Date Picker and Calendar Heatmap with Legend */}
        <div className="relative">
          {/* Left navigation arrow - positioned outside the card */}
          <button
            onClick={() => navigateDay('prev')}
            disabled={!canNavigatePrev}
            className="absolute -left-12 top-1/2 -translate-y-1/2 p-2 rounded-full text-gray-300 hover:text-blue-500 hover:bg-blue-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            title="Vorheriger Tag"
          >
            <ChevronLeft size={24} />
          </button>

          {/* Right navigation arrow - positioned outside the card */}
          <button
            onClick={() => navigateDay('next')}
            disabled={!canNavigateNext}
            className="absolute -right-12 top-1/2 -translate-y-1/2 p-2 rounded-full text-gray-300 hover:text-blue-500 hover:bg-blue-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            title="Nächster Tag"
          >
            <ChevronRight size={24} />
          </button>

          <div className="bg-white border border-gray-200 overflow-hidden rounded-lg shadow-md">
            <div className="flex items-center">
              <div className="flex-1">
                <DateRangePicker
                  startDate={startDate}
                  endDate={endDate}
                  filterDate={filterDate}
                  onLoad={() => loadAppointments(undefined, undefined, true)}
                  onDateRangeChange={handleDateRangeChange}
                  onFilterDateChange={setFilterDate}
                  loading={loading || submitting}
                  lastLoadedAt={lastLoadedAt}
                />
              </div>

              {/* Calls toggle - temporarily disabled */}
              {false && (
              <div className="flex items-center border-b border-gray-200">
                <div className="h-8 w-px bg-gray-200" />
                <button
                  onClick={() => setCallsEnabled(!callsEnabled)}
                  disabled={callsLoading}
                  className={`flex items-center gap-2 px-4 py-3 text-sm whitespace-nowrap transition ${
                    callsEnabled
                      ? "text-blue-600 bg-blue-50"
                      : "text-gray-500 hover:bg-gray-50"
                  } ${callsLoading ? "cursor-wait" : ""}`}
                  title={callsEnabled ? "Anrufe ausblenden" : "Anrufe einblenden"}
                >
                  {callsLoading ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Phone size={16} />
                  )}
                  <span className="hidden sm:inline">Calls</span>
                  <div className={`w-8 h-5 rounded-full relative transition-colors ${
                    callsEnabled ? "bg-blue-600" : "bg-gray-300"
                  }`}>
                    <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                      callsEnabled ? "translate-x-3.5" : "translate-x-0.5"
                    }`} />
                  </div>
                </button>
              </div>
              )}
            </div>

            <CalendarHeatmap
              startDate={startDate}
              endDate={endDate}
              appointments={appointments}
              syncedEntries={syncedEntries}
              submittedIds={submittedIds}
              modifiedEntries={modifiedEntries}
              selectedDate={filterDate}
              hideSoloMeetings={hideSoloMeetings}
              userEmail={session?.user?.email || undefined}
              onDayClick={(date) => {
                setFilterDate(date);
                if (date) setSeriesFilterActive(false); // Clear series filter when selecting a date
              }}
              onSeriesClick={setSeriesFilterActive}
              seriesFilterActive={seriesFilterActive}
              onStatsChange={setHeatmapStats}
            />
          </div>
        </div>

        {/* Legend */}
        <CalendarHeatmapLegend stats={heatmapStats} />

        <AppointmentList
          appointments={filteredMergedAppointments}
          projects={projects}
          tasks={tasks}
          activities={activities}
          syncedEntries={syncedEntries}
          duplicateWarnings={duplicateWarnings}
          loadingTasks={loadingTasks}
          // Actual meeting durations from call records
          actualDurations={actualDurations}
          onToggle={toggleAppointment}
          onToggleSeries={toggleSeries}
          onSelectAll={selectAllAppointments}
          onProjectChange={changeProject}
          onTaskChange={changeTask}
          onActivityChange={changeActivity}
          onBillableChange={changeBillable}
          onUseActualTimeChange={changeUseActualTime}
          onApplyToSeries={applyToSeries}
          onSubmit={submitToZep}
          onSyncSingle={syncSingleAppointment}
          syncingSingleId={syncingSingleId}
          onReset={resetPendingSyncs}
          submitting={submitting}
          // Editing synced entries (rebooking)
          editingAppointments={editingAppointments}
          modifiedEntries={modifiedEntries}
          onStartEditSynced={startEditingSyncedAppointment}
          onCancelEditSynced={cancelEditingSyncedAppointment}
          onModifyProject={updateModifiedProject}
          onModifyTask={updateModifiedTask}
          onModifyActivity={updateModifiedActivity}
          onModifyBillable={updateModifiedBillable}
          onModifyTime={updateModifiedTime}
          onSaveModifiedSingle={saveModifiedSingle}
          savingModifiedSingleId={savingModifiedSingleId}
          // Correcting rescheduled appointment times
          onCorrectTime={correctRescheduledTime}
          correctingTimeIds={correctingTimeIds}
          // Filter controls
          totalAppointmentsCount={mergedAppointments.length}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          filterDate={filterDate}
          onFilterDateClear={() => setFilterDate(null)}
          seriesFilterActive={seriesFilterActive}
          onSeriesFilterClear={() => setSeriesFilterActive(false)}
          hideSoloMeetings={hideSoloMeetings}
          onHideSoloMeetingsChange={setHideSoloMeetings}
          focusedAppointmentId={focusedAppointmentId}
        />
      </main>
    </div>
  );
}
