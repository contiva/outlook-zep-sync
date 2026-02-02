"use client";

import { useMemo, useState } from "react";
import { Search, X, RotateCcw } from "lucide-react";
import AppointmentRow from "./AppointmentRow";
import SeriesGroup from "./SeriesGroup";
import SyncConfirmDialog from "./SyncConfirmDialog";
import { DuplicateCheckResult, formatZepStartTime, formatZepEndTime } from "@/lib/zep-api";

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
  type?: string;
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
}

interface AppointmentListProps {
  appointments: Appointment[];
  projects: Project[];
  tasks: Record<number, Task[]>;
  activities: Activity[];
  syncedEntries: ZepEntry[];
  duplicateWarnings?: Map<string, DuplicateCheckResult>;
  loadingTasks?: Set<number>;
  onToggle: (id: string) => void;
  onToggleSeries: (seriesId: string, selected: boolean) => void;
  onSelectAll: (selected: boolean) => void;
  onProjectChange: (id: string, projectId: number | null) => void;
  onTaskChange: (id: string, taskId: number | null) => void;
  onActivityChange: (id: string, activityId: string) => void;
  onBillableChange: (id: string, billable: boolean) => void;
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
// Compares using rounded times (ZEP stores times in 15-min intervals)
// Trims subject/note for comparison (Outlook may have trailing spaces that ZEP trims)
function findSyncedEntry(apt: Appointment, syncedEntries: ZepEntry[]): ZepEntry | null {
  if (!syncedEntries || syncedEntries.length === 0) {
    return null;
  }

  const aptDate = new Date(apt.start.dateTime);
  const aptDateStr = aptDate.toISOString().split("T")[0];
  const aptEndDate = new Date(apt.end.dateTime);
  
  // Use rounded times for comparison (same logic as when syncing to ZEP)
  const aptFromTimeRounded = formatZepStartTime(aptDate);
  const aptToTimeRounded = formatZepEndTime(aptEndDate);
  
  // Trim subject for comparison (Outlook may have trailing spaces)
  const aptSubject = apt.subject.trim();

  return syncedEntries.find((entry) => {
    const entryDate = entry.date.split("T")[0];
    const entryNote = (entry.note || "").trim();
    return (
      entryNote === aptSubject &&
      entryDate === aptDateStr &&
      entry.from === aptFromTimeRounded &&
      entry.to === aptToTimeRounded
    );
  }) || null;
}

// Helper: Check if an appointment is ready to sync (selected, complete, not yet synced)
function isAppointmentSyncReady(apt: Appointment, syncedEntries: ZepEntry[]): boolean {
  if (!apt.selected) return false;
  if (!apt.projectId || !apt.taskId) return false;
  if (isAppointmentSynced(apt, syncedEntries)) return false;
  return true;
}

export default function AppointmentList({
  appointments,
  projects,
  tasks,
  activities,
  syncedEntries,
  duplicateWarnings,
  loadingTasks,
  onToggle,
  onToggleSeries,
  onSelectAll,
  onProjectChange,
  onTaskChange,
  onActivityChange,
  onBillableChange,
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

  // Count complete modifications (have project and task)
  const completeModificationsCount = useMemo(() => {
    if (!modifiedEntries) return 0;
    return Array.from(modifiedEntries.values()).filter(
      (mod) => mod.newProjectId > 0 && mod.newTaskId > 0
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
      <div className="p-12 text-center bg-card rounded-xl border border-border/60 shadow-sm">
        <div className="w-14 h-14 bg-muted-foreground/5 rounded-2xl flex items-center justify-center mx-auto mb-5">
          <Search size={22} className="text-muted-foreground/50" />
        </div>
        <p className="font-medium text-foreground mb-2">Keine Termine gefunden</p>
        <p className="text-sm text-muted-foreground/70">Wähle einen Zeitraum und klicke auf &quot;Laden&quot;</p>
      </div>
    );
  }

  // Determine if filter controls should be shown
  const showFilterControls = onSearchChange !== undefined;

  return (
    <div>
      {/* Header mit "Alle auswählen" Checkbox und Filter */}
      <div className="bg-card rounded-t-xl border border-border/60 shadow-sm">
        <div className="flex items-center">
          {/* Checkbox und Auswahl-Text */}
          <div className="flex items-center gap-3 px-4 py-3.5">
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
                  className="w-4 h-4 text-primary rounded-md border-border/60 focus:ring-primary focus:ring-offset-0 transition-colors"
                  aria-label="Alle Termine auswählen"
                />
                <span className="text-sm text-muted-foreground whitespace-nowrap">
                  Alle <span className="text-foreground font-medium">{selectableAppointments.length}</span>
                </span>
              </>
            )}
            {selectableAppointments.length === 0 && appointments.length > 0 && (
              <span className="text-sm text-success font-medium whitespace-nowrap flex items-center gap-2">
                <span className="w-2 h-2 bg-success rounded-full animate-pulse" />
                Alle synchronisiert
              </span>
            )}
          </div>

          {showFilterControls && (
            <>
              {/* Divider */}
              <div className="h-6 w-px bg-border/60" />

              {/* Search input */}
              <div className="relative flex-1">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/50" />
                <input
                  type="text"
                  placeholder="Suchen..."
                  value={searchQuery || ""}
                  onChange={(e) => onSearchChange?.(e.target.value)}
                  className="w-full pl-11 pr-10 py-3.5 text-sm bg-transparent border-0 focus:outline-none focus:ring-0 text-foreground placeholder:text-muted-foreground/50"
                  aria-label="Termine durchsuchen"
                />
                {searchQuery && (
                  <button
                    onClick={() => onSearchChange?.("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted-foreground/10 rounded-lg transition-colors"
                    aria-label="Suche löschen"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Divider */}
              <div className="h-6 w-px bg-border/60" />

              {/* Filter count */}
              <div className="px-4 text-sm whitespace-nowrap">
                <span className="font-semibold text-foreground">{appointments.length}</span>
                {totalAppointmentsCount !== undefined && totalAppointmentsCount !== appointments.length && (
                  <span className="text-muted-foreground/60"> / {totalAppointmentsCount}</span>
                )}
              </div>

              {/* Active filters */}
              {(filterDate || seriesFilterActive) && (
                <>
                  <div className="h-6 w-px bg-border/60" />
                  <div className="flex items-center gap-1.5 px-2">
                    {filterDate && (
                      <button
                        onClick={() => onFilterDateClear?.()}
                        className="group flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-primary bg-primary/10 rounded-lg hover:bg-primary/15 transition-colors"
                      >
                        <span>{new Date(filterDate).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" })}</span>
                        <X size={12} className="opacity-60 group-hover:opacity-100" />
                      </button>
                    )}
                    {seriesFilterActive && (
                      <button
                        onClick={() => onSeriesFilterClear?.()}
                        className="group flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-primary bg-primary/10 rounded-lg hover:bg-primary/15 transition-colors"
                      >
                        <span>Serien</span>
                        <X size={12} className="opacity-60 group-hover:opacity-100" />
                      </button>
                    )}
                  </div>
                </>
              )}

              {/* Divider */}
              <div className="h-6 w-px bg-border/60" />

              {/* Solo toggle */}
              <button
                onClick={() => onHideSoloMeetingsChange?.(!hideSoloMeetings)}
                className={`flex items-center gap-2.5 px-4 py-3.5 text-sm whitespace-nowrap transition-colors ${
                  !hideSoloMeetings 
                    ? "text-primary" 
                    : "text-muted-foreground hover:text-foreground"
                }`}
                title={hideSoloMeetings ? "Solo-Termine werden ausgeblendet" : "Solo-Termine werden angezeigt"}
              >
                <div className={`w-9 h-5 rounded-full relative transition-all duration-200 ${
                  !hideSoloMeetings ? "bg-primary" : "bg-muted-foreground/20"
                }`}>
                  <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-all duration-200 ${
                    !hideSoloMeetings ? "translate-x-4" : "translate-x-0.5"
                  }`} />
                </div>
                <span className="hidden sm:inline text-xs font-medium">Solo</span>
              </button>

              {/* Divider before sync button */}
              <div className="h-6 w-px bg-border/60" />

              {/* Sync button */}
              <button
                onClick={() => setShowConfirmDialog(true)}
                disabled={
                  submitting ||
                  (syncReadyAppointments.length === 0 && completeModificationsCount === 0)
                }
                className="flex items-center gap-2.5 px-5 py-3.5 text-sm font-medium bg-success text-white hover:bg-success/90 disabled:bg-muted-foreground/10 disabled:text-muted-foreground/50 disabled:cursor-not-allowed transition-all"
              >
                {submitting ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Sync...
                  </span>
                ) : (
                  <>
                    <span>ZEP Sync</span>
                    {(syncReadyAppointments.length > 0 || completeModificationsCount > 0) && (
                      <span className="inline-flex items-center justify-center min-w-[1.5rem] h-5 px-2 text-xs font-semibold bg-white/20 rounded-md">
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
                  className="p-3.5 text-muted-foreground/70 hover:text-foreground hover:bg-muted-foreground/5 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
              <div className="text-sm text-primary font-medium px-4">
                {seriesCount} Terminserie{seriesCount > 1 ? "n" : ""}
              </div>
            </>
          )}

          {/* Sync button when no filter controls */}
          {!showFilterControls && (
            <>
              <div className="flex-1" />
              <div className="h-8 w-px bg-border" />
              <button
                onClick={() => setShowConfirmDialog(true)}
                disabled={
                  submitting ||
                  (syncReadyAppointments.length === 0 && completeModificationsCount === 0)
                }
                className="flex items-center gap-2 px-5 py-3 text-sm font-medium bg-success text-white hover:bg-success/90 disabled:bg-muted-foreground/20 disabled:text-muted-foreground disabled:cursor-not-allowed transition"
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
                  className="p-3 text-muted-foreground hover:text-foreground hover:bg-background disabled:opacity-50 disabled:cursor-not-allowed transition"
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
                onToggle={onToggle}
                onToggleSeries={onToggleSeries}
                onProjectChange={onProjectChange}
                onTaskChange={onTaskChange}
                onActivityChange={onActivityChange}
                onBillableChange={onBillableChange}
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
                onToggle={onToggle}
                onProjectChange={onProjectChange}
                onTaskChange={onTaskChange}
                onActivityChange={onActivityChange}
                onBillableChange={onBillableChange}
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
                // Rescheduled time correction
                onCorrectTime={onCorrectTime}
                isCorrectingTime={correctingTimeIds?.has(item.appointments[0].id) || false}
              />
            )
          )}
      </div>

      {/* Footer - Status summary */}
      <div className="px-4 py-3 border border-border bg-card rounded-b-xl shadow-sm">
        <div className="flex items-center gap-4 text-sm text-muted">
          <span>
            Ausgewählt: <span className="font-medium text-foreground">{selectedAppointments.length}</span> Termine
            <span className="text-muted-foreground ml-1">({hours}h {minutes}min)</span>
          </span>
          {syncReadyAppointments.length > 0 && (
            <span className="text-success font-medium flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-success rounded-full" />
              {syncReadyAppointments.length} bereit
            </span>
          )}
          {completeModificationsCount > 0 && (
            <span className="text-primary font-medium flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-primary rounded-full" />
              {completeModificationsCount} zu aktualisieren
            </span>
          )}
          {incompleteUnsyncedAppointments.length > 0 && (
            <span className="text-warning font-medium flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-warning rounded-full" />
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
