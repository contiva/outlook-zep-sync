"use client";

import { useState, useMemo } from "react";
import { ChevronDown, ChevronRight, Repeat, Link2, Unlink2 } from "lucide-react";
import AppointmentRow from "./AppointmentRow";
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
  remark: string;
  attendees?: Attendee[];
  isOrganizer?: boolean;
  seriesMasterId?: string;
  type?: string;
}

interface SeriesGroupProps {
  seriesId: string;
  appointments: Appointment[];
  projects: Project[];
  tasks: Record<number, Task[]>;
  activities: Activity[];
  onToggle: (id: string) => void;
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
}

export default function SeriesGroup({
  seriesId,
  appointments,
  projects,
  tasks,
  activities,
  onToggle,
  onToggleSeries,
  onProjectChange,
  onTaskChange,
  onActivityChange,
  onRemarkChange,
  onApplyToSeries,
}: SeriesGroupProps) {
  const [expanded, setExpanded] = useState(false);
  const [linkedEdit, setLinkedEdit] = useState(true);

  // Serien-Level Werte (vom ersten Termin oder gemeinsame Werte)
  const firstAppointment = appointments[0];
  const seriesSubject = firstAppointment.subject;
  const allSelected = appointments.every((a) => a.selected);
  const someSelected = appointments.some((a) => a.selected);
  const selectedCount = appointments.filter((a) => a.selected).length;

  // Berechne Gesamtdauer
  const totalMinutes = appointments.reduce((acc, apt) => {
    const start = new Date(apt.start.dateTime);
    const end = new Date(apt.end.dateTime);
    return acc + (end.getTime() - start.getTime()) / 1000 / 60;
  }, 0);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = Math.round(totalMinutes % 60);

  // Prüfe ob alle die gleichen Werte haben
  const allSameProject = appointments.every(
    (a) => a.projectId === firstAppointment.projectId
  );
  const allSameTask = appointments.every(
    (a) => a.taskId === firstAppointment.taskId
  );
  const allSameActivity = appointments.every(
    (a) => a.activityId === firstAppointment.activityId
  );

  const seriesProjectId = allSameProject ? firstAppointment.projectId : null;
  const seriesTaskId = allSameTask ? firstAppointment.taskId : null;
  const seriesActivityId = allSameActivity ? firstAppointment.activityId : "be";

  // Konvertiere zu SelectOptions
  const projectOptions: SelectOption[] = useMemo(
    () =>
      projects.map((p) => ({
        value: p.id,
        label: p.name,
        description: p.description || null,
      })),
    [projects]
  );

  const taskOptions: SelectOption[] = useMemo(() => {
    if (!seriesProjectId || !tasks[seriesProjectId]) return [];
    return tasks[seriesProjectId].map((t) => ({
      value: t.id,
      label: t.name,
      description: t.description,
    }));
  }, [seriesProjectId, tasks]);

  const activityOptions: SelectOption[] = useMemo(
    () =>
      activities.map((a) => ({
        value: a.name,
        label: a.name,
        description: a.description,
      })),
    [activities]
  );

  const handleSeriesProjectChange = (projectId: number | null) => {
    if (linkedEdit) {
      // Bestimme die Tätigkeit basierend auf dem Projektnamen
      let activityId = "be"; // Standard: Beratung
      if (projectId) {
        const project = projects.find((p) => p.id === projectId);
        if (project) {
          const nameAndDesc = `${project.name} ${project.description || ""}`.toLowerCase();
          if (nameAndDesc.includes("intern")) {
            activityId = "vw"; // Verwaltung für interne Projekte
          }
        }
      }
      onApplyToSeries(seriesId, projectId, null, activityId);
    }
  };

  const handleSeriesTaskChange = (taskId: number | null) => {
    if (linkedEdit && seriesProjectId) {
      onApplyToSeries(seriesId, seriesProjectId, taskId, seriesActivityId);
    }
  };

  const handleSeriesActivityChange = (activityId: string) => {
    if (linkedEdit) {
      onApplyToSeries(
        seriesId,
        seriesProjectId,
        seriesTaskId,
        activityId
      );
    }
  };

  return (
    <div className="border border-blue-200 rounded-lg bg-blue-50/30">
      {/* Series Header */}
      <div className="p-4 bg-gradient-to-r from-blue-50 to-white border-b border-blue-100">
        <div className="flex items-start gap-3">
          {/* Expand/Collapse Button */}
          <button
            onClick={() => setExpanded(!expanded)}
            className="mt-0.5 p-1 hover:bg-blue-100 rounded transition"
          >
            {expanded ? (
              <ChevronDown size={18} className="text-blue-600" />
            ) : (
              <ChevronRight size={18} className="text-blue-600" />
            )}
          </button>

          {/* Checkbox für alle */}
          <input
            type="checkbox"
            checked={allSelected}
            ref={(el) => {
              if (el) el.indeterminate = someSelected && !allSelected;
            }}
            onChange={() => onToggleSeries(seriesId, !allSelected)}
            className="mt-1 h-5 w-5 text-blue-600 rounded"
          />

          <div className="flex-1">
            <div className="flex items-center gap-2">
              <Repeat size={16} className="text-blue-600" />
              <span className="font-medium text-gray-900">{seriesSubject}</span>
              <span className="text-sm text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">
                {appointments.length}x Serie
              </span>
              <span className="text-sm text-gray-500">
                ({hours}h {minutes}min gesamt)
              </span>
            </div>

            {/* Gebündelte Bearbeitung */}
            <div className="mt-3 flex items-center gap-4">
              <button
                onClick={() => setLinkedEdit(!linkedEdit)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                  linkedEdit
                    ? "bg-blue-600 text-white"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                {linkedEdit ? <Link2 size={14} /> : <Unlink2 size={14} />}
                {linkedEdit ? "Gebündelt" : "Einzeln"}
              </button>

              {linkedEdit && (
                <div className="flex flex-wrap gap-3">
                  {/* Projekt für Serie */}
                  <div className="flex flex-col">
                    <label className="text-xs text-gray-500 mb-1">
                      Projekt (alle)
                    </label>
                    <SearchableSelect
                      options={projectOptions}
                      value={seriesProjectId}
                      onChange={(val) =>
                        handleSeriesProjectChange(val !== null ? Number(val) : null)
                      }
                      placeholder={allSameProject ? "-- Projekt wählen --" : "-- Verschiedene --"}
                      className="w-80"
                    />
                  </div>

                  {/* Task für Serie */}
                  <div className="flex flex-col">
                    <label className="text-xs text-gray-500 mb-1">
                      Task (alle)
                    </label>
                    <SearchableSelect
                      options={taskOptions}
                      value={seriesTaskId}
                      onChange={(val) =>
                        handleSeriesTaskChange(val !== null ? Number(val) : null)
                      }
                      placeholder={
                        !seriesProjectId
                          ? "Erst Projekt wählen"
                          : allSameTask
                          ? "-- Task wählen --"
                          : "-- Verschiedene --"
                      }
                      disabled={!seriesProjectId}
                      className="w-80"
                    />
                  </div>

                  {/* Activity für Serie */}
                  <div className="flex flex-col">
                    <label className="text-xs text-gray-500 mb-1">
                      Tätigkeit (alle)
                    </label>
                    <SearchableSelect
                      options={activityOptions}
                      value={seriesActivityId}
                      onChange={(val) =>
                        handleSeriesActivityChange(String(val ?? "be"))
                      }
                      placeholder={allSameActivity ? "-- Tätigkeit --" : "-- Verschiedene --"}
                      className="w-56"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Expanded: Einzelne Termine */}
      {expanded && (
        <div className="divide-y divide-gray-100">
          {appointments.map((appointment) => (
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
              onRemarkChange={onRemarkChange}
            />
          ))}
        </div>
      )}

      {/* Collapsed: Kompakte Übersicht */}
      {!expanded && (
        <div className="px-4 py-2 text-sm text-gray-500 bg-white/50">
          {selectedCount} von {appointments.length} ausgewählt
          {allSameProject && seriesProjectId && (
            <span className="ml-2">
              • {projects.find((p) => p.id === seriesProjectId)?.name}
            </span>
          )}
          {allSameTask && seriesTaskId && (
            <span className="ml-1">
              / {tasks[seriesProjectId!]?.find((t) => t.id === seriesTaskId)?.name}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
