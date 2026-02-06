"use client";

import React, { useState, useImperativeHandle } from "react";
import { Check, Minus, Plus, RotateCcw } from "lucide-react";
import { usePopover } from "./usePopover";
import { formatDuration } from "./helpers";
import { roundToNearest15Min } from "@/lib/time-utils";

export interface DurationInfoPopoverHandle {
  open: () => void;
}

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
  // Manual duration for appointments without call data
  manualDurationMinutes?: number;
  plannedStartDateTime?: string;
  onManualDurationChange?: (durationMinutes: number | undefined) => void;
  // Teams meeting still waiting for call data
  isWaitingForTeamsData?: boolean;
  // Optional children to wrap (e.g., date/time display)
  children?: React.ReactNode;
  // Imperative handle ref for programmatic open
  popoverRef?: React.Ref<DurationInfoPopoverHandle>;
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
  manualDurationMinutes,
  plannedStartDateTime,
  onManualDurationChange,
  isWaitingForTeamsData = false,
  children,
  popoverRef,
}: DurationInfoPopoverProps) {
  const { isOpen, open, triggerProps, popoverProps } = usePopover({
    focusTrap: true,
    popoverId: "duration-info-popover",
  });

  // Expose open() to parent via ref
  useImperativeHandle(popoverRef, () => ({ open }), [open]);

  const plannedWasRounded = originalStart !== plannedStart || originalEnd !== plannedEnd;
  const actualWasRounded = hasActualData && originalActualStart && actualStart &&
    (originalActualStart !== actualStart || originalActualEnd !== actualEnd);

  // Manual duration stepper state
  const hasManualDuration = manualDurationMinutes !== undefined;
  const externalValue = manualDurationMinutes ?? plannedDurationMinutes;
  const [stepperValue, setStepperValue] = useState(externalValue);
  const [prevExternalValue, setPrevExternalValue] = useState(externalValue);

  // Sync stepper with external state (no useEffect needed)
  if (externalValue !== prevExternalValue) {
    setPrevExternalValue(externalValue);
    setStepperValue(externalValue);
  }

  // Compute manual time strings
  const manualTimeInfo = React.useMemo(() => {
    if (!plannedStartDateTime) return null;
    const ps = roundToNearest15Min(new Date(plannedStartDateTime));
    const pe = new Date(ps.getTime() + stepperValue * 60 * 1000);
    const fmt = (d: Date) => d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
    return { start: fmt(ps), end: fmt(pe) };
  }, [plannedStartDateTime, stepperValue]);

  // Determine which time is selected
  // For synced entries: use syncedTimeType
  // For non-synced entries: use useActualTime
  const isIstSelected = syncedTimeType
    ? syncedTimeType === 'actual'
    : (useActualTime === true && (hasActualData || hasManualDuration));
  const isPlanSelected = syncedTimeType
    ? syncedTimeType === 'planned'
    : !isIstSelected;

  const handleStepperChange = (newValue: number) => {
    const clamped = Math.max(15, Math.min(720, newValue));
    setStepperValue(clamped);
    onManualDurationChange?.(clamped);
  };

  const handleReset = () => {
    setStepperValue(plannedDurationMinutes);
    onManualDurationChange?.(undefined);
  };

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
              onClick={() => {
                if (isPlanSelected) return;
                if (hasManualDuration && !hasActualData && onManualDurationChange) {
                  // Reset manual duration → back to plan
                  handleReset();
                } else if (canSwitch) {
                  onTimeTypeChange?.(false);
                }
              }}
              disabled={isPlanSelected && !hasManualDuration}
              className={`w-full text-left p-2 rounded-lg border transition-all ${
                isPlanSelected
                  ? "bg-blue-50 border-blue-200 ring-1 ring-blue-300"
                  : (canSwitch || (hasManualDuration && !hasActualData))
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
                {!isPlanSelected && (canSwitch || (hasManualDuration && !hasActualData)) && <span className="ml-auto text-[10px] text-blue-500">Auswählen</span>}
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

            {/* Actual time / Manual duration section */}
            {hasActualData ? (
              /* Teams call data available - show original behavior */
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
                  <span className="text-[10px] text-gray-500">
                    Tatsächliche Dauer aus Teams-Anrufdaten
                  </span>
                  {isIstSelected && <span className="ml-auto text-[10px] text-orange-600 font-medium">Aktiv</span>}
                  {!isIstSelected && canSwitch && <span className="ml-auto text-[10px] text-orange-500">Auswählen</span>}
                </div>
                {originalActualStart && originalActualEnd && originalActualDurationMinutes !== undefined && (
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
            ) : isWaitingForTeamsData ? (
              /* Teams meeting - waiting for call data */
              <div className="w-full text-left p-2 rounded-lg border border-gray-200 bg-gray-50">
                <div className="flex items-center gap-2 mb-1">
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-400">
                    Ist
                  </span>
                  <span className="text-[10px] text-gray-400">
                    Warte auf Teams-Anrufdaten…
                  </span>
                </div>
                <div className="text-[10px] text-gray-400 mt-1">
                  Ist-Zeiten werden ca. 1h nach Meeting-Ende verfügbar.
                  Du kannst die Dauer dann manuell setzen, falls keine Daten eintreffen.
                </div>
              </div>
            ) : (
              /* No call data, manual duration available */
              <div
                className={`w-full text-left p-2 rounded-lg border transition-all ${
                  isIstSelected
                    ? "bg-orange-50 border-orange-200 ring-1 ring-orange-300"
                    : "bg-gray-50 border-gray-200 hover:border-orange-200"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${
                    isIstSelected
                      ? "bg-orange-200 text-orange-800"
                      : "bg-gray-100 text-gray-500"
                  }`}>
                    {isIstSelected && <Check size={10} />}
                    Ist
                  </span>
                  <span className="text-[10px] text-gray-500">
                    {isIstSelected ? "Manuelle Ist-Zeit" : "Ist-Zeit manuell setzen"}
                  </span>
                  {isIstSelected && <span className="ml-auto text-[10px] text-orange-600 font-medium">Aktiv</span>}
                </div>

                {/* Duration stepper */}
                <div className="space-y-1.5 mt-1.5">
                  {manualTimeInfo && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500">Beginn:</span>
                      <span className="text-gray-600 tabular-nums font-medium">{manualTimeInfo.start} (fest)</span>
                    </div>
                  )}

                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">Dauer:</span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStepperChange(stepperValue - 15);
                        }}
                        disabled={!onManualDurationChange || stepperValue <= 15}
                        className={`p-1 rounded-md border transition-colors ${
                          !onManualDurationChange || stepperValue <= 15
                            ? "text-gray-300 border-gray-200 bg-gray-50 cursor-not-allowed"
                            : "text-orange-600 border-orange-200 bg-orange-50 hover:bg-orange-100 hover:border-orange-300 cursor-pointer"
                        }`}
                        title={!onManualDurationChange ? "Nur im Bearbeitungsmodus änderbar" : "15 Minuten weniger"}
                      >
                        <Minus size={14} strokeWidth={2.5} />
                      </button>
                      <span className={`tabular-nums font-semibold min-w-[60px] text-center ${
                        isIstSelected ? "text-orange-700" : "text-gray-700"
                      }`}>
                        {formatDuration(stepperValue)}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStepperChange(stepperValue + 15);
                        }}
                        disabled={!onManualDurationChange || stepperValue >= 720}
                        className={`p-1 rounded-md border transition-colors ${
                          !onManualDurationChange || stepperValue >= 720
                            ? "text-gray-300 border-gray-200 bg-gray-50 cursor-not-allowed"
                            : "text-orange-600 border-orange-200 bg-orange-50 hover:bg-orange-100 hover:border-orange-300 cursor-pointer"
                        }`}
                        title={!onManualDurationChange ? "Nur im Bearbeitungsmodus änderbar" : "15 Minuten mehr"}
                      >
                        <Plus size={14} strokeWidth={2.5} />
                      </button>
                    </div>
                  </div>

                  {manualTimeInfo && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500">Ende:</span>
                      <span className={`tabular-nums font-medium ${isIstSelected ? "text-orange-600" : "text-gray-600"}`}>
                        {manualTimeInfo.end}
                      </span>
                    </div>
                  )}

                  {/* Reset button */}
                  {hasManualDuration && onManualDurationChange && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleReset();
                      }}
                      className="mt-1 flex items-center gap-1 text-[10px] text-gray-500 hover:text-gray-700 transition-colors cursor-pointer"
                    >
                      <RotateCcw size={10} />
                      Zurücksetzen (Plan verwenden)
                    </button>
                  )}
                </div>
              </div>
            )}
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
