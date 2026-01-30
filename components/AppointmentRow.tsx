"use client";

import { format } from "date-fns";
import { de } from "date-fns/locale";

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

interface AppointmentRowProps {
  appointment: Appointment;
  projects: Project[];
  onToggle: (id: string) => void;
  onProjectChange: (id: string, projectId: string) => void;
}

export default function AppointmentRow({
  appointment,
  projects,
  onToggle,
  onProjectChange,
}: AppointmentRowProps) {
  const startDate = new Date(appointment.start.dateTime);
  const endDate = new Date(appointment.end.dateTime);

  const dayLabel = format(startDate, "EE dd.MM.", { locale: de });
  const startTime = format(startDate, "HH:mm");
  const endTime = format(endDate, "HH:mm");

  return (
    <div
      className={`p-4 border-b border-gray-100 ${
        appointment.selected ? "bg-white" : "bg-gray-50 opacity-60"
      }`}
    >
      <div className="flex items-start gap-4">
        <input
          type="checkbox"
          checked={appointment.selected}
          onChange={() => onToggle(appointment.id)}
          className="mt-1 h-5 w-5 text-blue-600 rounded"
        />
        <div className="flex-1">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span className="font-medium">{dayLabel}</span>
            <span>
              {startTime} - {endTime}
            </span>
          </div>
          <div className="font-medium text-gray-900 mt-1">
            {appointment.subject}
          </div>
          {appointment.selected && (
            <div className="mt-2">
              <select
                value={appointment.projectId}
                onChange={(e) =>
                  onProjectChange(appointment.id, e.target.value)
                }
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Projekt wählen --</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
