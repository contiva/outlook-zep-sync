"use client";

import { useMemo } from "react";
import AppointmentRow from "./AppointmentRow";
import SeriesGroup from "./SeriesGroup";

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
}

interface ZepEntry {
  id: number;
  date: string;
  from: string;
  to: string;
  note: string | null;
  employee_id: string;
}

interface AppointmentListProps {
  appointments: Appointment[];
  projects: Project[];
  tasks: Record<number, Task[]>;
  activities: Activity[];
  syncedEntries: ZepEntry[];
  onToggle: (id: string) => void;
  onToggleSeries: (seriesId: string, selected: boolean) => void;
  onProjectChange: (id: string, projectId: number | null) => void;
  onTaskChange: (id: string, taskId: number | null) => void;
  onActivityChange: (id: string, activityId: string) => void;
  onApplyToSeries: (
    seriesId: string,
    projectId: number | null,
    taskId: number | null,
    activityId: string
  ) => void;
  onSubmit: () => void;
  submitting: boolean;
}

interface GroupedItem {
  type: "single" | "series";
  seriesId?: string;
  appointments: Appointment[];
  firstStart: Date;
}

// Helper: Check if an appointment is synced to ZEP
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

export default function AppointmentList({
  appointments,
  projects,
  tasks,
  activities,
  syncedEntries,
  onToggle,
  onToggleSeries,
  onProjectChange,
  onTaskChange,
  onActivityChange,
  onApplyToSeries,
  onSubmit,
  submitting,
}: AppointmentListProps) {
  // Gruppiere Termine nach Serien
  const groupedItems = useMemo(() => {
    const seriesMap = new Map<string, Appointment[]>();
    const singleAppointments: Appointment[] = [];

    appointments.forEach((apt) => {
      if (apt.seriesMasterId && apt.type === "occurrence") {
        const existing = seriesMap.get(apt.seriesMasterId) || [];
        existing.push(apt);
        seriesMap.set(apt.seriesMasterId, existing);
      } else {
        singleAppointments.push(apt);
      }
    });

    const items: GroupedItem[] = [];

    // Serien mit >= 2 Terminen als Gruppe
    seriesMap.forEach((seriesAppointments, seriesId) => {
      if (seriesAppointments.length >= 2) {
        // Sortiere nach Startzeit
        seriesAppointments.sort(
          (a, b) =>
            new Date(a.start.dateTime).getTime() -
            new Date(b.start.dateTime).getTime()
        );
        items.push({
          type: "series",
          seriesId,
          appointments: seriesAppointments,
          firstStart: new Date(seriesAppointments[0].start.dateTime),
        });
      } else {
        // Nur ein Termin -> als Einzeltermin behandeln
        singleAppointments.push(...seriesAppointments);
      }
    });

    // Einzeltermine hinzufügen
    singleAppointments.forEach((apt) => {
      items.push({
        type: "single",
        appointments: [apt],
        firstStart: new Date(apt.start.dateTime),
      });
    });

    // Nach Startzeit sortieren
    items.sort((a, b) => a.firstStart.getTime() - b.firstStart.getTime());

    return items;
  }, [appointments]);

  const selectedAppointments = appointments.filter((a) => a.selected);

  const totalMinutes = selectedAppointments.reduce((acc, apt) => {
    const start = new Date(apt.start.dateTime);
    const end = new Date(apt.end.dateTime);
    return acc + (end.getTime() - start.getTime()) / 1000 / 60;
  }, 0);

  const hours = Math.floor(totalMinutes / 60);
  const minutes = Math.round(totalMinutes % 60);

  // Alle ausgewählten Termine müssen Projekt, Task und Activity haben
  const allComplete = selectedAppointments.every(
    (a) => a.projectId && a.taskId && a.activityId
  );

  // Zähle Serien
  const seriesCount = groupedItems.filter((g) => g.type === "series").length;

  return (
    <div className="bg-white rounded-lg shadow">
      {seriesCount > 0 && (
        <div className="px-4 py-2 bg-blue-50 border-b border-blue-100 text-sm text-blue-700">
          {seriesCount} wiederkehrende Terminserie{seriesCount > 1 ? "n" : ""} erkannt
        </div>
      )}

      <div className="divide-y divide-gray-100">
        {groupedItems.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            Keine Termine gefunden. Wähle einen Zeitraum und klicke auf "Termine laden".
          </div>
        ) : (
          groupedItems.map((item) =>
            item.type === "series" ? (
              <SeriesGroup
                key={item.seriesId}
                seriesId={item.seriesId!}
                appointments={item.appointments}
                projects={projects}
                tasks={tasks}
                activities={activities}
                syncedEntries={syncedEntries}
                onToggle={onToggle}
                onToggleSeries={onToggleSeries}
                onProjectChange={onProjectChange}
                onTaskChange={onTaskChange}
                onActivityChange={onActivityChange}
                onApplyToSeries={onApplyToSeries}
              />
            ) : (
              <AppointmentRow
                key={item.appointments[0].id}
                appointment={item.appointments[0]}
                projects={projects}
                tasks={
                  item.appointments[0].projectId
                    ? tasks[item.appointments[0].projectId] || []
                    : []
                }
                activities={activities}
                isSynced={isAppointmentSynced(item.appointments[0], syncedEntries)}
                onToggle={onToggle}
                onProjectChange={onProjectChange}
                onTaskChange={onTaskChange}
                onActivityChange={onActivityChange}
              />
            )
          )
        )}
      </div>

      {appointments.length > 0 && (
        <div className="p-4 border-t border-gray-200 bg-gray-50 rounded-b-lg">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Ausgewählt: {selectedAppointments.length} Termine ({hours}h{" "}
              {minutes}min)
            </div>
            <button
              onClick={onSubmit}
              disabled={
                submitting ||
                selectedAppointments.length === 0 ||
                !allComplete
              }
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
            >
              {submitting ? "Wird übertragen..." : "An ZEP übertragen"}
            </button>
          </div>
          {selectedAppointments.length > 0 && !allComplete && (
            <p className="text-sm text-amber-600 mt-2">
              Bitte allen ausgewählten Terminen Projekt, Task und Tätigkeit zuweisen.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
