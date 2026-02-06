"use client";

import { RefreshCw } from "lucide-react";
import { startOfMonth, endOfMonth, subMonths, subDays, format, formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";

interface DateRangePickerProps {
  startDate: string;
  endDate: string;
  filterDate: string | null;
  onLoad: () => void;
  onDateRangeChange: (startDate: string, endDate: string) => void;
  onFilterDateChange: (date: string | null) => void;
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
  filterDate,
  onLoad,
  onDateRangeChange,
  onFilterDateChange,
  loading,
  lastLoadedAt,
}: DateRangePickerProps) {
  const presets = getPresets();
  const today = new Date();
  const yesterday = subDays(today, 1);
  
  // Format dates for comparison
  const todayStr = format(today, "yyyy-MM-dd");
  const yesterdayStr = format(yesterday, "yyyy-MM-dd");
  
  // Check if today/yesterday filter is active
  const isTodayActive = filterDate === todayStr;
  const isYesterdayActive = filterDate === yesterdayStr;
  
  // Check if a preset matches the current date range
  const isPresetActive = (preset: Preset): boolean => {
    const { start, end } = preset.getRange();
    const presetStart = format(start, "yyyy-MM-dd");
    const presetEnd = format(end, "yyyy-MM-dd");
    return startDate === presetStart && endDate === presetEnd;
  };
  
  // Check if preset is "related" to active today/yesterday filter (for darker styling)
  const isPresetRelated = (presetIndex: number): boolean => {
    if (!isTodayActive && !isYesterdayActive) return false;
    const isYesterdayInPreviousMonth = yesterday.getMonth() !== today.getMonth();
    if (isTodayActive) return presetIndex === 1; // Current month
    if (isYesterdayActive) return isYesterdayInPreviousMonth ? presetIndex === 0 : presetIndex === 1;
    return false;
  };
  
  const applyPreset = (preset: Preset, filterDateValue?: string) => {
    const { start, end } = preset.getRange();
    const startStr = format(start, "yyyy-MM-dd");
    const endStr = format(end, "yyyy-MM-dd");
    
    onDateRangeChange(startStr, endStr);
    
    // Set filter date if provided
    if (filterDateValue) {
      // Small delay to ensure data is loaded first
      setTimeout(() => onFilterDateChange(filterDateValue), 100);
    }
  };
  
  // Jump to today: load current month and filter to today
  const jumpToToday = () => {
    const currentMonthPreset = presets[1]; // Current month is second preset
    applyPreset(currentMonthPreset, todayStr);
  };
  
  // Jump to yesterday: load appropriate month and filter to yesterday
  const jumpToYesterday = () => {
    // Check if yesterday is in the previous month
    const isInPreviousMonth = yesterday.getMonth() !== today.getMonth();
    const targetPreset = isInPreviousMonth ? presets[0] : presets[1];
    applyPreset(targetPreset, yesterdayStr);
  };

  return (
    <div className="flex items-center border-b border-gray-200">
        {/* Month presets */}
        {presets.map((preset, index) => {
          const isActive = isPresetActive(preset);
          const isRelated = isPresetRelated(index);
          return (
            <button
              key={index}
              onClick={() => {
                applyPreset(preset);
                // Clear the filter date when clicking month directly
                setTimeout(() => onFilterDateChange(null), 100);
              }}
              className={`px-4 py-3 text-sm whitespace-nowrap transition ${
                isActive && !isRelated
                  ? "text-blue-600 bg-blue-50"
                  : isRelated
                  ? "text-gray-700 bg-gray-100"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              {preset.label}
            </button>
          );
        })}
        
        <div className="h-8 w-px bg-gray-200" />
        
        {/* Quick jump buttons */}
        <button
          onClick={jumpToYesterday}
          className={`px-4 py-3 text-sm whitespace-nowrap transition ${
            isYesterdayActive
              ? "text-blue-600 bg-blue-50"
              : "text-gray-600 hover:bg-gray-50"
          }`}
        >
          Gestern
        </button>
        
        <div className="h-8 w-px bg-gray-200" />
        
        <button
          onClick={jumpToToday}
          className={`px-4 py-3 text-sm whitespace-nowrap transition ${
            isTodayActive
              ? "text-blue-600 bg-blue-50"
              : "text-gray-600 hover:bg-gray-50"
          }`}
        >
          Heute
        </button>
        
        {/* Spacer */}
        <div className="flex-1" />
        
        {/* Last loaded status */}
        {lastLoadedAt && !loading && (
          <>
            <span 
              className="px-3 text-xs text-gray-400 hidden sm:inline" 
              title={format(lastLoadedAt, "PPpp", { locale: de })}
            >
              {formatDistanceToNow(lastLoadedAt, { addSuffix: true, locale: de })}
            </span>
            <div className="h-8 w-px bg-gray-200" />
          </>
        )}
        
        {/* ZEP direct link */}
        <a
          href="https://www.zep-online.de/zepcontiva/view/oauth2login.php"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center self-stretch ps-3 pe-1 text-sm font-medium text-gray-600 hover:bg-gray-50 transition whitespace-nowrap"
        >
          <span className="hidden sm:inline">Direkt zu</span>
          <img src="/zep-logo.png" alt="ZEP" className="h-6 relative -top-[1.2px] -ml-[2px]" />
        </a>

        {/* Load button */}
        <button
          onClick={onLoad}
          disabled={loading}
          className="relative flex items-center gap-2 px-4 py-3 text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:cursor-wait transition overflow-hidden"
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
            <span className="hidden sm:inline">Termine laden</span>
          </span>
        </button>
    </div>
  );
}
