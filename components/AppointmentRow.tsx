"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { ClockCheck, ClockArrowUp, AlertTriangle, Check, Banknote } from "lucide-react";
import ProjectTaskActivityForm from "./ProjectTaskActivityForm";
import { calculateDisplayTimes, roundToNearest15Min } from "@/lib/time-utils";
import AppointmentHeader from "./AppointmentRow/AppointmentHeader";
import AppointmentStatusBar from "./AppointmentRow/AppointmentStatusBar";
import DurationInfoPopover from "./AppointmentRow/DurationInfoPopover";
import {
  isInternalDomain,
  canChangeBillableForTask,
  formatDuration,
} from "./AppointmentRow/helpers";
import type {
  AppointmentRowProps,
  WorkLocation,
  Task,
} from "./AppointmentRow/types";

export type { AppointmentRowProps };

export default function AppointmentRow({
  appointment,
  projects,
  tasks,
  allTasks,
  activities,
  isSynced = false,
  isSyncReady = false,
  syncedEntry,
  duplicateWarning,
  loadingTasks = false,
  actualDuration,
  onToggle,
  onProjectChange,
  onTaskChange,
  onActivityChange,
  onBillableChange,
  onCustomRemarkChange,
  onUseActualTimeChange,
  onSyncSingle,
  isSyncingSingle = false,
  isEditing = false,
  modifiedEntry,
  onStartEditSynced,
  onCancelEditSynced,
  onModifyProject,
  onModifyTask,
  onModifyActivity,
  onModifyBillable,
  onModifyBemerkung,
  onModifyTime,
  globalWorkLocations,
  onWorkLocationChange,
  onModifyWorkLocation,
  onSaveModifiedSingle,
  isSavingModifiedSingle = false,
  onCorrectTime,
  isCorrectingTime = false,
  onLinkToZep,
  syncedEntries,
  syncMappings,
  linkedZepIds: linkedZepIdsProp,
  isFocused = false,
}: AppointmentRowProps) {
  const startDate = new Date(appointment.start.dateTime);
  const endDate = new Date(appointment.end.dateTime);

  // --- Live / Upcoming / Starting-soon state ---
  const [isLive, setIsLive] = useState(() => {
    const now = new Date();
    return now >= startDate && now <= endDate;
  });
  const [isUpcoming, setIsUpcoming] = useState(() => {
    const now = new Date();
    const minutesUntilStart = (startDate.getTime() - now.getTime()) / 60000;
    return minutesUntilStart > 0 && minutesUntilStart <= 30;
  });
  const [isStartingSoon, setIsStartingSoon] = useState(() => {
    const now = new Date();
    const minutesUntilStart = (startDate.getTime() - now.getTime()) / 60000;
    return minutesUntilStart > 0 && minutesUntilStart <= 5;
  });

  useEffect(() => {
    const checkStatus = () => {
      const now = new Date();
      const start = new Date(appointment.start.dateTime);
      const end = new Date(appointment.end.dateTime);
      const minutesUntilStart = (start.getTime() - now.getTime()) / 60000;

      setIsLive(now >= start && now <= end);
      setIsUpcoming(minutesUntilStart > 0 && minutesUntilStart <= 30);
      setIsStartingSoon(minutesUntilStart > 0 && minutesUntilStart <= 5);
    };

    checkStatus();
    const interval = setInterval(checkStatus, 30000);
    return () => clearInterval(interval);
  }, [appointment.start.dateTime, appointment.end.dateTime]);

  // --- Formatted times ---
  const dayLabel = format(startDate, "EE dd.MM.", { locale: de });
  const startTime = format(startDate, "HH:mm");
  const endTime = format(endDate, "HH:mm");
  const originalDurationMinutes = Math.round((endDate.getTime() - startDate.getTime()) / 60000);

  // --- Ref for click-outside editing detection ---
  const editingRowRef = useRef<HTMLDivElement>(null);

  // --- Planned duration (rounded for ZEP) ---
  const plannedDurationRounded = useMemo(() => {
    const start = new Date(appointment.start.dateTime);
    const end = new Date(appointment.end.dateTime);
    const display = calculateDisplayTimes(start, end);
    return {
      hours: display.durationHours,
      minutes: display.durationMins,
      totalMinutes: display.durationMinutes,
      startFormatted: display.startFormatted,
      endFormatted: display.endFormatted,
    };
  }, [appointment.start.dateTime, appointment.end.dateTime]);

  // --- Actual duration from call records ---
  const actualDurationInfo = useMemo(() => {
    if (!actualDuration) return null;
    const actualStart = new Date(actualDuration.actualStart);
    const actualEnd = new Date(actualDuration.actualEnd);

    const originalDurationMs = actualEnd.getTime() - actualStart.getTime();
    const originalDurationMins = Math.round(originalDurationMs / 60000);

    const display = calculateDisplayTimes(actualStart, actualEnd);
    const difference = display.durationMinutes - plannedDurationRounded.totalMinutes;

    const plannedStart = new Date(appointment.start.dateTime);
    const roundedPlannedStart = roundToNearest15Min(plannedStart);
    const zepEndDate = new Date(roundedPlannedStart.getTime() + display.durationMinutes * 60 * 1000);

    const formatTime = (d: Date) =>
      d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });

    return {
      hours: display.durationHours,
      minutes: display.durationMins,
      totalMinutes: display.durationMinutes,
      difference,
      color: difference < 0 ? "text-green-600" : difference > 0 ? "text-orange-600" : "text-gray-500",
      originalStart: formatTime(actualStart),
      originalEnd: formatTime(actualEnd),
      originalDurationMinutes: originalDurationMins,
      startRounded: display.startFormatted,
      endRounded: display.endFormatted,
      zepStart: formatTime(roundedPlannedStart),
      zepEnd: formatTime(zepEndDate),
    };
  }, [actualDuration, appointment.start.dateTime, plannedDurationRounded.totalMinutes]);

  // --- ZEP booked duration (synced entries) ---
  const zepBookedDuration = useMemo(() => {
    if (!isSynced || !syncedEntry) return null;
    const [fromH, fromM] = syncedEntry.from.split(':').map(Number);
    const [toH, toM] = syncedEntry.to.split(':').map(Number);
    const bookedMinutes = (toH * 60 + toM) - (fromH * 60 + fromM);
    return {
      hours: Math.floor(bookedMinutes / 60),
      minutes: bookedMinutes % 60,
      totalMinutes: bookedMinutes,
      from: syncedEntry.from.slice(0, 5),
      to: syncedEntry.to.slice(0, 5),
    };
  }, [isSynced, syncedEntry]);

  // --- Synced time type ---
  const syncedTimeType = useMemo(() => {
    if (!zepBookedDuration) return null;
    const zepFrom = zepBookedDuration.from;
    const zepTo = zepBookedDuration.to;

    if (zepFrom === plannedDurationRounded.startFormatted && zepTo === plannedDurationRounded.endFormatted) {
      return 'planned' as const;
    }
    if (actualDurationInfo) {
      if (zepFrom === actualDurationInfo.zepStart && zepTo === actualDurationInfo.zepEnd) {
        return 'actual' as const;
      }
      if (zepFrom === actualDurationInfo.startRounded && zepTo === actualDurationInfo.endRounded) {
        return 'actual' as const;
      }
    }
    return 'other' as const;
  }, [zepBookedDuration, plannedDurationRounded, actualDurationInfo]);

  // --- Synced shorter time warning ---
  const syncedShorterTime = useMemo(() => {
    if (!isSynced || !actualDurationInfo || !zepBookedDuration) return false;
    const [fromH, fromM] = zepBookedDuration.from.split(':').map(Number);
    const [toH, toM] = zepBookedDuration.to.split(':').map(Number);
    const zepMinutes = (toH * 60 + toM) - (fromH * 60 + fromM);
    const longerTime = Math.max(plannedDurationRounded.totalMinutes, actualDurationInfo.totalMinutes);
    return zepMinutes < longerTime;
  }, [isSynced, actualDurationInfo, zepBookedDuration, plannedDurationRounded.totalMinutes]);

  // --- Time deviation ---
  const timeDeviation = useMemo(() => {
    let zepStart: string;
    let zepEnd: string;

    if (isSynced && zepBookedDuration) {
      zepStart = zepBookedDuration.from;
      zepEnd = zepBookedDuration.to;
    } else if (appointment.useActualTime && actualDurationInfo) {
      zepStart = actualDurationInfo.zepStart;
      zepEnd = actualDurationInfo.zepEnd;
    } else {
      zepStart = plannedDurationRounded.startFormatted;
      zepEnd = plannedDurationRounded.endFormatted;
    }

    const hasDeviation = zepStart !== startTime || zepEnd !== endTime;
    if (!hasDeviation) return null;

    const usesActual = appointment.useActualTime && actualDurationInfo;
    const plannedDiffers = plannedDurationRounded.startFormatted !== startTime ||
                          plannedDurationRounded.endFormatted !== endTime;

    let reason: 'rounded' | 'actual' | 'both';
    if (usesActual && plannedDiffers) {
      reason = 'both';
    } else if (usesActual) {
      reason = 'actual';
    } else {
      reason = 'rounded';
    }

    return {
      outlookStart: startTime,
      outlookEnd: endTime,
      zepStart,
      zepEnd,
      reason,
      actualStart: actualDurationInfo?.startRounded,
      actualEnd: actualDurationInfo?.endRounded,
    };
  }, [
    isSynced, zepBookedDuration, appointment.useActualTime, actualDurationInfo,
    plannedDurationRounded, startTime, endTime
  ]);

  // --- Attendees ---
  const attendees = appointment.attendees || [];
  const attendeeCount = attendees.length;
  const attendeeDomains = [...new Set(attendees.map(a => a.emailAddress.address.split('@')[1]).filter(Boolean))];
  const isInternalOnly = attendeeCount > 0 && attendeeDomains.every(d => isInternalDomain(d));

  // --- Can edit billable in edit mode ---
  const canEditBillableInEditMode = useMemo(() => {
    if (!isEditing) return true;
    const selectedProjectId = modifiedEntry?.newProjectId || syncedEntry?.project_id;
    const selectedTaskId = modifiedEntry?.newTaskId || syncedEntry?.project_task_id;
    if (!selectedTaskId || !selectedProjectId) return true;

    let selectedTask: Task | undefined;
    if (allTasks && allTasks[selectedProjectId]) {
      selectedTask = allTasks[selectedProjectId].find(t => t.id === selectedTaskId);
    }
    const selectedProject = projects.find(p => p.id === selectedProjectId);

    const projektFakt = selectedProject?.voreinstFakturierbarkeit ?? selectedProject?.defaultFakt;
    const vorgangFakt = selectedTask?.defaultFakt;

    return canChangeBillableForTask(projektFakt, vorgangFakt);
  }, [isEditing, allTasks, projects, modifiedEntry?.newProjectId, modifiedEntry?.newTaskId, syncedEntry?.project_id, syncedEntry?.project_task_id]);

  // --- Work locations for current project ---
  const currentWorkLocations = useMemo(() => {
    if (!globalWorkLocations || globalWorkLocations.length === 0) return [];
    const pid = isEditing
      ? (modifiedEntry?.newProjectId || syncedEntry?.project_id)
      : appointment.projectId;
    if (!pid) return [];
    const project = projects.find((p) => p.id === pid);
    if (!project) return [];

    const ERSTE_TAETIGKEIT: WorkLocation = {
      kurzform: "- erste Tätigkeitsstätte -",
      bezeichnung: "Erste Tätigkeitsstätte",
      heimarbeitsort: false,
    };

    let locations: WorkLocation[];
    if (project.workLocations && project.workLocations.length > 0) {
      const allowed = new Set(project.workLocations);
      locations = globalWorkLocations.filter(wl => allowed.has(wl.kurzform));
      for (const wlKey of project.workLocations) {
        if (!globalWorkLocations.some(g => g.kurzform === wlKey) && wlKey !== ERSTE_TAETIGKEIT.kurzform) {
          locations.push({ kurzform: wlKey, bezeichnung: wlKey, heimarbeitsort: false });
        }
      }
    } else {
      locations = [...globalWorkLocations];
    }

    if (!locations.some(wl => wl.kurzform === ERSTE_TAETIGKEIT.kurzform)) {
      locations.unshift(ERSTE_TAETIGKEIT);
    } else {
      locations = [
        ERSTE_TAETIGKEIT,
        ...locations.filter(wl => wl.kurzform !== ERSTE_TAETIGKEIT.kurzform),
      ];
    }

    return locations;
  }, [globalWorkLocations, projects, appointment.projectId, isEditing, modifiedEntry?.newProjectId, syncedEntry?.project_id]);

  // --- Bemerkung values ---
  const syncedBemerkungValues = useMemo(() => {
    if (!syncedEntry) return { bemerkung: "", isCustom: false };
    const hasCustomRemark = syncedEntry.note && syncedEntry.note.trim() !== (appointment.subject || "").trim();
    const displayValue = modifiedEntry?.bemerkung !== undefined
      ? modifiedEntry.bemerkung
      : (hasCustomRemark ? syncedEntry.note! : "");
    const isCustom = !!(displayValue && displayValue.trim() !== (appointment.subject || "").trim());
    return { bemerkung: displayValue, isCustom };
  }, [syncedEntry, appointment.subject, modifiedEntry]);

  const unsyncedBemerkungValues = useMemo(() => {
    const hasCustom = appointment.customRemark && appointment.customRemark.trim() !== (appointment.subject || "").trim();
    return { bemerkung: hasCustom ? appointment.customRemark! : "", isCustom: !!hasCustom };
  }, [appointment.customRemark, appointment.subject]);

  // --- Is modified ---
  const isModified = useMemo(() => {
    if (!modifiedEntry || !syncedEntry) return false;
    const hasProjectChanges =
      modifiedEntry.newProjectId !== syncedEntry.project_id ||
      modifiedEntry.newTaskId !== syncedEntry.project_task_id ||
      modifiedEntry.newActivityId !== syncedEntry.activity_id ||
      modifiedEntry.newBillable !== syncedEntry.billable;
    const hasTimeChanges = modifiedEntry.newVon !== undefined || modifiedEntry.newBis !== undefined;
    const hasBemerkungChanges = modifiedEntry.bemerkung !== undefined && modifiedEntry.bemerkung !== (syncedEntry.note || "");
    const hasOrtChanges = modifiedEntry.newOrt !== undefined && modifiedEntry.newOrt !== (syncedEntry.work_location_id || undefined);
    return hasProjectChanges || hasTimeChanges || hasBemerkungChanges || hasOrtChanges;
  }, [modifiedEntry, syncedEntry]);

  // --- Click-outside handler ---
  useEffect(() => {
    if (!isEditing || isModified) return;

    function handleClickOutside(event: MouseEvent) {
      const target = event.target as HTMLElement;
      if (editingRowRef.current?.contains(target)) return;
      if (target.closest('[data-headlessui-state]')) return;

      setTimeout(() => {
        onCancelEditSynced?.(appointment.id);
      }, 0);
    }

    const timer = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isEditing, isModified, appointment.id, onCancelEditSynced]);

  // --- Linked ZEP IDs ---
  const linkedZepIds = useMemo(() => {
    if (linkedZepIdsProp) return linkedZepIdsProp;
    if (!syncMappings || syncMappings.size === 0) return undefined;
    const ids = new Set<number>();
    for (const mapping of syncMappings.values()) {
      ids.add(mapping.zepAttendanceId);
    }
    return ids;
  }, [linkedZepIdsProp, syncMappings]);

  // --- Synced project/task info ---
  const syncedInfo = useMemo(() => {
    if (!syncedEntry) return null;
    const project = projects.find((p) => p.id === syncedEntry.project_id);
    const activity = activities.find((a) => a.name === syncedEntry.activity_id);

    let taskName: string | null = null;
    if (allTasks && syncedEntry.project_id && syncedEntry.project_task_id) {
      const projectTasks = allTasks[syncedEntry.project_id];
      if (projectTasks) {
        const task = projectTasks.find((t) => t.id === syncedEntry.project_task_id);
        taskName = task?.name || null;
      }
    }

    return {
      projectName: project?.name || `Projekt #${syncedEntry.project_id}`,
      taskName,
      activityId: syncedEntry.activity_id,
      activityName: activity?.description || syncedEntry.activity_id,
      billable: syncedEntry.billable,
    };
  }, [syncedEntry, projects, activities, allTasks]);

  // --- Muted state ---
  const isMuted = !appointment.selected && !isSynced && !isSyncReady;

  // --- Time type change handler (shared) ---
  const handleTimeTypeChange = (useActual: boolean) => {
    if (isEditing && syncedEntry && onModifyTime) {
      onModifyTime(appointment.id, appointment, syncedEntry, useActual);
    } else if (!isSynced) {
      onUseActualTimeChange?.(appointment.id, useActual);
    }
  };

  // --- DurationInfoPopover shared props ---
  const durationPopoverProps = {
    originalStart: startTime,
    originalEnd: endTime,
    originalDurationMinutes,
    plannedStart: plannedDurationRounded.startFormatted,
    plannedEnd: plannedDurationRounded.endFormatted,
    plannedDurationMinutes: plannedDurationRounded.totalMinutes,
    originalActualStart: actualDurationInfo?.originalStart,
    originalActualEnd: actualDurationInfo?.originalEnd,
    originalActualDurationMinutes: actualDurationInfo?.originalDurationMinutes,
    actualStart: actualDurationInfo?.zepStart,
    actualEnd: actualDurationInfo?.zepEnd,
    actualDurationMinutes: actualDurationInfo?.totalMinutes,
    hasActualData: !!actualDurationInfo,
    hasDeviation: !!timeDeviation,
    useActualTime: appointment.useActualTime,
    syncedTimeType,
  };

  // Row state → visual style mapping
  const rowStateClass = isSynced && isModified
    ? "border-l-amber-400 border-gray-200 bg-amber-50/40"
    : isSynced
      ? "border-l-green-600 border-gray-200 bg-green-50/30"
      : isSyncReady
        ? "border-l-amber-400 border-gray-200 bg-amber-50/30"
        : appointment.selected
          ? "border-l-blue-400 border-gray-200 bg-white"
          : "border-l-gray-300 border-gray-200 bg-gray-50/50";

  return (
    <div
      id={`appointment-${appointment.id}`}
      ref={editingRowRef}
      className={`px-3 py-2 border-r border-b border-t border-l-4 transition-shadow hover:shadow-sm ${
        isFocused ? "ring-2 ring-blue-400 ring-inset" : ""
      } ${rowStateClass}`}
    >
      <div className="flex items-start gap-3">
        {/* Status icons: Synced, Ready-to-sync, or Checkbox + duplicate warning */}
        <div className="shrink-0 w-5 flex flex-col items-center gap-1">
          {/* Primary status icon */}
          <div className="h-5 w-5 flex items-center justify-center">
            {isSynced && isModified ? (
              <div
                title="Änderungen ausstehend"
                role="img"
                aria-label="Änderungen ausstehend"
              >
                <ClockArrowUp className="h-5 w-5 text-amber-500" aria-hidden="true" />
              </div>
            ) : isSynced ? (
              <div
                title="Bereits in ZEP synchronisiert"
                role="img"
                aria-label="Bereits in ZEP synchronisiert"
              >
                <ClockCheck className="h-5 w-5 text-green-600" aria-hidden="true" />
              </div>
            ) : isSyncReady ? (
              <div
                title="Bereit zur Synchronisierung"
                role="img"
                aria-label="Bereit zur Synchronisierung"
              >
                <ClockArrowUp className="h-5 w-5 text-amber-500" aria-hidden="true" />
              </div>
            ) : (
              <button
                type="button"
                onClick={() => onToggle(appointment.id)}
                className="relative flex items-center justify-center h-5 w-5 before:absolute before:inset-[-10px] before:content-['']"
                aria-label={`Termin auswählen: ${appointment.subject}`}
                aria-pressed={appointment.selected}
              >
                <span className={`h-4 w-4 rounded border flex items-center justify-center transition-colors ${
                  appointment.selected
                    ? "bg-blue-50 border-blue-300 text-blue-500"
                    : "border-gray-300 bg-white hover:bg-gray-50"
                }`}>
                  {appointment.selected && <Check size={12} strokeWidth={2.5} />}
                </span>
              </button>
            )}
          </div>
          {/* Duplicate warning indicator */}
          {duplicateWarning?.hasDuplicate && !isSynced && duplicateWarning.type !== 'rescheduled' && (
            <div
              className="h-5 w-5 flex items-center justify-center"
              title={duplicateWarning.message}
            >
              <AlertTriangle
                size={14}
                className="text-amber-500"
                aria-label={duplicateWarning.message}
              />
            </div>
          )}
        </div>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          {/* AppointmentHeader */}
          <AppointmentHeader
            appointment={appointment}
            isMuted={isMuted}
            isLive={isLive}
            isUpcoming={isUpcoming}
            isStartingSoon={isStartingSoon}
            isSynced={isSynced}
            syncedEntry={syncedEntry}
            attendees={attendees}
          />

          {/* Details row - Date/Time + Duration Badge */}
          <div className={`flex items-center gap-2 text-xs mt-0.5 ${isMuted ? "text-gray-400" : "text-gray-500"}`}>
            {/* Date and Time - clickable to show time options popover */}
            <DurationInfoPopover
              {...durationPopoverProps}
              canSwitch={(!isSynced || isEditing) && !!actualDurationInfo && actualDurationInfo.difference !== 0}
              onTimeTypeChange={handleTimeTypeChange}
            >
              <span className="relative pr-2">
                {isSynced && !isEditing && zepBookedDuration ? (
                  <span className={`font-semibold ${isMuted ? "text-gray-400" : "text-gray-700"}`}>{zepBookedDuration.from}–{zepBookedDuration.to}</span>
                ) : actualDurationInfo ? (
                  <span className={`font-semibold ${isMuted ? "text-gray-400" : "text-gray-700"}`}>
                    {appointment.useActualTime
                      ? `${actualDurationInfo.zepStart}–${actualDurationInfo.zepEnd}`
                      : `${plannedDurationRounded.startFormatted}–${plannedDurationRounded.endFormatted}`
                    }
                  </span>
                ) : (
                  <span className={`font-semibold ${isMuted ? "text-gray-400" : "text-gray-700"}`}>{plannedDurationRounded.startFormatted}–{plannedDurationRounded.endFormatted}</span>
                )}
                <span className={`ml-1 font-medium ${isMuted ? "text-gray-400" : "text-gray-500"}`}>{dayLabel}</span>
                {timeDeviation && (
                  <sup className="absolute right-0.5 top-1 text-[10px] text-amber-500">&#10033;</sup>
                )}
              </span>
            </DurationInfoPopover>

            {/* Separator before duration badge */}
            <span className={`text-xs ${isMuted ? "text-gray-200" : "text-gray-300"}`}>&bull;</span>

            {/* Duration badge - shows both times for synced entries with checkmark on synced one */}
            {isSynced && !isEditing && zepBookedDuration ? (
              <span
                className={`inline-flex items-center gap-0.5 text-xs rounded ${isMuted ? "bg-gray-100 text-gray-400" : "bg-gray-100"}`}
                title={`In ZEP gebucht: ${zepBookedDuration.from}–${zepBookedDuration.to}`}
              >
                {/* Planned time - with checkmark if synced */}
                <span
                  className={`inline-flex items-center gap-0.5 px-1.5 py-1 rounded-l ${
                    syncedTimeType === 'planned'
                      ? syncedShorterTime
                        ? "bg-amber-100 text-amber-700 font-medium"
                        : "bg-green-100 text-green-700 font-medium"
                      : "text-gray-400"
                  }`}
                  title={`Geplant: ${plannedDurationRounded.startFormatted}–${plannedDurationRounded.endFormatted}${syncedTimeType === 'planned' ? ' \u2713 In ZEP gebucht' : ''}${syncedShorterTime && syncedTimeType === 'planned' ? ' \u26A0 K\u00fcrzer als tats\u00e4chliche Zeit' : ''}`}
                >
                  {syncedTimeType === 'planned' && syncedShorterTime && <AlertTriangle size={10} className="text-amber-600" />}
                  {syncedTimeType === 'planned' && !syncedShorterTime && <ClockCheck size={10} className="text-green-600" />}
                  {plannedDurationRounded.hours > 0 ? `${plannedDurationRounded.hours}h${plannedDurationRounded.minutes > 0 ? plannedDurationRounded.minutes : ''}` : `${plannedDurationRounded.minutes}m`}
                </span>
                <span className="text-gray-300">|</span>
                {/* Actual time - with checkmark if synced */}
                <span
                  className={`inline-flex items-center gap-0.5 px-1.5 py-1 rounded-r ${
                    syncedTimeType === 'actual'
                      ? syncedShorterTime
                        ? "bg-amber-100 text-amber-700 font-medium"
                        : "bg-green-100 text-green-700 font-medium"
                      : actualDurationInfo
                        ? actualDurationInfo.color
                        : "text-gray-300"
                  }`}
                  title={actualDurationInfo
                    ? `Tats\u00e4chlich: ${actualDurationInfo.startRounded}–${actualDurationInfo.endRounded}${syncedTimeType === 'actual' ? ' \u2713 In ZEP gebucht' : ''}${syncedShorterTime && syncedTimeType === 'actual' ? ' \u26A0 K\u00fcrzer als geplante Zeit' : ''}`
                    : "Keine tats\u00e4chliche Zeit verf\u00fcgbar"
                  }
                >
                  {syncedTimeType === 'actual' && syncedShorterTime && <AlertTriangle size={10} className="text-amber-600" />}
                  {syncedTimeType === 'actual' && !syncedShorterTime && <ClockCheck size={10} className="text-green-600" />}
                  {actualDurationInfo
                    ? (actualDurationInfo.hours > 0 ? `${actualDurationInfo.hours}h${actualDurationInfo.minutes > 0 ? actualDurationInfo.minutes : ''}` : `${actualDurationInfo.minutes}m`)
                    : "--"
                  }
                </span>
              </span>
            ) : (
              // Not synced or editing: Show both times as toggle buttons
              <span
                className={`inline-flex items-center gap-0.5 text-xs rounded ring-1 ${isMuted ? "bg-gray-100 text-gray-400 ring-gray-200" : "bg-gray-100 ring-blue-300"}`}
                title={actualDurationInfo
                  ? `Geplant: ${formatDuration(plannedDurationRounded.totalMinutes)} | Tats\u00e4chlich: ${formatDuration(actualDurationInfo.totalMinutes)}`
                  : `Geplant: ${formatDuration(plannedDurationRounded.totalMinutes)} | Tats\u00e4chlich: keine Daten`
                }
              >
                {/* Planned time button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!actualDurationInfo) return;
                    handleTimeTypeChange(false);
                  }}
                  disabled={!actualDurationInfo}
                  className={`inline-flex items-center gap-0.5 px-1.5 py-1 rounded-l transition-colors ${
                    !appointment.useActualTime || !actualDurationInfo
                      ? "bg-blue-100 text-blue-700 font-medium"
                      : "text-gray-400 hover:text-gray-600 hover:bg-gray-200"
                  } ${!actualDurationInfo ? "cursor-default" : "cursor-pointer"}`}
                  title={`Geplant (gerundet): ${formatDuration(plannedDurationRounded.totalMinutes)} - f\u00fcr ZEP verwenden`}
                >
                  {(!appointment.useActualTime || !actualDurationInfo) && <Check size={10} />}
                  {plannedDurationRounded.hours > 0 ? `${plannedDurationRounded.hours}h${plannedDurationRounded.minutes > 0 ? plannedDurationRounded.minutes : ''}` : `${plannedDurationRounded.minutes}m`}
                </button>
                <span className="text-gray-300">|</span>
                {/* Actual time button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!actualDurationInfo || actualDurationInfo.difference === 0) return;
                    handleTimeTypeChange(true);
                  }}
                  disabled={!actualDurationInfo || actualDurationInfo.difference === 0}
                  className={`inline-flex items-center gap-0.5 px-1.5 py-1 rounded-r transition-colors ${
                    !actualDurationInfo || actualDurationInfo.difference === 0
                      ? "text-gray-300 cursor-default"
                      : appointment.useActualTime
                        ? `bg-blue-100 font-medium ${actualDurationInfo.color}`
                        : `${actualDurationInfo.color} hover:bg-gray-200`
                  }`}
                  title={!actualDurationInfo
                    ? "Keine tats\u00e4chliche Zeit verf\u00fcgbar"
                    : actualDurationInfo.difference === 0
                      ? "Tats\u00e4chliche Zeit entspricht der geplanten Zeit"
                      : `Tats\u00e4chlich (gerundet): ${formatDuration(actualDurationInfo.totalMinutes)} - f\u00fcr ZEP verwenden`
                  }
                >
                  {actualDurationInfo && appointment.useActualTime && actualDurationInfo.difference !== 0 && <Check size={10} />}
                  {actualDurationInfo
                    ? (actualDurationInfo.hours > 0 ? `${actualDurationInfo.hours}h${actualDurationInfo.minutes > 0 ? actualDurationInfo.minutes : ''}` : `${actualDurationInfo.minutes}m`)
                    : "--"
                  }
                </button>
              </span>
            )}
          </div>
        </div>

        {/* AppointmentStatusBar */}
        <AppointmentStatusBar
          appointment={appointment}
          isSynced={isSynced}
          isEditing={isEditing}
          isModified={isModified}
          isInternalOnly={isInternalOnly}
          attendeeCount={attendeeCount}
          duplicateWarning={duplicateWarning}
          onToggle={onToggle}
          onProjectChange={onProjectChange}
          onStartEditSynced={onStartEditSynced}
          onCancelEditSynced={onCancelEditSynced}
          onCorrectTime={onCorrectTime}
          isCorrectingTime={isCorrectingTime}
          onLinkToZep={onLinkToZep}
          syncedEntries={syncedEntries}
          linkedZepIds={linkedZepIds}
        />
      </div>

      {/* Synced entry info - compact inline */}
      {isSynced && syncedInfo && !isEditing && (
        <div className="mt-2 pt-2 ml-8 border-t border-gray-100 flex items-center gap-2 text-xs text-gray-500" role="status">
          <span className="font-medium text-gray-600">{syncedInfo.projectName}</span>
          {syncedInfo.taskName && (
            <>
              <span className="text-gray-300">/</span>
              <span title={syncedInfo.activityName}>
                {syncedInfo.taskName} <span className="text-gray-400">({syncedInfo.activityId})</span>
              </span>
            </>
          )}
          <span
            title={syncedInfo.billable ? "Fakturierbar" : "Nicht fakturierbar (intern)"}
            aria-label={syncedInfo.billable ? "Fakturierbar" : "Nicht fakturierbar (intern)"}
          >
            <Banknote
              size={14}
              className={syncedInfo.billable ? "text-amber-500" : "text-gray-400"}
              aria-hidden="true"
            />
          </span>
          {isModified && <span className="text-amber-600 font-medium">Ge\u00e4ndert</span>}
        </div>
      )}

      {/* Rescheduled appointment info */}
      {duplicateWarning?.type === 'rescheduled' && !isSynced && duplicateWarning.originalTime && duplicateWarning.newTime && (
        <div className="mt-1 ml-8 text-xs space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="text-gray-500 w-14">In ZEP:</span>
            <span className="text-red-500 line-through">
              {duplicateWarning.originalTime.date} {duplicateWarning.originalTime.from.slice(0, 5)}–{duplicateWarning.originalTime.to.slice(0, 5)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-500 w-14">Outlook:</span>
            <span className="text-green-600 font-medium">
              {duplicateWarning.newTime.date} {duplicateWarning.newTime.from.slice(0, 5)}–{duplicateWarning.newTime.to.slice(0, 5)}
            </span>
          </div>
        </div>
      )}

      {/* Editing UI for synced entries */}
      {isSynced && isEditing && syncedEntry && (
        <div className="mt-2 ml-8 flex items-end gap-2">
          <ProjectTaskActivityForm
            projects={projects}
            tasks={
              allTasks && (modifiedEntry?.newProjectId || syncedEntry.project_id)
                ? allTasks[modifiedEntry?.newProjectId || syncedEntry.project_id] || []
                : []
            }
            allTasks={allTasks}
            activities={activities}
            projectId={modifiedEntry?.newProjectId || syncedEntry.project_id}
            taskId={modifiedEntry?.newTaskId || syncedEntry.project_task_id}
            activityId={modifiedEntry?.newActivityId || syncedEntry.activity_id}
            bemerkung={syncedBemerkungValues.bemerkung}
            bemerkungPlaceholder={appointment.subject}
            isCustomBemerkung={syncedBemerkungValues.isCustom}
            billable={modifiedEntry?.newBillable ?? syncedEntry.billable}
            canChangeBillable={canEditBillableInEditMode && !!(modifiedEntry?.newTaskId || syncedEntry.project_task_id)}
            useActualTime={!!appointment.useActualTime}
            plannedTimeLabel={`${plannedDurationRounded.startFormatted}–${plannedDurationRounded.endFormatted}`}
            actualTimeLabel={actualDurationInfo ? `${actualDurationInfo.zepStart}–${actualDurationInfo.zepEnd}` : undefined}
            hasActualTime={!!actualDurationInfo}
            actualTimeDiffers={!!actualDurationInfo && actualDurationInfo.difference !== 0}
            onProjectChange={(val) => {
              if (val !== null && onModifyProject && syncedEntry) {
                onModifyProject(appointment.id, appointment, syncedEntry, val);
              }
            }}
            onTaskChange={(val) => {
              if (val !== null && onModifyTask) {
                onModifyTask(appointment.id, Number(val));
              }
            }}
            onActivityChange={(val) => {
              if (onModifyActivity && syncedEntry) {
                onModifyActivity(appointment.id, appointment, syncedEntry, val);
              }
            }}
            onBemerkungChange={(val) => {
              if (onModifyBemerkung && syncedEntry) {
                onModifyBemerkung(appointment.id, appointment, syncedEntry, val);
              }
            }}
            onBillableChange={(val) => {
              if (onModifyBillable && syncedEntry) {
                onModifyBillable(appointment.id, appointment, syncedEntry, val);
              }
            }}
            onTimeChange={(useActual) => {
              if (onModifyTime && syncedEntry) {
                onModifyTime(appointment.id, appointment, syncedEntry, useActual);
              }
            }}
            workLocations={currentWorkLocations}
            workLocation={modifiedEntry?.newOrt ?? syncedEntry?.work_location_id ?? undefined}
            onWorkLocationChange={(val) => {
              if (onModifyWorkLocation && syncedEntry) {
                onModifyWorkLocation(appointment.id, appointment, syncedEntry, val);
              }
            }}
            onSync={() => modifiedEntry && isModified && onSaveModifiedSingle?.(modifiedEntry)}
            isSyncing={isSavingModifiedSingle}
            isSyncReady={isModified}
            syncTooltip={isSavingModifiedSingle ? "Wird gespeichert..." : !isModified ? "Keine \u00c4nderungen" : "\u00c4nderungen in ZEP speichern"}
          />
        </div>
      )}

      {/* Dropdowns for selected unsynchronized appointments */}
      {appointment.selected && !isSynced && (
        <div className="mt-2 ml-8 flex items-end gap-2">
          <ProjectTaskActivityForm
            projects={projects}
            tasks={tasks}
            allTasks={allTasks}
            activities={activities}
            projectId={appointment.projectId}
            taskId={appointment.taskId}
            activityId={appointment.activityId}
            bemerkung={unsyncedBemerkungValues.bemerkung}
            bemerkungPlaceholder={appointment.subject}
            isCustomBemerkung={unsyncedBemerkungValues.isCustom}
            billable={appointment.billable}
            canChangeBillable={appointment.canChangeBillable}
            useActualTime={!!appointment.useActualTime}
            plannedTimeLabel={`${plannedDurationRounded.startFormatted}–${plannedDurationRounded.endFormatted}`}
            actualTimeLabel={actualDurationInfo ? `${actualDurationInfo.zepStart}–${actualDurationInfo.zepEnd}` : undefined}
            hasActualTime={!!actualDurationInfo}
            actualTimeDiffers={!!actualDurationInfo && actualDurationInfo.difference !== 0}
            loadingTasks={loadingTasks}
            onProjectChange={(val) => onProjectChange(appointment.id, val)}
            onTaskChange={(val) => onTaskChange(appointment.id, val)}
            onActivityChange={(val) => onActivityChange(appointment.id, val)}
            onBemerkungChange={(val) => onCustomRemarkChange?.(appointment.id, val)}
            onBillableChange={(val) => onBillableChange(appointment.id, val)}
            onTimeChange={(useActual) => onUseActualTimeChange?.(appointment.id, useActual)}
            workLocations={currentWorkLocations}
            workLocation={appointment.workLocation}
            onWorkLocationChange={(val) => onWorkLocationChange?.(appointment.id, val)}
            onSync={() => isSyncReady && onSyncSingle?.(appointment)}
            isSyncing={!!isSyncingSingle}
            isSyncReady={!!isSyncReady}
            syncTooltip={
              isSyncingSingle
                ? "Wird synchronisiert..."
                : !isSyncReady
                  ? "Erst Projekt und Task w\u00e4hlen"
                  : "Jetzt zu ZEP synchronisieren"
            }
          />
        </div>
      )}
    </div>
  );
}
