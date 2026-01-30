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
  remark: string;
  attendees?: Attendee[];
  isOrganizer?: boolean;
  seriesMasterId?: string;
  type?: string;
}

interface AppointmentListProps {
  appointments: Appointment[];
  projects: Project[];
  tasks: Record<number, Task[]>;
  activities: Activity[];
  onToggle: (id: string) => void;
  onToggleAll: (selected: boolean) => void;
  onToggleSeries: (seriesId: string, selected: boolean) => void;
  onProjectChange: (id: string, projectId: number | null) => void;
  onTaskChange: (id: string, taskId: number | null) => void;
  onActivityChange: (id: string, activityId: string) => void;
  onRemarkChange: (id: string, remark: string) => void;
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

export default function AppointmentList({
  appointments,
  projects,
  tasks,
  activities,
  onToggle,
  onToggleAll,
  onToggleSeries,
  onProjectChange,
  onTaskChange,
  onActivityChange,
  onRemarkChange,
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

  // Alle ausgewählten Termine müssen Projekt, Task, Activity und Bemerkung haben
  const allComplete = selectedAppointments.every(
    (a) => a.projectId && a.taskId && a.activityId && (a.remark || "").trim().length > 0
  );

  // Zähle Serien
  const seriesCount = groupedItems.filter((g) => g.type === "series").length;

  // Prüfe ob alle/einige/keine ausgewählt sind
  const allSelected = appointments.length > 0 && appointments.every((a) => a.selected);
  const someSelected = appointments.some((a) => a.selected) && !allSelected;

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Sticky Header mit Alle auswählen und Buchen-Button */}
      {appointments.length > 0 && (
        <div className="sticky top-0 z-10 px-4 py-3 border-b border-gray-200 bg-gray-50 flex items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={allSelected}
              ref={(el) => {
                if (el) el.indeterminate = someSelected;
              }}
              onChange={() => onToggleAll(!allSelected)}
              className="h-5 w-5 text-blue-600 rounded"
            />
            <span className="text-sm font-medium text-gray-700">
              {allSelected ? "Alle abwählen" : "Alle auswählen"}
            </span>
            <span className="text-sm text-gray-500">
              ({selectedAppointments.length} von {appointments.length} ausgewählt, {hours}h {minutes}min)
            </span>
            {selectedAppointments.length > 0 && !allComplete && (
              <span className="text-sm text-amber-600">
                ⚠ Nicht alle Termine vollständig
              </span>
            )}
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
      )}

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
                onToggle={onToggle}
                onToggleSeries={onToggleSeries}
                onProjectChange={onProjectChange}
                onTaskChange={onTaskChange}
                onActivityChange={onActivityChange}
                onRemarkChange={onRemarkChange}
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
                onToggle={onToggle}
                onProjectChange={onProjectChange}
                onTaskChange={onTaskChange}
                onActivityChange={onActivityChange}
                onRemarkChange={onRemarkChange}
              />
            )
          )
        )}
      </div>

    </div>
  );
}
