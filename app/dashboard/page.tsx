"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback, useMemo } from "react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { LogOut, Users, User } from "lucide-react";
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
  isOrganizer?: boolean;
  seriesMasterId?: string;
  type?: string;
  synced?: boolean; // true if already exists in ZEP
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
  const [syncedEntries, setSyncedEntries] = useState<ZepEntry[]>([]);
  const [submittedIds, setSubmittedIds] = useState<Set<string>>(new Set());
  const [filterDate, setFilterDate] = useState<string | null>(initialState.filterDate);
  const [hideSoloMeetings, setHideSoloMeetings] = useState(initialState.hideSoloMeetings);
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

  // Helper: Check if appointment has other attendees (not just the user)
  const hasOtherAttendees = useCallback(
    (apt: Appointment): boolean => {
      if (!apt.attendees || apt.attendees.length === 0) return false;
      // Filter out the current user - only count other attendees
      const userEmail = session?.user?.email?.toLowerCase();
      const otherAttendees = apt.attendees.filter(
        (a) => a.emailAddress.address.toLowerCase() !== userEmail
      );
      return otherAttendees.length > 0;
    },
    [session?.user?.email]
  );

  // Helper: Check if appointment is synced to ZEP (match by note/subject, date, and time)
  const isAppointmentSynced = useCallback(
    (apt: Appointment): boolean => {
      const aptDate = new Date(apt.start.dateTime);
      const aptDateStr = aptDate.toISOString().split("T")[0]; // YYYY-MM-DD
      const aptFromTime = aptDate.toTimeString().slice(0, 8); // HH:mm:ss
      const aptEndDate = new Date(apt.end.dateTime);
      const aptToTime = aptEndDate.toTimeString().slice(0, 8);

      return syncedEntries.some((entry) => {
        const entryDate = entry.date.split("T")[0]; // Handle ISO format from ZEP
        return (
          entry.note === apt.subject &&
          entryDate === aptDateStr &&
          entry.from === aptFromTime &&
          entry.to === aptToTime
        );
      });
    },
    [syncedEntries]
  );

  // Filter appointments by selected date and solo-meeting toggle
  const filteredAppointments = useMemo(() => {
    let filtered = appointments;
    
    // Filter by date if selected
    if (filterDate) {
      filtered = filtered.filter((apt) => apt.start.dateTime.startsWith(filterDate));
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
  }, [appointments, filterDate, hideSoloMeetings, session?.user?.email]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    }
  }, [status, router]);

  // Persist state to localStorage whenever it changes
  useEffect(() => {
    // Only save if we have appointments (don't overwrite with empty state on initial load)
    if (appointments.length > 0) {
      saveState({
        startDate,
        endDate,
        appointments,
        filterDate,
        hideSoloMeetings,
      });
    }
  }, [startDate, endDate, appointments, filterDate, hideSoloMeetings]);

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
          appointmentsData.map((event: any) => {
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
          onDayClick={setFilterDate}
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

        {/* Filter toggle for solo meetings */}
        {appointments.length > 0 && (
          <div className="flex items-center justify-between bg-white rounded-lg px-4 py-3 shadow-sm">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span>
                {filteredAppointments.length} von {appointments.length} Terminen
              </span>
              {hideSoloMeetings && (
                <span className="text-gray-400">
                  ({appointments.length - filteredAppointments.length} Solo-Termine ausgeblendet)
                </span>
              )}
            </div>
            <button
              onClick={() => setHideSoloMeetings(!hideSoloMeetings)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                hideSoloMeetings
                  ? "bg-blue-100 text-blue-700 hover:bg-blue-200"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {hideSoloMeetings ? (
                <>
                  <Users size={16} />
                  Nur Meetings mit Teilnehmern
                </>
              ) : (
                <>
                  <User size={16} />
                  Alle Termine anzeigen
                </>
              )}
            </button>
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
