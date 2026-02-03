"use client";

import { useMemo, useState } from "react";
import { Search, X, RotateCcw } from "lucide-react";
import AppointmentRow from "./AppointmentRow";
import SeriesGroup from "./SeriesGroup";
import SyncConfirmDialog from "./SyncConfirmDialog";
import { DuplicateCheckResult } from "@/lib/zep-api";
import { ActualDuration, ActualDurationsMap, normalizeJoinUrl } from "@/lib/teams-utils";

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
  duplicateWarnings?: Map<string, DuplicateCheckResult>;
  loadingTasks?: Set<number>;
  // Actual meeting durations from call records
  actualDurations?: ActualDurationsMap;
  onToggle: (id: string) => void;
  onToggleSeries: (seriesId: string, selected: boolean) => void;
  onSelectAll: (selected: boolean) => void;
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
  onSubmit: (appointmentsToSync: Appointment[], modifiedEntries?: ModifiedEntry[]) => void;
  onSyncSingle?: (appointment: Appointment) => void;
  syncingSingleId?: string | null;
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
  onModifyTime?: (appointmentId: string, apt: Appointment, syncedEntry: ZepEntry, useActualTime: boolean) => void;
  onSaveModifiedSingle?: (modifiedEntry: ModifiedEntry) => void;
  savingModifiedSingleId?: string | null;
  // Rescheduled appointment time correction
  onCorrectTime?: (appointmentId: string, duplicateWarning: DuplicateCheckResult) => void;
  correctingTimeIds?: Set<string>;
  // Filter props
  totalAppointmentsCount?: number;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  filterDate?: string | null;
  onFilterDateClear?: () => void;
  seriesFilterActive?: boolean;
  onSeriesFilterClear?: () => void;
  hideSoloMeetings?: boolean;
  onHideSoloMeetingsChange?: (hide: boolean) => void;
}

interface GroupedItem {
  type: "single" | "series";
  seriesId?: string;
  appointments: Appointment[];
  firstStart: Date;
}

// Helper: Check if an appointment is synced to ZEP
function isAppointmentSynced(apt: Appointment, syncedEntries: ZepEntry[]): boolean {
  return findSyncedEntry(apt, syncedEntries) !== null;
}

// Helper: Find the matching synced entry for an appointment
// Matches by subject and date only (not times) because entry could be synced with
// planned time OR actual time - we need to find the entry regardless
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
  return actualDurations.get(normalizedUrl);
}

export default function AppointmentList({
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
  onSelectAll,
  onProjectChange,
  onTaskChange,
  onActivityChange,
  onBillableChange,
  onUseActualTimeChange,
  onApplyToSeries,
  onSubmit,
  onSyncSingle,
  syncingSingleId,
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
  onModifyTime,
  onSaveModifiedSingle,
  savingModifiedSingleId,
  onCorrectTime,
  correctingTimeIds,
  // Filter props
  totalAppointmentsCount,
  searchQuery,
  onSearchChange,
  filterDate,
  onFilterDateClear,
  seriesFilterActive,
  onSeriesFilterClear,
  hideSoloMeetings,
  onHideSoloMeetingsChange,
}: AppointmentListProps) {
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  // Count complete modifications (have project and task, or have time changes)
  const completeModificationsCount = useMemo(() => {
    if (!modifiedEntries) return 0;
    return Array.from(modifiedEntries.values()).filter(
      (mod) => (mod.newProjectId > 0 && mod.newTaskId > 0) || mod.newVon !== undefined || mod.newBis !== undefined
    ).length;
  }, [modifiedEntries]);

  // Termine die auswählbar sind (nicht bereits gesynced)
  const selectableAppointments = useMemo(() => {
    return appointments.filter(apt => !isAppointmentSynced(apt, syncedEntries));
  }, [appointments, syncedEntries]);

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
  const syncReadyAppointments = appointments.filter((a) => isAppointmentSyncReady(a, syncedEntries));

  // Selected appointments that are NOT synced and still need project/task assignment
  const incompleteUnsyncedAppointments = selectedAppointments.filter(
    (a) => !isAppointmentSynced(a, syncedEntries) && (!a.projectId || !a.taskId)
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

  // Keine Termine vorhanden
  if (appointments.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500 bg-gray-50 rounded-lg border border-gray-200">
        Keine Termine gefunden. Wähle einen Zeitraum und klicke auf &quot;Termine laden&quot;.
      </div>
    );
  }

  // Determine if filter controls should be shown
  const showFilterControls = onSearchChange !== undefined;

  return (
    <div>
      {/* Header mit "Alle auswählen" Checkbox und Filter */}
      <div className="bg-white rounded-t-lg border border-gray-200">
        <div className="flex flex-wrap sm:flex-nowrap items-center">
          {/* Checkbox und Auswahl-Text */}
          <div className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-3">
            {selectableAppointments.length > 0 && (
              <>
                <input
                  type="checkbox"
                  checked={allSelectableSelected}
                  ref={(el) => {
                    if (el) {
                      el.indeterminate = someSelectableSelected;
                    }
                  }}
                  onChange={(e) => onSelectAll(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  aria-label="Alle Termine auswählen"
                />
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
              {/* Divider - hidden on mobile when wrapping */}
              <div className="hidden sm:block h-8 w-px bg-gray-200" />

              {/* Search input - full width on mobile */}
              <div className="relative flex-1 min-w-0 order-last sm:order-none w-full sm:w-auto border-t sm:border-t-0 border-gray-200">
                <Search size={16} className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Suchen..."
                  value={searchQuery || ""}
                  onChange={(e) => onSearchChange?.(e.target.value)}
                  className="w-full pl-9 sm:pl-11 pr-10 py-2.5 sm:py-3 text-sm bg-transparent border-0 focus:outline-none focus:ring-0"
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
              <div className="hidden sm:block h-8 w-px bg-gray-200" />

              {/* Filter count - hidden on mobile */}
              <div className="hidden sm:block px-3 text-sm text-gray-500 whitespace-nowrap">
                <span className="font-medium text-gray-700">{appointments.length}</span>
                {totalAppointmentsCount !== undefined && totalAppointmentsCount !== appointments.length && (
                  <span className="text-gray-400"> / {totalAppointmentsCount}</span>
                )}
              </div>

              {/* Active filters */}
              {(filterDate || seriesFilterActive) && (
                <>
                  <div className="hidden sm:block h-8 w-px bg-gray-200" />
                  <div className="flex items-center gap-1 sm:gap-2 px-1 sm:px-2">
                    {filterDate && (
                      <button
                        onClick={() => onFilterDateClear?.()}
                        className="flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-2 py-1 text-xs text-blue-700 bg-blue-50 rounded-full hover:bg-blue-100 transition"
                      >
                        <span>{new Date(filterDate).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" })}</span>
                        <X size={12} />
                      </button>
                    )}
                    {seriesFilterActive && (
                      <button
                        onClick={() => onSeriesFilterClear?.()}
                        className="flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-2 py-1 text-xs text-purple-700 bg-purple-50 rounded-full hover:bg-purple-100 transition"
                      >
                        <span>Serien</span>
                        <X size={12} />
                      </button>
                    )}
                  </div>
                </>
              )}

              {/* Divider */}
              <div className="hidden sm:block h-8 w-px bg-gray-200" />

              {/* Solo toggle - icon only on mobile */}
              <button
                onClick={() => onHideSoloMeetingsChange?.(!hideSoloMeetings)}
                className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-2.5 sm:py-3 text-sm whitespace-nowrap transition ${
                  !hideSoloMeetings
                    ? "text-blue-600 bg-blue-50"
                    : "text-gray-500 hover:bg-gray-50"
                }`}
                title={hideSoloMeetings ? "Solo-Termine werden ausgeblendet" : "Solo-Termine werden angezeigt"}
              >
                <div className={`w-7 sm:w-8 h-4 sm:h-5 rounded-full relative transition-colors ${
                  !hideSoloMeetings ? "bg-blue-600" : "bg-gray-300"
                }`}>
                  <div className={`absolute top-0.5 w-3 sm:w-4 h-3 sm:h-4 bg-white rounded-full shadow transition-transform ${
                    !hideSoloMeetings ? "translate-x-3 sm:translate-x-3.5" : "translate-x-0.5"
                  }`} />
                </div>
                <span className="hidden sm:inline">Solo</span>
              </button>

              {/* Divider before sync button */}
              <div className="hidden sm:block h-8 w-px bg-gray-200" />

              {/* Sync button */}
              <button
                onClick={() => setShowConfirmDialog(true)}
                disabled={
                  submitting ||
                  (syncReadyAppointments.length === 0 && completeModificationsCount === 0)
                }
                className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-medium bg-green-600 text-white hover:bg-green-700 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed transition rounded-r-lg sm:rounded-none"
              >
                {submitting ? (
                  <span className="hidden sm:inline">Übertragen...</span>
                ) : (
                  <>
                    <span className="hidden sm:inline">ZEP Sync</span>
                    <span className="sm:hidden">Sync</span>
                    {(syncReadyAppointments.length > 0 || completeModificationsCount > 0) && (
                      <span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1 sm:px-1.5 text-xs font-medium bg-white/20 rounded-full">
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
                  className="p-2.5 sm:p-3 text-gray-400 hover:text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
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
                className="flex items-center gap-2 px-4 py-3 text-sm font-medium bg-green-600 text-white hover:bg-green-700 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed transition"
              >
                {submitting ? (
                  "Übertragen..."
                ) : (
                  <>
                    <span>ZEP Sync</span>
                    {(syncReadyAppointments.length > 0 || completeModificationsCount > 0) && (
                      <span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 text-xs font-medium bg-white/20 rounded-full">
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
                onUseActualTimeChange={onUseActualTimeChange}
                onApplyToSeries={onApplyToSeries}
                // Single sync
                onSyncSingle={onSyncSingle}
                syncingSingleId={syncingSingleId}
                // Rescheduled time correction
                onCorrectTime={onCorrectTime}
                correctingTimeIds={correctingTimeIds}
              />
            ) : (
              <AppointmentRow
                key={item.appointments[0].id}
                appointment={item.appointments[0]}
                projects={projects}
                tasks={
                  item.appointments[0].projectId
                    ? tasks[item.appointments[0].projectId] || []
                    : []
                }
                allTasks={tasks}
                activities={activities}
                isSynced={isAppointmentSynced(item.appointments[0], syncedEntries)}
                isSyncReady={isAppointmentSyncReady(item.appointments[0], syncedEntries)}
                syncedEntry={findSyncedEntry(item.appointments[0], syncedEntries)}
                duplicateWarning={duplicateWarnings?.get(item.appointments[0].id)}
                loadingTasks={item.appointments[0].projectId ? loadingTasks?.has(item.appointments[0].projectId) : false}
                // Actual meeting duration from call records
                actualDuration={getActualDuration(item.appointments[0], actualDurations)}
                onToggle={onToggle}
                onProjectChange={onProjectChange}
                onTaskChange={onTaskChange}
                onActivityChange={onActivityChange}
                onBillableChange={onBillableChange}
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
                onModifyTime={onModifyTime}
                onSaveModifiedSingle={onSaveModifiedSingle}
                isSavingModifiedSingle={savingModifiedSingleId === item.appointments[0].id}
                // Rescheduled time correction
                onCorrectTime={onCorrectTime}
                isCorrectingTime={correctingTimeIds?.has(item.appointments[0].id) || false}
              />
            )
          )}
      </div>

      {/* Footer - Status summary */}
      <div className="px-3 sm:px-4 py-2 sm:py-3 border border-gray-200 bg-white rounded-b-lg">
        <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-600">
          <span>
            <span className="font-medium text-gray-900">{selectedAppointments.length}</span> <span className="hidden sm:inline">Termine</span> ausgewählt
            <span className="text-gray-400 ml-1">({hours}h {minutes}min)</span>
          </span>
          {syncReadyAppointments.length > 0 && (
            <span className="text-green-600">
              {syncReadyAppointments.length} bereit
            </span>
          )}
          {completeModificationsCount > 0 && (
            <span className="text-blue-600">
              {completeModificationsCount} <span className="hidden sm:inline">zu</span> aktualisieren
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
