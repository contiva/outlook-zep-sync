"use client";

import { useState, useMemo } from "react";
import { ChevronDown, ChevronRight, Repeat, ClockArrowUp } from "lucide-react";
import AppointmentRow from "./AppointmentRow";
import SearchableSelect, { SelectOption } from "./SearchableSelect";
import { DuplicateCheckResult } from "@/lib/zep-api";
import { ActualDuration, ActualDurationsMap, normalizeJoinUrl, getDurationKey } from "@/lib/teams-utils";

// Zugeordnete Tätigkeit (zu Projekt oder Vorgang)
interface AssignedActivity {
  name: string;      // Tätigkeit-Kürzel
  standard: boolean; // true wenn Standard-Tätigkeit
}

interface Project {
  id: number;
  name: string;
  description: string;
  activities?: AssignedActivity[]; // Dem Projekt zugeordnete Tätigkeiten
}

interface Task {
  id: number;
  name: string;
  description: string | null;
  project_id: number;
  activities?: AssignedActivity[]; // Dem Vorgang zugeordnete Tätigkeiten (leer = erbt vom Projekt)
}

interface Activity {
  name: string;
  description: string;
}

interface ZepEntry {
  id: number;
  date: string;
  from: string;
  to: string;
  note: string | null;
  employee_id: string;
  project_id: number;
  project_task_id: number;
  activity_id: string;
  billable: boolean;
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
  billable: boolean;
  canChangeBillable: boolean;
  attendees?: Attendee[];
  organizer?: {
    emailAddress: {
      name: string;
      address: string;
    };
  };
  isOrganizer?: boolean;
  seriesMasterId?: string;
  type?: 'calendar' | 'call' | 'singleInstance' | 'occurrence' | 'exception' | 'seriesMaster';
  callType?: 'Phone' | 'Video' | 'ScreenShare';
  direction?: 'incoming' | 'outgoing';
  isOnlineMeeting?: boolean;
  onlineMeetingProvider?: string;
  onlineMeeting?: { joinUrl?: string };
  useActualTime?: boolean; // true = use actual time from call records, false = use planned time
}

interface SeriesGroupProps {
  seriesId: string;
  appointments: Appointment[];
  projects: Project[];
  tasks: Record<number, Task[]>;
  activities: Activity[];
  syncedEntries: ZepEntry[];
  duplicateWarnings?: Map<string, DuplicateCheckResult>;
  loadingTasks?: Set<number>;
  // Actual meeting durations from call records
  actualDurations?: ActualDurationsMap;
  onToggle: (id: string) => void;
  onToggleSeries: (seriesId: string, selected: boolean) => void;
  onProjectChange: (id: string, projectId: number | null) => void;
  onTaskChange: (id: string, taskId: number | null) => void;
  onActivityChange: (id: string, activityId: string) => void;
  onBillableChange: (id: string, billable: boolean) => void;
  // Toggle between planned and actual time for ZEP sync
  onUseActualTimeChange?: (id: string, useActual: boolean) => void;
  onApplyToSeries: (
    seriesId: string,
    projectId: number | null,
    taskId: number | null,
    activityId: string
  ) => void;
  // Single sync
  onSyncSingle?: (appointment: Appointment) => void;
  syncingSingleId?: string | null;
  // Rescheduled appointment time correction
  onCorrectTime?: (appointmentId: string, duplicateWarning: DuplicateCheckResult) => void;
  correctingTimeIds?: Set<string>;
  // Keyboard navigation focus
  focusedAppointmentId?: string | null;
}

// Helper: Check if an appointment is synced to ZEP
function isAppointmentSynced(apt: Appointment, syncedEntries: ZepEntry[]): boolean {
  return findSyncedEntry(apt, syncedEntries) !== null;
}

// Helper: Find the matching synced entry for an appointment
// Matches by subject and date only (not times) because entry could be synced with
// planned time OR actual time
function findSyncedEntry(apt: Appointment, syncedEntries: ZepEntry[]): ZepEntry | null {
  if (!syncedEntries || syncedEntries.length === 0) {
    return null;
  }

  const aptDateStr = new Date(apt.start.dateTime).toISOString().split("T")[0];
  const aptSubject = apt.subject.trim();

  return syncedEntries.find((entry) => {
    const entryDate = entry.date.split("T")[0];
    const entryNote = (entry.note || "").trim();
    return entryNote === aptSubject && entryDate === aptDateStr;
  }) || null;
}

// Helper: Check if an appointment is ready to sync (selected, complete, not yet synced)
function isAppointmentSyncReady(apt: Appointment, syncedEntries: ZepEntry[]): boolean {
  if (!apt.selected) return false;
  if (!apt.projectId || !apt.taskId) return false;
  if (isAppointmentSynced(apt, syncedEntries)) return false;
  return true;
}

// Helper: Get actual duration for an online meeting from call records
function getActualDuration(
  apt: Appointment,
  actualDurations?: ActualDurationsMap
): ActualDuration | undefined {
  if (!actualDurations || !apt.isOnlineMeeting || !apt.onlineMeeting?.joinUrl) {
    return undefined;
  }
  const normalizedUrl = normalizeJoinUrl(apt.onlineMeeting.joinUrl);
  if (!normalizedUrl) return undefined;
  // Use date-specific key for recurring meetings (they share the same joinUrl)
  const aptDate = new Date(apt.start.dateTime).toISOString().split("T")[0];
  const durationKey = getDurationKey(normalizedUrl, aptDate);
  return actualDurations.get(durationKey);
}

export default function SeriesGroup({
  seriesId,
  appointments,
  projects,
  tasks,
  activities,
  syncedEntries,
  duplicateWarnings,
  loadingTasks,
  actualDurations,
  onToggle,
  onToggleSeries,
  onProjectChange,
  onTaskChange,
  onActivityChange,
  onBillableChange,
  onUseActualTimeChange,
  onApplyToSeries,
  onSyncSingle,
  syncingSingleId,
  onCorrectTime,
  correctingTimeIds,
  focusedAppointmentId,
}: SeriesGroupProps) {
  const [expanded, setExpanded] = useState(false);

  // Serien-Level Werte (vom ersten Termin oder gemeinsame Werte)
  const firstAppointment = appointments[0];
  const seriesSubject = firstAppointment.subject;
  const allSelected = appointments.every((a) => a.selected);
  const someSelected = appointments.some((a) => a.selected);
  const selectedCount = appointments.filter((a) => a.selected).length;
  
  // Count how many appointments are already synced
  const syncedCount = appointments.filter((a) => isAppointmentSynced(a, syncedEntries)).length;
  
  // Count how many appointments are ready to sync
  const syncReadyCount = appointments.filter((a) => isAppointmentSyncReady(a, syncedEntries)).length;

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

  // Konvertiere Activities zu SelectOptions - gefiltert nach Projekt/Vorgang
  const activityOptions: SelectOption[] = useMemo(() => {
    // Find the selected task and project
    let selectedTask: Task | undefined;
    if (seriesTaskId && seriesProjectId && tasks[seriesProjectId]) {
      selectedTask = tasks[seriesProjectId].find(t => t.id === seriesTaskId);
    }
    const selectedProject = seriesProjectId
      ? projects.find(p => p.id === seriesProjectId)
      : undefined;

    // Get assigned activities: Task activities take precedence over Project activities
    let assignedActivities: AssignedActivity[] = [];
    if (selectedTask?.activities && selectedTask.activities.length > 0) {
      assignedActivities = selectedTask.activities;
    } else if (selectedProject?.activities && selectedProject.activities.length > 0) {
      assignedActivities = selectedProject.activities;
    }

    // If we have assigned activities, filter the global activities list
    if (assignedActivities.length > 0) {
      const assignedNames = new Set(assignedActivities.map(a => a.name));
      const filteredActivities = activities.filter(a => assignedNames.has(a.name));
      
      return filteredActivities.map((a) => {
        const assigned = assignedActivities.find(aa => aa.name === a.name);
        return {
          value: a.name,
          label: assigned?.standard ? `${a.name} (Standard)` : a.name,
          description: a.description,
        };
      });
    }

    // Fallback: show all global activities
    return activities.map((a) => ({
      value: a.name,
      label: a.name,
      description: a.description,
    }));
  }, [activities, projects, tasks, seriesProjectId, seriesTaskId]);

  const handleSeriesProjectChange = (projectId: number | null) => {
    onApplyToSeries(seriesId, projectId, null, seriesActivityId);
  };

  const handleSeriesTaskChange = (taskId: number | null) => {
    if (!seriesProjectId) return;

    // Find standard activity for the selected task
    let newActivityId = seriesActivityId;
    if (taskId) {
      const projectTasks = tasks[seriesProjectId] || [];
      const selectedTask = projectTasks.find((t) => t.id === taskId);
      const project = projects.find((p) => p.id === seriesProjectId);

      // Check task activities first, then project activities
      const taskActivities = selectedTask?.activities || [];
      const projectActivities = project?.activities || [];
      const relevantActivities = taskActivities.length > 0 ? taskActivities : projectActivities;
      const standardActivity = relevantActivities.find((a) => a.standard);

      if (standardActivity) {
        newActivityId = standardActivity.name;
      }
    }

    onApplyToSeries(seriesId, seriesProjectId, taskId, newActivityId);
  };

  const handleSeriesActivityChange = (activityId: string) => {
    onApplyToSeries(
      seriesId,
      seriesProjectId,
      seriesTaskId,
      activityId
    );
  };

  // Determine series status for left border color
  const seriesStatus = syncedCount === appointments.length
    ? "synced" // All synced - green
    : syncedCount > 0
    ? "partial" // Some synced - yellow
    : syncReadyCount > 0
    ? "ready" // Some ready to sync - amber
    : someSelected
    ? "unsynced" // Some selected but not sync-ready - red
    : "idle"; // Nothing selected - gray

  return (
    <div className={`border-r border-b border-t border-l-4 transition-shadow ${
      seriesStatus === "synced"
        ? "border-l-green-600 border-gray-200 bg-green-50/20"
        : seriesStatus === "partial"
        ? "border-l-yellow-400 border-gray-200 bg-yellow-50/20"
        : seriesStatus === "ready"
        ? "border-l-amber-400 border-gray-200 bg-amber-50/20"
        : seriesStatus === "unsynced"
        ? "border-l-red-400 border-gray-200 bg-red-50/20"
        : "border-l-gray-300 border-gray-200 bg-gray-50/30"
    }`}>
      {/* Series Header */}
      <div className="px-3 py-2">
        <div className="flex items-start gap-3">
          {/* Expand/Collapse Button */}
          <button
            onClick={() => setExpanded(!expanded)}
            className="mt-0.5 p-0.5 hover:bg-gray-100 rounded transition"
            aria-expanded={expanded}
            aria-label={expanded ? "Terminserie einklappen" : "Terminserie ausklappen"}
          >
            {expanded ? (
              <ChevronDown size={16} className="text-gray-500" aria-hidden="true" />
            ) : (
              <ChevronRight size={16} className="text-gray-500" aria-hidden="true" />
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
            className="mt-0.5 h-4 w-4 accent-sky-300 rounded"
            aria-label={`Alle ${appointments.length} Termine der Serie "${seriesSubject}" auswählen`}
          />

          <div className="flex-1">
            <div className="flex items-center gap-2">
              <Repeat size={16} className="text-blue-600" />
              {firstAppointment.isOnlineMeeting && firstAppointment.onlineMeetingProvider === "teamsForBusiness" && (
                <svg
                  className="w-4 h-4 flex-shrink-0"
                  viewBox="0 0 2228.833 2073.333"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-label="Teams Meeting"
                >
                  <path
                    fill="#5059C9"
                    d="M1554.637 777.5h575.713c54.391 0 98.483 44.092 98.483 98.483v524.398c0 199.901-162.051 361.952-361.952 361.952h-1.711c-199.901.028-361.975-162.023-362.004-361.924V828.971c.001-28.427 23.045-51.471 51.471-51.471z"
                  />
                  <circle fill="#5059C9" cx="1943.75" cy="440.583" r="233.25" />
                  <circle fill="#7B83EB" cx="1218.083" cy="336.917" r="336.917" />
                  <path
                    fill="#7B83EB"
                    d="M1667.323 777.5H717.01c-53.743 1.33-96.257 45.931-95.01 99.676v598.105c-7.505 322.519 247.657 590.16 570.167 598.053 322.51-7.893 577.671-275.534 570.167-598.053V877.176c1.245-53.745-41.268-98.346-95.011-99.676z"
                  />
                  <path
                    opacity=".1"
                    d="M1244 777.5v838.145c-.258 38.435-23.549 72.964-59.09 87.598a91.856 91.856 0 01-35.765 7.257H667.613c-6.738-17.105-12.958-34.21-18.142-51.833a631.287 631.287 0 01-27.472-183.49V877.02c-1.246-53.659 41.198-98.19 94.857-99.52H1244z"
                  />
                  <path
                    opacity=".2"
                    d="M1192.167 777.5v889.978a91.802 91.802 0 01-7.257 35.765c-14.634 35.541-49.163 58.832-87.598 59.09H691.975a721.63 721.63 0 01-24.362-51.833 631.282 631.282 0 01-27.472-183.49V877.02c-1.246-53.659 41.198-98.19 94.857-99.52h457.169z"
                  />
                  <path
                    opacity=".2"
                    d="M1192.167 777.5v786.312c-.395 52.223-42.632 94.46-94.855 94.855h-447.84A631.282 631.282 0 01622 1475.177V877.02c-1.246-53.659 41.198-98.19 94.857-99.52h475.31z"
                  />
                  <path
                    opacity=".2"
                    d="M1140.333 777.5v786.312c-.395 52.223-42.632 94.46-94.855 94.855H649.472A631.282 631.282 0 01622 1475.177V877.02c-1.246-53.659 41.198-98.19 94.857-99.52h423.476z"
                  />
                  <path
                    opacity=".1"
                    d="M1244 509.522v163.275c-8.812.518-17.105 1.037-25.917 1.037-8.812 0-17.105-.518-25.917-1.037a284.472 284.472 0 01-51.833-8.293c-104.963-24.857-191.679-98.469-233.25-198.003a288.02 288.02 0 01-16.587-51.833h258.648c52.305.198 94.657 42.549 94.856 94.854z"
                  />
                  <path
                    opacity=".2"
                    d="M1192.167 561.355v111.442a284.472 284.472 0 01-51.833-8.293c-104.963-24.857-191.679-98.469-233.25-198.003h190.228c52.304.198 94.656 42.55 94.855 94.854z"
                  />
                  <path
                    opacity=".2"
                    d="M1192.167 561.355v111.442a284.472 284.472 0 01-51.833-8.293c-104.963-24.857-191.679-98.469-233.25-198.003h190.228c52.304.198 94.656 42.55 94.855 94.854z"
                  />
                  <path
                    opacity=".2"
                    d="M1140.333 561.355v103.148c-104.963-24.857-191.679-98.469-233.25-198.003h138.395c52.305.199 94.656 42.551 94.855 94.855z"
                  />
                  <linearGradient
                    id="teams-gradient-series"
                    gradientUnits="userSpaceOnUse"
                    x1="198.099"
                    y1="1683.0726"
                    x2="942.2344"
                    y2="394.2607"
                    gradientTransform="matrix(1 0 0 -1 0 2075.3333)"
                  >
                    <stop offset="0" stopColor="#5a62c3" />
                    <stop offset=".5" stopColor="#4d55bd" />
                    <stop offset="1" stopColor="#3940ab" />
                  </linearGradient>
                  <path
                    fill="url(#teams-gradient-series)"
                    d="M95.01 466.5h950.312c52.473 0 95.01 42.538 95.01 95.01v950.312c0 52.473-42.538 95.01-95.01 95.01H95.01c-52.473 0-95.01-42.538-95.01-95.01V561.51c0-52.472 42.538-95.01 95.01-95.01z"
                  />
                  <path
                    fill="#FFF"
                    d="M820.211 828.193H630.241v517.297H509.211V828.193H320.123V727.844h500.088v100.349z"
                  />
                </svg>
              )}
              <span className="font-medium text-gray-900 truncate">{seriesSubject}</span>
              <span className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded shrink-0">
                {appointments.length}x
              </span>
              <span className="text-xs text-gray-400 shrink-0">
                {hours}h {minutes > 0 ? `${minutes}m` : ""}
              </span>
              {firstAppointment.organizer && (
                <span className="text-xs text-gray-400 truncate" title={firstAppointment.organizer.emailAddress.address}>
                  • {firstAppointment.isOrganizer ? "Du" : (firstAppointment.organizer.emailAddress.name || firstAppointment.organizer.emailAddress.address.split("@")[0])}
                </span>
              )}
              {/* Sync Status - compact */}
              {syncedCount > 0 && (
                <span
                  className={`text-xs px-1.5 py-0.5 rounded shrink-0 ${
                    syncedCount === appointments.length
                      ? "bg-green-50 text-green-700"
                      : "bg-yellow-50 text-yellow-700"
                  }`}
                  title={`${syncedCount} von ${appointments.length} synchronisiert`}
                >
                  {syncedCount}/{appointments.length} Synced
                </span>
              )}
              {syncReadyCount > 0 && (
                <span
                  className="flex items-center gap-1 text-xs text-amber-600 shrink-0"
                  title={`${syncReadyCount} bereit zum Sync`}
                >
                  <ClockArrowUp className="h-3.5 w-3.5" />
                  {syncReadyCount}
                </span>
              )}
            </div>

            {/* Serien-Bearbeitung - Änderungen gelten für alle Termine */}
            <div className="mt-2 flex items-center gap-2 flex-wrap">
              <SearchableSelect
                options={projectOptions}
                value={seriesProjectId}
                onChange={(val) =>
                  handleSeriesProjectChange(val !== null ? Number(val) : null)
                }
                placeholder={allSameProject ? "Projekt" : "Verschiedene"}
                className="w-48 sm:w-56"
              />
              <SearchableSelect
                options={taskOptions}
                value={seriesTaskId}
                onChange={(val) =>
                  handleSeriesTaskChange(val !== null ? Number(val) : null)
                }
                placeholder={
                  !seriesProjectId
                    ? "Erst Projekt"
                    : loadingTasks?.has(seriesProjectId)
                    ? "Laden..."
                    : allSameTask
                    ? "Task"
                    : "Verschiedene"
                }
                disabled={!seriesProjectId}
                loading={seriesProjectId ? loadingTasks?.has(seriesProjectId) : false}
                className="w-48 sm:w-56"
              />
              <SearchableSelect
                options={activityOptions}
                value={seriesActivityId}
                onChange={(val) =>
                  handleSeriesActivityChange(String(val ?? "be"))
                }
                placeholder={allSameActivity ? "Tätigkeit" : "Verschiedene"}
                className="w-36"
              />
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
              allTasks={tasks}
              activities={activities}
              isSynced={isAppointmentSynced(appointment, syncedEntries)}
              isSyncReady={isAppointmentSyncReady(appointment, syncedEntries)}
              syncedEntry={findSyncedEntry(appointment, syncedEntries)}
              duplicateWarning={duplicateWarnings?.get(appointment.id)}
              loadingTasks={appointment.projectId ? loadingTasks?.has(appointment.projectId) : false}
              // Actual meeting duration from call records
              actualDuration={getActualDuration(appointment, actualDurations)}
              onToggle={onToggle}
              onProjectChange={onProjectChange}
              onTaskChange={onTaskChange}
              onActivityChange={onActivityChange}
              onBillableChange={onBillableChange}
              onUseActualTimeChange={onUseActualTimeChange}
              // Single sync
              onSyncSingle={onSyncSingle}
              isSyncingSingle={syncingSingleId === appointment.id}
              // Rescheduled time correction
              onCorrectTime={onCorrectTime}
              isCorrectingTime={correctingTimeIds?.has(appointment.id) || false}
              // Keyboard navigation focus
              isFocused={focusedAppointmentId === appointment.id}
            />
          ))}
        </div>
      )}

      {/* Collapsed: Kompakte Übersicht */}
      {!expanded && (
        <div className="px-3 py-1.5 text-xs text-gray-400 border-t border-gray-100">
          {selectedCount}/{appointments.length} ausgewählt
          {allSameProject && seriesProjectId && (
            <span className="ml-2 text-gray-500">
              • {projects.find((p) => p.id === seriesProjectId)?.name}
            </span>
          )}
          {allSameTask && seriesTaskId && (
            <span className="text-gray-500">
              {" / "}{tasks[seriesProjectId!]?.find((t) => t.id === seriesTaskId)?.name}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
