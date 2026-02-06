"use client";

import { useState, useMemo } from "react";
import { format } from "date-fns";
import { ChevronDown, ChevronRight, Repeat, ClockArrowUp, Check, Minus, Banknote, Loader2 } from "lucide-react";
import AppointmentRow from "./AppointmentRow";
import SearchableSelect, { SelectOption } from "./SearchableSelect";
import { DuplicateCheckResult } from "@/lib/zep-api";
import { ActualDuration, ActualDurationsMap, normalizeJoinUrl, getDurationKey } from "@/lib/teams-utils";
import { RedisSyncMapping } from "@/lib/redis";

// Zugeordnete Tätigkeit (zu Projekt oder Vorgang)
interface AssignedActivity {
  name: string;      // Tätigkeit-Kürzel
  standard: boolean; // true wenn Standard-Tätigkeit
}

interface WorkLocation {
  kurzform: string;
  bezeichnung: string;
  heimarbeitsort: boolean;
}

interface Project {
  id: number;
  name: string;
  description: string;
  activities?: AssignedActivity[]; // Dem Projekt zugeordnete Tätigkeiten
  workLocations?: string[];
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
  customRemark?: string; // Optional: alternative remark for ZEP (overrides subject)
  workLocation?: string;
}

interface SeriesGroupProps {
  seriesId: string;
  appointments: Appointment[];
  projects: Project[];
  tasks: Record<number, Task[]>;
  activities: Activity[];
  syncedEntries: ZepEntry[];
  syncMappings?: Map<string, RedisSyncMapping>;
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
  onCustomRemarkChange?: (id: string, customRemark: string) => void;
  // Toggle between planned and actual time for ZEP sync
  onUseActualTimeChange?: (id: string, useActual: boolean) => void;
  onApplyToSeries: (
    seriesId: string,
    projectId: number | null,
    taskId: number | null,
    activityId: string,
    billable?: boolean
  ) => void;
  // Series sync - sync all sync-ready appointments in the series
  onSyncSeries?: (seriesId: string, appointments: Appointment[]) => void;
  syncingSeriesId?: string | null;
  // Single sync
  onSyncSingle?: (appointment: Appointment) => void;
  syncingSingleId?: string | null;
  // Rescheduled appointment time correction
  onCorrectTime?: (appointmentId: string, duplicateWarning: DuplicateCheckResult) => void;
  correctingTimeIds?: Set<string>;
  // Conflict link popover
  onLinkToZep?: (appointmentId: string, zepEntryId: number) => void;
  linkedZepIds?: Set<number>;
  // Keyboard navigation focus
  focusedAppointmentId?: string | null;
  globalWorkLocations?: WorkLocation[];
  onWorkLocationChange?: (id: string, workLocation: string | undefined) => void;
}

// Helper: Check if an appointment is synced to ZEP
function isAppointmentSynced(apt: Appointment, syncedEntries: ZepEntry[], syncMappings?: Map<string, RedisSyncMapping>): boolean {
  return findSyncedEntry(apt, syncedEntries, syncMappings) !== null;
}

// Helper: Find the matching synced entry for an appointment
// Priority 1: Redis mapping (outlookEventId -> zepAttendanceId) - most reliable
// Priority 2: Subject/customRemark match on same date - fallback for pre-Redis entries
function findSyncedEntry(apt: Appointment, syncedEntries: ZepEntry[], syncMappings?: Map<string, RedisSyncMapping>): ZepEntry | null {
  if (!syncedEntries || syncedEntries.length === 0) {
    return null;
  }

  // Priority 1: Redis mapping lookup
  const redisMapping = syncMappings?.get(apt.id);
  if (redisMapping) {
    const entry = syncedEntries.find((e) => e.id === redisMapping.zepAttendanceId);
    if (entry) return entry;
  }

  // Priority 2: Subject/customRemark match on same date
  const aptDateStr = new Date(apt.start.dateTime).toISOString().split("T")[0];
  const aptSubject = (apt.subject || "").trim();
  const aptCustomRemark = (apt.customRemark || "").trim();

  return syncedEntries.find((entry) => {
    const entryDate = entry.date.split("T")[0];
    if (entryDate !== aptDateStr) return false;

    const entryNote = (entry.note || "").trim();
    return entryNote === aptSubject || (aptCustomRemark && entryNote === aptCustomRemark);
  }) || null;
}

// Helper: Check if an appointment is ready to sync (selected, complete, not yet synced)
function isAppointmentSyncReady(apt: Appointment, syncedEntries: ZepEntry[], syncMappings?: Map<string, RedisSyncMapping>): boolean {
  if (!apt.selected) return false;
  if (!apt.projectId || !apt.taskId) return false;
  if (isAppointmentSynced(apt, syncedEntries, syncMappings)) return false;
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
  syncMappings,
  duplicateWarnings,
  loadingTasks,
  actualDurations,
  onToggle,
  onToggleSeries,
  onProjectChange,
  onTaskChange,
  onActivityChange,
  onBillableChange,
  onCustomRemarkChange,
  onUseActualTimeChange,
  onApplyToSeries,
  onSyncSeries,
  syncingSeriesId,
  onSyncSingle,
  syncingSingleId,
  onCorrectTime,
  correctingTimeIds,
  onLinkToZep,
  linkedZepIds,
  focusedAppointmentId,
  globalWorkLocations,
  onWorkLocationChange,
}: SeriesGroupProps) {
  const [expanded, setExpanded] = useState(false);

  // Serien-Level Werte (vom ersten Termin oder gemeinsame Werte)
  const firstAppointment = appointments[0];
  const seriesSubject = firstAppointment.subject;
  const allSelected = appointments.every((a) => a.selected);
  const someSelected = appointments.some((a) => a.selected);
  const selectedCount = appointments.filter((a) => a.selected).length;
  
  // Count how many appointments are already synced
  const syncedCount = appointments.filter((a) => isAppointmentSynced(a, syncedEntries, syncMappings)).length;
  
  // Count how many appointments are ready to sync
  const syncReadyCount = appointments.filter((a) => isAppointmentSyncReady(a, syncedEntries, syncMappings)).length;

  // Berechne Gesamtdauer
  const totalMinutes = appointments.reduce((acc, apt) => {
    const start = new Date(apt.start.dateTime);
    const end = new Date(apt.end.dateTime);
    return acc + (end.getTime() - start.getTime()) / 1000 / 60;
  }, 0);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = Math.round(totalMinutes % 60);

  // Zeit des ersten Termins
  const firstStart = new Date(firstAppointment.start.dateTime);
  const firstEnd = new Date(firstAppointment.end.dateTime);
  const timeRange = `${format(firstStart, "HH:mm")}–${format(firstEnd, "HH:mm")}`;

  // Dauer pro Termin (vom ersten Termin, da alle gleich lang sein sollten)
  const perAppointmentMinutes = (firstEnd.getTime() - firstStart.getTime()) / 1000 / 60;
  const perAppointmentHours = Math.floor(perAppointmentMinutes / 60);
  const perAppointmentMins = Math.round(perAppointmentMinutes % 60);
  const perAppointmentDuration = perAppointmentHours > 0
    ? (perAppointmentMins > 0 ? `${perAppointmentHours}h ${perAppointmentMins}m` : `${perAppointmentHours}h`)
    : `${perAppointmentMins}m`;

  // Turnus berechnen (basierend auf durchschnittlichem Abstand zwischen Terminen)
  const recurrenceLabel = useMemo(() => {
    if (appointments.length < 2) return null;

    // Sortiere nach Datum
    const sorted = [...appointments].sort(
      (a, b) => new Date(a.start.dateTime).getTime() - new Date(b.start.dateTime).getTime()
    );

    // Berechne durchschnittlichen Abstand in Tagen
    let totalDays = 0;
    for (let i = 1; i < sorted.length; i++) {
      const prev = new Date(sorted[i - 1].start.dateTime);
      const curr = new Date(sorted[i].start.dateTime);
      totalDays += (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);
    }
    const avgDays = totalDays / (sorted.length - 1);

    // Bestimme Turnus basierend auf durchschnittlichem Abstand
    if (avgDays <= 1.5) return "täglich";
    if (avgDays <= 8) return "wöchentlich";
    if (avgDays <= 16) return "2-wöchentlich";
    if (avgDays <= 35) return "monatlich";
    return null;
  }, [appointments]);

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
  const allSameBillable = appointments.every(
    (a) => a.billable === firstAppointment.billable
  );
  const allCanChangeBillable = appointments.every((a) => a.canChangeBillable);

  const seriesProjectId = allSameProject ? firstAppointment.projectId : null;
  const seriesTaskId = allSameTask ? firstAppointment.taskId : null;
  const seriesActivityId = allSameActivity ? firstAppointment.activityId : "be";
  const seriesBillable = allSameBillable ? firstAppointment.billable : true;
  const seriesCanChangeBillable = allCanChangeBillable && allSameBillable;

  // Get sync-ready appointments for series sync
  const syncReadyAppointments = appointments.filter((a) => isAppointmentSyncReady(a, syncedEntries, syncMappings));
  const isSyncingThisSeries = syncingSeriesId === seriesId;

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

  const handleSeriesBillableChange = () => {
    if (!seriesTaskId || !seriesCanChangeBillable) return;
    onApplyToSeries(
      seriesId,
      seriesProjectId,
      seriesTaskId,
      seriesActivityId,
      !seriesBillable
    );
  };

  const handleSyncSeries = () => {
    if (!onSyncSeries || syncReadyAppointments.length === 0) return;
    onSyncSeries(seriesId, syncReadyAppointments);
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
          <button
            type="button"
            onClick={() => onToggleSeries(seriesId, !allSelected)}
            className={`mt-0.5 h-4 w-4 rounded border flex items-center justify-center transition-colors ${
              allSelected
                ? "bg-blue-50 border-blue-300 text-blue-500"
                : someSelected
                ? "bg-blue-50 border-blue-300 text-blue-400"
                : "border-gray-300 bg-white hover:bg-gray-50"
            }`}
            aria-label={`Alle ${appointments.length} Termine der Serie "${seriesSubject}" auswählen`}
            aria-pressed={allSelected}
          >
            {allSelected && <Check size={12} strokeWidth={2.5} />}
            {someSelected && !allSelected && <Minus size={12} strokeWidth={2.5} />}
          </button>

          <div className="flex-1 min-w-0">
            {/* Title row */}
            <div className="flex items-center gap-1.5 min-h-5">
              <Repeat size={14} className="text-blue-600 shrink-0" />
              <span className="font-medium text-gray-900 truncate">{seriesSubject}</span>
              {/* Organizer - inline after title */}
              {firstAppointment.organizer && (
                <span
                  className="text-xs font-light text-gray-500 shrink-0"
                  title={firstAppointment.organizer.emailAddress.address}
                >
                  {firstAppointment.isOrganizer ? "von Dir" : `von ${firstAppointment.organizer.emailAddress.name || firstAppointment.organizer.emailAddress.address.split("@")[0]}`}
                </span>
              )}
              {/* Dot separator before Teams icon */}
              {firstAppointment.organizer && firstAppointment.isOnlineMeeting && firstAppointment.onlineMeetingProvider === "teamsForBusiness" && (
                <span className="text-gray-300">·</span>
              )}
              {/* Teams Meeting Icon */}
              {firstAppointment.isOnlineMeeting && firstAppointment.onlineMeetingProvider === "teamsForBusiness" && (
                <span className="group shrink-0">
                  <svg
                    className="w-3.5 h-3.5 grayscale opacity-60 group-hover:grayscale-0 group-hover:opacity-100 transition-all"
                    viewBox="0 0 2228.833 2073.333"
                    xmlns="http://www.w3.org/2000/svg"
                    aria-label="Teams Meeting"
                  >
                    <path fill="#5059C9" d="M1554.637 777.5h575.713c54.391 0 98.483 44.092 98.483 98.483v524.398c0 199.901-162.051 361.952-361.952 361.952h-1.711c-199.901.028-361.975-162.023-362.004-361.924V828.971c.001-28.427 23.045-51.471 51.471-51.471z"/>
                    <circle fill="#5059C9" cx="1943.75" cy="440.583" r="233.25"/>
                    <circle fill="#7B83EB" cx="1218.083" cy="336.917" r="336.917"/>
                    <path fill="#7B83EB" d="M1667.323 777.5H717.01c-53.743 1.33-96.257 45.931-95.01 99.676v598.105c-7.505 322.519 247.657 590.16 570.167 598.053 322.51-7.893 577.671-275.534 570.167-598.053V877.176c1.245-53.745-41.268-98.346-95.011-99.676z"/>
                    <linearGradient id="teams-gradient-series" gradientUnits="userSpaceOnUse" x1="198.099" y1="1683.0726" x2="942.2344" y2="394.2607" gradientTransform="matrix(1 0 0 -1 0 2075.3333)">
                      <stop offset="0" stopColor="#5a62c3"/><stop offset=".5" stopColor="#4d55bd"/><stop offset="1" stopColor="#3940ab"/>
                    </linearGradient>
                    <path fill="url(#teams-gradient-series)" d="M95.01 466.5h950.312c52.473 0 95.01 42.538 95.01 95.01v950.312c0 52.473-42.538 95.01-95.01 95.01H95.01c-52.473 0-95.01-42.538-95.01-95.01V561.51c0-52.472 42.538-95.01 95.01-95.01z"/>
                    <path fill="#FFF" d="M820.211 828.193H630.241v517.297H509.211V828.193H320.123V727.844h500.088v100.349z"/>
                  </svg>
                </span>
              )}
            </div>
            {/* Details row - Time, Recurrence, Count, Duration */}
            <div className="flex items-center gap-2 text-xs mt-0.5 text-gray-500">
              <span className="font-semibold text-gray-700">{timeRange}</span>
              {recurrenceLabel && (
                <span className="text-gray-400">({recurrenceLabel})</span>
              )}
              <span className="text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                {appointments.length}x {perAppointmentDuration}
              </span>
              <span className="text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                Σ {hours}h{minutes > 0 ? ` ${minutes}m` : ""}
              </span>
            </div>
          </div>

          {/* Status badges - right aligned */}
          <div className="shrink-0 flex items-center gap-1.5">
            {syncReadyCount > 0 && (
              <span
                className="flex items-center gap-1 px-2 py-0.5 text-xs text-amber-600"
                title={`${syncReadyCount} bereit zum Sync`}
              >
                <ClockArrowUp className="h-3.5 w-3.5" />
                {syncReadyCount}
              </span>
            )}
            {syncedCount > 0 && (
              <span
                className={`px-2 py-0.5 text-xs font-medium rounded ${
                  syncedCount === appointments.length
                    ? "bg-green-50 text-green-700"
                    : "bg-yellow-50 text-yellow-700"
                }`}
                title={`${syncedCount} von ${appointments.length} synchronisiert`}
              >
                {syncedCount}/{appointments.length} Synced
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Serien-Bearbeitung - Änderungen gelten für alle Termine */}
      <div className="px-3 pb-3 pt-0 ml-8 border-t border-gray-100">
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <div className="flex flex-col min-w-0">
            <label className="text-xs text-gray-500 mb-1">Projekt</label>
            <SearchableSelect
              options={projectOptions}
              value={seriesProjectId}
              onChange={(val) =>
                handleSeriesProjectChange(val !== null ? Number(val) : null)
              }
              placeholder={allSameProject ? "-- Projekt wählen --" : "-- Verschiedene --"}
              className="w-64 sm:w-72"
            />
          </div>
          <div className="flex flex-col min-w-0">
            <label className={`text-xs mb-1 ${!seriesProjectId ? "text-gray-300" : "text-gray-500"}`}>Task</label>
            <SearchableSelect
              options={taskOptions}
              value={seriesTaskId}
              onChange={(val) =>
                handleSeriesTaskChange(val !== null ? Number(val) : null)
              }
              placeholder="-- Task wählen --"
              disabled={!seriesProjectId}
              disabledMessage={
                !seriesProjectId
                  ? "Erst Projekt wählen"
                  : loadingTasks?.has(seriesProjectId)
                  ? "Laden..."
                  : "Keine Tasks vorhanden"
              }
              loading={seriesProjectId ? loadingTasks?.has(seriesProjectId) : false}
              className="w-64 sm:w-72"
            />
          </div>
          <div className="flex flex-col min-w-0">
            <label className={`text-xs mb-1 ${!seriesTaskId ? "text-gray-300" : "text-gray-500"}`}>Tätigkeit</label>
            <SearchableSelect
              options={activityOptions}
              value={seriesActivityId}
              onChange={(val) =>
                handleSeriesActivityChange(String(val ?? "be"))
              }
              placeholder="-- Tätigkeit wählen --"
              disabled={!seriesTaskId}
              disabledMessage={!seriesProjectId ? "Erst Projekt wählen" : "Erst Task wählen"}
              className="w-40 sm:w-48"
            />
          </div>
          {/* Billable Toggle */}
          <div className="flex flex-col">
            <label className={`text-xs mb-1 ${!seriesTaskId ? "text-gray-300" : "text-gray-500"}`}>Fakt.</label>
            <button
              type="button"
              onClick={handleSeriesBillableChange}
              disabled={!seriesTaskId || !seriesCanChangeBillable}
              className={`flex items-center justify-center w-10 h-9.5 rounded-lg border transition-colors ${
                !seriesTaskId
                  ? "bg-gray-50 border-gray-200 text-gray-300 cursor-not-allowed"
                  : !seriesCanChangeBillable
                    ? seriesBillable
                      ? "bg-amber-50 border-amber-200 text-amber-500 cursor-not-allowed"
                      : "bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed"
                    : seriesBillable
                      ? "bg-amber-50 border-amber-300 text-amber-600 hover:bg-amber-100"
                      : "bg-gray-100 border-gray-300 text-gray-400 hover:bg-gray-200"
              }`}
              title={
                !seriesTaskId
                  ? "Erst Task wählen"
                  : !seriesCanChangeBillable
                    ? `Fakturierbarkeit vom Projekt/Vorgang festgelegt (${seriesBillable ? "fakturierbar" : "nicht fakturierbar"})`
                    : seriesBillable
                      ? "Fakturierbar - klicken zum Ändern"
                      : "Nicht fakturierbar (intern) - klicken zum Ändern"
              }
            >
              <Banknote size={18} className={!seriesTaskId || (!seriesBillable && seriesCanChangeBillable) ? "opacity-50" : ""} />
            </button>
          </div>
          {/* Series Sync Button */}
          {onSyncSeries && (
            <div className="flex flex-col">
              <label className={`text-xs mb-1 ${syncReadyCount === 0 ? "text-gray-300" : "text-gray-500"}`}>Sync</label>
              <button
                type="button"
                onClick={handleSyncSeries}
                disabled={syncReadyCount === 0 || isSyncingThisSeries}
                className={`flex items-center justify-center gap-1 px-3 h-9.5 rounded-lg border transition-colors ${
                  isSyncingThisSeries
                    ? "bg-green-500 border-green-500 text-white cursor-wait"
                    : syncReadyCount === 0
                      ? "bg-gray-50 border-gray-200 text-gray-300 cursor-not-allowed opacity-40"
                      : "bg-green-600 border-green-600 text-white hover:bg-green-700 hover:border-green-700"
                }`}
                title={
                  isSyncingThisSeries
                    ? "Wird synchronisiert..."
                    : syncReadyCount === 0
                      ? "Keine Termine zum Synchronisieren bereit"
                      : `${syncReadyCount} Termine zu ZEP synchronisieren`
                }
              >
                {isSyncingThisSeries ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <>
                    <ClockArrowUp size={18} className={syncReadyCount === 0 ? "opacity-50" : ""} />
                    {syncReadyCount > 0 && <span className="text-sm font-medium">{syncReadyCount}</span>}
                  </>
                )}
              </button>
            </div>
          )}
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
              isSynced={isAppointmentSynced(appointment, syncedEntries, syncMappings)}
              isSyncReady={isAppointmentSyncReady(appointment, syncedEntries, syncMappings)}
              syncedEntry={findSyncedEntry(appointment, syncedEntries, syncMappings)}
              duplicateWarning={duplicateWarnings?.get(appointment.id)}
              loadingTasks={appointment.projectId ? loadingTasks?.has(appointment.projectId) : false}
              // Actual meeting duration from call records
              actualDuration={getActualDuration(appointment, actualDurations)}
              onToggle={onToggle}
              onProjectChange={onProjectChange}
              onTaskChange={onTaskChange}
              onActivityChange={onActivityChange}
              onBillableChange={onBillableChange}
              onCustomRemarkChange={onCustomRemarkChange}
              onUseActualTimeChange={onUseActualTimeChange}
              // Single sync
              onSyncSingle={onSyncSingle}
              isSyncingSingle={syncingSingleId === appointment.id}
              // Rescheduled time correction
              onCorrectTime={onCorrectTime}
              isCorrectingTime={correctingTimeIds?.has(appointment.id) || false}
              // Conflict link popover
              onLinkToZep={onLinkToZep}
              syncedEntries={syncedEntries}
              syncMappings={syncMappings}
              linkedZepIds={linkedZepIds}
              // Keyboard navigation focus
              isFocused={focusedAppointmentId === appointment.id}
              globalWorkLocations={globalWorkLocations}
              onWorkLocationChange={onWorkLocationChange}
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
