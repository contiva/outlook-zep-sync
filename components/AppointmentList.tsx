"use client";

import AppointmentRow from "./AppointmentRow";

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
}

interface AppointmentListProps {
  appointments: Appointment[];
  projects: Project[];
  tasks: Record<number, Task[]>;
  activities: Activity[];
  onToggle: (id: string) => void;
  onProjectChange: (id: string, projectId: number | null) => void;
  onTaskChange: (id: string, taskId: number | null) => void;
  onActivityChange: (id: string, activityId: string) => void;
  onSubmit: () => void;
  submitting: boolean;
}

export default function AppointmentList({
  appointments,
  projects,
  tasks,
  activities,
  onToggle,
  onProjectChange,
  onTaskChange,
  onActivityChange,
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

  // Alle ausgewählten Termine müssen Projekt, Task und Activity haben
  const allComplete = selectedAppointments.every(
    (a) => a.projectId && a.taskId && a.activityId
  );

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
              tasks={appointment.projectId ? tasks[appointment.projectId] || [] : []}
              activities={activities}
              onToggle={onToggle}
              onProjectChange={onProjectChange}
              onTaskChange={onTaskChange}
              onActivityChange={onActivityChange}
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
