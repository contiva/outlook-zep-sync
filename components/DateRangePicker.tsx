"use client";

import { Calendar, RefreshCw } from "lucide-react";
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, subWeeks, subMonths, format, formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";

interface DateRangePickerProps {
  startDate: string;
  endDate: string;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  onLoad: () => void;
  onDateRangeChange?: (startDate: string, endDate: string) => void;
  loading: boolean;
  lastLoadedAt?: Date | null;
}

type PresetKey = "thisWeek" | "lastWeek" | "thisMonth" | "lastMonth";

interface Preset {
  label: string;
  getRange: () => { start: Date; end: Date };
}

const presets: Record<PresetKey, Preset> = {
  thisWeek: {
    label: "Diese Woche",
    getRange: () => {
      const now = new Date();
      return {
        start: startOfWeek(now, { weekStartsOn: 1 }),
        end: endOfWeek(now, { weekStartsOn: 1 }),
      };
    },
  },
  lastWeek: {
    label: "Letzte Woche",
    getRange: () => {
      const lastWeek = subWeeks(new Date(), 1);
      return {
        start: startOfWeek(lastWeek, { weekStartsOn: 1 }),
        end: endOfWeek(lastWeek, { weekStartsOn: 1 }),
      };
    },
  },
  thisMonth: {
    label: "Dieser Monat",
    getRange: () => {
      const now = new Date();
      return {
        start: startOfMonth(now),
        end: endOfMonth(now),
      };
    },
  },
  lastMonth: {
    label: "Letzter Monat",
    getRange: () => {
      const lastMonth = subMonths(new Date(), 1);
      return {
        start: startOfMonth(lastMonth),
        end: endOfMonth(lastMonth),
      };
    },
  },
};

export default function DateRangePicker({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  onLoad,
  onDateRangeChange,
  loading,
  lastLoadedAt,
}: DateRangePickerProps) {
  const applyPreset = (key: PresetKey) => {
    const { start, end } = presets[key].getRange();
    const startStr = format(start, "yyyy-MM-dd");
    const endStr = format(end, "yyyy-MM-dd");
    
    // Nutze den kombinierten Callback wenn vorhanden (lädt automatisch)
    if (onDateRangeChange) {
      onDateRangeChange(startStr, endStr);
    } else {
      // Fallback: Nur Daten ändern, User muss manuell laden
      onStartDateChange(startStr);
      onEndDateChange(endStr);
    }
  };

  return (
    <div className="p-4 bg-white rounded-lg shadow space-y-3">
      {/* Preset buttons */}
      <div className="flex flex-wrap gap-2">
        {(Object.keys(presets) as PresetKey[]).map((key) => (
          <button
            key={key}
            onClick={() => applyPreset(key)}
            className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition"
          >
            {presets[key].label}
          </button>
        ))}
      </div>
      
      {/* Date inputs and load button */}
      <div className="flex flex-wrap items-center gap-4">
        <Calendar className="text-gray-400 hidden sm:block" size={24} />
        <div className="flex items-center gap-2">
          <label htmlFor="startDate" className="text-sm text-gray-600">Von:</label>
          <input
            id="startDate"
            type="date"
            value={startDate}
            onChange={(e) => onStartDateChange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="endDate" className="text-sm text-gray-600">Bis:</label>
          <input
            id="endDate"
            type="date"
            value={endDate}
            onChange={(e) => onEndDateChange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <button
          onClick={onLoad}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 transition flex items-center gap-2"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          {loading ? "Laden..." : "Termine laden"}
        </button>
        
        {lastLoadedAt && !loading && (
          <span className="text-xs text-gray-400 hidden sm:inline" title={format(lastLoadedAt, "PPpp", { locale: de })}>
            Zuletzt geladen: {formatDistanceToNow(lastLoadedAt, { addSuffix: true, locale: de })}
          </span>
        )}
      </div>
    </div>
  );
}
