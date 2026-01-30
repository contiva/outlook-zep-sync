"use client";

import { useMemo } from "react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { Users, CheckCircle } from "lucide-react";
import SearchableSelect, { SelectOption } from "./SearchableSelect";

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

interface AppointmentRowProps {
  appointment: Appointment;
  projects: Project[];
  tasks: Task[];
  activities: Activity[];
  isSynced?: boolean;
  onToggle: (id: string) => void;
  onProjectChange: (id: string, projectId: number | null) => void;
  onTaskChange: (id: string, taskId: number | null) => void;
  onActivityChange: (id: string, activityId: string) => void;
}

function getStatusColor(response: string): string {
  switch (response) {
    case "accepted":
      return "text-green-600";
    case "tentativelyAccepted":
      return "text-yellow-600";
    case "declined":
      return "text-red-600";
    case "organizer":
      return "text-blue-600";
    default:
      return "text-gray-400";
  }
}

function getStatusIcon(response: string): string {
  switch (response) {
    case "accepted":
      return "✓";
    case "tentativelyAccepted":
      return "?";
    case "declined":
      return "✗";
    case "organizer":
      return "★";
    default:
      return "○";
  }
}

export default function AppointmentRow({
  appointment,
  projects,
  tasks,
  activities,
  isSynced = false,
  onToggle,
  onProjectChange,
  onTaskChange,
  onActivityChange,
}: AppointmentRowProps) {
  const startDate = new Date(appointment.start.dateTime);
  const endDate = new Date(appointment.end.dateTime);

  const dayLabel = format(startDate, "EE dd.MM.", { locale: de });
  const startTime = format(startDate, "HH:mm");
  const endTime = format(endDate, "HH:mm");

  const durationMinutes = (endDate.getTime() - startDate.getTime()) / 1000 / 60;
  const durationHours = Math.floor(durationMinutes / 60);
  const durationMins = Math.round(durationMinutes % 60);

  const attendees = appointment.attendees || [];
  const attendeeCount = attendees.length;

  // Konvertiere Projekte zu SelectOptions
  const projectOptions: SelectOption[] = useMemo(
    () =>
      projects.map((p) => ({
        value: p.id,
        label: p.name,
        description: p.description || null,
      })),
    [projects]
  );

  // Konvertiere Tasks zu SelectOptions
  const taskOptions: SelectOption[] = useMemo(
    () =>
      tasks.map((t) => ({
        value: t.id,
        label: t.name,
        description: t.description,
      })),
    [tasks]
  );

  // Konvertiere Activities zu SelectOptions
  const activityOptions: SelectOption[] = useMemo(
    () =>
      activities.map((a) => ({
        value: a.name,
        label: a.name,
        description: a.description,
      })),
    [activities]
  );

  return (
    <div
      className={`p-4 border-b border-gray-100 ${
        appointment.selected ? "bg-white" : "bg-gray-50 opacity-60"
      }`}
    >
      <div className="flex items-start gap-4">
        {isSynced ? (
          <div className="mt-1 h-5 w-5 flex items-center justify-center" title="Bereits in ZEP synchronisiert">
            <CheckCircle className="h-5 w-5 text-green-600" />
          </div>
        ) : (
          <input
            type="checkbox"
            checked={appointment.selected}
            onChange={() => onToggle(appointment.id)}
            className="mt-1 h-5 w-5 text-blue-600 rounded"
          />
        )}
        <div className="flex-1">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span className="font-medium">{dayLabel}</span>
            <span>
              {startTime} - {endTime}
            </span>
            <span className="text-gray-400">
              ({durationHours}h {durationMins}min)
            </span>
            {isSynced && (
              <span className="text-green-600 text-xs font-medium">
                In ZEP
              </span>
            )}
          </div>
          <div className="font-medium text-gray-900 mt-1">
            {appointment.subject}
          </div>

          {/* Teilnehmer anzeigen */}
          {attendeeCount > 0 && (
            <div className="mt-2">
              <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                <Users size={12} />
                <span>{attendeeCount} Teilnehmer</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {attendees.map((attendee, index) => (
                  <span
                    key={index}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-gray-100 ${getStatusColor(
                      attendee.status.response
                    )}`}
                    title={`${attendee.emailAddress.address} - ${attendee.status.response}`}
                  >
                    <span>{getStatusIcon(attendee.status.response)}</span>
                    <span className="text-gray-700">
                      {attendee.emailAddress.name || attendee.emailAddress.address.split("@")[0]}
                    </span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {appointment.selected && !isSynced && (
            <div className="mt-3 flex flex-wrap gap-3">
              {/* Projekt-Dropdown */}
              <div className="flex flex-col">
                <label className="text-xs text-gray-500 mb-1">Projekt</label>
                <SearchableSelect
                  options={projectOptions}
                  value={appointment.projectId}
                  onChange={(val) =>
                    onProjectChange(
                      appointment.id,
                      val !== null ? Number(val) : null
                    )
                  }
                  placeholder="-- Projekt wählen --"
                  className="w-96"
                />
              </div>

              {/* Task-Dropdown */}
              <div className="flex flex-col">
                <label className="text-xs text-gray-500 mb-1">Task</label>
                <SearchableSelect
                  options={taskOptions}
                  value={appointment.taskId}
                  onChange={(val) =>
                    onTaskChange(
                      appointment.id,
                      val !== null ? Number(val) : null
                    )
                  }
                  placeholder="-- Task wählen --"
                  disabled={!appointment.projectId || tasks.length === 0}
                  disabledMessage={
                    !appointment.projectId
                      ? "Erst Projekt wählen"
                      : "Keine Tasks vorhanden"
                  }
                  className="w-96"
                />
              </div>

              {/* Activity-Dropdown */}
              <div className="flex flex-col">
                <label className="text-xs text-gray-500 mb-1">Tätigkeit</label>
                <SearchableSelect
                  options={activityOptions}
                  value={appointment.activityId}
                  onChange={(val) =>
                    onActivityChange(appointment.id, String(val ?? "be"))
                  }
                  placeholder="-- Tätigkeit wählen --"
                  className="w-56"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
