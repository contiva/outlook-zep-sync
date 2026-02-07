'use client';

import { useState, useCallback } from 'react';
import { usePopover } from './usePopover';
import type { SyncedEntry } from './types';

export interface ConflictLinkPopoverProps {
  appointmentId: string;
  appointmentDate: string; // ISO datetime
  suggestedEntryId?: number;
  suggestedEntry?: {
    note: string | null;
    from: string;
    to: string;
    projektNr?: string;
    vorgangNr?: string;
  };
  syncedEntries: SyncedEntry[];
  linkedZepIds?: Set<number>;
  onLink: (appointmentId: string, zepEntryId: number) => void;
  children: React.ReactNode;
}

export default function ConflictLinkPopover({
  appointmentId,
  appointmentDate,
  suggestedEntryId,
  suggestedEntry,
  syncedEntries,
  linkedZepIds,
  onLink,
  children,
}: ConflictLinkPopoverProps) {
  const [selectedEntryId, setSelectedEntryId] = useState<number | null>(suggestedEntryId ?? null);

  const popoverId = `conflict-link-popover-${appointmentId}`;

  const onOpen = useCallback(() => {
    setSelectedEntryId(suggestedEntryId ?? null);
    // Focus the selected or first radio button after the popover renders
    requestAnimationFrame(() => {
      const radioName = `link-zep-${appointmentId}`;
      const selected = document.querySelector<HTMLInputElement>(
        `input[name="${radioName}"][checked]`,
      );
      const first = document.querySelector<HTMLInputElement>(`input[name="${radioName}"]`);
      (selected ?? first)?.focus();
    });
  }, [suggestedEntryId, appointmentId]);

  const { isOpen, triggerProps, popoverProps, close } = usePopover({
    onOpen,
    focusTrap: true,
    popoverId,
  });

  const aptDateStr = new Date(appointmentDate).toISOString().split('T')[0];
  const sameDayEntries = syncedEntries
    .filter((entry) => {
      const entryDate = entry.date.split('T')[0];
      if (entryDate !== aptDateStr) return false;
      if (entry.id && linkedZepIds?.has(entry.id)) return false;
      return true;
    })
    .sort((a, b) => b.from.localeCompare(a.from));

  const handleLink = () => {
    if (selectedEntryId !== null) {
      onLink(appointmentId, selectedEntryId);
      close();
    }
  };

  return (
    <span className="relative inline-flex items-center">
      <button {...triggerProps} className="cursor-pointer">
        {children}
      </button>

      {isOpen && (
        <div
          {...popoverProps}
          className={`absolute right-0 z-50 bg-white rounded-lg shadow-lg border border-gray-200 p-3 min-w-72 max-w-96 font-[Inter] ${popoverProps.className}`}
        >
          <div className="text-xs font-medium text-gray-700 mb-2">ZEP-Eintrag verknüpfen</div>

          {sameDayEntries.length === 0 ? (
            <div className="text-xs text-gray-500 py-2 space-y-2">
              <div>Keine verfügbaren ZEP-Einträge an diesem Tag.</div>
              {suggestedEntry && (
                <div className="p-2 bg-amber-50 rounded-lg border border-amber-200">
                  <div className="text-[11px] text-amber-600 mb-1">Überschneidung mit:</div>
                  <div className="text-xs font-medium text-gray-800 truncate">
                    {suggestedEntry.note || 'Ohne Bemerkung'}
                  </div>
                  <div className="text-[11px] text-gray-500">
                    {suggestedEntry.from.slice(0, 5)}–{suggestedEntry.to.slice(0, 5)}
                    {suggestedEntry.projektNr && (
                      <span className="ml-1.5 text-gray-400">
                        {suggestedEntry.projektNr}
                        {suggestedEntry.vorgangNr ? `/${suggestedEntry.vorgangNr}` : ''}
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-amber-500 mt-1">
                    Bereits einem anderen Termin zugeordnet
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div
              className="space-y-1 max-h-48 overflow-y-auto"
              role="radiogroup"
              aria-label="ZEP-Eintrag zum Verknüpfen auswählen"
            >
              {sameDayEntries.map((entry) => (
                <label
                  key={entry.id}
                  className={`flex items-start gap-2 p-2 rounded-lg cursor-pointer transition ${
                    selectedEntryId === entry.id
                      ? 'bg-blue-50 border border-blue-200'
                      : entry.id === suggestedEntryId
                        ? 'bg-amber-50 border border-amber-200 hover:bg-amber-100'
                        : 'hover:bg-gray-50 border border-transparent'
                  }`}
                >
                  <input
                    type="radio"
                    name={`link-zep-${appointmentId}`}
                    checked={selectedEntryId === entry.id}
                    onChange={() => setSelectedEntryId(entry.id)}
                    className="mt-0.5 accent-blue-600"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-gray-800 truncate">
                      {entry.note || 'Ohne Bemerkung'}
                    </div>
                    <div className="text-[11px] text-gray-500">
                      {entry.from.slice(0, 5)}–{entry.to.slice(0, 5)}
                      {entry.projektNr && (
                        <span className="ml-1.5 text-gray-400">
                          {entry.projektNr}
                          {entry.vorgangNr ? `/${entry.vorgangNr}` : ''}
                        </span>
                      )}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          )}

          {sameDayEntries.length > 0 && (
            <div className="mt-2 pt-2 border-t border-gray-100 flex justify-end">
              <button
                onClick={handleLink}
                disabled={selectedEntryId === null}
                className="px-3 py-1 text-xs font-medium text-white bg-blue-600 rounded hover:bg-blue-700 transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Verknüpfen
              </button>
            </div>
          )}
        </div>
      )}
    </span>
  );
}
