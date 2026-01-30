"use client";

import { useMemo } from "react";
import { format, eachDayOfInterval, parseISO, isWeekend } from "date-fns";
import { de } from "date-fns/locale";

interface Appointment {
  id: string;
  subject: string;
  start: { dateTime: string };
  end: { dateTime: string };
  projectId: number | null;
  selected: boolean;
}

interface ZepAttendance {
  date: string;
  from: string;
  to: string;
  note: string | null;
}

interface CalendarHeatmapProps {
  startDate: string;
  endDate: string;
  appointments: Appointment[];
  syncedEntries: ZepAttendance[];
  submittedIds: Set<string>;
  selectedDate: string | null;
  onDayClick: (date: string | null) => void;
}

type DayStatus = "empty" | "unprocessed" | "edited" | "synced" | "weekend";

export default function CalendarHeatmap({
  startDate,
  endDate,
  appointments,
  syncedEntries,
  submittedIds,
  selectedDate,
  onDayClick,
}: CalendarHeatmapProps) {
  // Generate all days in the range
  const days = useMemo(() => {
    try {
      return eachDayOfInterval({
        start: parseISO(startDate),
        end: parseISO(endDate),
      });
    } catch {
      return [];
    }
  }, [startDate, endDate]);

  // Group appointments by date
  const appointmentsByDate = useMemo(() => {
    const map = new Map<string, Appointment[]>();
    appointments.forEach((apt) => {
      const date = apt.start.dateTime.split("T")[0];
      const existing = map.get(date) || [];
      map.set(date, [...existing, apt]);
    });
    return map;
  }, [appointments]);

  // Group synced entries by date
  const syncedByDate = useMemo(() => {
    const map = new Map<string, ZepAttendance[]>();
    syncedEntries.forEach((entry) => {
      const date = entry.date.split("T")[0];
      const existing = map.get(date) || [];
      map.set(date, [...existing, entry]);
    });
    return map;
  }, [syncedEntries]);

  // Helper: Check if a specific appointment is synced to ZEP
  const isAppointmentSynced = (apt: Appointment, zepEntries: ZepAttendance[]): boolean => {
    if (!zepEntries || zepEntries.length === 0) return false;
    
    const aptDate = new Date(apt.start.dateTime);
    const aptFromTime = aptDate.toTimeString().slice(0, 8);
    const aptEndDate = new Date(apt.end.dateTime);
    const aptToTime = aptEndDate.toTimeString().slice(0, 8);

    return zepEntries.some((entry) => {
      return (
        entry.note === apt.subject &&
        entry.from === aptFromTime &&
        entry.to === aptToTime
      );
    });
  };

  // Calculate status for each day
  const getDayStatus = (date: Date): DayStatus => {
    const dateStr = format(date, "yyyy-MM-dd");
    
    if (isWeekend(date)) {
      return "weekend";
    }

    const dayAppointments = appointmentsByDate.get(dateStr) || [];
    const dayZepEntries = syncedByDate.get(dateStr) || [];

    if (dayAppointments.length === 0 && dayZepEntries.length === 0) {
      return "empty";
    }

    // Check each appointment's sync status
    const selectedAppointments = dayAppointments.filter((apt) => apt.selected);
    
    // Check how many appointments are synced
    const syncedAppointments = dayAppointments.filter((apt) => 
      isAppointmentSynced(apt, dayZepEntries) || submittedIds.has(apt.id)
    );
    
    // All appointments are either synced or deselected
    const allDone = dayAppointments.length > 0 && 
      dayAppointments.every((apt) => 
        !apt.selected || isAppointmentSynced(apt, dayZepEntries) || submittedIds.has(apt.id)
      );
    
    if (allDone) {
      return "synced";
    }

    // Check if any selected (non-synced) appointment has a project assigned
    const unsyncedSelected = selectedAppointments.filter(
      (apt) => !isAppointmentSynced(apt, dayZepEntries) && !submittedIds.has(apt.id)
    );
    const anyEdited = unsyncedSelected.some((apt) => apt.projectId !== null);
    
    if (anyEdited) {
      return "edited";
    }

    // Has selected appointments without project (unprocessed)
    if (unsyncedSelected.length > 0) {
      return "unprocessed";
    }

    return "empty";
  };

  const getStatusColor = (status: DayStatus): string => {
    switch (status) {
      case "synced":
        return "bg-green-500";
      case "edited":
        return "bg-yellow-500";
      case "unprocessed":
        return "bg-red-400";
      case "weekend":
        return "bg-gray-200";
      case "empty":
      default:
        return "bg-gray-100";
    }
  };

  const getStatusLabel = (status: DayStatus): string => {
    switch (status) {
      case "synced":
        return "Synchronisiert";
      case "edited":
        return "Bearbeitet";
      case "unprocessed":
        return "Unbearbeitet";
      case "weekend":
        return "Wochenende";
      case "empty":
      default:
        return "Keine Termine";
    }
  };

  // Count stats
  const stats = useMemo(() => {
    let synced = 0;
    let edited = 0;
    let unprocessed = 0;

    days.forEach((day) => {
      const status = getDayStatus(day);
      if (status === "synced") synced++;
      else if (status === "edited") edited++;
      else if (status === "unprocessed") unprocessed++;
    });

    return { synced, edited, unprocessed };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days, appointmentsByDate, syncedByDate, submittedIds]);

  if (days.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-medium text-gray-700">Sync-Status</h3>
          {selectedDate && (
            <button
              onClick={() => onDayClick(null)}
              className="text-xs text-blue-600 hover:text-blue-800 underline"
            >
              Filter aufheben
            </button>
          )}
        </div>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-sm bg-green-500" />
            <span className="text-gray-600">Synchronisiert ({stats.synced})</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-sm bg-yellow-500" />
            <span className="text-gray-600">Bearbeitet ({stats.edited})</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-sm bg-red-400" />
            <span className="text-gray-600">Unbearbeitet ({stats.unprocessed})</span>
          </div>
        </div>
      </div>

      {/* Horizontal row - all days as boxes, auto-scaling width */}
      <div 
        className="grid gap-1"
        style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))` }}
      >
        {days.map((day) => {
          const status = getDayStatus(day);
          const dateStr = format(day, "yyyy-MM-dd");
          const dayAppointments = appointmentsByDate.get(dateStr) || [];
          const selectedCount = dayAppointments.filter((apt) => apt.selected).length;
          const totalCount = dayAppointments.length;
          const dayNum = format(day, "d");
          const weekday = format(day, "EEEEEE", { locale: de });
          
          const isSelected = selectedDate === dateStr;
          
          return (
            <div
              key={day.toISOString()}
              className="flex flex-col items-center gap-0.5"
              title={`${format(day, "EEEE, d. MMMM", { locale: de })}\n${selectedCount}/${totalCount} Termin(e) ausgewählt - ${getStatusLabel(status)}`}
            >
              {/* Weekday label */}
              <span className="text-[10px] text-gray-400">{weekday}</span>
              
              {/* Day box */}
              <div
                onClick={() => onDayClick(isSelected ? null : dateStr)}
                className={`aspect-square w-full max-w-8 rounded flex items-center justify-center text-xs font-medium cursor-pointer transition-all hover:scale-110 ${getStatusColor(status)} ${
                  status === "synced" ? "text-white" :
                  status === "edited" ? "text-yellow-900" :
                  status === "unprocessed" ? "text-white" :
                  "text-gray-400"
                } ${isSelected ? "ring-2 ring-blue-600 ring-offset-1 scale-110" : ""}`}
              >
                {dayNum}
              </div>
              
              {/* Appointment count indicator - shows selected/total */}
              {totalCount > 0 && (
                <span className={`text-[10px] ${selectedCount < totalCount ? "text-gray-400" : "text-gray-500"}`}>
                  {selectedCount === totalCount ? totalCount : `${selectedCount}/${totalCount}`}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
