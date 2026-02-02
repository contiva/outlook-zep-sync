"use client";

import { Dialog, DialogPanel, DialogTitle } from "@headlessui/react";
import { X, CloudUpload, AlertTriangle, RefreshCw } from "lucide-react";
import { DuplicateCheckResult } from "@/lib/zep-api";
import { useMemo, useState } from "react";

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

interface Project {
  id: number;
  name: string;
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
}

interface SyncConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (includedAppointments: Appointment[], modifiedEntries?: ModifiedEntry[]) => void;
  appointments: Appointment[];
  projects: Project[];
  submitting: boolean;
  duplicateWarnings?: Map<string, DuplicateCheckResult>;
  modifiedEntries?: Map<string, ModifiedEntry>;
}

export default function SyncConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  appointments,
  projects,
  submitting,
  duplicateWarnings,
  modifiedEntries,
}: SyncConfirmDialogProps) {
  // Track which appointments are excluded from sync
  const [excludedIds, setExcludedIds] = useState<Set<string>>(new Set());
  // Track which modifications are excluded
  const [excludedModificationIds, setExcludedModificationIds] = useState<Set<string>>(new Set());
  // Track if we've seen the dialog open (to reset state on first open)
  const [wasOpen, setWasOpen] = useState(false);
  
  // Reset excluded when dialog opens for the first time or reopens
  if (isOpen && !wasOpen) {
    setWasOpen(true);
    if (excludedIds.size > 0) {
      setExcludedIds(new Set());
    }
    if (excludedModificationIds.size > 0) {
      setExcludedModificationIds(new Set());
    }
  } else if (!isOpen && wasOpen) {
    setWasOpen(false);
  }

  // Get complete modifications (have both project and task)
  const completeModifications = useMemo(() => {
    if (!modifiedEntries) return [];
    return Array.from(modifiedEntries.values()).filter(
      (mod) => mod.newProjectId > 0 && mod.newTaskId > 0
    );
  }, [modifiedEntries]);

  // Filter to only included modifications
  const includedModifications = useMemo(() => {
    return completeModifications.filter(mod => !excludedModificationIds.has(mod.outlookEventId));
  }, [completeModifications, excludedModificationIds]);

  // Toggle modification exclude/include
  const toggleModificationExclude = (id: string) => {
    setExcludedModificationIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };
  
  // Filter to only included appointments
  const includedAppointments = useMemo(() => {
    return appointments.filter(apt => !excludedIds.has(apt.id));
  }, [appointments, excludedIds]);
  
  // Toggle exclude/include
  const toggleExclude = (id: string) => {
    setExcludedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Calculate total duration (only for included appointments)
  const totalMinutes = useMemo(() => {
    return includedAppointments.reduce((acc, apt) => {
      const start = new Date(apt.start.dateTime);
      const end = new Date(apt.end.dateTime);
      return acc + (end.getTime() - start.getTime()) / 1000 / 60;
    }, 0);
  }, [includedAppointments]);

  const hours = Math.floor(totalMinutes / 60);
  const minutes = Math.round(totalMinutes % 60);

  // Create project lookup map
  const projectMap = useMemo(() => {
    const map = new Map<number, string>();
    projects.forEach((p) => map.set(p.id, p.name));
    return map;
  }, [projects]);

  // Format time helper
  const formatTime = (dateTime: string) => {
    const date = new Date(dateTime);
    return date.toLocaleTimeString("de-DE", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Format date helper
  const formatDate = (dateTime: string) => {
    const date = new Date(dateTime);
    return date.toLocaleDateString("de-DE", {
      weekday: "short",
      day: "2-digit",
      month: "2-digit",
    });
  };

  // Group appointments by date for better readability
  const appointmentsByDate = useMemo(() => {
    const grouped = new Map<string, Appointment[]>();
    appointments.forEach((apt) => {
      const dateStr = apt.start.dateTime.split("T")[0];
      const existing = grouped.get(dateStr) || [];
      existing.push(apt);
      grouped.set(dateStr, existing);
    });
    return Array.from(grouped.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [appointments]);

  // Count appointments with duplicate warnings
  const appointmentsWithWarnings = useMemo(() => {
    if (!duplicateWarnings) return [];
    return appointments.filter((apt) => duplicateWarnings.has(apt.id));
  }, [appointments, duplicateWarnings]);

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-foreground/40 backdrop-blur-sm" aria-hidden="true" />

      {/* Full-screen container */}
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel className="mx-auto max-w-lg w-full bg-card rounded-2xl shadow-2xl border border-border">
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-border">
            <DialogTitle className="text-lg font-semibold text-foreground flex items-center gap-2.5">
              <div className="w-8 h-8 bg-success/10 rounded-lg flex items-center justify-center">
                <CloudUpload className="h-4 w-4 text-success" />
              </div>
              Termine an ZEP übertragen
            </DialogTitle>
            <button
              onClick={onClose}
              className="p-2 text-muted-foreground hover:text-foreground hover:bg-background rounded-lg transition"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Content */}
          <div className="p-5">
            <p className="text-sm text-muted mb-4">
              {includedAppointments.length === appointments.length ? (
                <>Folgende <span className="font-medium text-foreground">{appointments.length}</span> Termine werden synchronisiert:</>
              ) : (
                <><span className="font-medium text-foreground">{includedAppointments.length}</span> von {appointments.length} Terminen werden synchronisiert:</>
              )}
            </p>

            {appointmentsWithWarnings.length > 0 && (
              <div className="mb-4 p-3 bg-warning-light border border-warning/20 rounded-xl">
                <div className="flex items-center gap-2 text-warning text-sm font-medium mb-1">
                  <AlertTriangle size={16} />
                  {appointmentsWithWarnings.length} Termin(e) mit möglichen Duplikaten
                </div>
                <p className="text-xs text-warning/80">
                  Diese Termine könnten bereits in ZEP existieren. Bitte prüfe vor dem Sync.
                </p>
              </div>
            )}

            {/* Scrollable appointment list */}
            <div className="max-h-64 overflow-y-auto border border-border rounded-xl divide-y divide-border">
              {appointmentsByDate.map(([dateStr, dayAppointments]) => (
                <div key={dateStr}>
                  {/* Date header */}
                  <div className="bg-background px-3 py-2 text-xs font-medium text-muted sticky top-0 border-b border-border">
                    {formatDate(dayAppointments[0].start.dateTime)}
                  </div>
                  {/* Appointments for this date */}
                  {dayAppointments.map((apt) => {
                    const isExcluded = excludedIds.has(apt.id);
                    return (
                      <div
                        key={apt.id}
                        className={`px-3 py-2.5 flex items-center gap-3 text-sm transition ${
                          isExcluded 
                            ? "bg-muted-foreground/5 opacity-60" 
                            : duplicateWarnings?.has(apt.id) 
                              ? "bg-warning-light" 
                              : "hover:bg-background"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={!isExcluded}
                          onChange={() => toggleExclude(apt.id)}
                          className="w-4 h-4 text-primary rounded border-border focus:ring-primary focus:ring-offset-0 flex-shrink-0"
                          aria-label={isExcluded ? `${apt.subject} einschließen` : `${apt.subject} ausschließen`}
                        />
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <span className={`font-mono text-xs whitespace-nowrap ${isExcluded ? "text-muted-foreground" : "text-muted"}`}>
                            {formatTime(apt.start.dateTime)}-{formatTime(apt.end.dateTime)}
                          </span>
                          <span className={`truncate ${isExcluded ? "text-muted-foreground line-through" : "text-foreground"}`}>
                            {apt.subject}
                          </span>
                          {duplicateWarnings?.has(apt.id) && !isExcluded && (
                            <AlertTriangle size={14} className="text-warning flex-shrink-0" />
                          )}
                        </div>
                        <span className={`text-xs ml-2 whitespace-nowrap font-medium ${isExcluded ? "text-muted-foreground" : "text-muted"}`}>
                          {apt.projectId ? projectMap.get(apt.projectId) || "?" : "-"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>

            {/* Total duration for new entries */}
            {includedAppointments.length > 0 && (
              <div className="mt-4 text-sm text-muted">
                Gesamt:{" "}
                <span className="font-semibold text-foreground">
                  {hours}h {minutes}min
                </span>
              </div>
            )}

            {/* Modified entries section */}
            {completeModifications.length > 0 && (
              <div className="mt-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 bg-primary/10 rounded-lg flex items-center justify-center">
                    <RefreshCw className="h-3 w-3 text-primary" />
                  </div>
                  <span className="text-sm font-medium text-foreground">
                    Einträge aktualisieren ({includedModifications.length})
                  </span>
                </div>
                <div className="max-h-48 overflow-y-auto border border-border rounded-xl divide-y divide-border">
                  {completeModifications.map((mod) => {
                    const isExcluded = excludedModificationIds.has(mod.outlookEventId);
                    return (
                      <div
                        key={mod.outlookEventId}
                        className={`px-3 py-2.5 flex items-center gap-3 text-sm transition ${
                          isExcluded ? "bg-muted-foreground/5 opacity-60" : "hover:bg-background"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={!isExcluded}
                          onChange={() => toggleModificationExclude(mod.outlookEventId)}
                          className="w-4 h-4 text-primary rounded border-border focus:ring-primary focus:ring-offset-0 flex-shrink-0"
                          aria-label={isExcluded ? "Änderung einschließen" : "Änderung ausschließen"}
                        />
                        <div className="flex flex-col min-w-0 flex-1">
                          <span className={`truncate ${isExcluded ? "text-muted-foreground line-through" : "text-foreground"}`}>
                            {mod.bemerkung || `Eintrag vom ${mod.datum}`}
                          </span>
                          <span className={`text-xs ${isExcluded ? "text-muted-foreground" : "text-primary"}`}>
                            → {mod.newProjektNr} / {mod.newVorgangNr}
                          </span>
                        </div>
                        <span className={`text-xs whitespace-nowrap font-mono ${isExcluded ? "text-muted-foreground" : "text-muted"}`}>
                          {mod.von} - {mod.bis}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-5 border-t border-border bg-background rounded-b-2xl">
            <button
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2.5 text-sm font-medium text-muted hover:text-foreground transition disabled:opacity-50 rounded-lg hover:bg-muted-foreground/10"
            >
              Abbrechen
            </button>
            <button
              onClick={() => onConfirm(includedAppointments, includedModifications.length > 0 ? includedModifications : undefined)}
              disabled={submitting || (includedAppointments.length === 0 && includedModifications.length === 0)}
              className="px-5 py-2.5 text-sm font-medium bg-success text-white rounded-xl hover:bg-success/90 disabled:bg-muted-foreground/20 disabled:text-muted-foreground disabled:cursor-not-allowed transition flex items-center gap-2 shadow-sm"
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Wird übertragen...
                </>
              ) : (
                <>
                  <CloudUpload className="h-4 w-4" />
                  {includedAppointments.length > 0 && includedModifications.length > 0 
                    ? `Übertragen (${includedAppointments.length} neu, ${includedModifications.length} ändern)`
                    : includedModifications.length > 0 
                      ? `${includedModifications.length} Änderung(en) übertragen`
                      : "Übertragen"
                  }
                </>
              )}
            </button>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
