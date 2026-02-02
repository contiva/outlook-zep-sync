"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback, useMemo } from "react";
import { format, startOfMonth, endOfMonth, subMonths, isWeekend, addDays } from "date-fns";
import { LogOut, Search, X, Keyboard } from "lucide-react";
import DateRangePicker from "@/components/DateRangePicker";
import AppointmentList from "@/components/AppointmentList";
import CalendarHeatmap from "@/components/CalendarHeatmap";
import { saveSyncRecords, SyncRecord } from "@/lib/sync-history";
import { checkAppointmentsForDuplicates, DuplicateCheckResult, ZepAttendance, formatZepStartTime, formatZepEndTime } from "@/lib/zep-api";

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
}

interface Task {
  id: number;
  name: string;
  description: string | null;
  project_id: number;
  activities?: AssignedActivity[]; // Dem Vorgang zugeordnete Tätigkeiten (leer = erbt vom Projekt)
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
  type?: string;
  isOnlineMeeting?: boolean;
  onlineMeetingProvider?: string;
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
  attendees?: Attendee[];
  organizer?: {
    emailAddress: {
      name: string;
      address: string;
    };
  };
  isOrganizer?: boolean;
  seriesMasterId?: string;
  type?: string;
  synced?: boolean; // true if already exists in ZEP
  isOnlineMeeting?: boolean;
  onlineMeetingProvider?: string;
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
  newProjectId: number;
  newTaskId: number;
  newActivityId: string;
  newProjektNr: string;
  newVorgangNr: string;
  // Original entry data needed for SOAP modify call
  userId: string;
  datum: string;
  von: string;
  bis: string;
  bemerkung?: string;
  istFakturierbar?: boolean;
}

// localStorage key for persisting work state
const STORAGE_KEY = "outlook-zep-sync-state";

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

interface PersistedState {
  startDate: string;
  endDate: string;
  appointments: Appointment[];
  filterDate: string | null;
  hideSoloMeetings: boolean;
  syncedEntries: ZepEntry[]; // Already synced entries from ZEP
  savedAt: number; // timestamp for cache invalidation
}

// Helper: Check if an appointment is already synced to ZEP
function isAppointmentSynced(apt: Appointment, syncedEntries: ZepEntry[]): boolean {
  if (!syncedEntries || syncedEntries.length === 0) {
    return false;
  }

  const aptDate = new Date(apt.start.dateTime);
  const aptDateStr = aptDate.toISOString().split("T")[0];
  const aptFromTime = aptDate.toTimeString().slice(0, 8);
  const aptEndDate = new Date(apt.end.dateTime);
  const aptToTime = aptEndDate.toTimeString().slice(0, 8);

  return syncedEntries.some((entry) => {
    const entryDate = entry.date.split("T")[0];
    return (
      entry.note === apt.subject &&
      entryDate === aptDateStr &&
      entry.from === aptFromTime &&
      entry.to === aptToTime
    );
  });
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

export default function Dashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Load initial state from localStorage or use defaults
  const initialState = useMemo(() => {
    const stored = getStoredState();
    const defaultRange = getDefaultDateRange();
    return {
      startDate: stored?.startDate ?? defaultRange.startDate,
      endDate: stored?.endDate ?? defaultRange.endDate,
      appointments: stored?.appointments ?? [],
      filterDate: stored?.filterDate ?? null,
      hideSoloMeetings: stored?.hideSoloMeetings ?? true,
      syncedEntries: stored?.syncedEntries ?? [],
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  const [startDate, setStartDate] = useState(initialState.startDate);
  const [endDate, setEndDate] = useState(initialState.endDate);
  const [appointments, setAppointments] = useState<Appointment[]>(initialState.appointments);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Record<number, Task[]>>({});
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error"; details?: string[] } | null>(null);
  const [syncedEntries, setSyncedEntries] = useState<ZepEntry[]>(initialState.syncedEntries);
  const [submittedIds, setSubmittedIds] = useState<Set<string>>(new Set());
  const [filterDate, setFilterDate] = useState<string | null>(initialState.filterDate);
  const [hideSoloMeetings, setHideSoloMeetings] = useState(initialState.hideSoloMeetings);
  const [seriesFilterActive, setSeriesFilterActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [zepEmployee, setZepEmployee] = useState<{ username: string; firstname: string; lastname: string; email: string } | null>(null);
  const [employeeLoading, setEmployeeLoading] = useState(false);
  const [employeeError, setEmployeeError] = useState<string | null>(null);
  const [duplicateWarnings, setDuplicateWarnings] = useState<Map<string, DuplicateCheckResult>>(new Map());
  const [loadingTasks, setLoadingTasks] = useState<Set<number>>(new Set());
  const [lastLoadedAt, setLastLoadedAt] = useState<Date | null>(
    initialState.appointments.length > 0 ? new Date(getStoredState()?.savedAt || Date.now()) : null
  );

  // State for editing synced entries (rebooking)
  const [editingAppointments, setEditingAppointments] = useState<Set<string>>(new Set());
  const [modifiedEntries, setModifiedEntries] = useState<Map<string, ModifiedEntry>>(new Map());

  const employeeId = zepEmployee?.username ?? "";



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

  // Filter appointments by selected date, series filter, search query, and solo-meeting toggle
  const filteredAppointments = useMemo(() => {
    let filtered = appointments;
    
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
        
        // Otherwise, only show if has other attendees
        const otherAttendees = (apt.attendees || []).filter(
          (a) => a.emailAddress.address.toLowerCase() !== userEmail
        );
        return otherAttendees.length > 0;
      });
    }
    
    return filtered;
  }, [appointments, filterDate, seriesFilterActive, validSeriesIds, searchQuery, hideSoloMeetings, session?.user?.email]);

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
  }, [startDate, endDate, appointments, filterDate, hideSoloMeetings, syncedEntries]);

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
  }, [appointments, syncedEntries]);

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
        loadAppointments();
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

  // Load projects when employeeId or date range changes
  // Uses today's date as reference for filtering bookable projects
  const loadProjects = useCallback(async () => {
    if (!employeeId) return;

    try {
      // Use today as reference date for project filtering
      // This ensures we only show projects that are currently bookable
      const today = new Date().toISOString().split("T")[0];
      const params = new URLSearchParams({
        employeeId: employeeId,
        date: today,
      });
      const res = await fetch(`/api/zep/employee-projects?${params}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setProjects(data);
      }
    } catch (error) {
      console.error("Failed to load projects:", error);
    }
  }, [employeeId]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  // Note: Synced entries are loaded together with appointments in loadAppointments()

  const loadTasksForProject = useCallback(async (projectId: number, options?: { skipFilter?: boolean }) => {
    if (tasks[projectId]) return;

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
      }
    } catch (error) {
      console.error("Failed to load tasks:", error);
    } finally {
      setLoadingTasks((prev) => {
        const next = new Set(prev);
        next.delete(projectId);
        return next;
      });
    }
  }, [tasks, employeeId, projects]);

  const loadAppointments = async (overrideStartDate?: string, overrideEndDate?: string) => {
    const effectiveStartDate = overrideStartDate ?? startDate;
    const effectiveEndDate = overrideEndDate ?? endDate;
    
    setLoading(true);
    setMessage(null);
    try {
      // Build projects URL with today's date for filtering bookable projects
      const today = new Date().toISOString().split("T")[0];
      const projectsParams = employeeId 
        ? new URLSearchParams({ employeeId: employeeId, date: today })
        : null;

      // Load appointments, ZEP entries, and projects in parallel
      const [appointmentsRes, zepRes, projectsRes] = await Promise.all([
        fetch(`/api/calendar?startDate=${effectiveStartDate}&endDate=${effectiveEndDate}`),
        employeeId 
          ? fetch(`/api/zep/timeentries?employeeId=${employeeId}&startDate=${effectiveStartDate}&endDate=${effectiveEndDate}`)
          : Promise.resolve(null),
        projectsParams
          ? fetch(`/api/zep/employee-projects?${projectsParams}`)
          : Promise.resolve(null),
      ]);

      const appointmentsData = await appointmentsRes.json();

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
              };
            }
            
            // New appointment - apply defaults
            const otherAttendees = (event.attendees || []).filter(
              (a: Attendee) => a.emailAddress.address.toLowerCase() !== userEmail
            );
            const hasMeetingAttendees = otherAttendees.length > 0;
            
            return {
              ...event,
              selected: hasMeetingAttendees, // Only pre-select meetings with other attendees
              projectId: null,
              taskId: null,
              activityId: "be", // Default: Beratung
            };
          })
        );
      }

      // Load ZEP entries for sync status
      if (zepRes) {
        const zepData = await zepRes.json();
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
      }

      // Load projects
      if (projectsRes) {
        const projectsData = await projectsRes.json();
        if (Array.isArray(projectsData)) {
          setProjects(projectsData);
        }
      }
      
      // Update last loaded timestamp
      setLastLoadedAt(new Date());
    } catch (error) {
      console.error("Failed to load appointments:", error);
      setMessage({ text: "Fehler beim Laden der Termine", type: "error" });
    }
    setLoading(false);
  };

  // Handler für Preset-Buttons: setzt Datum UND lädt sofort
  const handleDateRangeChange = (newStartDate: string, newEndDate: string) => {
    setStartDate(newStartDate);
    setEndDate(newEndDate);
    // Sofort laden mit den neuen Werten (nicht warten auf State-Update)
    loadAppointments(newStartDate, newEndDate);
  };

  const toggleAppointment = (id: string) => {
    setAppointments((prev) =>
      prev.map((apt) =>
        apt.id === id ? { ...apt, selected: !apt.selected } : apt
      )
    );
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
    // Erstelle Set der IDs von gefilterten, sichtbaren Terminen
    const visibleIds = new Set(filteredAppointments.map(a => a.id));
    
    setAppointments((prev) =>
      prev.map((apt) => {
        // Nur Termine ändern die in der gefilterten Liste sichtbar sind
        if (!visibleIds.has(apt.id)) return apt;
        // Bereits gesynced? Nicht ändern
        if (isAppointmentSynced(apt, syncedEntries)) return apt;
        return { ...apt, selected };
      })
    );
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
        };
      })
    );
    // Auch Editing-State zurücksetzen
    setEditingAppointments(new Set());
    setModifiedEntries(new Map());
    setMessage(null);
  };

  const changeProject = async (id: string, projectId: number | null) => {
    setAppointments((prev) =>
      prev.map((apt) =>
        apt.id === id ? { ...apt, projectId, taskId: null } : apt
      )
    );

    if (projectId) {
      await loadTasksForProject(projectId);
    }
  };

  const changeTask = (id: string, taskId: number | null) => {
    setAppointments((prev) =>
      prev.map((apt) => {
        if (apt.id !== id) return apt;
        
        // Find standard activity for the selected task
        let newActivityId = apt.activityId;
        if (taskId && apt.projectId) {
          const projectTasks = tasks[apt.projectId] || [];
          const selectedTask = projectTasks.find((t) => t.id === taskId);
          
          // Check task activities first, then project activities
          const taskActivities = selectedTask?.activities || [];
          const project = projects.find((p) => p.id === apt.projectId);
          const projectActivities = project?.activities || [];
          
          // Use task activities if available, otherwise project activities
          const relevantActivities = taskActivities.length > 0 ? taskActivities : projectActivities;
          const standardActivity = relevantActivities.find((a) => a.standard);
          
          if (standardActivity) {
            newActivityId = standardActivity.name;
          }
        }
        
        return { ...apt, taskId, activityId: newActivityId };
      })
    );
  };

  const changeActivity = (id: string, activityId: string) => {
    setAppointments((prev) =>
      prev.map((apt) => (apt.id === id ? { ...apt, activityId } : apt))
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

  // Helper: Find the synced ZEP entry for an appointment
  const findSyncedEntry = useCallback((apt: Appointment): ZepEntry | null => {
    if (!syncedEntries || syncedEntries.length === 0) return null;

    const aptDate = new Date(apt.start.dateTime);
    const aptDateStr = aptDate.toISOString().split("T")[0];
    const aptFromTime = aptDate.toTimeString().slice(0, 8);
    const aptEndDate = new Date(apt.end.dateTime);
    const aptToTime = aptEndDate.toTimeString().slice(0, 8);

    return syncedEntries.find((entry) => {
      const entryDate = entry.date.split("T")[0];
      return (
        entry.note === apt.subject &&
        entryDate === aptDateStr &&
        entry.from === aptFromTime &&
        entry.to === aptToTime
      );
    }) || null;
  }, [syncedEntries]);

  // Start editing a synced appointment
  const startEditingSyncedAppointment = useCallback((appointmentId: string) => {
    setEditingAppointments((prev) => new Set(prev).add(appointmentId));
  }, []);

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
          newProjectId: projectId,
          newTaskId: 0,
          newActivityId: syncedEntry.activity_id,
          newProjektNr: project.name,
          newVorgangNr: "",
          userId: syncedEntry.employee_id,
          datum: syncedEntry.date.split("T")[0],
          von: syncedEntry.from.slice(0, 5),
          bis: syncedEntry.to.slice(0, 5),
          bemerkung: syncedEntry.note || undefined,
          istFakturierbar: syncedEntry.billable,
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
          newProjectId: syncedEntry.project_id,
          newTaskId: syncedEntry.project_task_id,
          newActivityId: activityId,
          newProjektNr: project?.name || syncedEntry.projektNr || "",
          newVorgangNr: task?.name || syncedEntry.vorgangNr || "",
          userId: syncedEntry.employee_id,
          datum: syncedEntry.date.split("T")[0],
          von: syncedEntry.from.slice(0, 5),
          bis: syncedEntry.to.slice(0, 5),
          bemerkung: syncedEntry.note || undefined,
          istFakturierbar: syncedEntry.billable,
        });
      }
      return next;
    });
  }, [projects, tasks]);

  const submitToZep = async (appointmentsToSync: Appointment[], entriesToModify?: ModifiedEntry[]) => {
    // Use the appointments passed from the dialog (already filtered by user)
    const syncReadyAppointments = appointmentsToSync;
    const modificationsToSubmit = entriesToModify || Array.from(modifiedEntries.values()).filter(
      (e) => e.newProjektNr && e.newVorgangNr // Only submit complete modifications
    );
    
    if (syncReadyAppointments.length === 0 && modificationsToSubmit.length === 0) {
      setMessage({ text: "Keine Termine zum Synchronisieren oder Aktualisieren vorhanden.", type: "error" });
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
          const startDt = new Date(apt.start.dateTime);
          const endDt = new Date(apt.end.dateTime);
          const dateStr = startDt.toISOString().split("T")[0];

          return {
            date: dateStr,
            from: formatZepStartTime(startDt),
            to: formatZepEndTime(endDt),
            employee_id: employeeId,
            note: apt.subject,
            billable: true,
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
        if (result.errors) allErrors.push(...result.errors);

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
          von: mod.von,
          bis: mod.bis,
          bemerkung: mod.bemerkung,
          istFakturierbar: mod.istFakturierbar,
        }));

        const modRes = await fetch("/api/zep/timeentries", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ entries: modifyEntries }),
        });

        const modResult = await modRes.json();
        modifySucceeded = modResult.succeeded || 0;
        modifyFailed = modResult.failed || 0;
        if (modResult.errors) allErrors.push(...modResult.errors);

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
        
        setMessage({
          text: parts.join(", "),
          type: "success",
          details: allErrors.length > 0 ? allErrors : undefined,
        });
      } else if (totalFailed > 0) {
        setMessage({
          text: `${totalFailed} Fehler bei der Übertragung`,
          type: "error",
          details: allErrors,
        });
      }

      // Reload synced entries to update status display
      if (employeeId && totalSucceeded > 0) {
        try {
          const res = await fetch(`/api/zep/timeentries?employeeId=${employeeId}&startDate=${startDate}&endDate=${endDate}`);
          const data = await res.json();
          if (Array.isArray(data)) {
            setSyncedEntries(data);
          }
        } catch (e) {
          console.error("Failed to reload synced entries:", e);
        }
      }
    } catch (error) {
      console.error("Submit error:", error);
      setMessage({ text: "Fehler bei der Übertragung", type: "error" });
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
          <h1 className="text-xl font-bold text-gray-900">
            Outlook → ZEP Sync
          </h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">
              {session?.user?.email}
              {zepEmployee && (
                <span className="ml-1 text-gray-500">
                  (ZEP: {zepEmployee.username})
                </span>
              )}
              {employeeLoading && (
                <span className="ml-1 text-gray-400">(Lade ZEP...)</span>
              )}
            </span>
            <div 
              className="relative group"
              title="Tastaturkürzel: Esc = Filter löschen, Strg+R = Neu laden"
            >
              <Keyboard size={16} className="text-gray-400 cursor-help" />
              <div className="hidden group-hover:block absolute right-0 top-full mt-1 p-2 bg-gray-900 text-white text-xs rounded shadow-lg whitespace-nowrap z-50">
                <div className="font-medium mb-1">Tastaturkürzel</div>
                <div><kbd className="px-1 bg-gray-700 rounded">Esc</kbd> Filter löschen</div>
                <div><kbd className="px-1 bg-gray-700 rounded">Strg+R</kbd> Termine laden</div>
              </div>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
            >
              <LogOut size={16} />
              Abmelden
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

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        <DateRangePicker
          startDate={startDate}
          endDate={endDate}
          onStartDateChange={setStartDate}
          onEndDateChange={setEndDate}
          onLoad={() => loadAppointments()}
          onDateRangeChange={handleDateRangeChange}
          loading={loading}
          lastLoadedAt={lastLoadedAt}
        />

        <CalendarHeatmap
          startDate={startDate}
          endDate={endDate}
          appointments={appointments}
          syncedEntries={syncedEntries}
          submittedIds={submittedIds}
          selectedDate={filterDate}
          hideSoloMeetings={hideSoloMeetings}
          userEmail={session?.user?.email || undefined}
          onDayClick={(date) => {
            setFilterDate(date);
            if (date) setSeriesFilterActive(false); // Clear series filter when selecting a date
          }}
          onSeriesClick={setSeriesFilterActive}
          seriesFilterActive={seriesFilterActive}
        />

        {message && (
          <div
            className={`p-4 rounded-lg relative ${
              message.type === "error"
                ? "bg-red-50 text-red-800 border border-red-200"
                : "bg-green-50 text-green-800 border border-green-200"
            }`}
          >
            <button
              onClick={() => setMessage(null)}
              className="absolute top-2 right-2 p-1 rounded hover:bg-black/5 transition"
              aria-label="Meldung schließen"
            >
              <X size={16} />
            </button>
            <div className="pr-8">
              <p className="font-medium">{message.text}</p>
              {message.details && message.details.length > 0 && (
                <ul className="mt-2 text-sm list-disc list-inside">
                  {message.details.map((detail, idx) => (
                    <li key={idx}>{detail}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        {/* Search and filter controls */}
        {appointments.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-100">
            <div className="flex items-center">
              {/* Search input */}
              <div className="relative flex-1">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Termine durchsuchen..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-11 pr-10 py-3 text-sm bg-transparent border-0 focus:outline-none focus:ring-0"
                  aria-label="Termine durchsuchen"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition"
                    aria-label="Suche löschen"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
              
              {/* Divider */}
              <div className="h-8 w-px bg-gray-200" />
              
              {/* Filter count */}
              <div className="px-4 text-sm text-gray-500 whitespace-nowrap">
                <span className="font-medium text-gray-700">{filteredAppointments.length}</span>
                <span className="text-gray-400"> / {appointments.length}</span>
              </div>
              
              {/* Active filters */}
              {(filterDate || seriesFilterActive) && (
                <>
                  <div className="h-8 w-px bg-gray-200" />
                  <div className="flex items-center gap-2 px-2">
                    {filterDate && (
                      <button
                        onClick={() => setFilterDate(null)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-blue-700 bg-blue-50 rounded-full hover:bg-blue-100 transition"
                      >
                        <span>{new Date(filterDate).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" })}</span>
                        <X size={14} />
                      </button>
                    )}
                    {seriesFilterActive && (
                      <button
                        onClick={() => setSeriesFilterActive(false)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-purple-700 bg-purple-50 rounded-full hover:bg-purple-100 transition"
                      >
                        <span>Serien</span>
                        <X size={14} />
                      </button>
                    )}
                  </div>
                </>
              )}
              
              {/* Divider */}
              <div className="h-8 w-px bg-gray-200" />
              
              {/* Solo toggle */}
              <button
                onClick={() => setHideSoloMeetings(!hideSoloMeetings)}
                className={`flex items-center gap-2 px-4 py-3 text-sm whitespace-nowrap transition ${
                  !hideSoloMeetings 
                    ? "text-blue-600 bg-blue-50" 
                    : "text-gray-500 hover:bg-gray-50"
                }`}
                title={hideSoloMeetings ? "Solo-Termine werden ausgeblendet" : "Solo-Termine werden angezeigt"}
              >
                <div className={`w-8 h-5 rounded-full relative transition-colors ${
                  !hideSoloMeetings ? "bg-blue-600" : "bg-gray-300"
                }`}>
                  <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                    !hideSoloMeetings ? "translate-x-3.5" : "translate-x-0.5"
                  }`} />
                </div>
                <span className="hidden sm:inline">Solo-Termine</span>
              </button>
            </div>
          </div>
        )}

        <AppointmentList
          appointments={filteredAppointments}
          projects={projects}
          tasks={tasks}
          activities={activities}
          syncedEntries={syncedEntries}
          duplicateWarnings={duplicateWarnings}
          loadingTasks={loadingTasks}
          onToggle={toggleAppointment}
          onToggleSeries={toggleSeries}
          onSelectAll={selectAllAppointments}
          onProjectChange={changeProject}
          onTaskChange={changeTask}
          onActivityChange={changeActivity}
          onApplyToSeries={applyToSeries}
          onSubmit={submitToZep}
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
        />
      </main>
    </div>
  );
}
