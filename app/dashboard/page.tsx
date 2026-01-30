"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { format, startOfWeek, endOfWeek } from "date-fns";
import { LogOut } from "lucide-react";
import DateRangePicker from "@/components/DateRangePicker";
import AppointmentList from "@/components/AppointmentList";

interface Project {
  id: number;
  name: string;
  description: string;
}

interface Task {
  id: number;
  name: string;
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
}

export default function Dashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const today = new Date();
  const [startDate, setStartDate] = useState(
    format(startOfWeek(today, { weekStartsOn: 1 }), "yyyy-MM-dd")
  );
  const [endDate, setEndDate] = useState(
    format(endOfWeek(today, { weekStartsOn: 1 }), "yyyy-MM-dd")
  );
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Record<number, Task[]>>({});
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [zepToken, setZepToken] = useState<string | null>(null);
  const [employeeId, setEmployeeId] = useState<string>("rfels");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    }
  }, [status, router]);

  useEffect(() => {
    const token = localStorage.getItem("zepToken");
    const storedEmployeeId = localStorage.getItem("zepEmployeeId");

    if (!token) {
      router.push("/");
      return;
    }

    setZepToken(token);
    if (storedEmployeeId) {
      setEmployeeId(storedEmployeeId);
    }

    // Load projects
    fetch(`/api/zep/projects?token=${encodeURIComponent(token)}`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setProjects(data);
        }
      })
      .catch(console.error);

    // Load activities
    fetch(`/api/zep/activities?token=${encodeURIComponent(token)}`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setActivities(data);
        }
      })
      .catch(console.error);
  }, [router]);

  const loadTasksForProject = useCallback(async (projectId: number) => {
    if (tasks[projectId] || !zepToken) return;

    try {
      const res = await fetch(
        `/api/zep/tasks?token=${encodeURIComponent(zepToken)}&projectId=${projectId}`
      );
      const data = await res.json();
      if (Array.isArray(data)) {
        setTasks((prev) => ({ ...prev, [projectId]: data }));
      }
    } catch (error) {
      console.error("Failed to load tasks:", error);
    }
  }, [zepToken, tasks]);

  const loadAppointments = async () => {
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch(
        `/api/calendar?startDate=${startDate}&endDate=${endDate}`
      );
      const data = await res.json();

      if (Array.isArray(data)) {
        setAppointments(
          data.map((event: any) => ({
            ...event,
            selected: true,
            projectId: null,
            taskId: null,
            activityId: "be", // Default: Beratung
          }))
        );
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

  const submitToZep = async () => {
    if (!zepToken) {
      setMessage("ZEP-Token fehlt");
      return;
    }

    const selectedAppointments = appointments.filter((a) => a.selected);
    const entries = selectedAppointments.map((apt) => {
      const startDt = new Date(apt.start.dateTime);
      const endDt = new Date(apt.end.dateTime);

      return {
        date: startDt.toISOString().replace(/\.\d{3}Z$/, ".000000Z"),
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
        body: JSON.stringify({ token: zepToken, entries }),
      });

      const result = await res.json();
      setMessage(result.message || "Erfolgreich uebertragen!");

      if (result.succeeded > 0) {
        setAppointments((prev) => prev.filter((a) => !a.selected));
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
            <div className="text-sm">
              <label className="text-gray-500 mr-2">Mitarbeiter:</label>
              <input
                type="text"
                value={employeeId}
                onChange={(e) => {
                  setEmployeeId(e.target.value);
                  localStorage.setItem("zepEmployeeId", e.target.value);
                }}
                className="px-2 py-1 border rounded text-sm w-24"
                placeholder="z.B. rfels"
              />
            </div>
            <span className="text-sm text-gray-600">{session?.user?.email}</span>
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

        <AppointmentList
          appointments={appointments}
          projects={projects}
          tasks={tasks}
          activities={activities}
          onToggle={toggleAppointment}
          onProjectChange={changeProject}
          onTaskChange={changeTask}
          onActivityChange={changeActivity}
          onSubmit={submitToZep}
          submitting={submitting}
        />
      </main>
    </div>
  );
}
