"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback, useMemo } from "react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { LogOut, Search, X } from "lucide-react";
import DateRangePicker from "@/components/DateRangePicker";
import AppointmentList from "@/components/AppointmentList";
import CalendarHeatmap from "@/components/CalendarHeatmap";

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
  const [message, setMessage] = useState("");
  const [syncedEntries, setSyncedEntries] = useState<ZepEntry[]>(initialState.syncedEntries);
  const [submittedIds, setSubmittedIds] = useState<Set<string>>(new Set());
  const [filterDate, setFilterDate] = useState<string | null>(initialState.filterDate);
  const [hideSoloMeetings, setHideSoloMeetings] = useState(initialState.hideSoloMeetings);
  const [seriesFilterActive, setSeriesFilterActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  // Derive employee ID from Azure email: robert.fels@contiva.com -> rfels
  const employeeId = useMemo(() => {
    const email = session?.user?.email;
    if (!email) return "";
    
    const localPart = email.split("@")[0]; // robert.fels
    const parts = localPart.split("."); // ["robert", "fels"]
    
    if (parts.length >= 2) {
      // First letter of first name + last name
      return parts[0].charAt(0) + parts[parts.length - 1]; // rfels
    }
    return localPart; // fallback: use full local part
  }, [session?.user?.email]);



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

    try {
      const res = await fetch(`/api/zep/tasks?projectId=${projectId}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setTasks((prev) => ({ ...prev, [projectId]: data }));
      }
    } catch (error) {
      console.error("Failed to load tasks:", error);
    }
  }, [tasks]);

  const loadAppointments = async () => {
    setLoading(true);
    setMessage("");
    try {
      // Load appointments and ZEP entries in parallel
      const [appointmentsRes, zepRes] = await Promise.all([
        fetch(`/api/calendar?startDate=${startDate}&endDate=${endDate}`),
        employeeId 
          ? fetch(`/api/zep/timeentries?employeeId=${employeeId}&startDate=${startDate}&endDate=${endDate}`)
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
        }
      }
    } catch (error) {
      console.error("Failed to load appointments:", error);
      setMessage("Fehler beim Laden der Termine");
    }
    setLoading(false);
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

  const submitToZep = async () => {
    // Only submit filtered (visible) appointments that are selected
    const selectedAppointments = filteredAppointments.filter((a) => a.selected);
    
    // Check if all required fields are set
    const incompleteAppointments = selectedAppointments.filter(
      (a) => !a.projectId || !a.taskId
    );
    
    if (incompleteAppointments.length > 0) {
      setMessage(`Fehler: ${incompleteAppointments.length} Termin(e) ohne Projekt oder Task`);
      return;
    }
    
    const entries = selectedAppointments.map((apt) => {
      const startDt = new Date(apt.start.dateTime);
      const endDt = new Date(apt.end.dateTime);

      // ZEP API requires date in YYYY-MM-DD format (not ISO timestamp)
      const dateStr = startDt.toISOString().split("T")[0];

      return {
        date: dateStr,
        from: startDt.toTimeString().slice(0, 8),
        to: endDt.toTimeString().slice(0, 8),
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
      
      // Show detailed error message if available
      let msg = result.message || "Erfolgreich uebertragen!";
      if (result.errors?.length > 0) {
        msg += "\n" + result.errors.join("\n");
      }
      setMessage(msg);

      if (result.succeeded > 0) {
        // Track submitted IDs for heatmap
        const submittedAppointmentIds = new Set(selectedAppointments.map((a) => a.id));
        setSubmittedIds((prev) => new Set([...prev, ...submittedAppointmentIds]));
        
        // Reload synced entries to update heatmap
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
        
        // Remove only the submitted appointments from list
        setAppointments((prev) => prev.filter((a) => !submittedAppointmentIds.has(a.id)));
      }
    } catch (error) {
      console.error("Submit error:", error);
      setMessage("Fehler bei der Uebertragung");
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
              {session?.user?.email} ({employeeId})
            </span>
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

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        <DateRangePicker
          startDate={startDate}
          endDate={endDate}
          onStartDateChange={setStartDate}
          onEndDateChange={setEndDate}
          onLoad={loadAppointments}
          loading={loading}
        />

        <CalendarHeatmap
          startDate={startDate}
          endDate={endDate}
          appointments={appointments}
          syncedEntries={syncedEntries}
          submittedIds={submittedIds}
          selectedDate={filterDate}
          onDayClick={(date) => {
            setFilterDate(date);
            if (date) setSeriesFilterActive(false); // Clear series filter when selecting a date
          }}
          onSeriesClick={setSeriesFilterActive}
          seriesFilterActive={seriesFilterActive}
        />

        {message && (
          <div
            className={`p-4 rounded-lg ${
              message.includes("Fehler")
                ? "bg-red-50 text-red-800"
                : "bg-green-50 text-green-800"
            }`}
          >
            {message}
          </div>
        )}

        {/* Search and filter controls */}
        {appointments.length > 0 && (
          <div className="flex items-center justify-between bg-white rounded-lg px-4 py-3 shadow-sm gap-4">
            {/* Search input - disabled when date/series filter active */}
            <div className="relative flex-1 max-w-xs">
              <Search size={16} className={`absolute left-3 top-1/2 -translate-y-1/2 ${filterDate || seriesFilterActive ? "text-gray-300" : "text-gray-400"}`} />
              <input
                type="text"
                placeholder={filterDate || seriesFilterActive ? "Filter aktiv..." : "Suche nach Titel oder Teilnehmer..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                disabled={!!filterDate || seriesFilterActive}
                className={`w-full pl-9 pr-8 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  filterDate || seriesFilterActive ? "bg-gray-50 text-gray-400 cursor-not-allowed" : ""
                }`}
              />
              {searchQuery && !filterDate && !seriesFilterActive && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X size={14} />
                </button>
              )}
            </div>
            
            <span className="text-sm text-gray-400 ml-auto">
              {filteredAppointments.length}/{appointments.length}
            </span>
            <label className="flex items-center gap-2 text-sm text-gray-500 cursor-pointer hover:text-gray-700">
              <input
                type="checkbox"
                checked={!hideSoloMeetings}
                onChange={() => setHideSoloMeetings(!hideSoloMeetings)}
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              Solo-Termine anzeigen
            </label>
          </div>
        )}

        <AppointmentList
          appointments={filteredAppointments}
          projects={projects}
          tasks={tasks}
          activities={activities}
          syncedEntries={syncedEntries}
          onToggle={toggleAppointment}
          onToggleSeries={toggleSeries}
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
