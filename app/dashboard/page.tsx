"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { format, startOfWeek, endOfWeek } from "date-fns";
import { LogOut } from "lucide-react";
import DateRangePicker from "@/components/DateRangePicker";
import AppointmentList from "@/components/AppointmentList";

interface Project {
  id: string;
  name: string;
}

interface Appointment {
  id: string;
  subject: string;
  start: { dateTime: string };
  end: { dateTime: string };
  selected: boolean;
  projectId: string;
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
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    }
  }, [status, router]);

  useEffect(() => {
    // ZEP Projekte laden
    const zepUrl = localStorage.getItem("zepUrl");
    const zepToken = localStorage.getItem("zepToken");

    if (!zepUrl || !zepToken) {
      router.push("/");
      return;
    }

    fetch(`/api/zep/projects?zepUrl=${encodeURIComponent(zepUrl)}&token=${encodeURIComponent(zepToken)}`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setProjects(data);
        }
      })
      .catch(console.error);
  }, [router]);

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
            projectId: "",
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

  const changeProject = (id: string, projectId: string) => {
    setAppointments((prev) =>
      prev.map((apt) => (apt.id === id ? { ...apt, projectId } : apt))
    );
  };

  const submitToZep = async () => {
    const zepUrl = localStorage.getItem("zepUrl");
    const zepToken = localStorage.getItem("zepToken");

    if (!zepUrl || !zepToken) {
      setMessage("ZEP-Verbindungsdaten fehlen");
      return;
    }

    const selectedAppointments = appointments.filter((a) => a.selected);
    const entries = selectedAppointments.map((apt) => ({
      projectId: apt.projectId,
      date: format(new Date(apt.start.dateTime), "yyyy-MM-dd"),
      startTime: format(new Date(apt.start.dateTime), "HH:mm"),
      endTime: format(new Date(apt.end.dateTime), "HH:mm"),
      description: apt.subject,
    }));

    setSubmitting(true);
    try {
      const res = await fetch("/api/zep/timeentries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ zepUrl, token: zepToken, entries }),
      });

      const result = await res.json();
      setMessage(result.message || "Erfolgreich übertragen!");

      // Erfolgreiche Einträge entfernen
      if (result.succeeded > 0) {
        setAppointments((prev) => prev.filter((a) => !a.selected));
      }
    } catch (error) {
      console.error("Submit error:", error);
      setMessage("Fehler bei der Übertragung");
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
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">
            Outlook → ZEP Sync
          </h1>
          <div className="flex items-center gap-4">
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

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
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
          onToggle={toggleAppointment}
          onProjectChange={changeProject}
          onSubmit={submitToZep}
          submitting={submitting}
        />
      </main>
    </div>
  );
}
