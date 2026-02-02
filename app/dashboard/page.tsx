"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback, useMemo } from "react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { LogOut, Search, X, Keyboard } from "lucide-react";
import DateRangePicker from "@/components/DateRangePicker";
import AppointmentList from "@/components/AppointmentList";
import CalendarHeatmap from "@/components/CalendarHeatmap";
import { saveSyncRecords, SyncRecord } from "@/lib/sync-history";
import { checkAppointmentsForDuplicates, DuplicateCheckResult, ZepAttendance, formatZepStartTime, formatZepEndTime } from "@/lib/zep-api";

interface Project {
  id: number;
  name: string;
  description: string;
}

interface Task {
  id: number;
  name: string;
  description: string | null;
  project_id: number;
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
}

// localStorage key for persisting work state
const STORAGE_KEY = "outlook-zep-sync-state";

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
  const today = new Date();
  const initialState = useMemo(() => {
    const stored = getStoredState();
    return {
      startDate: stored?.startDate ?? format(startOfMonth(today), "yyyy-MM-dd"),
      endDate: stored?.endDate ?? format(endOfMonth(today), "yyyy-MM-dd"),
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
  const loadProjects = useCallback(async () => {
    if (!employeeId) return;

    try {
      const params = new URLSearchParams({
        employeeId: employeeId,
        startDate: startDate,
        endDate: endDate,
      });
      const res = await fetch(`/api/zep/employee-projects?${params}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setProjects(data);
      }
    } catch (error) {
      console.error("Failed to load projects:", error);
    }
  }, [employeeId, startDate, endDate]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  // Note: Synced entries are loaded together with appointments in loadAppointments()

  const loadTasksForProject = useCallback(async (projectId: number) => {
    if (tasks[projectId]) return;

    setLoadingTasks((prev) => new Set(prev).add(projectId));
    try {
      const res = await fetch(`/api/zep/tasks?projectId=${projectId}`);
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
  }, [tasks]);

  const loadAppointments = async (overrideStartDate?: string, overrideEndDate?: string) => {
    const effectiveStartDate = overrideStartDate ?? startDate;
    const effectiveEndDate = overrideEndDate ?? endDate;
    
    setLoading(true);
    setMessage(null);
    try {
      // Load appointments and ZEP entries in parallel
      const [appointmentsRes, zepRes] = await Promise.all([
        fetch(`/api/calendar?startDate=${effectiveStartDate}&endDate=${effectiveEndDate}`),
        employeeId 
          ? fetch(`/api/zep/timeentries?employeeId=${employeeId}&startDate=${effectiveStartDate}&endDate=${effectiveEndDate}`)
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
          const syncedProjectIds = [...new Set(zepData.map((entry: ZepEntry) => entry.project_id))];
          syncedProjectIds.forEach((projectId) => {
            if (!tasks[projectId]) {
              // Load tasks in background (don't await)
              fetch(`/api/zep/tasks?projectId=${projectId}`)
                .then((res) => res.json())
                .then((data) => {
                  if (Array.isArray(data)) {
                    setTasks((prev) => ({ ...prev, [projectId]: data }));
                  }
                })
                .catch((err) => console.error("Failed to load tasks for synced project:", err));
            }
          });
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
      prev.map((apt) => (apt.id === id ? { ...apt, taskId } : apt))
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

  const submitToZep = async (appointmentsToSync: Appointment[]) => {
    // Use the appointments passed from the dialog (already filtered by user)
    const syncReadyAppointments = appointmentsToSync;
    
    if (syncReadyAppointments.length === 0) {
      setMessage({ text: "Keine Termine zum Synchronisieren vorhanden.", type: "error" });
      return;
    }
    
    const entries = syncReadyAppointments.map((apt) => {
      const startDt = new Date(apt.start.dateTime);
      const endDt = new Date(apt.end.dateTime);

      // ZEP API requires date in YYYY-MM-DD format (not ISO timestamp)
      const dateStr = startDt.toISOString().split("T")[0];

      // ZEP requires times in 15-minute intervals
      // Round start time DOWN, end time UP (maximizes booked time)
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

    setSubmitting(true);
    try {
      const res = await fetch("/api/zep/timeentries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entries }),
      });

      const result = await res.json();
      
      // Build a better success/error message
      if (result.succeeded > 0) {
        const totalMinutes = syncReadyAppointments.reduce((acc, apt) => {
          const start = new Date(apt.start.dateTime);
          const end = new Date(apt.end.dateTime);
          return acc + (end.getTime() - start.getTime()) / 1000 / 60;
        }, 0);
        const hours = Math.floor(totalMinutes / 60);
        const mins = Math.round(totalMinutes % 60);
        
        setMessage({
          text: `${result.succeeded} Termin${result.succeeded > 1 ? "e" : ""} an ZEP übertragen (${hours}h ${mins}min)`,
          type: "success",
          details: result.errors?.length > 0 ? result.errors : undefined,
        });
      } else {
        setMessage({
          text: result.message || "Fehler bei der Übertragung",
          type: "error",
          details: result.errors,
        });
      }

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
        
        // Reload synced entries to update status display
        if (employeeId) {
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
        
        // Deselect the submitted appointments (they stay in list but show as synced)
        setAppointments((prev) => 
          prev.map((a) => 
            submittedAppointmentIds.has(a.id) 
              ? { ...a, selected: false }
              : a
          )
        );
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
          <div className="flex flex-wrap items-center gap-4 bg-white rounded-lg px-4 py-3 shadow-sm">
            {/* Search input */}
            <div className="relative flex-1 min-w-[200px] max-w-xs">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Suche nach Titel oder Teilnehmer..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                aria-label="Termine durchsuchen"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  aria-label="Suche löschen"
                >
                  <X size={14} />
                </button>
              )}
            </div>
            
            <span className="text-sm text-gray-400 hidden sm:inline">
              {filteredAppointments.length}/{appointments.length}
            </span>
            <label className="flex items-center gap-2 text-sm text-gray-500 cursor-pointer hover:text-gray-700 whitespace-nowrap">
              <input
                type="checkbox"
                checked={!hideSoloMeetings}
                onChange={() => setHideSoloMeetings(!hideSoloMeetings)}
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="hidden sm:inline">Solo-Termine anzeigen</span>
              <span className="sm:hidden">Solo</span>
            </label>
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
          submitting={submitting}
        />
      </main>
    </div>
  );
}
