'use client';

import { useMemo, useEffect } from 'react';
import { format, eachDayOfInterval, parseISO, isWeekend, addDays as addDaysToDate } from 'date-fns';
import { de } from 'date-fns/locale';
import { PartyPopper } from 'lucide-react';
import { RedisSyncMapping } from '@/lib/redis';

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
  billable?: boolean;
  canChangeBillable?: boolean;
  seriesMasterId?: string;
  type?: 'calendar' | 'call' | 'singleInstance' | 'occurrence' | 'exception' | 'seriesMaster';
  callType?: 'Phone' | 'Video' | 'ScreenShare';
  direction?: 'incoming' | 'outgoing';
  attendees?: Attendee[];
  customRemark?: string; // Optional: alternative remark for ZEP (overrides subject)
}

interface ZepAttendance {
  date: string;
  from: string;
  to: string;
  note: string | null;
  id: number;
  project_id: number;
  project_task_id: number;
  activity_id: string;
  billable: boolean;
}

// Modified entry for tracking changes to synced entries
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
  newVon?: string;
  newBis?: string;
}

export interface HeatmapStats {
  synced: number;
  syncedWithChanges: number;
  edited: number;
  unprocessed: number;
}

interface CalendarHeatmapProps {
  startDate: string;
  endDate: string;
  appointments: Appointment[];
  syncedEntries: ZepAttendance[];
  syncMappings?: Map<string, RedisSyncMapping>;
  submittedIds: Set<string>;
  modifiedEntries?: Map<string, ModifiedEntry>;
  selectedDate: string | null;
  onDayClick: (date: string | null) => void;
  onSeriesClick: (seriesFilter: boolean) => void;
  seriesFilterActive: boolean;
  hideSoloMeetings?: boolean;
  userEmail?: string;
  onStatsChange?: (stats: HeatmapStats) => void;
}

// Berechnet Ostersonntag für ein gegebenes Jahr (Anonymous Gregorian Algorithm)
function getEasterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

// Bundesweite gesetzliche Feiertage (gelten in allen 16 Bundesländern)
function getGermanHolidays(year: number): Map<string, string> {
  const easter = getEasterSunday(year);
  const holidays = new Map<string, string>();
  const fmt = (d: Date) => format(d, 'yyyy-MM-dd');

  // Feste Feiertage
  holidays.set(`${year}-01-01`, 'Neujahr');
  holidays.set(`${year}-05-01`, 'Tag der Arbeit');
  holidays.set(`${year}-10-03`, 'Tag der Deutschen Einheit');
  holidays.set(`${year}-12-25`, '1. Weihnachtsfeiertag');
  holidays.set(`${year}-12-26`, '2. Weihnachtsfeiertag');

  // Bewegliche Feiertage (abhängig von Ostern)
  holidays.set(fmt(addDaysToDate(easter, -2)), 'Karfreitag');
  holidays.set(fmt(addDaysToDate(easter, 1)), 'Ostermontag');
  holidays.set(fmt(addDaysToDate(easter, 39)), 'Christi Himmelfahrt');
  holidays.set(fmt(addDaysToDate(easter, 50)), 'Pfingstmontag');

  return holidays;
}

type DayStatus = 'empty' | 'unprocessed' | 'edited' | 'synced' | 'syncedWithChanges' | 'weekend';
type AppointmentStatus = 'synced' | 'syncedWithChanges' | 'edited' | 'unprocessed' | 'deselected';

export default function CalendarHeatmap({
  startDate,
  endDate,
  appointments,
  syncedEntries,
  syncMappings,
  submittedIds,
  modifiedEntries,
  selectedDate,
  onDayClick,
  onSeriesClick,
  seriesFilterActive,
  hideSoloMeetings = false,
  userEmail,
  onStatsChange,
}: CalendarHeatmapProps) {
  // Helper: Check if an appointment is a solo meeting (only user as attendee)
  const isSoloMeeting = (apt: Appointment): boolean => {
    if (!userEmail) return false;
    const otherAttendees = (apt.attendees || []).filter(
      (a) => a.emailAddress.address.toLowerCase() !== userEmail.toLowerCase(),
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

  // Feiertage für alle relevanten Jahre im Bereich berechnen
  const holidays = useMemo(() => {
    try {
      const startYear = parseISO(startDate).getFullYear();
      const endYear = parseISO(endDate).getFullYear();
      const allHolidays = new Map<string, string>();
      for (let y = startYear; y <= endYear; y++) {
        const yearHolidays = getGermanHolidays(y);
        yearHolidays.forEach((name, date) => allHolidays.set(date, name));
      }
      return allHolidays;
    } catch {
      return new Map<string, string>();
    }
  }, [startDate, endDate]);

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
      const date = apt.start.dateTime.split('T')[0];
      const existing = map.get(date) || [];
      map.set(date, [...existing, apt]);
    });
    return map;
  }, [filteredAppointments]);

  // Group synced entries by date
  const syncedByDate = useMemo(() => {
    const map = new Map<string, ZepAttendance[]>();
    syncedEntries.forEach((entry) => {
      const date = entry.date.split('T')[0];
      const existing = map.get(date) || [];
      map.set(date, [...existing, entry]);
    });
    return map;
  }, [syncedEntries]);

  // Find all recurring series (appointments with seriesMasterId) - using filtered appointments
  const seriesData = useMemo(() => {
    const seriesMap = new Map<string, Appointment[]>();

    filteredAppointments.forEach((apt) => {
      if (apt.seriesMasterId && apt.type === 'occurrence') {
        const existing = seriesMap.get(apt.seriesMasterId) || [];
        existing.push(apt);
        seriesMap.set(apt.seriesMasterId, existing);
      }
    });

    // Only count series with at least 2 occurrences
    const validSeries = Array.from(seriesMap.entries()).filter(([, apts]) => apts.length >= 2);

    const totalSeriesAppointments = validSeries.reduce((acc, [, apts]) => acc + apts.length, 0);

    return {
      count: validSeries.length,
      series: validSeries, // Array of [seriesId, appointments[]]
      appointments: validSeries.flatMap(([, apts]) => apts),
      totalAppointments: totalSeriesAppointments,
    };
  }, [filteredAppointments]);

  // Helper: Check if a specific appointment is synced to ZEP (needs to be before getSeriesStatus)
  // Priority 1: Redis mapping lookup
  // Priority 2: Subject/customRemark match on same date
  const isAppointmentSyncedCheck = (apt: Appointment): boolean => {
    // Priority 1: Redis mapping lookup - verify ZEP entry still exists
    const redisMapping = syncMappings?.get(apt.id);
    if (redisMapping && syncedEntries.some((e) => e.id === redisMapping.zepAttendanceId))
      return true;

    const zepEntries = syncedByDate.get(apt.start.dateTime.split('T')[0]) || [];
    if (zepEntries.length === 0) return false;

    // Priority 2: Subject/customRemark match
    const aptSubject = (apt.subject || '').trim();
    const aptCustomRemark = (apt.customRemark || '').trim();

    return zepEntries.some((entry) => {
      const entryNote = (entry.note || '').trim();
      return entryNote === aptSubject || (aptCustomRemark && entryNote === aptCustomRemark);
    });
  };

  // Calculate aggregated status for a series
  const getSeriesStatus = (seriesAppointments: Appointment[]): AppointmentStatus => {
    let syncedCount = 0;
    let hasUnprocessed = false;
    let hasEdited = false;
    let allDeselectedOrSynced = true;

    for (const apt of seriesAppointments) {
      const isSynced = isAppointmentSyncedCheck(apt) || submittedIds.has(apt.id);

      if (isSynced) {
        syncedCount++;
        continue;
      }

      // Not synced
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

    const allSynced = syncedCount === seriesAppointments.length;
    const someSynced = syncedCount > 0;

    if (allSynced) return 'synced';
    // Partially synced series = yellow (syncedWithChanges)
    if (someSynced) return 'syncedWithChanges';
    if (hasUnprocessed) return 'unprocessed';
    if (hasEdited) return 'edited';
    if (allDeselectedOrSynced) return 'deselected';
    return 'deselected';
  };

  // Helper: Check if a specific appointment is synced to ZEP
  // Priority 1: Redis mapping lookup
  // Priority 2: Subject/customRemark match on same date
  const isAppointmentSynced = (apt: Appointment, zepEntries: ZepAttendance[]): boolean => {
    // Priority 1: Redis mapping lookup - verify ZEP entry still exists
    const redisMapping = syncMappings?.get(apt.id);
    if (redisMapping && syncedEntries.some((e) => e.id === redisMapping.zepAttendanceId))
      return true;

    if (!zepEntries || zepEntries.length === 0) return false;

    // Priority 2: Subject/customRemark match
    const aptSubject = (apt.subject || '').trim();
    const aptCustomRemark = (apt.customRemark || '').trim();

    return zepEntries.some((entry) => {
      const entryNote = (entry.note || '').trim();
      return entryNote === aptSubject || (aptCustomRemark && entryNote === aptCustomRemark);
    });
  };

  // Calculate status for each day
  const getDayStatus = (date: Date): DayStatus => {
    const dateStr = format(date, 'yyyy-MM-dd');

    if (isWeekend(date)) {
      return 'weekend';
    }

    const dayAppointments = appointmentsByDate.get(dateStr) || [];
    const dayZepEntries = syncedByDate.get(dateStr) || [];

    if (dayAppointments.length === 0 && dayZepEntries.length === 0) {
      return 'empty';
    }

    // Check each appointment's sync status - synced appointments count as done regardless of selected state
    const unsyncedAppointments = dayAppointments.filter(
      (apt) => !isAppointmentSynced(apt, dayZepEntries) && !submittedIds.has(apt.id),
    );

    // All appointments are synced
    if (unsyncedAppointments.length === 0 && dayAppointments.length > 0) {
      return 'synced';
    }

    // Check unsynced appointments that are selected
    const unsyncedSelected = unsyncedAppointments.filter((apt) => apt.selected);

    // Check if any selected (non-synced) appointment has a project assigned
    const anyEdited = unsyncedSelected.some((apt) => apt.projectId !== null);

    if (anyEdited) {
      return 'edited';
    }

    // Has selected appointments without project (unprocessed)
    if (unsyncedSelected.length > 0) {
      return 'unprocessed';
    }

    // All unsynced appointments are deselected - treat as synced/done if there are synced ones
    if (
      dayAppointments.some(
        (apt) => isAppointmentSynced(apt, dayZepEntries) || submittedIds.has(apt.id),
      )
    ) {
      return 'synced';
    }

    return 'empty';
  };

  const getStatusLabel = (status: DayStatus): string => {
    switch (status) {
      case 'synced':
        return 'Synchronisiert';
      case 'syncedWithChanges':
        return 'Änderung ausstehend';
      case 'edited':
        return 'Bearbeitet';
      case 'unprocessed':
        return 'Unbearbeitet';
      case 'weekend':
        return 'Wochenende';
      case 'empty':
      default:
        return 'Keine Termine';
    }
  };

  // Helper: Check if a synced appointment has pending modifications
  const hasPendingModifications = (apt: Appointment, zepEntries: ZepAttendance[]): boolean => {
    if (!modifiedEntries || modifiedEntries.size === 0) return false;

    const mod = modifiedEntries.get(apt.id);
    if (!mod) return false;

    // Find the matching synced entry
    const syncedEntry = zepEntries.find((entry) => {
      const entryNote = (entry.note || '').trim();
      return entryNote === (apt.subject || '').trim();
    });
    if (!syncedEntry) return false;

    // Check if there are actual changes
    const hasProjectChanges =
      mod.newProjectId !== syncedEntry.project_id ||
      mod.newTaskId !== syncedEntry.project_task_id ||
      mod.newActivityId !== syncedEntry.activity_id ||
      mod.newBillable !== syncedEntry.billable;
    const hasTimeChanges = mod.newVon !== undefined || mod.newBis !== undefined;

    return hasProjectChanges || hasTimeChanges;
  };

  // Get status for individual appointment
  const getAppointmentStatus = (
    apt: Appointment,
    zepEntries: ZepAttendance[],
  ): AppointmentStatus => {
    // Synced check comes FIRST
    if (isAppointmentSynced(apt, zepEntries) || submittedIds.has(apt.id)) {
      // Check if synced but has pending modifications
      if (hasPendingModifications(apt, zepEntries)) {
        return 'syncedWithChanges';
      }
      return 'synced';
    }
    if (!apt.selected) {
      return 'deselected';
    }
    if (apt.projectId !== null) {
      return 'edited';
    }
    return 'unprocessed';
  };

  const getAppointmentStatusColor = (status: AppointmentStatus): string => {
    switch (status) {
      case 'synced':
        return 'bg-green-600';
      case 'syncedWithChanges':
        return 'bg-yellow-400';
      case 'edited':
        return 'bg-amber-400';
      case 'unprocessed':
        return 'bg-red-400';
      case 'deselected':
        return 'bg-gray-300';
    }
  };

  // Series status colors - same as appointments but with amber for edited
  const getSeriesStatusColor = (status: AppointmentStatus): string => {
    switch (status) {
      case 'synced':
        return 'bg-green-600';
      case 'syncedWithChanges':
        return 'bg-yellow-400';
      case 'edited':
        return 'bg-amber-400'; // Ready to sync
      case 'unprocessed':
        return 'bg-red-400'; // Not ready - red
      case 'deselected':
        return 'bg-gray-300';
    }
  };

  // Count stats (per appointment, not per day)
  const stats = useMemo(() => {
    let synced = 0;
    let syncedWithChanges = 0;
    let edited = 0;
    let unprocessed = 0;

    filteredAppointments.forEach((apt) => {
      const dateStr = apt.start.dateTime.split('T')[0];
      const zepEntries = syncedByDate.get(dateStr) || [];
      const status = getAppointmentStatus(apt, zepEntries);

      if (status === 'synced') synced++;
      else if (status === 'syncedWithChanges') syncedWithChanges++;
      else if (status === 'edited') edited++;
      else if (status === 'unprocessed') unprocessed++;
      // deselected appointments are not counted
    });

    return { synced, syncedWithChanges, edited, unprocessed };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredAppointments, syncedByDate, submittedIds, modifiedEntries]);

  // Notify parent of stats changes
  useEffect(() => {
    onStatsChange?.(stats);
  }, [stats, onStatsChange]);

  if (days.length === 0) {
    return null;
  }

  return (
    <div className="p-4">
      {/* Horizontal row - series tile + divider + all days as boxes */}
      <div
        className="grid gap-1 items-end"
        style={{ gridTemplateColumns: `auto auto repeat(${days.length}, minmax(0, 1fr))` }}
      >
        {/* Series tile - always first */}
        <div className="flex flex-col items-center gap-0.5">
          {/* Label */}
          <span className="text-[10px] text-gray-400" aria-hidden="true">
            Serien
          </span>

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
            className={`w-10 h-10 rounded overflow-hidden flex items-center justify-center focus:outline-none transition-transform shadow-[inset_1px_1px_2px_rgba(0,0,0,0.08)] ${
              seriesData.count === 0
                ? 'bg-gray-100 border border-gray-200 cursor-default'
                : seriesFilterActive
                  ? 'cursor-pointer ring-2 ring-blue-600 ring-offset-1 scale-110'
                  : 'cursor-pointer hover:brightness-110 hover:shadow-md'
            }`}
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
                      className={`flex-1 ${getSeriesStatusColor(seriesStatus)} border-b border-white/30 last:border-b-0 shadow-[inset_0_1px_0_rgba(255,255,255,0.25),inset_0_-1px_0_rgba(0,0,0,0.1)]`}
                      aria-hidden="true"
                    />
                  );
                })}
              </div>
            ) : (
              <span className="text-[10px] text-gray-400" aria-hidden="true">
                -
              </span>
            )}
          </button>

          {/* Infinity symbol below */}
          <span
            className={`text-[10px] font-medium ${
              seriesData.count > 0 ? 'text-gray-600' : 'text-gray-400'
            }`}
            aria-hidden="true"
          >
            ∞
          </span>
        </div>

        {/* Divider between series and days */}
        <div className="flex flex-col items-center gap-0.5 px-1">
          <span className="text-[10px] text-transparent" aria-hidden="true">
            .
          </span>
          <div className="w-px h-10 bg-gray-300" />
          <span className="text-[10px] text-transparent" aria-hidden="true">
            .
          </span>
        </div>

        {days.map((day) => {
          const status = getDayStatus(day);
          const dateStr = format(day, 'yyyy-MM-dd');
          const dayAppointments = appointmentsByDate.get(dateStr) || [];
          const selectedCount = dayAppointments.filter((apt) => apt.selected).length;
          const totalCount = dayAppointments.length;
          const dayNum = format(day, 'd');
          const weekday = format(day, 'EEEEEE', { locale: de });
          const holidayName = holidays.get(dateStr);
          const isHoliday = !!holidayName;

          const isSelected = selectedDate === dateStr;

          return (
            <div key={day.toISOString()} className="flex flex-col items-center gap-0.5">
              {/* Weekday label */}
              <span className="text-[10px] text-gray-400" aria-hidden="true">
                {weekday}
              </span>

              {/* Day box with stacked segments */}
              <button
                type="button"
                onClick={() => onDayClick(isSelected ? null : dateStr)}
                className={`relative group w-full max-w-8 h-10 rounded overflow-hidden cursor-pointer focus:outline-none transition-transform shadow-[inset_1px_1px_2px_rgba(0,0,0,0.08)] flex items-center justify-center ${
                  status === 'weekend' || (isHoliday && totalCount === 0)
                    ? 'bg-gray-100'
                    : totalCount === 0
                      ? 'bg-gray-100 border border-gray-200'
                      : ''
                } ${isSelected ? 'ring-2 ring-blue-600 ring-offset-1 scale-110' : totalCount > 0 ? 'hover:brightness-110 hover:shadow-md' : 'hover:bg-gray-200 hover:shadow-md'}`}
                aria-label={`${format(day, 'EEEE, d. MMMM', { locale: de })}${holidayName ? ` (${holidayName})` : ''}: ${totalCount} Termine, ${selectedCount} ausgewählt, Status: ${getStatusLabel(status)}`}
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
                          className={`flex-1 ${getAppointmentStatusColor(aptStatus)} border-b border-white/30 last:border-b-0 shadow-[inset_0_1px_0_rgba(255,255,255,0.25),inset_0_-1px_0_rgba(0,0,0,0.1)]`}
                          aria-hidden="true"
                        />
                      );
                    })}
                  </div>
                ) : status === 'weekend' || isHoliday || (totalCount === 0 && isSelected) ? (
                  <PartyPopper
                    className={`w-4 h-4 transition-all duration-300 ${isSelected ? 'text-gray-500 opacity-100' : isHoliday ? 'text-gray-600 opacity-30' : 'text-gray-300 opacity-0 group-hover:text-gray-500 group-hover:opacity-100'}`}
                    aria-hidden="true"
                  />
                ) : null}
                {/* Feiertag: PartyPopper-Overlay über Terminen */}
                {isHoliday && totalCount > 0 && (
                  <div
                    className="absolute inset-0 flex items-center justify-center"
                    aria-hidden="true"
                  >
                    <PartyPopper className="w-4 h-4 text-gray-800 opacity-30" />
                  </div>
                )}
              </button>

              {/* Day number below */}
              <span
                className={`text-[10px] font-medium ${
                  isHoliday
                    ? 'text-red-500'
                    : status === 'weekend'
                      ? 'text-gray-400'
                      : 'text-gray-600'
                }`}
                title={holidayName || undefined}
              >
                {dayNum}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Legend component exported separately to be placed outside the container
export function CalendarHeatmapLegend({ stats }: { stats: HeatmapStats }) {
  return (
    <div className="flex items-center justify-end gap-3 text-[10px] px-1 mt-1">
      <div className="flex items-center gap-1">
        <div className="w-2 h-2 rounded-sm bg-green-600/60" />
        <span className="text-gray-400">Synchronisiert</span>
        <span className="text-gray-400">{stats.synced}</span>
      </div>
      {stats.syncedWithChanges > 0 && (
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-sm bg-yellow-400/60" />
          <span className="text-gray-400">Änderung</span>
          <span className="text-gray-400">{stats.syncedWithChanges}</span>
        </div>
      )}
      <div className="flex items-center gap-1">
        <div className="w-2 h-2 rounded-sm bg-amber-400/60" />
        <span className="text-gray-400">Bearbeitet</span>
        <span className="text-gray-400">{stats.edited}</span>
      </div>
      <div className="flex items-center gap-1">
        <div className="w-2 h-2 rounded-sm bg-red-400/60" />
        <span className="text-gray-400">Unbearbeitet</span>
        <span className="text-gray-400">{stats.unprocessed}</span>
      </div>
    </div>
  );
}
