"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import { Search, X, RotateCcw, ClockArrowUp, Check, Minus, User, ChevronDown } from "lucide-react";
import AppointmentRow from "./AppointmentRow";
import SeriesGroup from "./SeriesGroup";
import SyncConfirmDialog from "./SyncConfirmDialog";
import type { DuplicateCheckResult } from "@/lib/zep-api";
import { ActualDuration, ActualDurationsMap, normalizeJoinUrl, getDurationKey } from "@/lib/teams-utils";
import { RedisSyncMapping } from "@/lib/redis";

interface WorkLocation {
  kurzform: string;
  bezeichnung: string;
  heimarbeitsort: boolean;
}

interface Project {
  id: number;
  name: string;
  description: string;
  workLocations?: string[];
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
  billable: boolean;
  canChangeBillable: boolean;
  attendees?: Attendee[];
  isOrganizer?: boolean;
  seriesMasterId?: string;
  type?: 'calendar' | 'call' | 'singleInstance' | 'occurrence' | 'exception' | 'seriesMaster';
  callType?: 'Phone' | 'Video' | 'ScreenShare';
  direction?: 'incoming' | 'outgoing';
  isOnlineMeeting?: boolean;
  onlineMeeting?: { joinUrl?: string };
  useActualTime?: boolean; // true = use actual time from call records, false = use planned time
  customRemark?: string; // Optional: alternative remark for ZEP (overrides subject)
  workLocation?: string;
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
  projektNr?: string;
  vorgangNr?: string;
  work_location_id?: string | null;
}

// Modified entry for rebooking synced entries
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
  newOrt?: string;
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

interface AppointmentListProps {
  appointments: Appointment[];
  projects: Project[];
  tasks: Record<number, Task[]>;
  activities: Activity[];
  syncedEntries: ZepEntry[];
  syncMappings?: Map<string, RedisSyncMapping>;
  duplicateWarnings?: Map<string, DuplicateCheckResult>;
  loadingTasks?: Set<number>;
  // Loading state for skeleton
  loading?: boolean;
  // Actual meeting durations from call records
  actualDurations?: ActualDurationsMap;
  onToggle: (id: string) => void;
  onToggleSeries: (seriesId: string, selected: boolean) => void;
  onSelectAll: (selected: boolean) => void;
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
  onSubmit: (appointmentsToSync: Appointment[], modifiedEntries?: ModifiedEntry[]) => void;
  onSyncSingle?: (appointment: Appointment) => void;
  syncingSingleId?: string | null;
  // Series sync
  onSyncSeries?: (seriesId: string, appointments: Appointment[]) => void;
  syncingSeriesId?: string | null;
  onReset: () => void;
  submitting: boolean;
  // Editing synced entries (rebooking)
  editingAppointments?: Set<string>;
  modifiedEntries?: Map<string, ModifiedEntry>;
  onStartEditSynced?: (appointmentId: string) => void;
  onCancelEditSynced?: (appointmentId: string) => void;
  onModifyProject?: (appointmentId: string, apt: Appointment, syncedEntry: ZepEntry, projectId: number) => void;
  onModifyTask?: (appointmentId: string, taskId: number) => void;
  onModifyActivity?: (appointmentId: string, apt: Appointment, syncedEntry: ZepEntry, activityId: string) => void;
  onModifyBillable?: (appointmentId: string, apt: Appointment, syncedEntry: ZepEntry, billable: boolean) => void;
  onModifyBemerkung?: (appointmentId: string, apt: Appointment, syncedEntry: ZepEntry, bemerkung: string) => void;
  onModifyTime?: (appointmentId: string, apt: Appointment, syncedEntry: ZepEntry, useActualTime: boolean) => void;
  onSaveModifiedSingle?: (modifiedEntry: ModifiedEntry) => void;
  savingModifiedSingleId?: string | null;
  // Rescheduled appointment time correction
  onCorrectTime?: (appointmentId: string, duplicateWarning: DuplicateCheckResult) => void;
  correctingTimeIds?: Set<string>;
  // Conflict link popover
  onLinkToZep?: (appointmentId: string, zepEntryId: number) => void;
  // Filter props
  totalAppointmentsCount?: number;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  filterDate?: string | null;
  onFilterDateClear?: () => void;
  seriesFilterActive?: boolean;
  onSeriesFilterClear?: () => void;
  // Status filter: "all" | "synced" | "inProgress" | "unprocessed"
  statusFilter?: string;
  onStatusFilterChange?: (status: string) => void;
  hideSoloMeetings?: boolean;
  onHideSoloMeetingsChange?: (hide: boolean) => void;
  focusedAppointmentId?: string | null;
  // Highlighted appointment (from UpcomingMeetingBar jump)
  highlightedAppointment?: { id: string; type: "running" | "upcoming" } | null;
  globalWorkLocations?: WorkLocation[];
  onWorkLocationChange?: (id: string, workLocation: string | undefined) => void;
  onModifyWorkLocation?: (appointmentId: string, apt: Appointment, syncedEntry: ZepEntry, workLocation: string | undefined) => void;
}

// Status filter options with colors
const STATUS_FILTER_OPTIONS = [
  { value: "all", label: "Alle", color: null },
  { value: "synced", label: "Synchronisiert", color: "bg-green-500" },
  { value: "inProgress", label: "In Bearbeitung", color: "bg-amber-400" },
  { value: "unprocessed", label: "Unbearbeitet", color: "bg-red-400" },
];

interface GroupedItem {
  type: "single" | "series";
  seriesId?: string;
  appointments: Appointment[];
  firstStart: Date;
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

// Skeleton component for loading state - with variation for realistic look
function AppointmentSkeleton({ variant = 0 }: { variant?: number }) {
  // Different title widths for variation
  const titleWidths = ["w-64", "w-48", "w-72", "w-56", "w-40"];
  const orgWidths = ["w-28", "w-24", "w-32", "w-20", "w-36"];
  const isSynced = variant === 0 || variant === 3; // Some appear synced

  return (
    <div className="bg-white border border-gray-100 rounded-lg p-4 animate-pulse">
      {/* Row 1: Main info */}
      <div className="flex items-start gap-3">
        {/* Checkbox or synced icon skeleton */}
        {isSynced ? (
          <div className="w-5 h-5 bg-green-100 rounded-full mt-0.5 shrink-0" />
        ) : (
          <div className="w-4 h-4 bg-gray-200 rounded mt-1 shrink-0" />
        )}

        {/* Content area */}
        <div className="flex-1 min-w-0">
          {/* Title row */}
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            {/* Title */}
            <div className={`h-4 bg-gray-200 rounded ${titleWidths[variant % titleWidths.length]}`} />
            {/* "von" text */}
            <div className={`h-3 bg-gray-100 rounded ${orgWidths[variant % orgWidths.length]}`} />
            {/* Separator dot */}
            <div className="w-1 h-1 bg-gray-300 rounded-full" />
            {/* Attendees badge */}
            <div className="h-5 bg-gray-100 rounded-full w-8" />
            {/* Separator dot */}
            <div className="w-1 h-1 bg-gray-300 rounded-full" />
            {/* Teams icon placeholder */}
            <div className="w-4 h-4 bg-gray-100 rounded" />
          </div>

          {/* Time and duration row */}
          <div className="flex items-center gap-2">
            {/* Time range */}
            <div className="h-3.5 bg-gray-100 rounded w-32" />
            {/* Separator dot */}
            <div className="w-1 h-1 bg-gray-300 rounded-full" />
            {/* Duration badge */}
            <div className={`h-6 rounded-full w-14 ${isSynced ? "bg-green-100" : "bg-gray-100"}`} />
            {/* Separator */}
            <div className="w-px h-3 bg-gray-200" />
            {/* Actual duration */}
            <div className="h-4 bg-gray-100 rounded w-8" />
          </div>
        </div>

        {/* Right side: Tags */}
        <div className="flex items-center gap-2 shrink-0">
          {isSynced && <div className="h-5 bg-green-100 rounded-full w-16" />}
          <div className={`h-5 rounded-full w-12 ${variant % 2 === 0 ? "bg-blue-50" : "bg-orange-50"}`} />
        </div>
      </div>

      {/* Row 2: Form fields or synced info */}
      {isSynced ? (
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-50">
          {/* Project/Task info for synced */}
          <div className="h-4 bg-gray-100 rounded w-32" />
          <div className="h-4 bg-gray-100 rounded w-1" />
          <div className="h-4 bg-gray-100 rounded w-24" />
          <div className="h-5 w-5 bg-gray-100 rounded ml-2" />
        </div>
      ) : (
        <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-50">
          {/* Projekt dropdown */}
          <div className="flex flex-col gap-1.5">
            <div className="h-3 bg-gray-100 rounded w-12" />
            <div className="h-9 bg-gray-100 rounded w-44" />
          </div>

          {/* Task dropdown */}
          <div className="flex flex-col gap-1.5">
            <div className="h-3 bg-gray-100 rounded w-8" />
            <div className="h-9 bg-gray-100 rounded w-32" />
          </div>

          {/* Tätigkeit dropdown */}
          <div className="flex flex-col gap-1.5">
            <div className="h-3 bg-gray-100 rounded w-16" />
            <div className="h-9 bg-gray-100 rounded w-32" />
          </div>

          {/* Fakt. button */}
          <div className="flex flex-col gap-1.5">
            <div className="h-3 bg-gray-100 rounded w-8" />
            <div className="h-9 w-9 bg-gray-100 rounded" />
          </div>

          {/* Zeit buttons */}
          <div className="flex flex-col gap-1.5">
            <div className="h-3 bg-gray-100 rounded w-8" />
            <div className="flex gap-1">
              <div className="h-9 w-11 bg-gray-100 rounded" />
              <div className="h-9 w-11 bg-gray-100 rounded" />
            </div>
          </div>

          {/* Sync button */}
          <div className="flex flex-col gap-1.5">
            <div className="h-3 bg-gray-100 rounded w-8" />
            <div className="h-9 w-9 bg-gray-100 rounded" />
          </div>
        </div>
      )}
    </div>
  );
}

// Skeleton list with 5 items
function AppointmentListSkeleton() {
  return (
    <div>
      {/* Header skeleton */}
      <div className="bg-white border border-gray-200 rounded-t-lg shadow-md">
        <div className="flex items-center px-4 py-3">
          {/* Checkbox */}
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 bg-gray-200 rounded animate-pulse" />
            <div className="h-4 bg-gray-200 rounded w-16 animate-pulse" />
          </div>

          <div className="h-8 w-px bg-gray-200 mx-3" />

          {/* Search */}
          <div className="flex-1 flex items-center gap-2">
            <div className="w-5 h-5 bg-gray-200 rounded animate-pulse" />
            <div className="h-4 bg-gray-200 rounded w-24 animate-pulse" />
          </div>

          <div className="h-8 w-px bg-gray-200 mx-3" />

          {/* Filter button */}
          <div className="h-8 bg-gray-200 rounded w-20 animate-pulse" />

          <div className="h-8 w-px bg-gray-200 mx-3" />

          {/* Count */}
          <div className="h-4 bg-gray-200 rounded w-16 animate-pulse" />

          <div className="flex-1" />

          {/* Sync button */}
          <div className="h-10 bg-gray-200 rounded w-28 animate-pulse" />
        </div>
      </div>

      {/* Appointment skeletons with variation */}
      <div className="flex flex-col gap-1 py-1">
        {[0, 1, 2, 3, 4].map((i) => (
          <AppointmentSkeleton key={i} variant={i} />
        ))}
      </div>

      {/* Footer skeleton */}
      <div className="px-4 py-3 border border-gray-200 bg-white rounded-b-lg">
        <div className="flex items-center gap-4">
          <div className="h-4 bg-gray-200 rounded w-40 animate-pulse" />
          <div className="h-4 bg-gray-200 rounded w-24 animate-pulse" />
        </div>
      </div>
    </div>
  );
}

export default function AppointmentList({
  appointments,
  projects,
  tasks,
  activities,
  syncedEntries,
  syncMappings,
  duplicateWarnings,
  loadingTasks,
  loading,
  actualDurations,
  onToggle,
  onToggleSeries,
  onSelectAll,
  onProjectChange,
  onTaskChange,
  onActivityChange,
  onBillableChange,
  onCustomRemarkChange,
  onUseActualTimeChange,
  onApplyToSeries,
  onSubmit,
  onSyncSingle,
  syncingSingleId,
  onSyncSeries,
  syncingSeriesId,
  onReset,
  submitting,
  editingAppointments,
  modifiedEntries,
  onStartEditSynced,
  onCancelEditSynced,
  onModifyProject,
  onModifyTask,
  onModifyActivity,
  onModifyBillable,
  onModifyBemerkung,
  onModifyTime,
  onSaveModifiedSingle,
  savingModifiedSingleId,
  onCorrectTime,
  correctingTimeIds,
  onLinkToZep,
  // Filter props
  totalAppointmentsCount,
  searchQuery,
  onSearchChange,
  filterDate,
  onFilterDateClear,
  seriesFilterActive,
  onSeriesFilterClear,
  statusFilter = "all",
  onStatusFilterChange,
  hideSoloMeetings,
  onHideSoloMeetingsChange,
  focusedAppointmentId,
  highlightedAppointment,
  globalWorkLocations,
  onWorkLocationChange,
  onModifyWorkLocation,
}: AppointmentListProps) {
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [soloPopoverOpen, setSoloPopoverOpen] = useState(false);
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const statusDropdownRef = useRef<HTMLDivElement>(null);
  const statusTriggerRef = useRef<HTMLButtonElement>(null);
  const [soloPopoverOpenAbove, setSoloPopoverOpenAbove] = useState(false);
  const [soloToggleCount, setSoloToggleCount] = useState(() => {
    if (typeof window !== "undefined") {
      return parseInt(localStorage.getItem("soloToggleCount") || "0", 10);
    }
    return 0;
  });
  const soloPopoverRef = useRef<HTMLDivElement>(null);
  const soloTriggerRef = useRef<HTMLButtonElement>(null);

  // Close solo popover when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        soloPopoverRef.current &&
        !soloPopoverRef.current.contains(event.target as Node) &&
        soloTriggerRef.current &&
        !soloTriggerRef.current.contains(event.target as Node)
      ) {
        setSoloPopoverOpen(false);
      }
    }
    if (soloPopoverOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [soloPopoverOpen]);

  // Close status dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        statusDropdownRef.current &&
        !statusDropdownRef.current.contains(event.target as Node) &&
        statusTriggerRef.current &&
        !statusTriggerRef.current.contains(event.target as Node)
      ) {
        setStatusDropdownOpen(false);
      }
    }
    if (statusDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [statusDropdownOpen]);

  // Helper to open solo popover with position calculation
  const openSoloPopover = () => {
    if (soloTriggerRef.current) {
      const rect = soloTriggerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const popoverHeight = 120; // Approximate height
      setSoloPopoverOpenAbove(spaceBelow < popoverHeight && rect.top > popoverHeight);
    }
    setSoloPopoverOpen(true);
  };

  // Handle solo toggle with popover logic
  const handleSoloToggle = () => {
    const willHide = !hideSoloMeetings;
    onHideSoloMeetingsChange?.(willHide);

    // Only show popover when enabling (showing solo meetings), not when hiding
    if (!willHide && soloToggleCount < 3) {
      const newCount = soloToggleCount + 1;
      setSoloToggleCount(newCount);
      localStorage.setItem("soloToggleCount", String(newCount));

      openSoloPopover();
      // Auto-close after 3 seconds
      setTimeout(() => setSoloPopoverOpen(false), 3000);
    }
  };

  // Count complete modifications that have actual changes
  const completeModificationsCount = useMemo(() => {
    if (!modifiedEntries) return 0;
    return Array.from(modifiedEntries.values()).filter((mod) => {
      // Must be complete (have project and task, or have time changes)
      const isComplete = (mod.newProjectId > 0 && mod.newTaskId > 0) || mod.newVon !== undefined || mod.newBis !== undefined;
      if (!isComplete) return false;

      // Must have actual changes compared to original
      const hasProjectChanges =
        mod.newProjectId !== mod.originalProjectId ||
        mod.newTaskId !== mod.originalTaskId ||
        mod.newActivityId !== mod.originalActivityId ||
        mod.newBillable !== mod.originalBillable;
      const hasTimeChanges = mod.newVon !== undefined || mod.newBis !== undefined;

      return hasProjectChanges || hasTimeChanges;
    }).length;
  }, [modifiedEntries]);

  // Termine die auswählbar sind (nicht bereits gesynced)
  const selectableAppointments = useMemo(() => {
    return appointments.filter(apt => !isAppointmentSynced(apt, syncedEntries, syncMappings));
  }, [appointments, syncedEntries, syncMappings]);

  // Collect ZEP entry IDs already linked to any appointment (via Redis or subject match)
  const linkedZepIds = useMemo(() => {
    const ids = new Set<number>();
    for (const apt of appointments) {
      const entry = findSyncedEntry(apt, syncedEntries, syncMappings);
      if (entry?.id) ids.add(entry.id);
    }
    return ids;
  }, [appointments, syncedEntries, syncMappings]);

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

  // Appointments that are ready to sync (selected, complete, NOT already synced)
  const syncReadyAppointments = appointments.filter((a) => isAppointmentSyncReady(a, syncedEntries, syncMappings));

  // Selected appointments that are NOT synced and still need project/task assignment
  const incompleteUnsyncedAppointments = selectedAppointments.filter(
    (a) => !isAppointmentSynced(a, syncedEntries, syncMappings) && (!a.projectId || !a.taskId)
  );

  const totalMinutes = selectedAppointments.reduce((acc, apt) => {
    const start = new Date(apt.start.dateTime);
    const end = new Date(apt.end.dateTime);
    return acc + (end.getTime() - start.getTime()) / 1000 / 60;
  }, 0);

  const hours = Math.floor(totalMinutes / 60);
  const minutes = Math.round(totalMinutes % 60);

  // Handle confirm from dialog with filtered appointments and modifications
  const handleConfirmSync = (includedAppointments: Appointment[], modifications?: ModifiedEntry[]) => {
    setShowConfirmDialog(false);
    onSubmit(includedAppointments, modifications);
  };

  // Zähle Serien
  const seriesCount = groupedItems.filter((g) => g.type === "series").length;

  // Berechne ob alle/einige/keine auswählbaren Termine ausgewählt sind
  const selectedSelectableCount = selectableAppointments.filter(a => a.selected).length;
  const allSelectableSelected = selectableAppointments.length > 0 && selectedSelectableCount === selectableAppointments.length;
  const someSelectableSelected = selectedSelectableCount > 0 && selectedSelectableCount < selectableAppointments.length;

  // Loading state - show skeleton
  if (loading) {
    return <AppointmentListSkeleton />;
  }

  // Keine Termine geladen (nicht gefiltert - wirklich keine Daten)
  if (appointments.length === 0 && (!totalAppointmentsCount || totalAppointmentsCount === 0)) {
    return (
      <div className="p-8 text-center text-gray-500 bg-gray-50 rounded-lg border border-gray-200">
        Keine Termine gefunden. Wähle einen Zeitraum und klicke auf &quot;Termine laden&quot;.
      </div>
    );
  }

  // Determine if filter controls should be shown (moved up for empty filtered state)
  const showFilterControls = onSearchChange !== undefined;

  // Filter aktiv aber keine Ergebnisse - zeige Filterbar mit Hinweis
  if (appointments.length === 0 && totalAppointmentsCount && totalAppointmentsCount > 0) {
    return (
      <div>
        {/* Header mit Filter (ohne Checkbox da keine Termine) */}
        <div className="relative bg-white border border-gray-200 rounded-t-lg shadow-md">
          <div className="flex items-center">
            {/* Platzhalter für Checkbox-Bereich */}
            <div className="flex items-center gap-3 px-4 py-3">
              <span className="text-sm text-gray-500 whitespace-nowrap">
                Keine Ergebnisse
              </span>
            </div>

            {showFilterControls && (
              <>
                {/* Divider */}
                <div className="h-8 w-px bg-gray-200" />

                {/* Search input */}
                <div className="relative flex-1">
                  <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Suchen..."
                    value={searchQuery || ""}
                    onChange={(e) => onSearchChange?.(e.target.value)}
                    className="w-full pl-11 pr-10 py-3 text-sm bg-transparent border-0 focus:outline-none focus:ring-0"
                    aria-label="Termine durchsuchen"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => onSearchChange?.("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition"
                      aria-label="Suche löschen"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                {/* Divider */}
                <div className="h-8 w-px bg-gray-200" />

                {/* Count */}
                <div className="px-3 text-sm text-gray-500 whitespace-nowrap">
                  <span className="font-medium text-gray-700">0</span>
                  <span className="text-gray-400"> / {totalAppointmentsCount}</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Hinweis dass keine Ergebnisse gefunden wurden */}
        <div className="p-8 text-center text-gray-500 bg-gray-50 border border-t-0 border-gray-200 rounded-b-lg">
          Keine Termine für diese Filterkriterien gefunden.
          {searchQuery && (
            <button
              onClick={() => onSearchChange?.("")}
              className="ml-2 text-blue-600 hover:text-blue-800 underline"
            >
              Suche zurücksetzen
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header mit "Alle auswählen" Checkbox und Filter */}
      <div className="relative bg-white border border-gray-200 rounded-t-lg shadow-md">
        <div className="flex items-center">
          {/* Checkbox und Auswahl-Text */}
          <div className="flex items-center gap-3 px-4 py-3">
            {selectableAppointments.length > 0 && (
              <>
                <button
                  type="button"
                  onClick={() => onSelectAll(!allSelectableSelected)}
                  className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                    allSelectableSelected || someSelectableSelected
                      ? "bg-blue-50 border-blue-300 text-blue-500"
                      : "border-gray-300 bg-white hover:bg-gray-50"
                  }`}
                  aria-label="Alle Termine auswählen"
                  aria-pressed={allSelectableSelected}
                >
                  {allSelectableSelected && <Check size={12} strokeWidth={2.5} />}
                  {someSelectableSelected && !allSelectableSelected && <Minus size={12} strokeWidth={2.5} />}
                </button>
                <span className="text-sm text-gray-600 whitespace-nowrap">
                  Alle ({selectableAppointments.length})
                </span>
              </>
            )}
            {selectableAppointments.length === 0 && appointments.length > 0 && (
              <span className="text-sm text-gray-500 whitespace-nowrap">
                Alle synchronisiert
              </span>
            )}
          </div>

          {showFilterControls && (
            <>
              {/* Divider */}
              <div className="h-8 w-px bg-gray-200" />

              {/* Search input */}
              <div className="relative flex-1">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Suchen..."
                  value={searchQuery || ""}
                  onChange={(e) => onSearchChange?.(e.target.value)}
                  className="w-full pl-11 pr-10 py-3 text-sm bg-transparent border-0 focus:outline-none focus:ring-0"
                  aria-label="Termine durchsuchen"
                />
                {searchQuery && (
                  <button
                    onClick={() => onSearchChange?.("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition"
                    aria-label="Suche löschen"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Divider */}
              <div className="h-8 w-px bg-gray-200" />

              {/* Status filter dropdown */}
              {onStatusFilterChange && (
                <div className="relative">
                  <button
                    ref={statusTriggerRef}
                    onClick={() => setStatusDropdownOpen(!statusDropdownOpen)}
                    className={`flex items-center gap-2 px-3 py-2 text-sm whitespace-nowrap transition rounded-lg mx-1 ${
                      statusFilter !== "all"
                        ? "text-gray-700 bg-gray-100"
                        : "text-gray-500 hover:bg-gray-50"
                    }`}
                    title="Nach Status filtern"
                  >
                    {/* Color dot */}
                    <span className={`w-2.5 h-2.5 rounded-full ${
                      STATUS_FILTER_OPTIONS.find(o => o.value === statusFilter)?.color || "bg-gray-300"
                    }`} />
                    <span className="hidden sm:inline">
                      {STATUS_FILTER_OPTIONS.find(o => o.value === statusFilter)?.label || "Alle"}
                    </span>
                    <ChevronDown size={14} className={`transition-transform ${statusDropdownOpen ? "rotate-180" : ""}`} />
                  </button>

                  {/* Dropdown menu */}
                  {statusDropdownOpen && (
                    <div
                      ref={statusDropdownRef}
                      className="absolute top-full mt-1 right-0 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50 min-w-40"
                    >
                      {STATUS_FILTER_OPTIONS.map((option) => (
                        <button
                          key={option.value}
                          onClick={() => {
                            onStatusFilterChange(option.value);
                            setStatusDropdownOpen(false);
                          }}
                          className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left transition ${
                            statusFilter === option.value
                              ? "bg-blue-50 text-blue-700"
                              : "text-gray-700 hover:bg-gray-50"
                          }`}
                        >
                          <span className={`w-2.5 h-2.5 rounded-full ${option.color || "bg-gray-300"}`} />
                          <span>{option.label}</span>
                          {statusFilter === option.value && (
                            <Check size={14} className="ml-auto text-blue-600" />
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Divider */}
              <div className="h-8 w-px bg-gray-200" />

              {/* Filter count */}
              <div className="px-3 text-sm text-gray-500 whitespace-nowrap">
                <span className="font-medium text-gray-700">{appointments.length}</span>
                {totalAppointmentsCount !== undefined && totalAppointmentsCount !== appointments.length && (
                  <span className="text-gray-400"> / {totalAppointmentsCount}</span>
                )}
              </div>

              {/* Active filters */}
              {(filterDate || seriesFilterActive) && (
                <>
                  <div className="h-8 w-px bg-gray-200" />
                  <div className="flex items-center gap-2 px-2">
                    {filterDate && (
                      <button
                        onClick={() => onFilterDateClear?.()}
                        className="flex items-center gap-1.5 px-2 py-1 text-xs text-blue-500 border border-blue-300 rounded-full hover:bg-blue-50 transition"
                      >
                        <span>{new Date(filterDate).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" })}</span>
                        <X size={12} />
                      </button>
                    )}
                    {seriesFilterActive && (
                      <button
                        onClick={() => onSeriesFilterClear?.()}
                        className="flex items-center gap-1.5 px-2 py-1 text-xs text-purple-700 bg-purple-50 rounded-full hover:bg-purple-100 transition"
                      >
                        <span>Serien</span>
                        <X size={12} />
                      </button>
                    )}
                  </div>
                </>
              )}

              {/* Divider */}
              <div className="h-8 w-px bg-gray-200" />

              {/* Solo toggle with popover */}
              <div className="relative">
                <button
                  ref={soloTriggerRef}
                  onClick={handleSoloToggle}
                  className={`flex items-center gap-2 px-4 py-3 text-sm whitespace-nowrap transition ${
                    !hideSoloMeetings
                      ? "text-blue-600 bg-blue-50"
                      : "text-gray-500 hover:bg-gray-50"
                  }`}
                >
                  <div className={`w-8 h-5 rounded-full relative transition-colors ${
                    !hideSoloMeetings ? "bg-blue-600" : "bg-gray-300"
                  }`}>
                    <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                      !hideSoloMeetings ? "translate-x-3.5" : "translate-x-0.5"
                    }`} />
                  </div>
                  <User size={16} />
                </button>

                {/* Popover - only shown for first 3 uses */}
                {soloPopoverOpen && (
                  <div
                    ref={soloPopoverRef}
                    className={`absolute right-0 w-64 bg-white rounded-lg shadow-lg border border-gray-200 p-3 z-50 ${
                      soloPopoverOpenAbove ? "bottom-full mb-1" : "top-full mt-1"
                    }`}
                  >
                    <div className="text-sm font-medium text-gray-900 mb-1">Solo-Termine</div>
                    <p className="text-xs text-gray-500">
                      {hideSoloMeetings
                        ? "Solo-Termine (Meetings ohne weitere Teilnehmer) werden jetzt ausgeblendet."
                        : "Solo-Termine (Meetings ohne weitere Teilnehmer) werden jetzt angezeigt."}
                    </p>
                  </div>
                )}
              </div>

              {/* Divider before sync button */}
              <div className="h-8 w-px bg-gray-200" />

              {/* Sync button */}
              <button
                onClick={() => setShowConfirmDialog(true)}
                disabled={
                  submitting ||
                  (syncReadyAppointments.length === 0 && completeModificationsCount === 0)
                }
                className="group flex items-center gap-2 px-4 py-3 text-sm font-medium bg-green-600 text-white shadow-[0_0_10px_rgba(74,222,128,0.35),0_4px_8px_rgba(0,0,0,0.15)] hover:bg-green-700 hover:shadow-[0_0_14px_rgba(74,222,128,0.5),0_6px_12px_rgba(0,0,0,0.2)] disabled:bg-gray-100 disabled:text-gray-400 disabled:shadow-none disabled:cursor-not-allowed transition"
              >
                {submitting ? (
                  "Übertragen..."
                ) : (
                  <>
                    <ClockArrowUp size={18} className={`transition-transform ${(syncReadyAppointments.length > 0 || completeModificationsCount > 0) ? "animate-sync-hop" : ""}`} />
                    <span>ZEP Sync</span>
                    {(syncReadyAppointments.length > 0 || completeModificationsCount > 0) && (
                      <span className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 text-xs font-medium bg-white/20 rounded-full">
                        {syncReadyAppointments.length + completeModificationsCount}
                      </span>
                    )}
                  </>
                )}
              </button>

              {/* Reset button (icon only) */}
              {(selectedAppointments.length > 0 || completeModificationsCount > 0) && (
                <button
                  onClick={onReset}
                  disabled={submitting}
                  className="p-3 text-gray-400 hover:text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
                  title="Auswahl zurücksetzen"
                >
                  <RotateCcw size={16} />
                </button>
              )}
            </>
          )}

          {/* Serien-Anzeige (nur wenn keine Filter-Controls) */}
          {!showFilterControls && seriesCount > 0 && (
            <>
              <div className="flex-1" />
              <div className="text-sm text-blue-600 px-4">
                {seriesCount} Terminserie{seriesCount > 1 ? "n" : ""}
              </div>
            </>
          )}

          {/* Sync button when no filter controls */}
          {!showFilterControls && (
            <>
              <div className="flex-1" />
              <div className="h-8 w-px bg-gray-200" />
              <button
                onClick={() => setShowConfirmDialog(true)}
                disabled={
                  submitting ||
                  (syncReadyAppointments.length === 0 && completeModificationsCount === 0)
                }
                className="group flex items-center gap-2 px-4 py-3 text-sm font-medium bg-green-600 text-white shadow-[0_0_10px_rgba(74,222,128,0.35),0_4px_8px_rgba(0,0,0,0.15)] hover:bg-green-700 hover:shadow-[0_0_14px_rgba(74,222,128,0.5),0_6px_12px_rgba(0,0,0,0.2)] disabled:bg-gray-100 disabled:text-gray-400 disabled:shadow-none disabled:cursor-not-allowed transition"
              >
                {submitting ? (
                  "Übertragen..."
                ) : (
                  <>
                    <ClockArrowUp size={18} className={`transition-transform ${(syncReadyAppointments.length > 0 || completeModificationsCount > 0) ? "animate-sync-hop" : ""}`} />
                    <span>ZEP Sync</span>
                    {(syncReadyAppointments.length > 0 || completeModificationsCount > 0) && (
                      <span className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 text-xs font-medium bg-white/20 rounded-full">
                        {syncReadyAppointments.length + completeModificationsCount}
                      </span>
                    )}
                  </>
                )}
              </button>
              {/* Reset button (icon only) */}
              {(selectedAppointments.length > 0 || completeModificationsCount > 0) && (
                <button
                  onClick={onReset}
                  disabled={submitting}
                  className="p-3 text-gray-400 hover:text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
                  title="Auswahl zurücksetzen"
                >
                  <RotateCcw size={16} />
                </button>
              )}
            </>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-1 py-1">
        {
          groupedItems.map((item) =>
            item.type === "series" ? (
              <SeriesGroup
                key={item.seriesId}
                seriesId={item.seriesId!}
                appointments={item.appointments}
                projects={projects}
                tasks={tasks}
                activities={activities}
                syncedEntries={syncedEntries}
                syncMappings={syncMappings}
                duplicateWarnings={duplicateWarnings}
                loadingTasks={loadingTasks}
                // Actual meeting durations from call records
                actualDurations={actualDurations}
                onToggle={onToggle}
                onToggleSeries={onToggleSeries}
                onProjectChange={onProjectChange}
                onTaskChange={onTaskChange}
                onActivityChange={onActivityChange}
                onBillableChange={onBillableChange}
                onCustomRemarkChange={onCustomRemarkChange}
                onUseActualTimeChange={onUseActualTimeChange}
                onApplyToSeries={onApplyToSeries}
                // Series sync
                onSyncSeries={onSyncSeries}
                syncingSeriesId={syncingSeriesId}
                // Single sync
                onSyncSingle={onSyncSingle}
                syncingSingleId={syncingSingleId}
                // Rescheduled time correction
                onCorrectTime={onCorrectTime}
                correctingTimeIds={correctingTimeIds}
                // Conflict link popover
                onLinkToZep={onLinkToZep}
                linkedZepIds={linkedZepIds}
                // Keyboard navigation focus
                focusedAppointmentId={focusedAppointmentId}
                globalWorkLocations={globalWorkLocations}
                onWorkLocationChange={onWorkLocationChange}
              />
            ) : (
              <div
                key={item.appointments[0].id}
                id={`appointment-${item.appointments[0].id}`}
                className={`transition-all duration-300 ${
                  highlightedAppointment?.id === item.appointments[0].id
                    ? highlightedAppointment.type === "running"
                      ? "ring-2 ring-red-500 ring-offset-2 rounded-lg"
                      : "ring-2 ring-amber-500 ring-offset-2 rounded-lg"
                    : ""
                }`}
              >
              <AppointmentRow
                appointment={item.appointments[0]}
                projects={projects}
                tasks={
                  item.appointments[0].projectId
                    ? tasks[item.appointments[0].projectId] || []
                    : []
                }
                allTasks={tasks}
                activities={activities}
                isSynced={isAppointmentSynced(item.appointments[0], syncedEntries, syncMappings)}
                isSyncReady={isAppointmentSyncReady(item.appointments[0], syncedEntries, syncMappings)}
                syncedEntry={findSyncedEntry(item.appointments[0], syncedEntries, syncMappings)}
                duplicateWarning={duplicateWarnings?.get(item.appointments[0].id)}
                loadingTasks={item.appointments[0].projectId ? loadingTasks?.has(item.appointments[0].projectId) : false}
                // Actual meeting duration from call records
                actualDuration={getActualDuration(item.appointments[0], actualDurations)}
                onToggle={onToggle}
                onProjectChange={onProjectChange}
                onTaskChange={onTaskChange}
                onActivityChange={onActivityChange}
                onBillableChange={onBillableChange}
                onCustomRemarkChange={onCustomRemarkChange}
                onUseActualTimeChange={onUseActualTimeChange}
                // Single sync
                onSyncSingle={onSyncSingle}
                isSyncingSingle={syncingSingleId === item.appointments[0].id}
                // Editing synced entries props
                isEditing={editingAppointments?.has(item.appointments[0].id) || false}
                modifiedEntry={modifiedEntries?.get(item.appointments[0].id)}
                onStartEditSynced={onStartEditSynced}
                onCancelEditSynced={onCancelEditSynced}
                onModifyProject={onModifyProject}
                onModifyTask={onModifyTask}
                onModifyActivity={onModifyActivity}
                onModifyBillable={onModifyBillable}
                onModifyBemerkung={onModifyBemerkung}
                onModifyTime={onModifyTime}
                onSaveModifiedSingle={onSaveModifiedSingle}
                isSavingModifiedSingle={savingModifiedSingleId === item.appointments[0].id}
                // Rescheduled time correction
                onCorrectTime={onCorrectTime}
                isCorrectingTime={correctingTimeIds?.has(item.appointments[0].id) || false}
                // Conflict link popover
                onLinkToZep={onLinkToZep}
                syncedEntries={syncedEntries}
                syncMappings={syncMappings}
                linkedZepIds={linkedZepIds}
                // Keyboard navigation focus
                isFocused={focusedAppointmentId === item.appointments[0].id}
                globalWorkLocations={globalWorkLocations}
                onWorkLocationChange={onWorkLocationChange}
                onModifyWorkLocation={onModifyWorkLocation}
              />
              </div>
            )
          )}
      </div>

      {/* Footer - Status summary */}
      <div className="px-4 py-3 border border-gray-200 bg-white rounded-b-lg">
        <div className="flex items-center gap-4 text-sm text-gray-600">
          <span>
            Ausgewählt: <span className="font-medium text-gray-900">{selectedAppointments.length}</span> Termine
            <span className="text-gray-400 ml-1">({hours}h {minutes}min)</span>
          </span>
          {syncReadyAppointments.length > 0 && (
            <span className="text-green-600">
              {syncReadyAppointments.length} bereit
            </span>
          )}
          {completeModificationsCount > 0 && (
            <span className="text-blue-600">
              {completeModificationsCount} zu aktualisieren
            </span>
          )}
          {incompleteUnsyncedAppointments.length > 0 && (
            <span className="text-amber-600">
              {incompleteUnsyncedAppointments.length} unvollständig
            </span>
          )}
        </div>
      </div>

      {/* Sync Confirmation Dialog */}
      <SyncConfirmDialog
        isOpen={showConfirmDialog}
        onClose={() => setShowConfirmDialog(false)}
        onConfirm={handleConfirmSync}
        appointments={syncReadyAppointments}
        projects={projects}
        submitting={submitting}
        duplicateWarnings={duplicateWarnings}
        modifiedEntries={modifiedEntries}
      />
    </div>
  );
}
