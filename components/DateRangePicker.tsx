"use client";

import { Calendar, RefreshCw } from "lucide-react";
import { startOfMonth, endOfMonth, subMonths, subDays, format, formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";

interface DateRangePickerProps {
  startDate: string;
  endDate: string;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  onLoad: () => void;
  onDateRangeChange?: (startDate: string, endDate: string) => void;
  onFilterDateChange?: (date: string | null) => void;
  loading: boolean;
  lastLoadedAt?: Date | null;
}

interface Preset {
  label: string;
  getRange: () => { start: Date; end: Date };
}

// Generate presets dynamically with actual month names
function getPresets(): Preset[] {
  const now = new Date();
  const lastMonth = subMonths(now, 1);
  
  return [
    {
      label: format(lastMonth, "MMMM", { locale: de }),
      getRange: () => ({
        start: startOfMonth(lastMonth),
        end: endOfMonth(lastMonth),
      }),
    },
    {
      label: format(now, "MMMM", { locale: de }),
      getRange: () => ({
        start: startOfMonth(now),
        end: endOfMonth(now),
      }),
    },
  ];
}

export default function DateRangePicker({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  onLoad,
  onDateRangeChange,
  onFilterDateChange,
  loading,
  lastLoadedAt,
}: DateRangePickerProps) {
  const presets = getPresets();
  const today = new Date();
  const yesterday = subDays(today, 1);
  
  // Check if a preset matches the current date range
  const isPresetActive = (preset: Preset): boolean => {
    const { start, end } = preset.getRange();
    const presetStart = format(start, "yyyy-MM-dd");
    const presetEnd = format(end, "yyyy-MM-dd");
    return startDate === presetStart && endDate === presetEnd;
  };
  
  const applyPreset = (preset: Preset, filterDate?: string) => {
    const { start, end } = preset.getRange();
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
    
    // Set filter date if provided
    if (filterDate && onFilterDateChange) {
      // Small delay to ensure data is loaded first
      setTimeout(() => onFilterDateChange(filterDate), 100);
    }
  };
  
  // Jump to today: load current month and filter to today
  const jumpToToday = () => {
    const todayStr = format(today, "yyyy-MM-dd");
    const currentMonthPreset = presets[1]; // Current month is second preset
    applyPreset(currentMonthPreset, todayStr);
  };
  
  // Jump to yesterday: load appropriate month and filter to yesterday
  const jumpToYesterday = () => {
    const yesterdayStr = format(yesterday, "yyyy-MM-dd");
    // Check if yesterday is in the previous month
    const isInPreviousMonth = yesterday.getMonth() !== today.getMonth();
    const targetPreset = isInPreviousMonth ? presets[0] : presets[1];
    applyPreset(targetPreset, yesterdayStr);
  };

  return (
    <div className="p-4 bg-white rounded-lg shadow space-y-3">
      {/* Preset buttons */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Quick jump buttons */}
        <button
          onClick={jumpToYesterday}
          className="px-3 py-1 text-sm rounded-md transition bg-gray-100 text-gray-700 hover:bg-gray-200"
        >
          Gestern
        </button>
        <button
          onClick={jumpToToday}
          className="px-3 py-1 text-sm rounded-md transition bg-gray-100 text-gray-700 hover:bg-gray-200"
        >
          Heute
        </button>
        
        {/* Divider */}
        <div className="h-5 w-px bg-gray-300 mx-1" />
        
        {/* Month presets */}
        {presets.map((preset, index) => {
          const isActive = isPresetActive(preset);
          return (
            <button
              key={index}
              onClick={() => applyPreset(preset)}
              className={`px-3 py-1 text-sm rounded-md transition ${
                isActive
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {preset.label}
            </button>
          );
        })}
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
          className="relative px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:cursor-wait transition flex items-center gap-2 overflow-hidden"
        >
          {/* Progress bar background animation */}
          {loading && (
            <>
              <style>{`
                @keyframes progress-sweep {
                  0% { transform: translateX(-100%); }
                  100% { transform: translateX(100%); }
                }
              `}</style>
              <div 
                className="absolute inset-0 bg-blue-400 opacity-60"
                style={{
                  animation: "progress-sweep 1.5s ease-in-out infinite",
                }}
              />
            </>
          )}
          <span className="relative z-10 flex items-center gap-2">
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            Termine laden
          </span>
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
