"use client";

import { useMemo, useState } from "react";
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
  newProjectId: number;
  newTaskId: number;
  newActivityId: string;
  newProjektNr: string;
  newVorgangNr: string;
  userId: string;
  datum: string;
  von: string;
  bis: string;
  bemerkung?: string;
  istFakturierbar?: boolean;
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
  onApplyToSeries: (
    seriesId: string,
    projectId: number | null,
    taskId: number | null,
    activityId: string
  ) => void;
  onSubmit: (appointmentsToSync: Appointment[], modifiedEntries?: ModifiedEntry[]) => void;
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
  // Rescheduled appointment time correction
  onCorrectTime?: (appointmentId: string, duplicateWarning: DuplicateCheckResult) => void;
  correctingTimeIds?: Set<string>;
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
  onApplyToSeries,
  onSubmit,
  onReset,
  submitting,
  editingAppointments,
  modifiedEntries,
  onStartEditSynced,
  onCancelEditSynced,
  onModifyProject,
  onModifyTask,
  onModifyActivity,
  onCorrectTime,
  correctingTimeIds,
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

  const totalMinutes = selectedAppointments.reduce((acc, apt) => {
    const start = new Date(apt.start.dateTime);
    const end = new Date(apt.end.dateTime);
    return acc + (end.getTime() - start.getTime()) / 1000 / 60;
  }, 0);

  const hours = Math.floor(totalMinutes / 60);
  const minutes = Math.round(totalMinutes % 60);

  // Alle ausgewählten Termine müssen Projekt, Task und Activity haben
  const allComplete = selectedAppointments.every(
    (a) => a.projectId && a.taskId && a.activityId
  );

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

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Header mit "Alle auswählen" Checkbox */}
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-3">
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
              <span className="text-sm text-gray-600">
                Alle auswählen ({selectableAppointments.length} verfügbar)
              </span>
            </>
          )}
          {selectableAppointments.length === 0 && appointments.length > 0 && (
            <span className="text-sm text-gray-500">
              Alle Termine bereits synchronisiert
            </span>
          )}
        </div>
        {seriesCount > 0 && (
          <div className="text-sm text-blue-600">
            {seriesCount} Terminserie{seriesCount > 1 ? "n" : ""}
          </div>
        )}
      </div>

      <div className="divide-y divide-gray-100">
        {groupedItems.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            Keine Termine gefunden. Wähle einen Zeitraum und klicke auf &quot;Termine laden&quot;.
          </div>
        ) : (
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
                onApplyToSeries={onApplyToSeries}
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
                // Editing synced entries props
                isEditing={editingAppointments?.has(item.appointments[0].id) || false}
                modifiedEntry={modifiedEntries?.get(item.appointments[0].id)}
                onStartEditSynced={onStartEditSynced}
                onCancelEditSynced={onCancelEditSynced}
                onModifyProject={onModifyProject}
                onModifyTask={onModifyTask}
                onModifyActivity={onModifyActivity}
                // Rescheduled time correction
                onCorrectTime={onCorrectTime}
                isCorrectingTime={correctingTimeIds?.has(item.appointments[0].id) || false}
              />
            )
          )
        )}
      </div>

      {appointments.length > 0 && (
        <div className="p-4 border-t border-gray-200 bg-gray-50 rounded-b-lg">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Ausgewählt: {selectedAppointments.length} Termine ({hours}h{" "}
              {minutes}min)
              {syncReadyAppointments.length > 0 && (
                <span className="ml-2 text-amber-600">
                  ({syncReadyAppointments.length} bereit zum Sync)
                </span>
              )}
              {completeModificationsCount > 0 && (
                <span className="ml-2 text-blue-600">
                  ({completeModificationsCount} zu aktualisieren)
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {(selectedAppointments.length > 0 || completeModificationsCount > 0) && (
                <button
                  onClick={onReset}
                  disabled={submitting}
                  className="px-4 py-2 text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
                  title="Alle ausstehenden Syncs zurücksetzen"
                >
                  Zurücksetzen
                </button>
              )}
              <button
                onClick={() => setShowConfirmDialog(true)}
                disabled={
                  submitting ||
                  (syncReadyAppointments.length === 0 && completeModificationsCount === 0)
                }
                className="relative px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
              >
                {submitting 
                  ? "Wird übertragen..." 
                  : syncReadyAppointments.length > 0 && completeModificationsCount > 0
                    ? (
                      <span className="flex items-center gap-2">
                        An ZEP übertragen
                        <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-medium bg-white text-green-700 rounded-full">
                          {syncReadyAppointments.length} neu
                        </span>
                        <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">
                          {completeModificationsCount} ändern
                        </span>
                      </span>
                    )
                    : completeModificationsCount > 0 
                      ? (
                        <span className="flex items-center gap-2">
                          Änderungen übertragen
                          <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">
                            {completeModificationsCount}
                          </span>
                        </span>
                      )
                      : (
                        <span className="flex items-center gap-2">
                          An ZEP übertragen
                          <span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 text-xs font-medium bg-white text-green-700 rounded-full">
                            {syncReadyAppointments.length}
                          </span>
                        </span>
                      )
                }
              </button>
            </div>
          </div>
          {selectedAppointments.length > 0 && !allComplete && syncReadyAppointments.length < selectedAppointments.length && (
            <p className="text-sm text-gray-500 mt-2">
              {selectedAppointments.length - syncReadyAppointments.length} weitere Termine benötigen noch Projekt/Task-Zuweisung.
            </p>
          )}
        </div>
      )}

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
