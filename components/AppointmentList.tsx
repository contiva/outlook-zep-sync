"use client";

import AppointmentRow from "./AppointmentRow";

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

interface AppointmentListProps {
  appointments: Appointment[];
  projects: Project[];
  onToggle: (id: string) => void;
  onProjectChange: (id: string, projectId: string) => void;
  onSubmit: () => void;
  submitting: boolean;
}

export default function AppointmentList({
  appointments,
  projects,
  onToggle,
  onProjectChange,
  onSubmit,
  submitting,
}: AppointmentListProps) {
  const selectedAppointments = appointments.filter((a) => a.selected);

  const totalMinutes = selectedAppointments.reduce((acc, apt) => {
    const start = new Date(apt.start.dateTime);
    const end = new Date(apt.end.dateTime);
    return acc + (end.getTime() - start.getTime()) / 1000 / 60;
  }, 0);

  const hours = Math.floor(totalMinutes / 60);
  const minutes = Math.round(totalMinutes % 60);

  const allHaveProject = selectedAppointments.every((a) => a.projectId);

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="divide-y divide-gray-100">
        {appointments.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            Keine Termine gefunden. Wähle einen Zeitraum und klicke auf "Termine laden".
          </div>
        ) : (
          appointments.map((appointment) => (
            <AppointmentRow
              key={appointment.id}
              appointment={appointment}
              projects={projects}
              onToggle={onToggle}
              onProjectChange={onProjectChange}
            />
          ))
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
                !allHaveProject
              }
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
            >
              {submitting ? "Wird übertragen..." : "An ZEP übertragen"}
            </button>
          </div>
          {selectedAppointments.length > 0 && !allHaveProject && (
            <p className="text-sm text-amber-600 mt-2">
              Bitte allen ausgewählten Terminen ein Projekt zuweisen.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
