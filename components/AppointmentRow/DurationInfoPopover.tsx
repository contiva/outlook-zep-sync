"use client";

import React from "react";
import { Check } from "lucide-react";
import { usePopover } from "./usePopover";
import { formatDuration } from "./helpers";

export interface DurationInfoPopoverProps {
  // Original times from Outlook (unrounded)
  originalStart: string;
  originalEnd: string;
  originalDurationMinutes: number;
  // Rounded times for ZEP
  plannedStart: string;
  plannedEnd: string;
  plannedDurationMinutes: number;
  // Actual times from call records (if available)
  originalActualStart?: string;
  originalActualEnd?: string;
  originalActualDurationMinutes?: number;
  // Rounded actual times for ZEP
  actualStart?: string;
  actualEnd?: string;
  actualDurationMinutes?: number;
  hasActualData: boolean;
  // Time deviation indicator
  hasDeviation?: boolean;
  // Currently selected time type (for non-synced entries)
  useActualTime?: boolean;
  // Synced time type (for synced entries) - 'planned', 'actual', 'other', or null
  syncedTimeType?: 'planned' | 'actual' | 'other' | null;
  // Callback to change time type (useActualTime: true = Ist, false = Plan)
  onTimeTypeChange?: (useActualTime: boolean) => void;
  // Whether switching is allowed (e.g., disabled for synced entries not in edit mode)
  canSwitch?: boolean;
  // Optional children to wrap (e.g., date/time display)
  children?: React.ReactNode;
}

export default function DurationInfoPopover({
  originalStart,
  originalEnd,
  originalDurationMinutes,
  plannedStart,
  plannedEnd,
  plannedDurationMinutes,
  originalActualStart,
  originalActualEnd,
  originalActualDurationMinutes,
  actualStart,
  actualEnd,
  actualDurationMinutes,
  hasActualData,
  hasDeviation,
  useActualTime,
  syncedTimeType,
  onTimeTypeChange,
  canSwitch = false,
  children,
}: DurationInfoPopoverProps) {
  const { isOpen, toggle, triggerProps, popoverProps } = usePopover({
    focusTrap: true,
    popoverId: "duration-info-popover",
  });

  const plannedWasRounded = originalStart !== plannedStart || originalEnd !== plannedEnd;
  const actualWasRounded = hasActualData && originalActualStart && actualStart &&
    (originalActualStart !== actualStart || originalActualEnd !== actualEnd);

  // Determine which time is selected
  // For synced entries: use syncedTimeType
  // For non-synced entries: use useActualTime
  const isIstSelected = syncedTimeType
    ? syncedTimeType === 'actual'
    : (useActualTime === true && hasActualData);
  const isPlanSelected = syncedTimeType
    ? syncedTimeType === 'planned'
    : !isIstSelected;

  return (
    <span className="relative inline-flex items-center">
      {children && (
        <button
          {...triggerProps}
          className="hover:text-gray-700 transition-colors cursor-pointer"
          title="Zeitoptionen anzeigen"
        >
          {children}
        </button>
      )}
      {!children && (
        <button
          {...triggerProps}
          className="text-gray-500 px-1.5 py-0.5 hover:text-gray-700 transition-colors cursor-pointer"
          title="Klicken für Details"
        >
          Dauer:
        </button>
      )}

      {isOpen && (
        <div
          {...popoverProps}
          className={`absolute left-0 z-50 bg-white rounded-lg shadow-lg border border-gray-200 p-3 min-w-64 font-[Inter] ${
            popoverProps.className
          }`}
        >
          <div className="text-xs font-medium text-gray-700 mb-2">
            Zeitoptionen für ZEP
          </div>

          <div className="space-y-2 text-xs">
            {/* Plan time explanation */}
            <button
              type="button"
              onClick={() => canSwitch && onTimeTypeChange?.(false)}
              disabled={!canSwitch || isPlanSelected}
              className={`w-full text-left p-2 rounded-lg border transition-all ${
                isPlanSelected
                  ? "bg-blue-50 border-blue-200 ring-1 ring-blue-300"
                  : canSwitch
                    ? "bg-blue-50/50 border-blue-100 hover:bg-blue-50 hover:border-blue-200 cursor-pointer"
                    : "bg-blue-50/50 border-blue-100"
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${isPlanSelected ? "bg-blue-200 text-blue-800" : "bg-blue-100 text-blue-700"}`}>
                  {isPlanSelected && <Check size={10} />}
                  Plan
                </span>
                <span className="text-[10px] text-gray-500">Geplante Dauer laut Outlook-Termin</span>
                {isPlanSelected && <span className="ml-auto text-[10px] text-blue-600 font-medium">Aktiv</span>}
                {!isPlanSelected && canSwitch && <span className="ml-auto text-[10px] text-blue-500">Auswählen</span>}
              </div>
              <div className="space-y-0.5">
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Outlook:</span>
                  <span className="text-gray-600 tabular-nums">
                    {originalStart}–{originalEnd} ({formatDuration(originalDurationMinutes)})
                  </span>
                </div>
                {plannedWasRounded && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">Für ZEP:</span>
                    <span className="text-blue-600 font-medium tabular-nums">
                      {plannedStart}–{plannedEnd} ({formatDuration(plannedDurationMinutes)})
                    </span>
                  </div>
                )}
              </div>
              {plannedWasRounded && (
                <div className="text-[10px] text-gray-400 mt-1">
                  ↳ Auf 15-Minuten-Raster gerundet
                </div>
              )}
            </button>

            {/* Actual time explanation */}
            <button
              type="button"
              onClick={() => canSwitch && hasActualData && onTimeTypeChange?.(true)}
              disabled={!canSwitch || !hasActualData || isIstSelected}
              className={`w-full text-left p-2 rounded-lg border transition-all ${
                isIstSelected
                  ? "bg-orange-50 border-orange-200 ring-1 ring-orange-300"
                  : hasActualData && canSwitch
                    ? "bg-orange-50/50 border-orange-100 hover:bg-orange-50 hover:border-orange-200 cursor-pointer"
                    : hasActualData
                      ? "bg-orange-50/50 border-orange-100"
                      : "bg-gray-50 border-gray-200"
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${
                  isIstSelected
                    ? "bg-orange-200 text-orange-800"
                    : hasActualData
                      ? "bg-orange-100 text-orange-700"
                      : "bg-gray-100 text-gray-400"
                }`}>
                  {isIstSelected && <Check size={10} />}
                  Ist
                </span>
                <span className={`text-[10px] ${hasActualData ? "text-gray-500" : "text-gray-400"}`}>
                  {hasActualData
                    ? "Tatsächliche Dauer aus Teams-Anrufdaten"
                    : "Keine Anrufdaten verfügbar"
                  }
                </span>
                {isIstSelected && <span className="ml-auto text-[10px] text-orange-600 font-medium">Aktiv</span>}
                {!isIstSelected && hasActualData && canSwitch && <span className="ml-auto text-[10px] text-orange-500">Auswählen</span>}
              </div>
              {hasActualData && originalActualStart && originalActualEnd && originalActualDurationMinutes !== undefined && (
                <div className="space-y-0.5">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">Teams:</span>
                    <span className="text-gray-600 tabular-nums">
                      {originalActualStart}–{originalActualEnd} ({formatDuration(originalActualDurationMinutes)})
                    </span>
                  </div>
                  {actualWasRounded && actualStart && actualEnd && actualDurationMinutes !== undefined && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500">Für ZEP:</span>
                      <span className="text-orange-600 font-medium tabular-nums">
                        {actualStart}–{actualEnd} ({formatDuration(actualDurationMinutes)})
                      </span>
                    </div>
                  )}
                  {actualWasRounded && (
                    <div className="text-[10px] text-gray-400 mt-1">
                      ↳ Auf 15-Minuten-Raster gerundet
                    </div>
                  )}
                </div>
              )}
            </button>
          </div>

          {hasDeviation && (
            <div className="mt-2 pt-2 border-t border-gray-100 flex items-center gap-1.5 text-[10px] text-amber-600">
              <span className="text-amber-500">✱</span>
              <span>Die Zeit für ZEP weicht vom Outlook-Termin ab</span>
            </div>
          )}

          <div className={`text-[10px] text-gray-400 ${hasDeviation ? "mt-1.5" : "mt-2 pt-2 border-t border-gray-100"}`}>
            Wähle die Zeit, die in ZEP gebucht werden soll
          </div>
        </div>
      )}
    </span>
  );
}
