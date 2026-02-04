"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { Users, ClockCheck, ClockArrowUp, AlertTriangle, Pencil, X, Check, HelpCircle, XCircle, Clock, RefreshCw, Ban, Banknote, Loader2 } from "lucide-react";
import SearchableSelect, { SelectOption } from "./SearchableSelect";
import { DuplicateCheckResult } from "@/lib/zep-api";
import { ActualDuration } from "@/lib/teams-utils";
import { calculateDisplayTimes, roundToNearest15Min } from "@/lib/time-utils";

// Helper: Format name from "Nachname, Vorname" to "Vorname Nachname"
function formatName(name?: string | null): string | null {
  if (!name) return null;
  // Check if name contains comma (format: "Nachname, Vorname")
  if (name.includes(', ')) {
    const [lastName, firstName] = name.split(', ');
    return `${firstName} ${lastName}`;
  }
  return name;
}

// Helper: Determine if user can change billable status
// Values 1 and 3 are editable, values 2 and 4 are locked
// Note: ZEP SOAP API returns these as strings, so we convert to number
function canChangeBillableForTask(projektFakt?: number | string, vorgangFakt?: number | string): boolean {
  const pFakt = projektFakt !== undefined ? Number(projektFakt) : undefined;
  const vFakt = vorgangFakt !== undefined ? Number(vorgangFakt) : undefined;
  
  // Task has own setting (not 0 = "inherited")
  if (vFakt !== undefined && vFakt !== 0) {
    return vFakt === 1 || vFakt === 3;
  }
  // Fallback to project setting
  if (pFakt !== undefined) {
    return pFakt === 1 || pFakt === 3;
  }
  // Default: editable
  return true;
}

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
  voreinstFakturierbarkeit?: number; // 1-4: Projekt-Level Fakturierbarkeit
  defaultFakt?: number; // 1-4: Projekt-Level Fakturierbarkeit (alternative)
}

interface Task {
  id: number;
  name: string;
  description: string | null;
  project_id: number;
  activities?: AssignedActivity[]; // Dem Vorgang zugeordnete Tätigkeiten (leer = erbt vom Projekt)
  defaultFakt?: number; // 0=vom Projekt geerbt, 1-4=eigene Einstellung
}

interface Activity {
  name: string;
  description: string;
}

interface SyncedEntry {
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
  projektNr?: string;
  vorgangNr?: string;
}

// Modified entry for rebooking
interface ModifiedEntry {
  zepId: number;
  outlookEventId: string;
  originalProjectId: number;
  originalTaskId: number;
  originalActivityId: string;
  originalBillable: boolean;
  newProjectId: number;
  newTaskId: number;
  newActivityId: string;
  newBillable: boolean;
  newProjektNr: string;
  newVorgangNr: string;
  userId: string;
  datum: string;
  von: string;
  bis: string;
  bemerkung?: string;
  // New time values (when user changes planned/actual time in edit mode)
  newVon?: string;
  newBis?: string;
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
  isOnlineMeeting?: boolean;
  onlineMeetingProvider?: string;
  onlineMeeting?: { joinUrl?: string };
  // Abgesagte Termine
  isCancelled?: boolean;
  lastModifiedDateTime?: string;
  type?: 'calendar' | 'call' | 'singleInstance' | 'occurrence' | 'exception' | 'seriesMaster';
  callType?: 'Phone' | 'Video' | 'ScreenShare';
  direction?: 'incoming' | 'outgoing';
  useActualTime?: boolean; // true = use actual time from call records, false = use planned time
}

interface AppointmentRowProps {
  appointment: Appointment;
  projects: Project[];
  tasks: Task[];
  allTasks?: Record<number, Task[]>;
  activities: Activity[];
  isSynced?: boolean;
  isSyncReady?: boolean;
  syncedEntry?: SyncedEntry | null;
  duplicateWarning?: DuplicateCheckResult;
  loadingTasks?: boolean;
  // Actual meeting duration from call records
  actualDuration?: ActualDuration;
  onToggle: (id: string) => void;
  onProjectChange: (id: string, projectId: number | null) => void;
  onTaskChange: (id: string, taskId: number | null) => void;
  onActivityChange: (id: string, activityId: string) => void;
  onBillableChange: (id: string, billable: boolean) => void;
  // Toggle between planned and actual time for ZEP sync
  onUseActualTimeChange?: (id: string, useActual: boolean) => void;
  // Single row sync
  onSyncSingle?: (appointment: Appointment) => void;
  isSyncingSingle?: boolean;
  // Editing synced entries (rebooking)
  isEditing?: boolean;
  modifiedEntry?: ModifiedEntry;
  onStartEditSynced?: (appointmentId: string) => void;
  onCancelEditSynced?: (appointmentId: string) => void;
  onModifyProject?: (appointmentId: string, apt: Appointment, syncedEntry: SyncedEntry, projectId: number) => void;
  onModifyTask?: (appointmentId: string, taskId: number) => void;
  onModifyActivity?: (appointmentId: string, apt: Appointment, syncedEntry: SyncedEntry, activityId: string) => void;
  onModifyBillable?: (appointmentId: string, apt: Appointment, syncedEntry: SyncedEntry, billable: boolean) => void;
  onModifyTime?: (appointmentId: string, apt: Appointment, syncedEntry: SyncedEntry, useActualTime: boolean) => void;
  onSaveModifiedSingle?: (modifiedEntry: ModifiedEntry) => void;
  isSavingModifiedSingle?: boolean;
  // Rescheduled appointment correction
  onCorrectTime?: (appointmentId: string, duplicateWarning: DuplicateCheckResult) => void;
  isCorrectingTime?: boolean;
}

// Attendee Status Icon Component
function AttendeeStatusIcon({ response }: { response: string }) {
  switch (response) {
    case "accepted":
      return <Check size={12} className="text-green-600" />;
    case "tentativelyAccepted":
      return <HelpCircle size={12} className="text-amber-500" />;
    case "declined":
      return <XCircle size={12} className="text-red-500" />;
    case "organizer":
      return <span className="text-blue-600 text-xs font-medium">★</span>;
    default:
      return <Clock size={12} className="text-gray-400" />;
  }
}

// Attendee Popover Component
interface AttendeePopoverProps {
  attendees: Attendee[];
  organizer?: {
    emailAddress: {
      name: string;
      address: string;
    };
  };
  isOrganizer?: boolean;
  isMuted?: boolean;
}

function AttendeePopover({ attendees, organizer, isOrganizer, isMuted }: AttendeePopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Close popover when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  const attendeeCount = attendees.length;
  const allDomains = [...new Set(attendees.map(a => a.emailAddress.address.split('@')[1]).filter(Boolean))];
  // Filter out contiva.com from displayed domains
  const domains = allDomains.filter(d => d !== "contiva.com");

  // Check if all attendees are from contiva.com
  const isInternalOnly = attendeeCount > 0 && allDomains.length === 1 && allDomains[0] === "contiva.com";

  // Group attendees by status
  const accepted = attendees.filter(a => a.status.response === "accepted");
  const tentative = attendees.filter(a => a.status.response === "tentativelyAccepted");
  const declined = attendees.filter(a => a.status.response === "declined");
  const noResponse = attendees.filter(a => !["accepted", "tentativelyAccepted", "declined", "organizer"].includes(a.status.response));

  // Only show trigger if there are attendees
  if (attendeeCount === 0) {
    return null;
  }

  return (
    <div className="relative inline-flex items-center">
      <span className={isMuted ? "text-gray-200" : "text-gray-300"}>•</span>
      <button
        ref={triggerRef}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 ml-2 hover:text-gray-700 transition-colors"
        title="Teilnehmer anzeigen"
      >
        <Users size={11} />
        <span>{attendeeCount}</span>
        {!isInternalOnly && domains.length > 0 && (
          <span className="text-gray-400">
            ({domains.join(', ')})
          </span>
        )}
      </button>

      {isOpen && (
        <div
          ref={popoverRef}
          className="absolute left-0 top-full mt-1 z-50 bg-white rounded-lg shadow-lg border border-gray-200 p-3 min-w-70 max-w-90"
        >
          <div className="text-xs font-medium text-gray-700 mb-2">
            {attendeeCount} Teilnehmer
          </div>
          
          {/* Organizer - highlighted at top */}
          {organizer && (
            <div className="mb-3 p-2 bg-blue-50 rounded-lg border border-blue-100">
              <div className="text-[10px] uppercase tracking-wide text-blue-600 font-medium mb-1">
                Organisator
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-blue-600 font-bold">★</span>
                <div className="flex-1 min-w-0">
                  <div className="truncate text-gray-800 font-medium">
                    {isOrganizer ? "Du" : (organizer.emailAddress.name || organizer.emailAddress.address.split('@')[0])}
                  </div>
                  <div className="truncate text-gray-400 text-[10px]">{organizer.emailAddress.address}</div>
                </div>
              </div>
            </div>
          )}
          
          <div className="space-y-2 max-h-75 overflow-y-auto">
            {/* Accepted */}
            {accepted.length > 0 && (
              <div>
                <div className="text-[10px] uppercase tracking-wide text-green-600 font-medium mb-1">
                  Zugesagt ({accepted.length})
                </div>
                {accepted.map((a, i) => (
                  <AttendeeItem key={i} attendee={a} />
                ))}
              </div>
            )}

            {/* Tentative */}
            {tentative.length > 0 && (
              <div>
                <div className="text-[10px] uppercase tracking-wide text-amber-600 font-medium mb-1">
                  Vorbehaltlich ({tentative.length})
                </div>
                {tentative.map((a, i) => (
                  <AttendeeItem key={i} attendee={a} />
                ))}
              </div>
            )}

            {/* Declined */}
            {declined.length > 0 && (
              <div>
                <div className="text-[10px] uppercase tracking-wide text-red-600 font-medium mb-1">
                  Abgesagt ({declined.length})
                </div>
                {declined.map((a, i) => (
                  <AttendeeItem key={i} attendee={a} />
                ))}
              </div>
            )}

            {/* No Response */}
            {noResponse.length > 0 && (
              <div>
                <div className="text-[10px] uppercase tracking-wide text-gray-500 font-medium mb-1">
                  Keine Antwort ({noResponse.length})
                </div>
                {noResponse.map((a, i) => (
                  <AttendeeItem key={i} attendee={a} />
                ))}
              </div>
            )}
          </div>

          {/* Domain summary - only show if there are external domains */}
          {domains.length > 0 && (
            <div className="mt-2 pt-2 border-t border-gray-100 text-[10px] text-gray-500">
              Externe Domains: {domains.join(', ')}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Single Attendee Item
function AttendeeItem({ attendee }: { attendee: Attendee }) {
  const name = attendee.emailAddress.name || attendee.emailAddress.address.split('@')[0];
  const email = attendee.emailAddress.address;

  return (
    <div className="flex items-center gap-2 py-0.5 text-xs">
      <AttendeeStatusIcon response={attendee.status.response} />
      <div className="flex-1 min-w-0">
        <div className="truncate text-gray-800">{name}</div>
        <div className="truncate text-gray-400 text-[10px]">{email}</div>
      </div>
    </div>
  );
}

// Time Deviation Popover Component
interface TimeDeviationPopoverProps {
  outlookStart: string;  // Original Outlook start time (HH:mm)
  outlookEnd: string;    // Original Outlook end time (HH:mm)
  zepStart: string;      // ZEP start time (HH:mm) - rounded or actual
  zepEnd: string;        // ZEP end time (HH:mm) - rounded or actual
  reason: 'rounded' | 'actual' | 'both';  // Why times differ
  actualStart?: string;  // Actual meeting start (HH:mm) if available
  actualEnd?: string;    // Actual meeting end (HH:mm) if available
  children: React.ReactNode;  // The date/time content to wrap
}

function TimeDeviationPopover({
  outlookStart,
  outlookEnd,
  zepStart,
  zepEnd,
  reason,
  actualStart,
  actualEnd,
  children
}: TimeDeviationPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Close popover when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  return (
    <span className="relative inline-flex items-center">
      <button
        ref={triggerRef}
        onClick={() => setIsOpen(!isOpen)}
        className="hover:text-gray-700 transition-colors cursor-pointer"
        title="Zeitabweichung - klicken für Details"
      >
        {children}
        <sup className="ml-0.5 text-[8px] text-amber-500">✱</sup>
      </button>

      {isOpen && (
        <div
          ref={popoverRef}
          className="absolute left-0 top-full mt-1 z-50 bg-white rounded-lg shadow-lg border border-gray-200 p-3 min-w-48"
        >
          <div className="text-xs font-medium text-gray-700 mb-2">
            Zeitabweichung
          </div>

          <div className="space-y-1.5 text-xs">
            {/* Original Outlook time */}
            <div className="flex items-center justify-between gap-4">
              <span className="text-gray-500">Outlook:</span>
              <span className="font-mono text-gray-700">{outlookStart}–{outlookEnd}</span>
            </div>

            {/* Actual time if available and different */}
            {actualStart && actualEnd && (actualStart !== outlookStart || actualEnd !== outlookEnd) && (
              <div className="flex items-center justify-between gap-4">
                <span className="text-gray-500">Tatsächlich:</span>
                <span className="font-mono text-gray-700">{actualStart}–{actualEnd}</span>
              </div>
            )}

            {/* ZEP time */}
            <div className="flex items-center justify-between gap-4 pt-1 border-t border-gray-100">
              <span className="text-gray-500 font-medium">Für ZEP:</span>
              <span className="font-mono text-amber-600 font-medium">{zepStart}–{zepEnd}</span>
            </div>
          </div>

          {/* Reason explanation */}
          <div className="mt-2 pt-2 border-t border-gray-100 text-[10px] text-gray-400">
            {reason === 'rounded' && "Auf 15-Minuten-Raster gerundet"}
            {reason === 'actual' && "Tatsächliche Meeting-Dauer verwendet"}
            {reason === 'both' && "Tatsächliche Dauer + Rundung auf 15min"}
          </div>
        </div>
      )}
    </span>
  );
}

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
  onModifyTime,
  onSaveModifiedSingle,
  isSavingModifiedSingle = false,
  onCorrectTime,
  isCorrectingTime = false,
}: AppointmentRowProps) {
  const startDate = new Date(appointment.start.dateTime);
  const endDate = new Date(appointment.end.dateTime);

  const dayLabel = format(startDate, "EE dd.MM.", { locale: de });
  const startTime = format(startDate, "HH:mm");
  const endTime = format(endDate, "HH:mm");

  // Ref for the editing UI to detect clicks outside
  const editingRowRef = useRef<HTMLDivElement>(null);


  // Planned duration (for ZEP - only rounds if duration is not a 15-min multiple)
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

  // Actual duration from call records (if available)
  // Display uses real call record times, ZEP booking uses planned start + actual duration
  const actualDurationInfo = useMemo(() => {
    if (!actualDuration) return null;
    const actualStart = new Date(actualDuration.actualStart);
    const actualEnd = new Date(actualDuration.actualEnd);

    // For DISPLAY: use real call record times (rounded)
    const display = calculateDisplayTimes(actualStart, actualEnd);
    const difference = display.durationMinutes - plannedDurationRounded.totalMinutes;

    // For ZEP BOOKING: use planned start (rounded) + ROUNDED actual duration
    // We use display.durationMinutes (the rounded duration) to match what the badge shows
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
      // Color based on difference: green if shorter, orange if longer, gray if same
      color: difference < 0 ? "text-green-600" : difference > 0 ? "text-orange-600" : "text-gray-500",
      // Display times (real call record times, rounded)
      startRounded: display.startFormatted,
      endRounded: display.endFormatted,
      // ZEP booking times (planned start rounded + rounded duration)
      zepStart: formatTime(roundedPlannedStart),
      zepEnd: formatTime(zepEndDate),
    };
  }, [actualDuration, appointment.start.dateTime, plannedDurationRounded.totalMinutes]);

  // ZEP booked duration (for synced entries)
  const zepBookedDuration = useMemo(() => {
    if (!isSynced || !syncedEntry) return null;
    // Parse ZEP times (format: "HH:mm:ss")
    const [fromH, fromM] = syncedEntry.from.split(':').map(Number);
    const [toH, toM] = syncedEntry.to.split(':').map(Number);
    const fromMinutes = fromH * 60 + fromM;
    const toMinutes = toH * 60 + toM;
    const bookedMinutes = toMinutes - fromMinutes;
    const bookedHours = Math.floor(bookedMinutes / 60);
    const bookedMins = bookedMinutes % 60;
    return {
      hours: bookedHours,
      minutes: bookedMins,
      totalMinutes: bookedMinutes,
      from: syncedEntry.from.slice(0, 5), // "HH:mm"
      to: syncedEntry.to.slice(0, 5),     // "HH:mm"
    };
  }, [isSynced, syncedEntry]);

  // Determine which time was synced (planned or actual)
  const syncedTimeType = useMemo(() => {
    if (!zepBookedDuration) return null;
    // Compare ZEP booked times with planned and actual times
    const zepFrom = zepBookedDuration.from;
    const zepTo = zepBookedDuration.to;
    const plannedFrom = plannedDurationRounded.startFormatted;
    const plannedTo = plannedDurationRounded.endFormatted;

    // Check if synced with planned time
    if (zepFrom === plannedFrom && zepTo === plannedTo) {
      return 'planned';
    }

    // Check if synced with actual time (if available)
    if (actualDurationInfo) {
      // New format: planned start + actual duration (for ZEP booking)
      if (zepFrom === actualDurationInfo.zepStart && zepTo === actualDurationInfo.zepEnd) {
        return 'actual';
      }
      // Also check old format: original call record times (for backwards compatibility)
      if (zepFrom === actualDurationInfo.startRounded && zepTo === actualDurationInfo.endRounded) {
        return 'actual';
      }
    }

    // Times don't match either - could be manually edited in ZEP
    return 'other';
  }, [zepBookedDuration, plannedDurationRounded, actualDurationInfo]);

  // Check if there's a time deviation between Outlook and ZEP times
  const timeDeviation = useMemo(() => {
    // Get the ZEP time that will be/was used
    let zepStart: string;
    let zepEnd: string;

    if (isSynced && zepBookedDuration) {
      // Already synced - use booked time
      zepStart = zepBookedDuration.from;
      zepEnd = zepBookedDuration.to;
    } else if (appointment.useActualTime && actualDurationInfo) {
      // Will use actual time (planned start + actual duration for ZEP)
      zepStart = actualDurationInfo.zepStart;
      zepEnd = actualDurationInfo.zepEnd;
    } else {
      // Will use planned time (rounded)
      zepStart = plannedDurationRounded.startFormatted;
      zepEnd = plannedDurationRounded.endFormatted;
    }

    // Compare with original Outlook time
    const hasDeviation = zepStart !== startTime || zepEnd !== endTime;
    if (!hasDeviation) return null;

    // Determine reason for deviation
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

  const attendees = appointment.attendees || [];
  const attendeeCount = attendees.length;
  
  // Check if all attendees are from contiva.com (internal meeting)
  const attendeeDomains = [...new Set(attendees.map(a => a.emailAddress.address.split('@')[1]).filter(Boolean))];
  const isInternalOnly = attendeeCount > 0 && attendeeDomains.length === 1 && attendeeDomains[0] === "contiva.com";

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

  // Task options for editing mode (based on modified project or synced project)
  const editingTaskOptions: SelectOption[] = useMemo(() => {
    if (!isEditing || !allTasks) return [];
    const projectId = modifiedEntry?.newProjectId || syncedEntry?.project_id;
    if (!projectId) return [];
    const projectTasks = allTasks[projectId] || [];
    return projectTasks.map((t) => ({
      value: t.id,
      label: t.name,
      description: t.description,
    }));
  }, [isEditing, allTasks, modifiedEntry?.newProjectId, syncedEntry?.project_id]);

  // Konvertiere Activities zu SelectOptions - gefiltert nach Projekt/Vorgang
  const activityOptions: SelectOption[] = useMemo(() => {
    // Determine which project and task are currently selected
    const selectedProjectId = isEditing
      ? (modifiedEntry?.newProjectId || syncedEntry?.project_id)
      : appointment.projectId;
    const selectedTaskId = isEditing
      ? (modifiedEntry?.newTaskId || syncedEntry?.project_task_id)
      : appointment.taskId;

    // Find the selected task and project
    let selectedTask: Task | undefined;
    if (selectedTaskId && selectedProjectId) {
      // In editing mode, use allTasks; otherwise use tasks prop
      if (isEditing && allTasks && allTasks[selectedProjectId]) {
        selectedTask = allTasks[selectedProjectId].find(t => t.id === selectedTaskId);
      } else {
        selectedTask = tasks.find(t => t.id === selectedTaskId);
      }
    }
    const selectedProject = selectedProjectId
      ? projects.find(p => p.id === selectedProjectId)
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
  }, [activities, projects, tasks, allTasks, appointment.projectId, appointment.taskId, isEditing, modifiedEntry?.newProjectId, modifiedEntry?.newTaskId, syncedEntry?.project_id, syncedEntry?.project_task_id]);

  // Determine if billable can be changed in edit mode (based on task/project settings)
  const canEditBillableInEditMode = useMemo(() => {
    if (!isEditing) return true;
    
    const selectedProjectId = modifiedEntry?.newProjectId || syncedEntry?.project_id;
    const selectedTaskId = modifiedEntry?.newTaskId || syncedEntry?.project_task_id;
    
    if (!selectedTaskId || !selectedProjectId) return true; // No task selected yet
    
    // Find the selected task and project
    let selectedTask: Task | undefined;
    if (allTasks && allTasks[selectedProjectId]) {
      selectedTask = allTasks[selectedProjectId].find(t => t.id === selectedTaskId);
    }
    const selectedProject = projects.find(p => p.id === selectedProjectId);
    
    const projektFakt = selectedProject?.voreinstFakturierbarkeit ?? selectedProject?.defaultFakt;
    const vorgangFakt = selectedTask?.defaultFakt;
    
    return canChangeBillableForTask(projektFakt, vorgangFakt);
  }, [isEditing, allTasks, projects, modifiedEntry?.newProjectId, modifiedEntry?.newTaskId, syncedEntry?.project_id, syncedEntry?.project_task_id]);

  // Check if this entry has been modified (for visual indicator)
  const isModified = useMemo(() => {
    if (!modifiedEntry || !syncedEntry) return false;
    // Check project/task/activity/billable changes
    const hasProjectChanges =
      modifiedEntry.newProjectId !== syncedEntry.project_id ||
      modifiedEntry.newTaskId !== syncedEntry.project_task_id ||
      modifiedEntry.newActivityId !== syncedEntry.activity_id ||
      modifiedEntry.newBillable !== syncedEntry.billable;
    // Check time changes
    const hasTimeChanges = modifiedEntry.newVon !== undefined || modifiedEntry.newBis !== undefined;
    return hasProjectChanges || hasTimeChanges;
  }, [modifiedEntry, syncedEntry]);


  // Click outside handler: Cancel editing if no changes were made
  useEffect(() => {
    if (!isEditing || isModified) return;

    function handleClickOutside(event: MouseEvent) {
      const target = event.target as HTMLElement;

      // Check if click is inside the row
      if (editingRowRef.current?.contains(target)) {
        return;
      }

      // Check if click is inside a HeadlessUI portal (dropdown options)
      // HeadlessUI adds data-headlessui-state attribute to portal elements
      if (target.closest('[data-headlessui-state]')) {
        return;
      }

      // Use setTimeout to allow the click event on other edit buttons to be processed first
      setTimeout(() => {
        onCancelEditSynced?.(appointment.id);
      }, 0);
    }

    // Small delay to avoid immediate trigger from the edit button click
    const timer = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isEditing, isModified, appointment.id, onCancelEditSynced]);

  // Get synced project/task info for display
  const syncedInfo = useMemo(() => {
    if (!syncedEntry) return null;
    
    const project = projects.find((p) => p.id === syncedEntry.project_id);
    const activity = activities.find((a) => a.name === syncedEntry.activity_id);
    
    // Find task in allTasks if available
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
      taskName: taskName,
      activityId: syncedEntry.activity_id, // Short form like "be", "vw"
      activityName: activity?.description || syncedEntry.activity_id,
      billable: syncedEntry.billable,
    };
  }, [syncedEntry, projects, activities, allTasks]);

  // Muted state for unselected, non-synced appointments
  const isMuted = !appointment.selected && !isSynced && !isSyncReady;

  return (
    <div
      ref={editingRowRef}
      className={`px-3 py-2 border-x border-b border-t ${
        isSynced && isModified
          ? "border-yellow-300 bg-linear-to-r from-amber-50 via-yellow-50/50 to-green-50"
          : isSynced
            ? "border-green-200 bg-linear-to-r from-green-50 via-emerald-50/50 to-white"
            : isSyncReady
              ? "border-amber-200 bg-linear-to-r from-amber-50 via-yellow-50/50 to-white"
              : appointment.selected
                ? "border-gray-200 bg-white"
                : "border-gray-200 bg-gray-50/50"
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Status icons: Synced, Ready-to-sync, or Checkbox + duplicate warning below */}
        <div className="shrink-0 pt-0.5 w-5 flex flex-col items-center gap-1">
          {/* Primary status icon */}
          <div className="h-5 w-5 flex items-center justify-center">
            {isSynced && isModified ? (
              // Synced with pending changes - orange clock arrow up
              <div
                title="Änderungen ausstehend"
                role="img"
                aria-label="Änderungen ausstehend"
              >
                <ClockArrowUp className="h-4 w-4 text-amber-500" aria-hidden="true" />
              </div>
            ) : isSynced ? (
              // Synced without changes - green clock check
              <div
                title="Bereits in ZEP synchronisiert"
                role="img"
                aria-label="Bereits in ZEP synchronisiert"
              >
                <ClockCheck className="h-4 w-4 text-green-600" aria-hidden="true" />
              </div>
            ) : isSyncReady ? (
              // Ready to sync - orange clock arrow up
              <div
                title="Bereit zur Synchronisierung"
                role="img"
                aria-label="Bereit zur Synchronisierung"
              >
                <ClockArrowUp className="h-4 w-4 text-amber-500" aria-hidden="true" />
              </div>
            ) : (
              // Not synced, not ready - checkbox
              <input
                type="checkbox"
                checked={appointment.selected}
                onChange={() => onToggle(appointment.id)}
                className="h-4 w-4 text-blue-600 rounded"
                aria-label={`Termin auswählen: ${appointment.subject}`}
              />
            )}
          </div>
          {/* Duplicate warning indicator */}
          {duplicateWarning?.hasDuplicate && !isSynced && duplicateWarning.type !== 'rescheduled' && (
            <div
              className="h-4 w-4 flex items-center justify-center"
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

        {/* Main content - Title on top, details below */}
        <div className="flex-1 min-w-0">
          {/* Title row with duration */}
          <div className="flex items-center gap-1.5">
            {appointment.subject ? (
              <span className={`font-bold text-sm truncate ${isMuted ? "text-gray-400" : "text-gray-900"}`}>{appointment.subject}</span>
            ) : (
              <span className="font-medium text-gray-400 text-sm italic">Kein Titel definiert</span>
            )}
            {/* Organizer - inline after title */}
            {appointment.organizer && (
              <span
                className={`text-xs font-light shrink-0 ${isMuted ? "text-gray-400" : "text-gray-500"}`}
                title={appointment.organizer.emailAddress.address}
              >
                {appointment.isOrganizer ? "von Dir" : `von ${formatName(appointment.organizer.emailAddress.name) || appointment.organizer.emailAddress.address}`}
              </span>
            )}
            {/* Duration badge - shows both times for synced entries with checkmark on synced one */}
            {isSynced && !isEditing && zepBookedDuration ? (
              // Synced (not editing): Show both times with checkmark on synced one
              <span
                className={`inline-flex items-center gap-0.5 text-[10px] rounded ${isMuted ? "bg-gray-100 text-gray-400" : "bg-gray-100"}`}
                title={`In ZEP gebucht: ${zepBookedDuration.from}–${zepBookedDuration.to}`}
              >
                {/* Planned time - with checkmark if synced */}
                <span
                  className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-l ${
                    syncedTimeType === 'planned'
                      ? "bg-green-100 text-green-700 font-medium"
                      : "text-gray-400"
                  }`}
                  title={`Geplant: ${plannedDurationRounded.startFormatted}–${plannedDurationRounded.endFormatted}${syncedTimeType === 'planned' ? ' ✓ In ZEP gebucht' : ''}`}
                >
                  {syncedTimeType === 'planned' && <ClockCheck size={10} className="text-green-600" />}
                  {plannedDurationRounded.hours > 0 ? `${plannedDurationRounded.hours}h${plannedDurationRounded.minutes > 0 ? plannedDurationRounded.minutes : ''}` : `${plannedDurationRounded.minutes}m`}
                </span>
                <span className="text-gray-300">|</span>
                {/* Actual time - with checkmark if synced */}
                <span
                  className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-r ${
                    syncedTimeType === 'actual'
                      ? "bg-green-100 text-green-700 font-medium"
                      : actualDurationInfo
                        ? actualDurationInfo.color
                        : "text-gray-300"
                  }`}
                  title={actualDurationInfo
                    ? `Tatsächlich: ${actualDurationInfo.startRounded}–${actualDurationInfo.endRounded}${syncedTimeType === 'actual' ? ' ✓ In ZEP gebucht' : ''}`
                    : "Keine tatsächliche Zeit verfügbar"
                  }
                >
                  {syncedTimeType === 'actual' && <ClockCheck size={10} className="text-green-600" />}
                  {actualDurationInfo
                    ? (actualDurationInfo.hours > 0 ? `${actualDurationInfo.hours}h${actualDurationInfo.minutes > 0 ? actualDurationInfo.minutes : ''}` : `${actualDurationInfo.minutes}m`)
                    : "--"
                  }
                </span>
              </span>
            ) : (
              // Not synced or editing: Show both times as toggle buttons
              <span
                className={`inline-flex items-center gap-0.5 text-[10px] rounded ring-1 ${isMuted ? "bg-gray-100 text-gray-400 ring-gray-200" : "bg-gray-100 ring-blue-300"}`}
                title={actualDurationInfo
                  ? `Geplant: ${plannedDurationRounded.hours > 0 ? `${plannedDurationRounded.hours}h ${plannedDurationRounded.minutes}min` : `${plannedDurationRounded.minutes}min`} | Tatsächlich: ${actualDurationInfo.hours > 0 ? `${actualDurationInfo.hours}h ${actualDurationInfo.minutes}min` : `${actualDurationInfo.minutes}min`}`
                  : `Geplant: ${plannedDurationRounded.hours > 0 ? `${plannedDurationRounded.hours}h ${plannedDurationRounded.minutes}min` : `${plannedDurationRounded.minutes}min`} | Tatsächlich: keine Daten`
                }
              >
                {/* Planned time button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!actualDurationInfo) return; // Can't toggle without actual data
                    if (isEditing && syncedEntry && onModifyTime) {
                      onModifyTime(appointment.id, appointment, syncedEntry, false);
                    } else {
                      onUseActualTimeChange?.(appointment.id, false);
                    }
                  }}
                  disabled={!actualDurationInfo}
                  className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-l transition-colors ${
                    !appointment.useActualTime || !actualDurationInfo
                      ? "bg-blue-100 text-blue-700 font-medium"
                      : "text-gray-400 hover:text-gray-600 hover:bg-gray-200"
                  } ${!actualDurationInfo ? "cursor-default" : "cursor-pointer"}`}
                  title={`Geplant (gerundet): ${plannedDurationRounded.hours > 0 ? `${plannedDurationRounded.hours}h ${plannedDurationRounded.minutes}min` : `${plannedDurationRounded.minutes}min`} - für ZEP verwenden`}
                >
                  {(!appointment.useActualTime || !actualDurationInfo) && <Check size={10} />}
                  {plannedDurationRounded.hours > 0 ? `${plannedDurationRounded.hours}h${plannedDurationRounded.minutes > 0 ? plannedDurationRounded.minutes : ''}` : `${plannedDurationRounded.minutes}m`}
                </button>
                <span className="text-gray-300">|</span>
                {/* Actual time button - disabled if no actual data or if times are equal */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!actualDurationInfo || actualDurationInfo.difference === 0) return;
                    if (isEditing && syncedEntry && onModifyTime) {
                      onModifyTime(appointment.id, appointment, syncedEntry, true);
                    } else {
                      onUseActualTimeChange?.(appointment.id, true);
                    }
                  }}
                  disabled={!actualDurationInfo || actualDurationInfo.difference === 0}
                  className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-r transition-colors ${
                    !actualDurationInfo || actualDurationInfo.difference === 0
                      ? "text-gray-300 cursor-default"
                      : appointment.useActualTime
                        ? `bg-blue-100 font-medium ${actualDurationInfo.color}`
                        : `${actualDurationInfo.color} hover:bg-gray-200`
                  }`}
                  title={!actualDurationInfo
                    ? "Keine tatsächliche Zeit verfügbar"
                    : actualDurationInfo.difference === 0
                      ? "Tatsächliche Zeit entspricht der geplanten Zeit"
                      : `Tatsächlich (gerundet): ${actualDurationInfo.hours > 0 ? `${actualDurationInfo.hours}h ${actualDurationInfo.minutes}min` : `${actualDurationInfo.minutes}min`} - für ZEP verwenden`
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
            {/* Cancelled badge */}
            {appointment.isCancelled && (
              <span 
                className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-red-100 text-red-700 font-medium cursor-help"
                title={appointment.lastModifiedDateTime 
                  ? `Abgesagt am ${format(new Date(appointment.lastModifiedDateTime), "dd.MM.yyyy 'um' HH:mm", { locale: de })}` 
                  : "Abgesagt"}
              >
                <Ban size={10} />
                Abgesagt
                {appointment.lastModifiedDateTime && (
                  <span className="text-red-500">
                    ({format(new Date(appointment.lastModifiedDateTime), "dd.MM.", { locale: de })})
                  </span>
                )}
              </span>
            )}
            {/* Teams Meeting Icon */}
            {appointment.isOnlineMeeting && appointment.onlineMeetingProvider === "teamsForBusiness" && (
              <svg
                className={`w-3.5 h-3.5 shrink-0 ${isMuted ? "opacity-40" : ""}`}
                viewBox="0 0 2228.833 2073.333"
                xmlns="http://www.w3.org/2000/svg"
                aria-label="Teams Meeting"
              >
                <path fill="#5059C9" d="M1554.637 777.5h575.713c54.391 0 98.483 44.092 98.483 98.483v524.398c0 199.901-162.051 361.952-361.952 361.952h-1.711c-199.901.028-361.975-162.023-362.004-361.924V828.971c.001-28.427 23.045-51.471 51.471-51.471z"/>
                <circle fill="#5059C9" cx="1943.75" cy="440.583" r="233.25"/>
                <circle fill="#7B83EB" cx="1218.083" cy="336.917" r="336.917"/>
                <path fill="#7B83EB" d="M1667.323 777.5H717.01c-53.743 1.33-96.257 45.931-95.01 99.676v598.105c-7.505 322.519 247.657 590.16 570.167 598.053 322.51-7.893 577.671-275.534 570.167-598.053V877.176c1.245-53.745-41.268-98.346-95.011-99.676z"/>
                <linearGradient id="a" gradientUnits="userSpaceOnUse" x1="198.099" y1="1683.0726" x2="942.2344" y2="394.2607" gradientTransform="matrix(1 0 0 -1 0 2075.3333)">
                  <stop offset="0" stopColor="#5a62c3"/><stop offset=".5" stopColor="#4d55bd"/><stop offset="1" stopColor="#3940ab"/>
                </linearGradient>
                <path fill="url(#a)" d="M95.01 466.5h950.312c52.473 0 95.01 42.538 95.01 95.01v950.312c0 52.473-42.538 95.01-95.01 95.01H95.01c-52.473 0-95.01-42.538-95.01-95.01V561.51c0-52.472 42.538-95.01 95.01-95.01z"/>
                <path fill="#FFF" d="M820.211 828.193H630.241v517.297H509.211V828.193H320.123V727.844h500.088v100.349z"/>
              </svg>
            )}
            {/* Internal/External meeting badge */}
            {attendeeCount > 0 && (
              isInternalOnly ? (
                <span
                  className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-gray-100 text-gray-600"
                  title="Internes Meeting - nur Contiva-Teilnehmer"
                >
                  Intern
                </span>
              ) : (
                <span
                  className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-amber-100 text-amber-700"
                  title="Externes Meeting - externe Teilnehmer"
                >
                  Extern
                </span>
              )
            )}
            {/* Call badges */}
            {appointment.type === 'call' && (
              <>
                <span
                  className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-blue-100 text-blue-800"
                  title="Anruf"
                >
                  Call
                </span>
                {appointment.callType && (
                  <span
                    className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-gray-100 text-gray-600"
                    title={`Anruftyp: ${appointment.callType}`}
                  >
                    {appointment.callType}
                  </span>
                )}
                {appointment.direction && (
                  <span
                    className="text-[10px]"
                    title={appointment.direction === 'incoming' ? 'Eingehender Anruf' : 'Ausgehender Anruf'}
                  >
                    {appointment.direction === 'incoming' ? '📥' : '📤'}
                  </span>
                )}
              </>
            )}
          </div>
          
          {/* Details row - Date/Time, Organizer, Attendee Domains */}
          <div className={`flex items-center gap-2 text-xs mt-0.5 ${isMuted ? "text-gray-400" : "text-gray-500"}`}>
            {/* Date and Time - show ZEP booked time for synced (not editing), rounded times otherwise */}
            {(() => {
              // Build the time display content
              const timeContent = (
                <>
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
                </>
              );

              // Wrap in popover if there's a deviation, otherwise just show the content
              return timeDeviation ? (
                <TimeDeviationPopover
                  outlookStart={timeDeviation.outlookStart}
                  outlookEnd={timeDeviation.outlookEnd}
                  zepStart={timeDeviation.zepStart}
                  zepEnd={timeDeviation.zepEnd}
                  reason={timeDeviation.reason}
                  actualStart={timeDeviation.actualStart}
                  actualEnd={timeDeviation.actualEnd}
                >
                  {timeContent}
                </TimeDeviationPopover>
              ) : (
                <span>{timeContent}</span>
              );
            })()}
            
            {/* Attendees with Popover */}
            {attendeeCount > 0 && (
              <AttendeePopover
                attendees={attendees}
                organizer={appointment.organizer}
                isOrganizer={appointment.isOrganizer}
                isMuted={isMuted}
              />
            )}
          </div>
        </div>

        {/* Status badges */}
        <div className="shrink-0 flex items-center gap-1.5">
          {/* Editing badge */}
          {isSynced && isEditing && (
            <span className="px-2 py-0.5 text-xs font-medium text-yellow-700 bg-yellow-50 rounded">
              In Bearbeitung
            </span>
          )}
          {isSynced && (
            <span className="px-2 py-0.5 text-xs font-medium text-green-700 bg-green-50 rounded">
              ZEP
            </span>
          )}
          {duplicateWarning?.hasDuplicate && !isSynced && duplicateWarning.type !== 'rescheduled' && (
            <span className="px-2 py-0.5 text-xs font-medium text-amber-700 bg-amber-50 rounded" title={duplicateWarning.message}>
              {duplicateWarning.type === 'exact' ? 'Duplikat' : duplicateWarning.type === 'timeOverlap' ? 'Konflikt' : 'Ähnlich'}
            </span>
          )}
          {/* Rescheduled appointment - show correction button */}
          {duplicateWarning?.type === 'rescheduled' && !isSynced && onCorrectTime && (
            <button
              onClick={() => onCorrectTime(appointment.id, duplicateWarning)}
              disabled={isCorrectingTime}
              className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium text-blue-700 bg-blue-50 rounded hover:bg-blue-100 transition disabled:opacity-50"
              title={duplicateWarning.message}
            >
              <RefreshCw size={10} className={isCorrectingTime ? "animate-spin" : ""} />
              Zeiten korrigieren
            </button>
          )}
          
          {/* Edit/Cancel button for synced */}
          {isSynced && onStartEditSynced && onCancelEditSynced && (
            <button
              onClick={() => isEditing 
                ? onCancelEditSynced(appointment.id) 
                : onStartEditSynced(appointment.id)
              }
              className={`p-1 rounded transition ${
                isEditing 
                  ? "text-blue-600 hover:text-blue-800 hover:bg-blue-100" 
                  : "text-gray-400 hover:text-blue-600 hover:bg-blue-50"
              }`}
              title={isEditing ? "Bearbeitung abbrechen" : "Bearbeiten"}
            >
              {isEditing ? <X size={12} /> : <Pencil size={12} />}
            </button>
          )}
        </div>
      </div>

      {/* Synced entry info - compact inline */}
      {isSynced && syncedInfo && !isEditing && (
        <div className="mt-1 ml-8 flex items-center gap-2 text-xs text-gray-500">
          <span className="font-medium text-gray-600">{syncedInfo.projectName}</span>
          {syncedInfo.taskName && (
            <>
              <span className="text-gray-300">/</span>
              <span title={syncedInfo.activityName}>
                {syncedInfo.taskName} <span className="text-gray-400">({syncedInfo.activityId})</span>
              </span>
            </>
          )}
          <span className="text-gray-300">•</span>
          <span title={syncedInfo.billable ? "Fakturierbar" : "Nicht fakturierbar (intern)"}>
            <Banknote
              size={14}
              className={syncedInfo.billable ? "text-amber-500" : "text-gray-400"}
            />
          </span>
          {isModified && <span className="text-amber-600 font-medium">Geändert</span>}
        </div>
      )}

      {/* Rescheduled appointment info - show time change details */}
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

      {/* Editing UI for synced entries - inline like normal appointments */}
      {isSynced && isEditing && syncedEntry && (
        <div className="mt-3 ml-8 flex flex-wrap items-end gap-3">
          {/* Projekt-Dropdown */}
          <div className="flex flex-col min-w-0">
            <label className="text-xs text-gray-500 mb-1">Projekt</label>
            <SearchableSelect
              options={projectOptions}
              value={modifiedEntry?.newProjectId || syncedEntry.project_id}
              onChange={(val) => {
                if (val !== null && onModifyProject && syncedEntry) {
                  onModifyProject(appointment.id, appointment, syncedEntry, Number(val));
                }
              }}
              placeholder="-- Projekt wählen --"
              className="w-64 sm:w-72"
            />
          </div>

          {/* Task-Dropdown */}
          <div className="flex flex-col min-w-0">
            <label className="text-xs text-gray-500 mb-1">Task</label>
            <SearchableSelect
              options={editingTaskOptions}
              value={modifiedEntry?.newTaskId || syncedEntry.project_task_id}
              onChange={(val) => {
                if (val !== null && onModifyTask) {
                  onModifyTask(appointment.id, Number(val));
                }
              }}
              placeholder="-- Task wählen --"
              disabled={editingTaskOptions.length === 0}
              disabledMessage={editingTaskOptions.length === 0 ? "Laden..." : undefined}
              className="w-64 sm:w-72"
            />
          </div>

          {/* Activity-Dropdown */}
          <div className="flex flex-col min-w-0">
            <label className="text-xs text-gray-500 mb-1">Tätigkeit</label>
            <SearchableSelect
              options={activityOptions}
              value={modifiedEntry?.newActivityId || syncedEntry.activity_id}
              onChange={(val) => {
                if (val !== null && onModifyActivity && syncedEntry) {
                  onModifyActivity(appointment.id, appointment, syncedEntry, String(val));
                }
              }}
              placeholder="-- Tätigkeit wählen --"
              disabled={!(modifiedEntry?.newTaskId || syncedEntry.project_task_id)}
              disabledMessage={!(modifiedEntry?.newProjectId || syncedEntry.project_id) ? "Erst Projekt wählen" : "Erst Task wählen"}
              className="w-40 sm:w-48"
            />
          </div>

          {/* Billable Toggle */}
          <div className="flex flex-col">
            <label className="text-xs text-gray-500 mb-1">Fakt.</label>
            <button
              type="button"
              onClick={() => {
                if (onModifyBillable && syncedEntry && canEditBillableInEditMode && (modifiedEntry?.newTaskId || syncedEntry.project_task_id)) {
                  const currentBillable = modifiedEntry?.newBillable ?? syncedEntry.billable;
                  onModifyBillable(appointment.id, appointment, syncedEntry, !currentBillable);
                }
              }}
              disabled={!(modifiedEntry?.newTaskId || syncedEntry.project_task_id) || !canEditBillableInEditMode}
              className={`flex items-center justify-center w-10 h-9.5 rounded-lg border transition-colors ${
                !(modifiedEntry?.newTaskId || syncedEntry.project_task_id)
                  ? "bg-gray-100 border-gray-200 text-gray-300 cursor-not-allowed"
                  : !canEditBillableInEditMode
                    ? (modifiedEntry?.newBillable ?? syncedEntry.billable)
                      ? "bg-amber-50 border-amber-300 text-amber-500 cursor-not-allowed opacity-70"
                      : "bg-gray-50 border-gray-300 text-gray-400 cursor-not-allowed opacity-70"
                    : (modifiedEntry?.newBillable ?? syncedEntry.billable)
                      ? "bg-amber-50 border-amber-300 text-amber-500 hover:bg-amber-100"
                      : "bg-gray-50 border-gray-300 text-gray-400 hover:bg-gray-100"
              }`}
              title={
                !(modifiedEntry?.newTaskId || syncedEntry.project_task_id)
                  ? "Erst Task wählen"
                  : !canEditBillableInEditMode
                    ? `Fakturierbarkeit vom Projekt/Vorgang festgelegt (${(modifiedEntry?.newBillable ?? syncedEntry.billable) ? "fakturierbar" : "nicht fakturierbar"})`
                    : (modifiedEntry?.newBillable ?? syncedEntry.billable)
                      ? "Fakturierbar - klicken zum Ändern"
                      : "Nicht fakturierbar (intern) - klicken zum Ändern"
              }
            >
              <Banknote size={18} className={!(modifiedEntry?.newTaskId || syncedEntry.project_task_id) || !(modifiedEntry?.newBillable ?? syncedEntry.billable) ? "opacity-50" : ""} />
            </button>
          </div>

          {/* Sync button for pending changes */}
          <div className="flex flex-col">
            <label className={`text-xs mb-1 ${!isModified ? "text-gray-300" : "text-gray-500"}`}>Sync</label>
            <button
              type="button"
              onClick={() => modifiedEntry && isModified && onSaveModifiedSingle?.(modifiedEntry)}
              disabled={isSavingModifiedSingle || !onSaveModifiedSingle || !isModified}
              className={`flex items-center justify-center w-10 h-9.5 rounded-lg border transition-colors ${
                isSavingModifiedSingle
                  ? "bg-green-500 border-green-500 text-white cursor-wait"
                  : !isModified
                    ? "bg-gray-50 border-gray-200 text-gray-300 cursor-not-allowed opacity-40"
                    : "bg-green-600 border-green-600 text-white hover:bg-green-700 hover:border-green-700"
              }`}
              title={isSavingModifiedSingle ? "Wird gespeichert..." : !isModified ? "Keine Änderungen" : "Änderungen in ZEP speichern"}
            >
              {isSavingModifiedSingle ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <ClockArrowUp size={18} />
              )}
            </button>
          </div>
        </div>
      )}

      {/* Dropdowns for selected unsynchronized appointments */}
      {appointment.selected && !isSynced && (
        <div className="mt-3 ml-8 flex flex-wrap items-end gap-3">
          {/* Projekt-Dropdown */}
          <div className="flex flex-col min-w-0">
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
              className="w-64 sm:w-72"
            />
          </div>

          {/* Task-Dropdown */}
          <div className="flex flex-col min-w-0">
            <label className={`text-xs mb-1 ${!appointment.projectId ? "text-gray-300" : "text-gray-500"}`}>Task</label>
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
              disabled={!appointment.projectId || (tasks.length === 0 && !loadingTasks)}
              disabledMessage={
                !appointment.projectId
                  ? "Erst Projekt wählen"
                  : loadingTasks
                    ? "Laden..."
                    : "Keine Tasks vorhanden"
              }
              loading={loadingTasks}
              className="w-64 sm:w-72"
            />
          </div>

          {/* Activity-Dropdown */}
          <div className="flex flex-col min-w-0">
            <label className={`text-xs mb-1 ${!appointment.taskId ? "text-gray-300" : "text-gray-500"}`}>Tätigkeit</label>
            <SearchableSelect
              options={activityOptions}
              value={appointment.activityId}
              onChange={(val) =>
                onActivityChange(appointment.id, String(val ?? "be"))
              }
              placeholder="-- Tätigkeit wählen --"
              disabled={!appointment.taskId}
              disabledMessage={!appointment.projectId ? "Erst Projekt wählen" : "Erst Task wählen"}
              className="w-40 sm:w-48"
            />
          </div>

          {/* Billable Toggle */}
          <div className="flex flex-col">
            <label className={`text-xs mb-1 ${!appointment.taskId ? "text-gray-300" : "text-gray-500"}`}>Fakt.</label>
            <button
              type="button"
              onClick={() => appointment.taskId && appointment.canChangeBillable && onBillableChange(appointment.id, !appointment.billable)}
              disabled={!appointment.taskId || !appointment.canChangeBillable}
              className={`flex items-center justify-center w-10 h-9.5 rounded-lg border transition-colors ${
                !appointment.taskId
                  ? "bg-gray-50 border-gray-200 text-gray-300 cursor-not-allowed opacity-40"
                  : appointment.billable
                    ? `bg-amber-50 border-amber-300 text-amber-500 ${appointment.canChangeBillable ? "hover:bg-amber-100" : "cursor-not-allowed"}`
                    : `bg-gray-50 border-gray-300 text-gray-400 ${appointment.canChangeBillable ? "hover:bg-gray-100" : "cursor-not-allowed"}`
              }`}
              title={
                !appointment.taskId 
                  ? "Erst Task wählen" 
                  : !appointment.canChangeBillable
                    ? `Fakturierbarkeit vom Projekt/Vorgang festgelegt (${appointment.billable ? "fakturierbar" : "nicht fakturierbar"})`
                    : appointment.billable 
                      ? "Fakturierbar - klicken zum Ändern" 
                      : "Nicht fakturierbar (intern) - klicken zum Ändern"
              }
            >
              <Banknote size={18} className={!appointment.taskId || (!appointment.billable && appointment.canChangeBillable) ? "opacity-50" : ""} />
            </button>
          </div>

          {/* Single Sync Button */}
          {onSyncSingle && (
            <div className="flex flex-col">
              <label className={`text-xs mb-1 ${!isSyncReady ? "text-gray-300" : "text-gray-500"}`}>Sync</label>
              <button
                type="button"
                onClick={() => isSyncReady && onSyncSingle(appointment)}
                disabled={!isSyncReady || isSyncingSingle}
                className={`flex items-center justify-center w-10 h-9.5 rounded-lg border transition-colors ${
                  isSyncingSingle
                    ? "bg-green-500 border-green-500 text-white cursor-wait"
                    : !isSyncReady
                      ? "bg-gray-50 border-gray-200 text-gray-300 cursor-not-allowed opacity-40"
                      : "bg-green-600 border-green-600 text-white hover:bg-green-700 hover:border-green-700"
                }`}
                title={
                  isSyncingSingle
                    ? "Wird synchronisiert..."
                    : !isSyncReady
                      ? "Erst Projekt und Task wählen"
                      : "Jetzt zu ZEP synchronisieren"
                }
              >
                {isSyncingSingle ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <ClockArrowUp size={18} className={!isSyncReady ? "opacity-50" : ""} />
                )}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
