"use client";

import { useMemo } from "react";
import { format, eachDayOfInterval, parseISO, isWeekend } from "date-fns";
import { de } from "date-fns/locale";
import { formatZepStartTime, formatZepEndTime } from "@/lib/zep-api";

interface Attendee {
  emailAddress: {
    address: string;
  };
}

interface Appointment {
  id: string;
  subject: string;
  start: { dateTime: string };
  end: { dateTime: string };
  projectId: number | null;
  selected: boolean;
  seriesMasterId?: string;
  type?: string;
  attendees?: Attendee[];
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
  onSeriesClick: (seriesFilter: boolean) => void;
  seriesFilterActive: boolean;
  hideSoloMeetings?: boolean;
  userEmail?: string;
}

type DayStatus = "empty" | "unprocessed" | "edited" | "synced" | "weekend";
type AppointmentStatus = "synced" | "edited" | "unprocessed" | "deselected";

export default function CalendarHeatmap({
  startDate,
  endDate,
  appointments,
  syncedEntries,
  submittedIds,
  selectedDate,
  onDayClick,
  onSeriesClick,
  seriesFilterActive,
  hideSoloMeetings = false,
  userEmail,
}: CalendarHeatmapProps) {
  // Helper: Check if an appointment is a solo meeting (only user as attendee)
  const isSoloMeeting = (apt: Appointment): boolean => {
    if (!userEmail) return false;
    const otherAttendees = (apt.attendees || []).filter(
      (a) => a.emailAddress.address.toLowerCase() !== userEmail.toLowerCase()
    );
    return otherAttendees.length === 0;
  };

  // Filter appointments based on hideSoloMeetings setting
  const filteredAppointments = useMemo(() => {
    if (!hideSoloMeetings) return appointments;
    
    return appointments.filter((apt) => {
      // Always show if manually selected
      if (apt.selected) return true;
      // Otherwise, only show if not a solo meeting
      return !isSoloMeeting(apt);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appointments, hideSoloMeetings, userEmail]);

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

  // Group appointments by date (using filtered appointments)
  const appointmentsByDate = useMemo(() => {
    const map = new Map<string, Appointment[]>();
    filteredAppointments.forEach((apt) => {
      const date = apt.start.dateTime.split("T")[0];
      const existing = map.get(date) || [];
      map.set(date, [...existing, apt]);
    });
    return map;
  }, [filteredAppointments]);

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

  // Find all recurring series (appointments with seriesMasterId) - using filtered appointments
  const seriesData = useMemo(() => {
    const seriesMap = new Map<string, Appointment[]>();
    
    filteredAppointments.forEach((apt) => {
      if (apt.seriesMasterId && apt.type === "occurrence") {
        const existing = seriesMap.get(apt.seriesMasterId) || [];
        existing.push(apt);
        seriesMap.set(apt.seriesMasterId, existing);
      }
    });

    // Only count series with at least 2 occurrences
    const validSeries = Array.from(seriesMap.entries()).filter(
      ([, apts]) => apts.length >= 2
    );

    const totalSeriesAppointments = validSeries.reduce(
      (acc, [, apts]) => acc + apts.length,
      0
    );

    return {
      count: validSeries.length,
      series: validSeries, // Array of [seriesId, appointments[]]
      appointments: validSeries.flatMap(([, apts]) => apts),
      totalAppointments: totalSeriesAppointments,
    };
  }, [appointments]);

  // Helper: Check if a specific appointment is synced to ZEP (needs to be before getSeriesStatus)
  // Uses rounded times for comparison (ZEP stores times in 15-min intervals)
  const isAppointmentSyncedCheck = (apt: Appointment): boolean => {
    const zepEntries = syncedByDate.get(apt.start.dateTime.split("T")[0]) || [];
    if (zepEntries.length === 0) return false;
    
    const aptDate = new Date(apt.start.dateTime);
    const aptEndDate = new Date(apt.end.dateTime);
    
    // Use rounded times (same logic as when syncing to ZEP)
    const aptFromTime = formatZepStartTime(aptDate);
    const aptToTime = formatZepEndTime(aptEndDate);

    return zepEntries.some((entry) => {
      return (
        entry.note === apt.subject &&
        entry.from === aptFromTime &&
        entry.to === aptToTime
      );
    });
  };

  // Calculate aggregated status for a series
  const getSeriesStatus = (seriesAppointments: Appointment[]): AppointmentStatus => {
    let hasUnprocessed = false;
    let hasEdited = false;
    let allSynced = true;
    let allDeselectedOrSynced = true;

    for (const apt of seriesAppointments) {
      const isSynced = isAppointmentSyncedCheck(apt) || submittedIds.has(apt.id);
      
      if (isSynced) {
        // Synced appointments are fine, continue checking others
        continue;
      }
      
      // Not synced
      allSynced = false;
      
      if (apt.selected) {
        allDeselectedOrSynced = false;
        if (apt.projectId !== null) {
          hasEdited = true;
        } else {
          hasUnprocessed = true;
        }
      }
      // Deselected but not synced - counts as deselected
    }

    if (allSynced) return "synced";
    if (hasUnprocessed) return "unprocessed";
    if (hasEdited) return "edited";
    if (allDeselectedOrSynced) return "deselected";
    return "deselected";
  };

  // Helper: Check if a specific appointment is synced to ZEP
  // Uses rounded times for comparison (ZEP stores times in 15-min intervals)
  const isAppointmentSynced = (apt: Appointment, zepEntries: ZepAttendance[]): boolean => {
    if (!zepEntries || zepEntries.length === 0) return false;
    
    const aptDate = new Date(apt.start.dateTime);
    const aptEndDate = new Date(apt.end.dateTime);
    
    // Use rounded times (same logic as when syncing to ZEP)
    const aptFromTime = formatZepStartTime(aptDate);
    const aptToTime = formatZepEndTime(aptEndDate);

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

    // Check each appointment's sync status - synced appointments count as done regardless of selected state
    const unsyncedAppointments = dayAppointments.filter(
      (apt) => !isAppointmentSynced(apt, dayZepEntries) && !submittedIds.has(apt.id)
    );
    
    // All appointments are synced
    if (unsyncedAppointments.length === 0 && dayAppointments.length > 0) {
      return "synced";
    }

    // Check unsynced appointments that are selected
    const unsyncedSelected = unsyncedAppointments.filter((apt) => apt.selected);
    
    // Check if any selected (non-synced) appointment has a project assigned
    const anyEdited = unsyncedSelected.some((apt) => apt.projectId !== null);
    
    if (anyEdited) {
      return "edited";
    }

    // Has selected appointments without project (unprocessed)
    if (unsyncedSelected.length > 0) {
      return "unprocessed";
    }

    // All unsynced appointments are deselected - treat as synced/done if there are synced ones
    if (dayAppointments.some((apt) => isAppointmentSynced(apt, dayZepEntries) || submittedIds.has(apt.id))) {
      return "synced";
    }

    return "empty";
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

  // Get status for individual appointment
  const getAppointmentStatus = (apt: Appointment, zepEntries: ZepAttendance[]): AppointmentStatus => {
    // Synced check comes FIRST - synced appointments should always show as green
    if (isAppointmentSynced(apt, zepEntries) || submittedIds.has(apt.id)) {
      return "synced";
    }
    if (!apt.selected) {
      return "deselected";
    }
    if (apt.projectId !== null) {
      return "edited";
    }
    return "unprocessed";
  };

  const getAppointmentStatusColor = (status: AppointmentStatus): string => {
    switch (status) {
      case "synced":
        return "bg-green-500";
      case "edited":
        return "bg-yellow-500";
      case "unprocessed":
        return "bg-red-400";
      case "deselected":
        return "bg-gray-300";
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
              Datumsfilter aufheben
            </button>
          )}
          {seriesFilterActive && (
            <button
              onClick={() => onSeriesClick(false)}
              className="text-xs text-blue-600 hover:text-blue-800 underline"
            >
              Serienfilter aufheben ({seriesData.count} Serien)
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

      {/* Horizontal row - series tile + all days as boxes */}
      <div 
        className="grid gap-1"
        style={{ gridTemplateColumns: `auto repeat(${days.length}, minmax(0, 1fr))` }}
      >
        {/* Series tile - always first */}
        <div className="flex flex-col items-center gap-0.5">
          {/* Label */}
          <span className="text-[10px] text-gray-400" aria-hidden="true">Serien</span>
          
          {/* Series box */}
          <button
            type="button"
            onClick={() => {
              if (seriesData.count > 0) {
                onSeriesClick(!seriesFilterActive);
                if (!seriesFilterActive) {
                  onDayClick(null); // Clear date filter when activating series filter
                }
              }
            }}
            disabled={seriesData.count === 0}
            className={`w-10 h-10 rounded overflow-hidden transition-all flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 ${
              seriesData.count === 0
                ? "bg-gray-100 border border-gray-200 cursor-default"
                : "cursor-pointer hover:scale-110"
            } ${seriesFilterActive ? "ring-2 ring-blue-600 ring-offset-1 scale-110" : ""}`}
            aria-label={`Terminserien filtern: ${seriesData.count} Serien mit ${seriesData.totalAppointments} Terminen`}
            aria-pressed={seriesFilterActive}
          >
            {seriesData.count > 0 ? (
              <div className="flex flex-col h-full w-full">
                {seriesData.series.map(([seriesId, seriesAppointments]) => {
                  const seriesStatus = getSeriesStatus(seriesAppointments);
                  return (
                    <div
                      key={seriesId}
                      className={`flex-1 ${getAppointmentStatusColor(seriesStatus)} border-b border-white/30 last:border-b-0`}
                      aria-hidden="true"
                    />
                  );
                })}
              </div>
            ) : (
              <span className="text-[10px] text-gray-400" aria-hidden="true">-</span>
            )}
          </button>
          
          {/* Infinity symbol below */}
          <span className={`text-[10px] font-medium ${
            seriesData.count > 0 ? "text-gray-600" : "text-gray-400"
          }`} aria-hidden="true">
            ∞
          </span>
        </div>
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
            >
              {/* Weekday label */}
              <span className="text-[10px] text-gray-400" aria-hidden="true">{weekday}</span>
              
              {/* Day box with stacked segments */}
              <button
                type="button"
                onClick={() => onDayClick(isSelected ? null : dateStr)}
                className={`w-full max-w-8 h-10 rounded overflow-hidden cursor-pointer transition-all hover:scale-110 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 ${
                  status === "weekend" ? "bg-gray-100" : totalCount === 0 ? "bg-gray-100 border border-gray-200" : ""
                } ${isSelected ? "ring-2 ring-blue-600 ring-offset-1 scale-110" : ""}`}
                aria-label={`${format(day, "EEEE, d. MMMM", { locale: de })}: ${totalCount} Termine, ${selectedCount} ausgewählt, Status: ${getStatusLabel(status)}`}
                aria-pressed={isSelected}
              >
                {/* Stacked segments for appointments */}
                {totalCount > 0 ? (
                  <div className="flex flex-col h-full w-full">
                    {dayAppointments.map((apt) => {
                      const aptStatus = getAppointmentStatus(apt, syncedByDate.get(dateStr) || []);
                      return (
                        <div
                          key={apt.id}
                          className={`flex-1 ${getAppointmentStatusColor(aptStatus)} border-b border-white/30 last:border-b-0`}
                          aria-hidden="true"
                        />
                      );
                    })}
                  </div>
                ) : null}
              </button>
              
              {/* Day number below */}
              <span className={`text-[10px] font-medium ${
                status === "weekend" ? "text-gray-400" : "text-gray-600"
              }`}>
                {dayNum}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
