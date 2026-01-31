"use client";

import { Dialog, DialogPanel, DialogTitle } from "@headlessui/react";
import { X, CloudUpload } from "lucide-react";
import { useMemo } from "react";

interface Project {
  id: number;
  name: string;
}

interface Appointment {
  id: string;
  subject: string;
  start: { dateTime: string };
  end: { dateTime: string };
  projectId: number | null;
}

interface SyncConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  appointments: Appointment[];
  projects: Project[];
  submitting: boolean;
}

export default function SyncConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  appointments,
  projects,
  submitting,
}: SyncConfirmDialogProps) {
  // Calculate total duration
  const totalMinutes = useMemo(() => {
    return appointments.reduce((acc, apt) => {
      const start = new Date(apt.start.dateTime);
      const end = new Date(apt.end.dateTime);
      return acc + (end.getTime() - start.getTime()) / 1000 / 60;
    }, 0);
  }, [appointments]);

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

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />

      {/* Full-screen container */}
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel className="mx-auto max-w-lg w-full bg-white rounded-xl shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <DialogTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <CloudUpload className="h-5 w-5 text-amber-500" />
              Termine an ZEP übertragen
            </DialogTitle>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-4">
            <p className="text-sm text-gray-600 mb-3">
              Folgende {appointments.length} Termine werden synchronisiert:
            </p>

            {/* Scrollable appointment list */}
            <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100">
              {appointmentsByDate.map(([dateStr, dayAppointments]) => (
                <div key={dateStr}>
                  {/* Date header */}
                  <div className="bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-500 sticky top-0">
                    {formatDate(dayAppointments[0].start.dateTime)}
                  </div>
                  {/* Appointments for this date */}
                  {dayAppointments.map((apt) => (
                    <div
                      key={apt.id}
                      className="px-3 py-2 flex items-center justify-between text-sm"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-gray-500 font-mono text-xs whitespace-nowrap">
                          {formatTime(apt.start.dateTime)}-{formatTime(apt.end.dateTime)}
                        </span>
                        <span className="text-gray-900 truncate">
                          {apt.subject}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500 ml-2 whitespace-nowrap">
                        {apt.projectId ? projectMap.get(apt.projectId) || "?" : "-"}
                      </span>
                    </div>
                  ))}
                </div>
              ))}
            </div>

            {/* Total duration */}
            <div className="mt-3 text-sm text-gray-600">
              Gesamt:{" "}
              <span className="font-medium text-gray-900">
                {hours}h {minutes}min
              </span>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">
            <button
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition disabled:opacity-50"
            >
              Abbrechen
            </button>
            <button
              onClick={onConfirm}
              disabled={submitting || appointments.length === 0}
              className="px-4 py-2 text-sm font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition flex items-center gap-2"
            >
              {submitting ? (
                <>
                  <svg
                    className="animate-spin h-4 w-4"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Wird übertragen...
                </>
              ) : (
                <>
                  <CloudUpload className="h-4 w-4" />
                  Übertragen
                </>
              )}
            </button>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
