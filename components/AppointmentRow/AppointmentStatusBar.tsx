"use client";

import { Pencil, X, RefreshCw, RotateCcw } from "lucide-react";
import { Appointment, SyncedEntry } from "./types";
import { DuplicateCheckResult } from "@/lib/zep-api";
import ConflictLinkPopover from "./ConflictLinkPopover";

export interface AppointmentStatusBarProps {
  appointment: Appointment;
  isSynced: boolean;
  isEditing: boolean;
  isModified: boolean;
  isInternalOnly: boolean;
  attendeeCount: number;
  duplicateWarning?: DuplicateCheckResult;
  // Actions
  onToggle: (id: string) => void;
  onProjectChange: (id: string, projectId: number | null) => void;
  onStartEditSynced?: (appointmentId: string) => void;
  onCancelEditSynced?: (appointmentId: string) => void;
  onCorrectTime?: (appointmentId: string, duplicateWarning: DuplicateCheckResult) => void;
  isCorrectingTime?: boolean;
  // Conflict Link
  onLinkToZep?: (appointmentId: string, zepEntryId: number) => void;
  syncedEntries?: SyncedEntry[];
  linkedZepIds?: Set<number>;
}

export default function AppointmentStatusBar({
  appointment,
  isSynced,
  isEditing,
  isInternalOnly,
  attendeeCount,
  duplicateWarning,
  onProjectChange,
  onStartEditSynced,
  onCancelEditSynced,
  onCorrectTime,
  isCorrectingTime,
  onLinkToZep,
  syncedEntries,
  linkedZepIds,
}: AppointmentStatusBarProps) {
  return (
    <div className="shrink-0 flex items-center gap-1.5" role="status">
      {/* Editing badge */}
      {isSynced && isEditing && (
        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded font-medium text-violet-700 bg-violet-50">
          In Bearbeitung
        </span>
      )}

      {/* Synced badge */}
      {isSynced && (
        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded font-medium text-green-700 bg-green-50">
          Synced
        </span>
      )}

      {/* Internal/External/Solo meeting badge */}
      {attendeeCount > 0 ? (
        isInternalOnly ? (
          <span
            className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded font-medium bg-gray-100 text-gray-600"
            title="Internes Meeting - nur Contiva-Teilnehmer"
          >
            Intern
          </span>
        ) : (
          <span
            className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded font-medium bg-amber-100 text-amber-700"
            title="Externes Meeting - externe Teilnehmer"
          >
            Extern
          </span>
        )
      ) : (
        <span
          className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded font-medium bg-blue-50 text-blue-600"
          title="Solo - keine weiteren Teilnehmer"
        >
          Solo
        </span>
      )}

      {/* Duplicate / Time overlap / Similar badges (not rescheduled) */}
      {duplicateWarning?.hasDuplicate && !isSynced && duplicateWarning.type !== 'rescheduled' && (
        onLinkToZep && syncedEntries ? (
          <ConflictLinkPopover
            appointmentId={appointment.id}
            appointmentDate={appointment.start.dateTime}
            suggestedEntryId={duplicateWarning.existingEntry?.id}
            suggestedEntry={duplicateWarning.existingEntry}
            syncedEntries={syncedEntries}
            linkedZepIds={linkedZepIds}
            onLink={onLinkToZep}
          >
            <span
              className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded font-medium text-orange-700 bg-orange-50 hover:bg-orange-100 transition cursor-pointer"
              title={`${duplicateWarning.message} — Klicken zum Verknüpfen`}
            >
              {duplicateWarning.type === 'exact' ? 'Duplikat' : duplicateWarning.type === 'timeOverlap' ? 'Zeitüberschneidung' : 'Ähnlich'}
            </span>
          </ConflictLinkPopover>
        ) : (
          <span
            className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded font-medium text-orange-700 bg-orange-50"
            title={duplicateWarning.message}
          >
            {duplicateWarning.type === 'exact' ? 'Duplikat' : duplicateWarning.type === 'timeOverlap' ? 'Zeitüberschneidung' : 'Ähnlich'}
          </span>
        )
      )}

      {/* Rescheduled appointment - correction button and link option */}
      {duplicateWarning?.type === 'rescheduled' && !isSynced && (
        <>
          {onCorrectTime && (
            <button
              onClick={() => onCorrectTime(appointment.id, duplicateWarning)}
              disabled={isCorrectingTime}
              className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 transition disabled:opacity-50"
              title={duplicateWarning.message}
            >
              <RefreshCw size={10} className={isCorrectingTime ? "animate-spin" : ""} />
              Zeiten korrigieren
            </button>
          )}
          {onLinkToZep && syncedEntries && (
            <ConflictLinkPopover
              appointmentId={appointment.id}
              appointmentDate={appointment.start.dateTime}
              suggestedEntryId={duplicateWarning.existingEntry?.id}
              suggestedEntry={duplicateWarning.existingEntry}
              syncedEntries={syncedEntries}
              linkedZepIds={linkedZepIds}
              onLink={onLinkToZep}
            >
              <span
                className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded font-medium text-green-700 bg-green-50 hover:bg-green-100 transition cursor-pointer"
                title="Als verknüpft markieren"
              >
                Verknüpfen
              </span>
            </ConflictLinkPopover>
          )}
        </>
      )}

      {/* Reset button for unsynchronized entries with project selected */}
      {!isSynced && appointment.selected && appointment.projectId && (
        <button
          onClick={() => onProjectChange(appointment.id, null)}
          className="p-1.5 rounded transition text-gray-400 hover:text-red-600 hover:bg-red-50"
          title="Auswahl zurücksetzen"
          aria-label="Auswahl zurücksetzen"
        >
          <RotateCcw size={12} />
        </button>
      )}

      {/* Edit/Cancel button for synced entries */}
      {isSynced && onStartEditSynced && onCancelEditSynced && (
        <button
          onClick={() => isEditing
            ? onCancelEditSynced(appointment.id)
            : onStartEditSynced(appointment.id)
          }
          className={`p-1.5 rounded transition ${
            isEditing
              ? "text-blue-600 hover:text-blue-800 hover:bg-blue-100"
              : "text-gray-400 hover:text-blue-600 hover:bg-blue-50"
          }`}
          title={isEditing ? "Bearbeitung abbrechen" : "Bearbeiten"}
          aria-label={isEditing ? "Bearbeitung abbrechen" : "Bearbeiten"}
        >
          {isEditing ? <X size={12} /> : <Pencil size={12} />}
        </button>
      )}
    </div>
  );
}
