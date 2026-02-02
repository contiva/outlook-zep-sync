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
    <div className="flex items-center border-b border-border/60 bg-card">
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
              className={`relative px-5 py-3.5 text-sm font-medium whitespace-nowrap transition-colors ${
                isActive && !isRelated
                  ? "text-primary"
                  : isRelated
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {preset.label}
              {isActive && !isRelated && (
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary rounded-full" />
              )}
            </button>
          );
        })}
        
        <div className="h-6 w-px bg-border/60" />
        
        {/* Quick jump buttons */}
        <button
          onClick={jumpToYesterday}
          className={`relative px-4 py-3.5 text-sm font-medium whitespace-nowrap transition-colors ${
            isYesterdayActive
              ? "text-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Gestern
          {isYesterdayActive && (
            <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-primary rounded-full" />
          )}
        </button>
        
        <div className="h-6 w-px bg-border/60" />
        
        <button
          onClick={jumpToToday}
          className={`relative px-4 py-3.5 text-sm font-medium whitespace-nowrap transition-colors ${
            isTodayActive
              ? "text-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Heute
          {isTodayActive && (
            <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-5 h-0.5 bg-primary rounded-full" />
          )}
        </button>
        
        {/* Spacer */}
        <div className="flex-1" />
        
        {/* Last loaded status */}
        {lastLoadedAt && !loading && (
          <>
            <span 
              className="px-3 text-xs text-muted-foreground/70 hidden sm:inline" 
              title={format(lastLoadedAt, "PPpp", { locale: de })}
            >
              {formatDistanceToNow(lastLoadedAt, { addSuffix: true, locale: de })}
            </span>
            <div className="h-6 w-px bg-border/60" />
          </>
        )}
        
        {/* Load button */}
        <button
          onClick={onLoad}
          disabled={loading}
          className="relative flex items-center gap-2 px-5 py-3.5 text-sm font-medium bg-primary text-white hover:bg-primary-hover disabled:cursor-wait transition-all overflow-hidden rounded-none"
        >
          {/* Progress bar background animation */}
          {loading && (
            <div 
              className="absolute inset-0 bg-white/20"
              style={{
                animation: "progress-sweep 1.5s ease-in-out infinite",
              }}
            />
          )}
          <span className="relative z-10 flex items-center gap-2">
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            <span className="hidden sm:inline">Laden</span>
          </span>
        </button>
    </div>
  );
}
