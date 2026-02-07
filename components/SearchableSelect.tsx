'use client';

import { useMemo, useState, useRef } from 'react';
import { Listbox, ListboxButton, ListboxOptions, ListboxOption } from '@headlessui/react';
import { ChevronDown, Check, Loader2, Search } from 'lucide-react';

export interface SelectOption {
  value: string | number;
  label: string;
  description?: string | null;
}

interface SearchableSelectProps {
  options: SelectOption[];
  value: string | number | null;
  onChange: (value: string | number | null) => void;
  placeholder?: string;
  disabled?: boolean;
  disabledMessage?: string;
  loading?: boolean;
  className?: string;
  /** Show only label in button (no description), dropdown still shows both */
  compact?: boolean;
}

export default function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = 'Auswählen',
  disabled = false,
  disabledMessage,
  loading = false,
  className = '',
  compact = false,
}: SearchableSelectProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedOption = useMemo(
    () => options.find((opt) => opt.value === value) || null,
    [options, value],
  );

  // Filter options based on search query
  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return options;
    const query = searchQuery.toLowerCase();
    return options.filter(
      (opt) =>
        opt.label.toLowerCase().includes(query) ||
        (opt.description && opt.description.toLowerCase().includes(query)),
    );
  }, [options, searchQuery]);

  // Display text for the button
  const displayText = useMemo(() => {
    if (disabled && disabledMessage) return disabledMessage;
    if (!selectedOption) return placeholder;
    if (compact) return selectedOption.label;
    return selectedOption.description
      ? `${selectedOption.label} - ${selectedOption.description}`
      : selectedOption.label;
  }, [selectedOption, disabled, disabledMessage, placeholder, compact]);

  // Show search only if there are more than 3 options
  const showSearch = options.length > 3;

  return (
    <Listbox
      value={selectedOption}
      onChange={(opt: SelectOption | null) => {
        onChange(opt?.value ?? null);
        setSearchQuery('');
      }}
      disabled={disabled}
    >
      {({ open }) => {
        // Focus search input when dropdown opens
        if (open && showSearch) {
          setTimeout(() => searchInputRef.current?.focus(), 10);
        }
        if (!open && searchQuery) {
          setTimeout(() => setSearchQuery(''), 0);
        }

        return (
          <div className={`relative ${className}`}>
            <ListboxButton
              className={`w-full h-8 border border-gray-200 py-1.5 pl-2.5 pr-8 text-sm leading-tight text-left transition-colors focus:border-blue-400 focus:ring-1 focus:ring-blue-400 focus:outline-none ${
                disabled
                  ? 'bg-gray-50 cursor-not-allowed text-gray-300 opacity-40'
                  : 'bg-white cursor-pointer hover:border-gray-300'
              } ${disabled ? '' : !selectedOption ? 'text-gray-400' : 'text-gray-700'}`}
            >
              <span className="block truncate">{displayText}</span>
              <span className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                {loading ? (
                  <Loader2 className="h-4 w-4 text-blue-500 animate-spin" aria-hidden="true" />
                ) : (
                  <ChevronDown
                    className={`h-4 w-4 ${disabled ? 'text-gray-300' : 'text-gray-400'}`}
                    aria-hidden="true"
                  />
                )}
              </span>
            </ListboxButton>

            <ListboxOptions
              anchor="bottom start"
              style={compact ? undefined : { width: 'calc(var(--button-width) * 1.5)' }}
              className={`z-[100] mt-1 max-h-64 bg-white text-sm shadow-md border border-gray-200 focus:outline-none min-w-[var(--button-width)] ${compact ? 'w-max max-w-80' : ''}`}
            >
              {/* Search input */}
              {showSearch && (
                <div className="sticky top-0 bg-white px-2 py-1.5 border-b border-gray-100">
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                    <input
                      ref={searchInputRef}
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Suchen..."
                      className="w-full pl-7 pr-2 py-1 text-sm border border-gray-200 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => {
                        if (['ArrowDown', 'ArrowUp', 'Enter', 'Escape'].includes(e.key)) return;
                        e.stopPropagation();
                      }}
                    />
                  </div>
                </div>
              )}

              <div className="overflow-auto max-h-48 py-0.5">
                {/* Option zum Abwählen - nur wenn nicht gesucht wird */}
                {/* Null-Option entfernt — Placeholder wird nur im Button angezeigt */}

                {/* Filtered options */}
                {filteredOptions.map((option) => (
                  <ListboxOption
                    key={option.value}
                    value={option}
                    className={({ focus }) =>
                      `relative cursor-pointer select-none py-1.5 pl-8 pr-3 ${
                        focus ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                      }`
                    }
                  >
                    {({ selected, focus }) => (
                      <>
                        <div className="flex flex-col">
                          <span className={`block ${selected ? 'font-medium' : 'font-normal'}`}>
                            {option.label}
                          </span>
                          {option.description && (
                            <span
                              className={`block text-xs ${
                                focus ? 'text-blue-500' : 'text-gray-400'
                              }`}
                            >
                              {option.description}
                            </span>
                          )}
                        </div>
                        {selected && (
                          <span
                            className={`absolute inset-y-0 left-0 flex items-center pl-2 ${
                              focus ? 'text-blue-600' : 'text-blue-500'
                            }`}
                          >
                            <Check className="h-3.5 w-3.5" aria-hidden="true" />
                          </span>
                        )}
                      </>
                    )}
                  </ListboxOption>
                ))}

                {/* No results message */}
                {searchQuery && filteredOptions.length === 0 && (
                  <div className="py-2 px-4 text-gray-500 text-center">Keine Ergebnisse</div>
                )}
              </div>
            </ListboxOptions>
          </div>
        );
      }}
    </Listbox>
  );
}
